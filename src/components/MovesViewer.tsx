import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { ChessGame } from '../types/chess';

interface MovesViewerProps {
  game?: ChessGame;
  currentMoveIndex: number;
  onMoveClick: (moveIndex: number) => void;
  variations?: {moveIndex: number, moves: string[]}[];
  moveHistory?: string[];
}

export const MovesViewer: React.FC<MovesViewerProps> = ({ 
  game, 
  currentMoveIndex, 
  onMoveClick, 
  variations = [], 
  moveHistory: externalMoveHistory 
}) => {
  const [moves, setMoves] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (game) {
      const chess = new Chess();
      try {
        chess.loadPgn(game.pgn);
        const gameHistory = chess.history();
        setMoves(gameHistory);
      } catch (error) {
        console.error('Error loading PGN for moves:', error);
        setMoves([]);
      }
    } else if (externalMoveHistory) {
      setMoves(externalMoveHistory);
    } else {
      setMoves([]);
    }
  }, [game, externalMoveHistory]);

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

  const handleMoveClick = (moveIndex: number) => {
    onMoveClick(moveIndex);
  };

  // Group moves by pairs (white and black)
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
      whiteIndex: i,
      blackIndex: i + 1
    });
  }

  return (
    <div 
      className={`moves-sidebar ${isOpen ? 'open' : 'closed'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-toggle-button" onClick={handleTogglePin}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          {isOpen ? (
            // Flèche vers la droite (pour fermer)
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          ) : (
            // Flèche vers la gauche (pour ouvrir)
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
          )}
        </svg>
        {isPinned && <div className="pin-indicator"></div>}
      </div>

      {isOpen && (
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Moves</h3>
            <span className="games-count">({moves.length})</span>
          </div>
          
          {moves.length === 0 ? (
            <div className="no-moves">
              <p>No moves to display. Select a game to see moves.</p>
            </div>
          ) : (
            <div className="moves-list-container">
              <div className="moves-list">
                {movePairs.map((pair) => (
                  <div key={pair.moveNumber}>
                    <div className="move-pair">
                      <span className="move-number">{pair.moveNumber}.</span>
                      <span 
                        className={`move white-move ${currentMoveIndex === pair.whiteIndex ? 'current' : ''}`}
                        onClick={() => handleMoveClick(pair.whiteIndex)}
                      >
                        {pair.white}
                      </span>
                      {pair.black && (
                        <span 
                          className={`move black-move ${currentMoveIndex === pair.blackIndex ? 'current' : ''}`}
                          onClick={() => handleMoveClick(pair.blackIndex)}
                        >
                          {pair.black}
                        </span>
                      )}
                    </div>
                    
                    {/* Display variations for this move */}
                    {variations.filter(v => v.moveIndex === pair.whiteIndex || v.moveIndex === pair.blackIndex).map((variation, varIndex) => (
                      <div key={`var-${varIndex}`} className="variation">
                        <span className="variation-label">({variation.moves.join(' ')})</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};