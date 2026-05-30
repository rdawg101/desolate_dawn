// express server, routes, MongoDB connection 
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB if URI is available, otherwise use in-memory storage for testing
let mongoConnected = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));
  db.on('open', () => { mongoConnected = true; console.log('✅ MongoDB connected'); });
} else {
  console.log('⚠️  No MONGODB_URI provided. Using in-memory storage for testing.');
}

// User schema and model - stores username, hashed password, best wave reached, and total kills
let User;
if (mongoConnected || process.env.MONGODB_URI) {
  User = mongoose.model('User', new mongoose.Schema({
      username: { type: String, unique: true, required: true },
      passwordHash: { type: String, required: true },
      bestWave: { type: Number, default: 0 },
      kills: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
  }));
} else {
  // In-memory storage for testing
  const users = {};
  let idCounter = 0;
  User = {
    findOne: async (query) => {
      return Object.values(users).find(u => u.username === query.username) || null;
    },
    create: async (data) => {
      data._id = ++idCounter;
      users[idCounter] = data;
      return data;
    },
    find: async () => Object.values(users),
    findOneAndUpdate: async (query, update, opts) => {
      const user = Object.values(users).find(u => u.username === query.username);
      if (user) {
        if (update.$max) user.bestWave = Math.max(user.bestWave, update.$max.bestWave);
        if (update.$inc) user.kills = (user.kills || 0) + update.$inc.kills;
      }
      return user;
    }
  };
}

// REGISTER endpoint - Create new account with hashed password
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user already exists
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password with bcrypt (10 salt rounds for security)
        const passwordHash = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await User.create({
            username,
            passwordHash,
            bestWave: 0,
            kills: 0
        });

        // Return user info (never return password hash!)
        return res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            bestWave: newUser.bestWave,
            kills: newUser.kills
        });

    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// LOGIN endpoint - Verify password and authenticate
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Compare password with hash
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Return user info (never return password hash!)
        return res.json({
            _id: user._id,
            username: user.username,
            bestWave: user.bestWave,
            kills: user.kills
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

 app.get('/api/leaderboard', async (req, res) => {
    const all = await User.find();
    const top = all.sort((a, b) => (b.bestWave - a.bestWave) || (b.kills - a.kills)).slice(0, 10);
    res.json(top);
  });

app.get('/api/user', async (req, res) => {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ username: user.username, bestWave: user.bestWave, kills: user.kills });
    } catch (err) {
      console.error('User lookup error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.post('/api/score', async (req, res) => {
    const { username, wave, kills } = req.body;
    if (!username || wave === undefined || kills === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await User.findOneAndUpdate(
            { username },
            {
                $max: { bestWave: wave },
                $inc: { kills }
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});