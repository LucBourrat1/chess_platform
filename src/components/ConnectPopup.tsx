import React, { useState } from 'react';
import type { AuthState } from '../types/chess';

interface ConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (username: string) => void;
  authState: AuthState;
  isValidating: boolean;
  error: string | null;
  onLogout: () => void;
}

export const ConnectPopup: React.FC<ConnectPopupProps> = ({
  isOpen,
  onClose,
  onConnect,
  authState,
  isValidating,
  error,
  onLogout
}) => {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onConnect(username.trim());
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup-content">
        <div className="popup-header">
          <h3>
            {authState.isAuthenticated ? 'Lichess Account' : 'Connect to Lichess'}
          </h3>
          <button className="popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="popup-body">
          {authState.isAuthenticated && authState.user ? (
            <div className="user-info">
              <p><strong>Connected as:</strong> {authState.user.username}</p>
              <p><strong>Status:</strong> {authState.user.online ? 'Online' : 'Offline'}</p>
              <button onClick={onLogout} className="logout-btn">
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="connect-form">
              <div className="form-group">
                <label htmlFor="username">Lichess Username:</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your Lichess username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isValidating}
                  autoFocus
                />
              </div>
              
              <button 
                type="submit"
                disabled={isValidating || !username.trim()}
                className="connect-btn"
              >
                {isValidating ? 'Validating...' : 'Connect Account'}
              </button>
            </form>
          )}
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};