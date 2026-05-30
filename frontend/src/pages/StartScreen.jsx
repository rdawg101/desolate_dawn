import "../styles/StartScreen.css";

export default function StartScreen({ username, onStartGame, onBackToMenu }) {
  return (
    <div className="start-screen">
      <div className="start-card">
        <div className="start-header">
          <h1>Desolate Dawn</h1>
          <p className="subtitle">Prepare for the darkness. Your light is your only defense.</p>
        </div>

        <div className="player-panel">
          <span className="label">Logged in as</span>
          <span className="player-name">{username}</span>
        </div>

        <div className="start-copy">
          <p>Press start to load the Unity game. The game screen will fill the browser and scale with your window size.</p>
          <p>Use the game start screen only for launch controls; the in-game UI and game over flow are handled by your Unity build.</p>
        </div>

        <div className="start-actions">
          <button className="btn btn-primary" onClick={onStartGame}>
            ▶ Start Game
          </button>
          <button className="btn btn-secondary" onClick={onBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
