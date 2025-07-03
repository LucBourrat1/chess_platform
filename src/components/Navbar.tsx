import React, { useState } from 'react';
import type { AuthState } from '../types/chess';
import { GameStorage } from '../services/gameStorage';

interface NavbarProps {
  authState: AuthState;
  onConnectClick: () => void;
  onDisconnect: () => void;
  onImportClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ authState, onConnectClick, onDisconnect, onImportClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const gameStorage = new GameStorage();

  const handleExportGames = async () => {
    if (!authState.user) return;
    
    try {
      await gameStorage.downloadGamesAsFile(authState.user.username);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export games');
    }
    setIsMenuOpen(false);
  };

  const handleConnectClick = () => {
    onConnectClick();
    setIsMenuOpen(false);
  };

  const handleDisconnectClick = () => {
    onDisconnect();
    setIsMenuOpen(false);
  };

  const handleImportClick = () => {
    onImportClick();
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src="/logo.jpg" alt="AI Chess Learning" className="navbar-logo" />
        <h1 className="navbar-title">AI Chess Learning</h1>
        
        <div 
          className="navbar-menu"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <button className="navbar-menu-button">
            Lichess
            <span className="menu-arrow">▼</span>
          </button>
          
          {isMenuOpen && (
            <div className="navbar-dropdown">
              {!authState.isAuthenticated ? (
                <button 
                  className="navbar-dropdown-item"
                  onClick={handleConnectClick}
                >
                  Connect
                </button>
              ) : (
                <>
                  <button 
                    className="navbar-dropdown-item"
                    onClick={handleImportClick}
                  >
                    Import Games
                  </button>
                  <button 
                    className="navbar-dropdown-item"
                    onClick={handleExportGames}
                  >
                    Export Games
                  </button>
                  <button 
                    className="navbar-dropdown-item"
                    onClick={handleDisconnectClick}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};