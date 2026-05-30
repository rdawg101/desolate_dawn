import { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import StartScreen from './pages/StartScreen';
import Game from './pages/Game';
import './style.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      setCurrentPage('landing');
    }
  }, []);

  const handleLogin = (user) => {
    localStorage.setItem('username', user);
    setUsername(user);
    setCurrentPage('start');
  };

  const handleRequestStart = () => {
    if (username) {
      setCurrentPage('start');
    }
  };

  const handleStartGame = () => {
    if (username) {
      setCurrentPage('game');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername(null);
    setCurrentPage('landing');
  };

  const handleBackToMenu = () => {
    setCurrentPage('landing');
  };

  return (
    <div id="app">
      {currentPage === 'landing' && (
        <Landing
          onLogin={handleLogin}
          onRequestStart={handleRequestStart}
          onLogout={handleLogout}
          username={username}
        />
      )}
      {currentPage === 'start' && (
        <StartScreen
          username={username}
          onStartGame={handleStartGame}
          onBackToMenu={handleBackToMenu}
        />
      )}
      {currentPage === 'game' && <Game onBackToMenu={handleBackToMenu} />}
    </div>
  );
}
