import React, { useState, useEffect } from 'react';
import type { AuthState } from '../types/chess';
import { LichessApi } from '../services/lichessApi';
import { GameStorage } from '../services/gameStorage';

interface ImportGamesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  authState: AuthState;
  onGamesImported: () => void;
}

export const ImportGamesPopup: React.FC<ImportGamesPopupProps> = ({
  isOpen,
  onClose,
  authState,
  onGamesImported
}) => {
  const [totalGames, setTotalGames] = useState<number | null>(null);
  const [gamesToDownload, setGamesToDownload] = useState<number>(200);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  const lichessApi = new LichessApi(authState.accessToken || undefined);
  const gameStorage = new GameStorage();

  useEffect(() => {
    if (isOpen && authState.user && authState.accessToken) {
      fetchTotalGames();
    }
  }, [isOpen, authState]);

  const fetchTotalGames = async () => {
    if (!authState.user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user profile which includes total game count
      const user = await lichessApi.getCurrentUser();
      setTotalGames(user.count?.all || 0);
    } catch (error) {
      console.error('Error fetching total games:', error);
      setError('Failed to fetch game count');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!authState.user || !authState.accessToken) return;
    
    setIsDownloading(true);
    setDownloadProgress('Downloading games from Lichess...');
    setError(null);
    
    try {
      const downloadedGames = await lichessApi.getUserGames(authState.user.username, gamesToDownload);
      
      setDownloadProgress('Saving games locally...');
      await gameStorage.saveGames(authState.user.username, downloadedGames);
      
      setDownloadProgress(null);
      onGamesImported();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download games from Lichess';
      setError(errorMessage);
      console.error('Download error:', error);
      setDownloadProgress(null);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup-content import-popup">
        <div className="popup-header">
          <h3>Import Games from Lichess</h3>
          <button className="popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="popup-body">
          {isLoading ? (
            <div className="loading-info">
              <p>Fetching account information...</p>
            </div>
          ) : (
            <div className="import-info">
              <div className="account-info">
                <p><strong>Account:</strong> {authState.user?.username}</p>
                <p><strong>Total games:</strong> {totalGames !== null ? totalGames.toLocaleString() : 'Unknown'}</p>
              </div>
              
              <div className="download-options">
                <div className="form-group">
                  <label htmlFor="games-count">Number of games to download:</label>
                  <div className="input-with-buttons">
                    <input
                      id="games-count"
                      type="number"
                      min="1"
                      max={totalGames || 1000}
                      value={gamesToDownload}
                      onChange={(e) => setGamesToDownload(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isDownloading}
                    />
                    <div className="quick-buttons">
                      <button 
                        type="button"
                        onClick={() => setGamesToDownload(100)}
                        disabled={isDownloading}
                        className="quick-btn"
                      >
                        100
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGamesToDownload(500)}
                        disabled={isDownloading}
                        className="quick-btn"
                      >
                        500
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGamesToDownload(1000)}
                        disabled={isDownloading}
                        className="quick-btn"
                      >
                        1000
                      </button>
                      {totalGames && (
                        <button 
                          type="button"
                          onClick={() => setGamesToDownload(totalGames)}
                          disabled={isDownloading}
                          className="quick-btn"
                        >
                          All
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleDownload}
                  disabled={isDownloading || gamesToDownload < 1}
                  className="download-btn-popup"
                >
                  {isDownloading ? 'Downloading...' : `Download ${gamesToDownload} Games`}
                </button>
              </div>
            </div>
          )}
          
          {downloadProgress && (
            <div className="download-progress">
              {downloadProgress}
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};