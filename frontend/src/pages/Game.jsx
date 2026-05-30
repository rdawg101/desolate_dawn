import { useEffect, useRef } from "react";
import "../styles/Game.css";

export default function Game({ onBackToMenu }) {
  const containerRef = useRef(null);
  const unityContainerRef = useRef(null);

  useEffect(() => {
    // This function loads the Unity WebGL build
    // Replace 'Build' with the path to your Unity WebGL export folder
    const loadUnityGame = async () => {
      console.log("Game loaded. Awaiting Unity WebGL build...");
      /*
      const script = document.createElement("script");
      script.src = "/Build/index.js"; // Unity loader
      script.async = true;
      document.body.appendChild(script);
      */
    };

    document.body.classList.add('game-active');
    loadUnityGame();

    const handleResize = () => {
      if (unityContainerRef.current) {
        unityContainerRef.current.style.width = `${window.innerWidth}px`;
        unityContainerRef.current.style.height = `${window.innerHeight}px`;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.body.classList.remove('game-active');
    };
  }, []);

  const apiBase = import.meta.env.DEV ? "http://localhost:4000" : "";

  const handleGameOver = async (wave, kills) => {
    // Called by Unity via SendMessage or fetch
    const username = localStorage.getItem("username");
    if (!username) {
      console.error("Username not found in localStorage");
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, wave, kills })
      });

      if (res.ok) {
        console.log("Score submitted successfully");
        // Optionally navigate back to Landing or show game-over screen
        window.location.href = "/";
      } else {
        console.error("Failed to submit score");
      }
    } catch (err) {
      console.error("Error submitting score:", err);
    }
  };

  // Expose handleGameOver to window so Unity can call it
  if (typeof window !== "undefined") {
    window.handleGameOver = handleGameOver;
  }

  return (
    <div ref={containerRef} className="game-container">
      <button className="game-exit-button" onClick={onBackToMenu}>
        ← Back to Menu
      </button>

      {/* Unity WebGL Build Container */}
      <div
        ref={unityContainerRef}
        id="unity-container"
        className="unity-container"
      >
        {/* 
          Unity will render here. 
          The Build folder structure should be:
          public/Build/
            ├── index.html
            ├── index.js (loader)
            ├── index.data
            ├── index.wasm
            └── TemplateData/
        */}
      </div>

      {/* Placeholder while build loads (optional) */}
      <div className="game-placeholder">
        <p>Loading Desolate Dawn...</p>
        <p className="placeholder-subtitle">
          Replace this placeholder with your Unity WebGL build.
        </p>
      </div>
    </div>
  );
}
