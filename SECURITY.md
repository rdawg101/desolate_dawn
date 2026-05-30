# Security Guide for Desolate Dawn

## 1. Password Security

### Bcrypt Hashing (Already Implemented)
- **What it does:** Bcrypt hashes passwords + adds a unique salt, making passwords uncrackable
- **How it works:** Each password gets a different salt → same password produces different hashes
- **Salt rounds:** 10 is standard; higher = slower but more secure (try 12 for production)
- **Why needed:** If DB is breached, attackers see hashes, not passwords

```js
// Registration: hash before storing
const passwordHash = await bcrypt.hash(password, 10);
await User.create({ username, passwordHash });

// Login: verify plaintext against hash
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Never store plain passwords.** Never return password hashes to frontend.

---

## 2. Authentication & Sessions

### Current Setup (Stateless)
- Frontend stores `username` in `localStorage`
- Backend doesn't track sessions
- **Problem:** Client can fake any username

### Production Fix: JWT (JSON Web Tokens)

```js
// Backend registration/login: Create token
const jwt = require('jsonwebtoken');
const token = jwt.sign({ username, userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, username });

// Frontend: Store token
localStorage.setItem('token', token);

// Frontend: Include in requests
fetch('/api/score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({ wave, kills })
});

// Backend: Verify token
const token = req.headers.authorization?.split(' ')[1];
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // Now you know who they are
} catch {
  return res.status(401).json({ error: 'Invalid token' });
}
```

**Key:** Store `JWT_SECRET` in `.env`, never in code.

---

## 3. Input Validation & Sanitization

### Prevent SQL Injection & XSS

```js
// ❌ Bad: No validation
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  await User.create({ username, password }); // Attacker could pass SQL
});

