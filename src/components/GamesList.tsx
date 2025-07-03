import React, { useState, useEffect } from 'react';
import type { ChessGame, AuthState } from '../types/chess';
import { LichessApi } from '../services/lichessApi';
import { GameStorage } from '../services/gameStorage';

interface GamesListProps {
  authState: AuthState;
  onGameSelect: (game: ChessGame) => void;
  selectedGameId?: string;
  refreshTrigger?: number;
}

export const GamesList: React.FC<GamesListProps> = ({ 
  authState, 
  onGameSelect, 
  selectedGameId,
  refreshTrigger 
}) => {
  const [games, setGames] = useState<ChessGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const lichessApi = new LichessApi(authState.accessToken || undefined);
  const gameStorage = new GameStorage();

  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      loadGames();
    }
  }, [authState, refreshTrigger]);

  const loadGames = async () => {
    if (!authState.user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First try to load from local storage
      const storedGames = await gameStorage.getUserGames(authState.user.username);
      
      if (storedGames.length > 0) {
        setGames(storedGames);
      }
    } catch (error) {
      console.error('Error loading stored games:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadGames = async () => {
    if (!authState.user || !authState.accessToken) return;
    
    setLoading(true);
    setDownloadProgress('Downloading games from Lichess...');
    setError(null);
    
    try {
      const downloadedGames = await lichessApi.getUserGames(authState.user.username, 200);
      
      setDownloadProgress('Saving games locally...');
      await gameStorage.saveGames(authState.user.username, downloadedGames);
      
      setGames(downloadedGames);
      setDownloadProgress(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download games from Lichess';
      setError(errorMessage);
      console.error('Download error:', error);
      setDownloadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsFile = async () => {
    if (!authState.user) return;
    
    try {
      await gameStorage.downloadGamesAsFile(authState.user.username);
    } catch (error) {
      setError('Failed to download games as file');
      console.error('File download error:', error);
    }
  };

  const formatTimeControl = (timeControl?: string) => {
    if (!timeControl) return '';
    return timeControl.includes('days') ? 'Correspondence' : timeControl;
  };

  const getResultColor = (result: string) => {
    if (result === '1-0') return 'white-win';
    if (result === '0-1') return 'black-win';
    if (result === '1/2-1/2') return 'draw';
    return 'unknown';
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="games-list">
        <p>Please connect to Lichess to view your games.</p>
      </div>
    );
  }

  const isOpen = isPinned || isHovered;

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      className={`jira-sidebar ${isOpen ? 'open' : 'closed'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-toggle-button" onClick={handleTogglePin}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          {isOpen ? (
            // Flèche vers la gauche (pour fermer)
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
          ) : (
            // Flèche vers la droite (pour ouvrir)
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          )}
        </svg>
        {isPinned && <div className="pin-indicator"></div>}
      </div>

      {isOpen && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Your Games</h3>
            <span className="games-count">({games.length})</span>
          </div>
          
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
          
          {games.length === 0 && !loading && !error && (
            <div className="no-games">
              <p>No games found. Use the Lichess menu to download your games.</p>
            </div>
          )}
          
          {games.length > 0 && (
            <div className="games-list-container">
              {games.map((game) => (
                <div 
                  key={game.id}
                  className={`game-item ${selectedGameId === game.id ? 'selected' : ''}`}
                  onClick={() => onGameSelect(game)}
                >
                  <div className="game-players">
                    <span className="white-player">{game.white}</span>
                    <span className="vs">vs</span>
                    <span className="black-player">{game.black}</span>
                  </div>
                  
                  <div className="game-result">
                    <span className={`result ${getResultColor(game.result)}`}>
                      {game.result}
                    </span>
                  </div>
                  
                  <div className="game-meta">
                    <span className="date">{game.date}</span>
                    {game.eco && <span className="eco">{game.eco}</span>}
                    <span className="time-control">{formatTimeControl(game.timeControl)}</span>
                  </div>
                  
                  {game.event && (
                    <div className="game-event">
                      {game.event}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};