# Unity WebGL Integration Guide

## Overview
The Game.jsx component handles full-screen, responsive embedding of your Unity WebGL build. The frontend now has authentication (login/register) and routing between Landing and Game pages.

---

## Step 1: Export Unity WebGL Build

In Unity:
1. **File → Build Settings**
2. Select **WebGL** platform
3. **Player Settings:**
   - Resolution: Set your desired aspect ratio (recommend 16:9)
   - Graphics: Adjust quality settings for performance
   - Compression: Use Gzip for smaller file size
4. **Build** → Choose `frontend/public/Build/` as output directory

This generates:
```
frontend/public/Build/
├── index.html
├── index.js (loader)
├── index.data
├── index.wasm
└── TemplateData/
    ├── style.css
    ├── favicon.ico
    └── ...
```

---

## Step 2: Update Game.jsx to Load Your Build

Replace the placeholder in [frontend/src/pages/Game.jsx](frontend/src/pages/Game.jsx):

```jsx
useEffect(() => {
  // Load the actual Unity build
  const script = document.createElement('script');
  script.src = '/Build/index.js'; // Path to Unity loader
  script.async = true;
  document.body.appendChild(script);

  // Optional: Listen for game ready
  window.UnityLoader?.InstantiateUnityContent?.();
}, []);
```

---

## Step 3: Communication Between Unity and React

### From Unity to React (Send Score)

In your Unity C# script:
```csharp
// When game ends, call JavaScript
using UnityEngine;

public class GameOverHandler : MonoBehaviour {
    public void OnGameOver(int waveReached, int killCount) {
        // Call the React function via JavaScript
        Application.ExternalCall("handleGameOver", waveReached, killCount);
    }
}
```

The `handleGameOver` function in [frontend/src/pages/Game.jsx](frontend/src/pages/Game.jsx) already handles:
- Sending score to `/api/score`
- Redirecting back to landing page
- Error handling

### From React to Unity (Send Data)

To send data from React to Unity:
```jsx
// In Game.jsx
const sendToUnity = (methodName, param1, param2) => {
  if (window.unityInstance) {
    window.unityInstance.SendMessage('GameManager', methodName, param1);
  }
};

// Example: Pause game from React
sendToUnity('PauseGame');
```

---

## Step 4: File Structure

After export, your structure should be:
```
desolate_dawn/
├── backend/
│   ├── index.js (with bcrypt auth)
│   ├── .env
│   └── ...
├── frontend/
│   ├── public/
│   │   └── Build/  ← Unity WebGL export here
│   │       ├── index.html
│   │       ├── index.js
│   │       └── ...
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx (Login/Register)
│   │   │   └── Game.jsx (Full-screen Unity embed)
│   │   ├── styles/
│   │   │   ├── Game.css (Responsive full-screen)
│   │   │   └── Landing.css (Styled auth forms)
│   │   ├── App.jsx (Router)
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── SECURITY.md (Security best practices)
```

---

## Step 5: Test Locally

**Terminal 1 (Frontend):**
```bash
cd frontend
npm run dev
```

**Terminal 2 (Backend):**
```bash
cd backend
node index.js
```

Open `http://localhost:5173` → Register/Login → Click "Play Game" → Unity loads in full-screen

---

## Step 6: Handling Score Submission

When game ends in Unity:
1. Unity calls `window.handleGameOver(wave, kills)`
2. React sends POST `/api/score` with username (from localStorage) + stats
3. Backend validates and updates player in database
4. Frontend redirects to landing page

**Backend validates:**
- Username exists (from JWT/localStorage)
- Wave and kills are reasonable (not negative, not unrealistic)
- Rate limiting (prevent spam)

---

## Performance Tips

### For Large Unity Builds
- **Compression:** Enable in Unity build settings
- **CDN:** Serve `Build/` files from Cloudflare or AWS CloudFront
- **Lazy loading:** Load Build files only when entering Game route
- **Optimize Unity:** Strip unused scripts, compress textures, reduce draw calls

### Browser Considerations
- **WebGL Support:** Test on mobile (iOS WebGL is limited)
- **Memory:** 32-bit browsers may struggle with large builds (2GB+)
- **WebAssembly:** Newer browsers required; use feature detection

```jsx
// In Game.jsx: Detect WebGL support
useEffect(() => {
  const canvas = document.createElement('canvas');
  const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!webgl) {
    console.error('WebGL not supported');
    // Show fallback UI
  }
}, []);
```

---

## Troubleshooting

### Build files not loading
- Check browser console for 404 errors
- Verify `public/Build/` exists with all files
- Check CORS headers if on different domain

### Unity not responding
- Check `window.handleGameOver` is accessible: `typeof window.handleGameOver === 'function'`
- Verify script loaded: Check Network tab for `/Build/index.js`
- Console for JS errors

### Scores not saving
- Verify username in `localStorage.getItem('username')`
- Check backend console for errors
- Verify `/api/score` endpoint is working (test with Postman)

---

## Next Steps

1. ✅ Export Unity WebGL build to `frontend/public/Build/`
2. ✅ Test login/register flow
3. ✅ Verify Game.jsx loads your build
4. ✅ Test score submission
5. ✅ Connect MongoDB Atlas (update `.env`)
6. ✅ Add JWT tokens (see [SECURITY.md](SECURITY.md))
7. ✅ Set up HTTPS for production
8. ✅ Deploy frontend (Vercel) + backend (Heroku/Railway)