// ✅ Good: Validate input
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  // Length checks
  if (!username || username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username 3-20 chars' });
  }

  // Alphanumeric + underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  // Password strength
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password 8+ chars' });
  }

  // Mongoose already prevents NoSQL injection with schemas
  await User.create({ username: username.trim(), passwordHash });
});
```

**Frontend sanitization:**
```js
// Never render user input directly
// ❌ Bad: window.innerHTML = username;
// ✅ Good: Use React (auto-escapes) or textContent
<li>{player.username}</li> // React escapes by default
```

---

## 4. CORS & Trusted Origins

### Current Setup
```js
app.use(cors()); // ❌ Allows ANY origin
```

### Production Setup
```js
app.use(cors({
  origin: 'https://yourdesolatdawn.com', // Only your domain
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Why:** Without CORS restriction, attackers on other sites can make requests pretending to be your users.

---

## 5. Rate Limiting (Prevent Brute Force)

Install: `npm install express-rate-limit`

```js
const rateLimit = require('express-rate-limit');

// 5 login attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, try later'
});

app.post('/api/login', loginLimiter, async (req, res) => {
  // Login logic
});

// General API limiter: 100 requests per hour
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100
});

app.use('/api/', apiLimiter);
```

**Why:** Protects against:
- Brute force password attacks
- DDoS attacks
- Resource exhaustion

---

## 6. HTTPS & TLS

### Development
- OK to use HTTP locally

### Production
- **ALWAYS use HTTPS**
- Get free SSL cert from [Let's Encrypt](https://letsencrypt.org/)
- Use [Certbot](https://certbot.eff.org/) to automate renewal

```js
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// Set security headers
app.use((req, res, next) => {
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});
```

---

## 7. Environment Variables & Secrets

### Current `.env`
```env
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your_super_secret_key_here
```

### Production Checklist
- ✅ `.env` in `.gitignore` (never commit secrets)
- ✅ Use platform secrets (Vercel, Heroku, AWS Secrets Manager)
- ✅ Rotate secrets regularly
- ✅ Minimize who has access to production `.env`

```bash
# Development
source .env

# Production (use platform-specific methods)
# Vercel: Settings → Environment Variables
# Heroku: Config Vars
# AWS: Secrets Manager
```

---

## 8. Database Security

### Mongoose Best Practices
```js
// ✅ Always use unique indexes
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true, required: true },
  email: { type: String, unique: true, sparse: true } // sparse allows null
});

// ✅ Use schema validation
const schema = new mongoose.Schema({
  bestWave: { type: Number, min: 0, max: 1000 }
});

// ✅ Timestamp fields
const schema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### MongoDB Atlas Security
- ✅ Enable authentication (username + password)
- ✅ Create IP whitelist (allow only your server IPs)
- ✅ Use connection string with read-only user for non-admin operations
- ✅ Enable encryption at rest
- ✅ Use TLS/SSL for connections (default)

---

## 9. Leaderboard Integrity (Prevent Cheating)

### Current Problem
Frontend can easily fake scores:
```js
// ❌ Attacker does this
fetch('/api/score', {
  method: 'POST',
  body: JSON.stringify({ username: 'Alice', wave: 999999, kills: 999999 })
});
```

### Solution: Server-Side Validation

```js
app.post('/api/score', authenticate, async (req, res) => {
  const { wave, kills } = req.body;
  const username = req.user.username; // From JWT, not user input!

  // Validate game data
  if (wave < 0 || wave > 10000) {
    return res.status(400).json({ error: 'Invalid wave number' });
  }
  if (kills < 0 || kills > 100000) {
    return res.status(400).json({ error: 'Invalid kill count' });
  }

  // Check rate limiting (player shouldn't send scores too frequently)
  // Implement cooldown between submissions

  await User.findOneAndUpdate(
    { username },
    { $max: { bestWave: wave }, $inc: { kills } }
  );
  
  res.json({ success: true });
});

// Better: Use game server for score verification
// Have Unity send cryptographic proof of score
```

**For production games:**
- Verify game state server-side
- Use anti-cheat services (EasyAntiCheat, Battleye)
- Require game server validation before accepting scores

---

## 10. Scaling with More Users

### Database Scaling
1. **Indexes** — Speed up queries
   ```js
   schema.index({ username: 1 });
   schema.index({ bestWave: -1, kills: -1 }); // For leaderboard
   ```

2. **Connection Pooling** — Reuse DB connections
   ```js
   mongoose.connect(url, { maxPoolSize: 50 });
   ```

3. **Sharding** — Distribute data across servers (MongoDB Atlas handles this automatically)

### API Scaling
1. **Load Balancing** — Multiple backend instances
   ```
   Client → Load Balancer → [Server1, Server2, Server3]
   ```
   Use: Nginx, HAProxy, or cloud provider (AWS ELB, GCP LB)

2. **Caching** — Redis for frequently accessed data
   ```js
   const redis = require('redis');
   const client = redis.createClient();
   
   app.get('/api/leaderboard', async (req, res) => {
     // Try cache first
     const cached = await client.get('leaderboard');
     if (cached) return res.json(JSON.parse(cached));
     
     // If not cached, fetch and store
     const leaderboard = await User.find().sort(...).limit(10);
     await client.setex('leaderboard', 300, JSON.stringify(leaderboard)); // 5 min TTL
     res.json(leaderboard);
   });
   ```

3. **CDN** — Serve static files (HTML, JS, CSS, WebGL build) from edge
   - Use: Cloudflare, AWS CloudFront, Bunny CDN
   - Dramatically reduces latency

### Frontend Scaling
- Bundle splitting (code splitting in Vite)
- Lazy load routes
- Compress assets

### Infrastructure
```
┌─────────────┐
│   CDN       │ (Static files + WebGL build)
└────────┬────┘
         │
┌────────▼────────┐
│ Load Balancer   │ (AWS ELB / Nginx)
└────────┬────────┘
         │
    ┌────┴────┬───────┬───────┐
    │          │       │       │
┌───▼──┐  ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│API 1 │  │API 2│ │API 3│ │API 4│ (Node/Express servers)
└───┬──┘  └──┬──┘ └──┬──┘ └──┬──┘
    │        │       │       │
    └────────┼───────┼───────┘
             │
        ┌────▼────────┐
        │ MongoDB +   │ (Replicas for HA)
        │ Redis Cache │
        └─────────────┘
```

---

## 11. Monitoring & Logging

### Essential Metrics
- API response time (track slow endpoints)
- Error rates (500, 401, etc)
- Active users
- Database query performance
- Server resource usage

### Tools
- **Sentry** — Error tracking
- **LogRocket** — Frontend monitoring
- **New Relic** — APM (Application Performance Monitoring)
- **DataDog** — Infrastructure monitoring
- **ELK Stack** — Logging (Elasticsearch, Logstash, Kibana)

```js
// Simple logging
const fs = require('fs');
app.use((req, res, next) => {
  const log = `${new Date().toISOString()} ${req.method} ${req.url}`;
  fs.appendFileSync('access.log', log + '\n');
  next();
});
```

---

## 12. Third-Party Security

### External Service Risks
- Payment processors (Stripe, PayPal) → PCI-DSS compliance
- Analytics (Google Analytics) → Data leaks
- CDNs → Potential for serving malicious code
- APIs → Man-in-the-middle attacks

### Mitigation
- ✅ Use established, audited services
- ✅ Verify SSL certificates
- ✅ Use webhooks with signature verification
- ✅ Minimize data shared with third parties
- ✅ Regular security audits

**Example: Verify Stripe webhook**
```js
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
    // Process event
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

## 13. Penetration Testing Checklist

Before launch, test for:
- [ ] SQL/NoSQL injection
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Brute force attacks
- [ ] Path traversal
- [ ] Unvalidated redirects
- [ ] Sensitive data exposure
- [ ] Broken authentication
- [ ] CORS misconfigurations
- [ ] Rate limiting bypasses

**Tools:** OWASP ZAP, Burp Suite, Postman

---

## 14. Quick Security Wins (Implement Now)

1. ✅ **Password hashing with bcrypt** (Done!)
2. ✅ **Input validation** (Add regex checks)
3. ✅ **HTTPS** (Use Let's Encrypt)
4. ✅ **Rate limiting** (npm install express-rate-limit)
5. ✅ **JWT tokens** (npm install jsonwebtoken)
6. ✅ **CORS restriction** (Set origin whitelist)
7. ✅ **Environment variables** (Keep secrets in .env)
8. ✅ **Security headers** (Add via middleware)
9. ✅ **Database authentication** (MongoDB Atlas)
10. ✅ **OWASP Top 10** (Read & implement)

---

## 15. Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Bcrypt Guide](https://github.com/kelektiv/node.bcrypt.js)
