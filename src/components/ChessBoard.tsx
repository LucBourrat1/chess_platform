import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { ChessGame } from '../types/chess';

interface ChessBoardProps {
  game?: ChessGame;
  onGameChange?: (game: ChessGame) => void;
  currentMoveIndex?: number;
  onMoveIndexChange?: (moveIndex: number) => void;
  onVariationsChange?: (variations: {moveIndex: number, moves: string[]}[]) => void;
  onMoveHistoryChange?: (moveHistory: string[]) => void;
}

export const ChessBoardComponent: React.FC<ChessBoardProps> = ({ 
  game, 
  onGameChange, 
  currentMoveIndex: externalMoveIndex, 
  onMoveIndexChange,
  onVariationsChange,
  onMoveHistoryChange
}) => {
  const [chessGame, setChessGame] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState(chessGame.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardSize, setBoardSize] = useState<number>(500);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [startSize, setStartSize] = useState<number>(500);
  const [variations, setVariations] = useState<{moveIndex: number, moves: string[]}[]>([]);
  const [isInVariation, setIsInVariation] = useState(false);
  const [currentVariationIndex, setCurrentVariationIndex] = useState<number | null>(null);

  // Function to detect user's color and set board orientation
  const detectUserColor = useCallback((game: ChessGame): 'white' | 'black' => {
    // Get current user from localStorage
    const savedUser = localStorage.getItem('lichess_user');
    if (!savedUser) return 'white';
    
    try {
      const user = JSON.parse(savedUser);
      const username = user.username?.toLowerCase();
      
      // Check if user played as white or black
      if (game.white.toLowerCase() === username) {
        return 'white';
      } else if (game.black.toLowerCase() === username) {
        return 'black';
      }
      
      // Default to white if user didn't play in this game
      return 'white';
    } catch (error) {
      console.error('Error detecting user color:', error);
      return 'white';
    }
  }, []);

  React.useEffect(() => {
    if (game) {
      const newGame = new Chess();
      try {
        newGame.loadPgn(game.pgn);
        const history = newGame.history();
        setMoveHistory(history);
        
        // Always start at the beginning position
        const startingGame = new Chess();
        setCurrentMoveIndex(0);
        setGamePosition(startingGame.fen());
        setChessGame(startingGame);
        
        // Reset variations when loading new game
        setVariations([]);
        setIsInVariation(false);
        setCurrentVariationIndex(null);
        
        // Set board orientation based on user's color
        const userColor = detectUserColor(game);
        setBoardOrientation(userColor);
      } catch (error) {
        console.error('Error loading PGN:', error);
      }
    }
  }, [game, detectUserColor]);

  const goToMove = useCallback((moveIndex: number) => {
    if (!game || moveIndex < 0 || moveIndex > moveHistory.length) return;
    
    const newGame = new Chess();
    try {
      newGame.loadPgn(game.pgn);
      const moves = newGame.history();
      
      const gameAtMove = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        gameAtMove.move(moves[i]);
      }
      
      setGamePosition(gameAtMove.fen());
      setChessGame(gameAtMove);
      setCurrentMoveIndex(moveIndex);
      
      // Notify parent component of move index change
      if (onMoveIndexChange) {
        onMoveIndexChange(moveIndex);
      }
    } catch (error) {
      console.error('Error navigating to move:', error);
    }
  }, [game, moveHistory, onMoveIndexChange]);

  const goToStart = useCallback(() => goToMove(0), [goToMove]);
  const goToEnd = useCallback(() => goToMove(moveHistory.length), [goToMove, moveHistory.length]);
  const goToPrevious = useCallback(() => goToMove(currentMoveIndex - 1), [goToMove, currentMoveIndex]);
  const goToNext = useCallback(() => goToMove(currentMoveIndex + 1), [goToMove, currentMoveIndex]);

  // Sync with external move index
  React.useEffect(() => {
    if (externalMoveIndex !== undefined && externalMoveIndex !== currentMoveIndex) {
      goToMove(externalMoveIndex);
    }
  }, [externalMoveIndex, currentMoveIndex, goToMove]);
  
  const rotateBoard = useCallback(() => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  // Global keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only work when a game is loaded
      if (!game) return;
      
      // Don't interfere with typing in input fields, textareas, or content-editable elements
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case 'ArrowDown':
          event.preventDefault();
          goToStart();
          break;
        case 'ArrowUp':
          event.preventDefault();
          goToEnd();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          rotateBoard();
          break;
        case 'Home':
          event.preventDefault();
          goToStart();
          break;
        case 'End':
          event.preventDefault();
          goToEnd();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [game, goToPrevious, goToNext, goToStart, goToEnd, rotateBoard]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    const gameCopy = new Chess(chessGame.fen());
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      
      if (move) {
        const moveNotation = move.san;
        
        if (game && !isInVariation) {
          // Check if this move differs from the main line
          if (currentMoveIndex < moveHistory.length && moveHistory[currentMoveIndex] !== moveNotation) {
            // Create a new variation
            const newVariation = {
              moveIndex: currentMoveIndex,
              moves: [moveNotation]
            };
            setVariations(prev => {
              const updated = [...prev, newVariation];
              if (onVariationsChange) {
                onVariationsChange(updated);
              }
              return updated;
            });
            setIsInVariation(true);
            setCurrentVariationIndex(variations.length);
          } else if (currentMoveIndex >= moveHistory.length) {
            // Extending beyond the main line
            const newVariation = {
              moveIndex: currentMoveIndex,
              moves: [moveNotation]
            };
            setVariations(prev => {
              const updated = [...prev, newVariation];
              if (onVariationsChange) {
                onVariationsChange(updated);
              }
              return updated;
            });
            setIsInVariation(true);
            setCurrentVariationIndex(variations.length);
          }
        } else if (isInVariation && currentVariationIndex !== null) {
          // Continue in current variation
          setVariations(prev => {
            const updated = [...prev];
            updated[currentVariationIndex].moves.push(moveNotation);
            if (onVariationsChange) {
              onVariationsChange(updated);
            }
            return updated;
          });
        } else if (!game) {
          // No game loaded, just add to move history
          const newHistory = [...moveHistory.slice(0, currentMoveIndex), moveNotation];
          setMoveHistory(newHistory);
          if (onMoveHistoryChange) {
            onMoveHistoryChange(newHistory);
          }
        }
        
        setGamePosition(gameCopy.fen());
        setChessGame(gameCopy);
        const newMoveIndex = currentMoveIndex + 1;
        setCurrentMoveIndex(newMoveIndex);
        
        // Notify parent component of move index change
        if (onMoveIndexChange) {
          onMoveIndexChange(newMoveIndex);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  }, [chessGame, game, isInVariation, currentMoveIndex, moveHistory, variations, currentVariationIndex, onMoveIndexChange, onVariationsChange, onMoveHistoryChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize(boardSize);
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    const delta = (deltaX + deltaY) / 2;
    
    const newSize = Math.max(300, Math.min(800, startSize + delta));
    setBoardSize(newSize);
  }, [isResizing, startPos.x, startPos.y, startSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'nw-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'auto';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div className="chess-board-container">
      <div className="chessboard-wrapper">
        <Chessboard
          position={gamePosition}
          onPieceDrop={onDrop}
          boardWidth={boardSize}
          boardOrientation={boardOrientation}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          customLightSquareStyle={{ backgroundColor: '#97B2C7' }}
          customDarkSquareStyle={{ backgroundColor: '#546F82' }}
        />
        <div 
          className="resize-handle"
          onMouseDown={handleResizeStart}
        >
          <div className="resize-lines"></div>
        </div>
      </div>
      
      {game && (
        <div className="game-controls">
          <div className="game-info">
            <h3>{game.white} vs {game.black}</h3>
            <p>Result: {game.result}</p>
            <p>Date: {game.date}</p>
            {game.eco && <p>ECO: {game.eco}</p>}
          </div>
          
          <div className="move-controls">
            <button onClick={goToStart} disabled={currentMoveIndex === 0}>
              ⏮️ Start
            </button>
            <button onClick={goToPrevious} disabled={currentMoveIndex === 0}>
              ⏪ Previous
            </button>
            <button onClick={goToNext} disabled={currentMoveIndex === moveHistory.length}>
              ⏩ Next
            </button>
            <button onClick={goToEnd} disabled={currentMoveIndex === moveHistory.length}>
              ⏭️ End
            </button>
            <button onClick={rotateBoard} className="rotate-btn">
              🔄 Rotate
            </button>
          </div>
          
          <div className="move-counter">
            Move {currentMoveIndex} of {moveHistory.length}
          </div>
          
          <div className="keyboard-help">
            <small>
              Global Shortcuts: ← Previous | → Next | ↓ Start | ↑ End | R Rotate
            </small>
          </div>
        </div>
      )}
    </div>
  );
};