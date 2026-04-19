import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import '../styles/HomePage.css';
import '../styles/themes.css';

export function HomePage() {
  const navigate = useNavigate();
  const [showButton, setShowButton] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRecord = () => {
    setTimeout(() => {
      navigate('/input');
    }, 300);
  };

  const handleHistory = () => {
    setTimeout(() => {
      navigate('/history');
    }, 300);
  };

  return (
    <div className="home-page">
      <div className="fog-overlay"></div>
      <div className="fog-overlay fog-layer-2"></div>

      {/* Theme Toggle Button */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="home-content">
        <p className="prompt-text">
          Do you remember the dream from last night?
        </p>

        <div className={`button-container ${showButton ? 'visible' : ''}`}>
          <button className="record-button" onClick={handleRecord}>
            <span className="moon-icon">🌙</span>
            <span>Record last night</span>
          </button>

          <button className="history-link" onClick={handleHistory}>
            <span className="calendar-icon">📅</span>
            <span>See past dreams</span>
          </button>
        </div>
      </div>
    </div>
  );
}
