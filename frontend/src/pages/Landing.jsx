import { useState, useEffect } from "react";
import "../styles/Landing.css";

export default function Landing({ onLogin, onRequestStart, onLogout, username }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [personalBest, setPersonalBest] = useState(null);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const apiBase = import.meta.env.DEV ? "http://localhost:4000" : "";

  const parseJsonResponse = async (res) => {
    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (err) {
      console.warn("Failed to parse JSON response:", err, text);
      return null;
    }
  };

  useEffect(() => {
    fetch(`${apiBase}/api/leaderboard`)
      .then(async (res) => {
        const data = await parseJsonResponse(res);
        return data || [];
      })
      .then((data) => setLeaderboard(data))
      .catch((err) => console.error("Failed to load leaderboard:", err));
  }, []);

  useEffect(() => {
    if (!username) {
      setPersonalBest(null);
      return;
    }

    fetch(`${apiBase}/api/user?username=${encodeURIComponent(username)}`)
      .then(async (res) => {
        const data = await parseJsonResponse(res);
        if (res.ok && data) {
          setPersonalBest(data);
        } else {
          setPersonalBest(null);
        }
      })
      .catch(() => setPersonalBest(null));
  }, [username]);

  async function handleAuth(e) {
    e.preventDefault();
    setError("");

    if (!name || !password) {
      setError("Username and password required");
      return;
    }

    const endpoint = isRegistering ? "/api/register" : "/api/login";
    const url = `${apiBase}${endpoint}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
      });

      const data = (await parseJsonResponse(res)) || {};

      if (!res.ok) {
        setError(data.error || res.statusText || "Authentication failed");
        return;
      }

      // Success
      onLogin(name);
      setName("");
      setPassword("");
    } catch (err) {
      setError("Network error: " + err.message);
    }
  }

  if (username) {
    return (
      <div className="landing">
        <div className="landing-content">
          <h1>Desolate Dawn</h1>
          <p style={{ fontSize: "1.1em", marginBottom: "2em" }}>
            Welcome, <strong>{username}!</strong>
          </p>

          <div className="auth-actions">
            <button className="btn btn-primary" onClick={onRequestStart}>
              ▶ Start Screen
            </button>
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </div>

          <h2>🏆 Leaderboard</h2>
          <div className="leaderboard">
            {leaderboard.length === 0 ? (
              <p style={{ color: "#aaa" }}>No scores yet. Be the first!</p>
            ) : (
              <ol>
                {leaderboard.slice(0, 10).map((player, idx) => (
                  <li key={idx}>
                    <span className="player-name">{player.username}</span>
                    <span className="player-stats">
                      Wave: {player.bestWave} | Kills: {player.kills}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {personalBest && (
            <div className="personal-best">
              <h3>Your personal best</h3>
              <p>
                Wave: {personalBest.bestWave} | Kills: {personalBest.kills}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing-content">
        <h1>Desolate Dawn</h1>
        <p style={{ fontSize: "0.95em", opacity: 0.8, marginBottom: "2em" }}>
          Fight endless hordes in the dark. Survive the night.
        </p>

        <div className="auth-form">
          <form onSubmit={handleAuth}>
            <h2>{isRegistering ? "Create Account" : "Login"}</h2>

            {error && <div className="error-message">{error}</div>}

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Username"
              required
              className="form-input"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="form-input"
            />

            <button type="submit" className="btn btn-primary">
              {isRegistering ? "Register" : "Login"}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                  setPassword("");
                }}
              >
                {isRegistering ? "Login here" : "Register here"}
              </button>
            </p>
          </div>
        </div>

        <h2>🏆 Leaderboard</h2>
        <div className="leaderboard">
          {leaderboard.length === 0 ? (
            <p style={{ color: "#aaa" }}>No scores yet. Be the first!</p>
          ) : (
            <ol>
              {leaderboard.slice(0, 10).map((player, idx) => (
                <li key={idx}>
                  <span className="player-name">{player.username}</span>
                  <span className="player-stats">
                    Wave: {player.bestWave} | Kills: {player.kills}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}