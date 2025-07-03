import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { ChessGame } from '../types/chess';

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

  const goToMove = useCallback((moveIndex: number, variationIndex?: number) => {
    if (moveIndex < 0) return;
    
    const newGame = new Chess();
    try {
      let moves: string[] = [];
      let maxMoveIndex = 0;
      
      if (game) {
        // Game is loaded, use PGN
        newGame.loadPgn(game.pgn);
        moves = newGame.history();
        maxMoveIndex = moves.length;
      } else {
        // No game loaded, use manual move history
        moves = moveHistory;
        maxMoveIndex = moveHistory.length;
      }
      
      // Check if we're navigating to a variation
      if (variationIndex !== undefined && variationIndex < variations.length) {
        const variation = variations[variationIndex];
        const variationMoves = variation.moves;
        const variationMoveIndex = moveIndex - variation.moveIndex;
        
        if (variationMoveIndex >= 0 && variationMoveIndex <= variationMoves.length) {
          // Navigate within the variation
          const gameAtMove = new Chess();
          
          // Play moves up to the variation starting point
          for (let i = 0; i < variation.moveIndex; i++) {
            if (i < moves.length) {
              gameAtMove.move(moves[i]);
            }
          }
          
          // Play variation moves
          for (let i = 0; i < variationMoveIndex; i++) {
            if (i < variationMoves.length) {
              gameAtMove.move(variationMoves[i]);
            }
          }
          
          setGamePosition(gameAtMove.fen());
          setChessGame(gameAtMove);
          setCurrentMoveIndex(moveIndex);
          setIsInVariation(true);
          setCurrentVariationIndex(variationIndex);
          
          if (onMoveIndexChange) {
            onMoveIndexChange(moveIndex);
          }
          return;
        }
      }
      
      // Standard navigation in main line
      if (moveIndex > maxMoveIndex) return;
      
      const gameAtMove = new Chess();
      for (let i = 0; i < moveIndex; i++) {
        if (i < moves.length) {
          gameAtMove.move(moves[i]);
        }
      }
      
      setGamePosition(gameAtMove.fen());
      setChessGame(gameAtMove);
      setCurrentMoveIndex(moveIndex);
      
      // Reset variation state when returning to main line
      setIsInVariation(false);
      setCurrentVariationIndex(null);
      
      // Notify parent component of move index change
      if (onMoveIndexChange) {
        onMoveIndexChange(moveIndex);
      }
    } catch (error) {
      console.error('Error navigating to move:', error);
    }
  }, [game, moveHistory, variations, onMoveIndexChange]);

  const goToStart = useCallback(() => goToMove(0), [goToMove]);
  const goToEnd = useCallback(() => {
    if (isInVariation && currentVariationIndex !== null) {
      const variation = variations[currentVariationIndex];
      goToMove(variation.moveIndex + variation.moves.length, currentVariationIndex);
    } else {
      goToMove(moveHistory.length);
    }
  }, [goToMove, moveHistory.length, isInVariation, currentVariationIndex, variations]);
  
  const goToPrevious = useCallback(() => goToMove(currentMoveIndex - 1), [goToMove, currentMoveIndex]);
  const goToNext = useCallback(() => {
    if (isInVariation && currentVariationIndex !== null) {
      const variation = variations[currentVariationIndex];
      const maxVariationMove = variation.moveIndex + variation.moves.length;
      if (currentMoveIndex < maxVariationMove) {
        goToMove(currentMoveIndex + 1, currentVariationIndex);
      }
    } else {
      goToMove(currentMoveIndex + 1);
    }
  }, [goToMove, currentMoveIndex, isInVariation, currentVariationIndex, variations]);
  
  const goToMainLine = useCallback(() => {
    if (isInVariation) {
      goToMove(currentMoveIndex);
    }
  }, [goToMove, currentMoveIndex, isInVariation]);
  
  const goToVariation = useCallback((variationIndex: number) => {
    if (variationIndex < variations.length) {
      const variation = variations[variationIndex];
      goToMove(variation.moveIndex, variationIndex);
    }
  }, [goToMove, variations]);

  // Sync with external move index
  React.useEffect(() => {
    if (externalMoveIndex !== undefined && externalMoveIndex !== currentMoveIndex) {
      goToMove(externalMoveIndex);
    }
  }, [externalMoveIndex, currentMoveIndex, goToMove]);
  
  const rotateBoard = useCallback(() => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  // Function to reset board to starting position
  const resetBoard = useCallback(() => {
    const startingGame = new Chess();
    setChessGame(startingGame);
    setGamePosition(startingGame.fen());
    setCurrentMoveIndex(0);
    setMoveHistory([]);
    setVariations([]);
    setIsInVariation(false);
    setCurrentVariationIndex(null);
    
    // Notify parent component
    if (onMoveIndexChange) {
      onMoveIndexChange(0);
    }
    if (onMoveHistoryChange) {
      onMoveHistoryChange([]);
    }
    if (onVariationsChange) {
      onVariationsChange([]);
    }
  }, [onMoveIndexChange, onMoveHistoryChange, onVariationsChange]);

  // Global keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        case 'Escape':
          event.preventDefault();
          resetBoard();
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          goToMainLine();
          break;
        case '1':
          event.preventDefault();
          goToVariation(0);
          break;
        case '2':
          event.preventDefault();
          goToVariation(1);
          break;
        case '3':
          event.preventDefault();
          goToVariation(2);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPrevious, goToNext, goToStart, goToEnd, rotateBoard, resetBoard, goToMainLine, goToVariation]);

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
        } else if (!game && !isInVariation) {
          // No game loaded - check if this move differs from the main line
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
            const newHistory = [...moveHistory, moveNotation];
            setMoveHistory(newHistory);
            if (onMoveHistoryChange) {
              onMoveHistoryChange(newHistory);
            }
          } else {
            // Following the main line
            const newHistory = [...moveHistory.slice(0, currentMoveIndex), moveNotation];
            setMoveHistory(newHistory);
            if (onMoveHistoryChange) {
              onMoveHistoryChange(newHistory);
            }
          }
        } else if (!game && isInVariation && currentVariationIndex !== null) {
          // Continue in current variation for manual moves
          setVariations(prev => {
            const updated = [...prev];
            updated[currentVariationIndex].moves.push(moveNotation);
            if (onVariationsChange) {
              onVariationsChange(updated);
            }
            return updated;
          });
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
              Global Shortcuts: ← Previous | → Next | ↓ Start | ↑ End | R Rotate | Esc Reset | M Main Line | 1-3 Variations
            </small>
          </div>
        </div>
      )}
      
      {!game && (
        <div className="no-game-controls">
          <div className="move-controls">
            <button onClick={goToStart} disabled={currentMoveIndex === 0}>
              ⏮️ Start
            </button>
            <button onClick={goToPrevious} disabled={currentMoveIndex === 0}>
              ⏪ Previous
            </button>
            <button onClick={goToNext} disabled={
              isInVariation && currentVariationIndex !== null
                ? currentMoveIndex >= (variations[currentVariationIndex].moveIndex + variations[currentVariationIndex].moves.length)
                : currentMoveIndex >= moveHistory.length
            }>
              ⏩ Next
            </button>
            <button onClick={goToEnd} disabled={
              isInVariation && currentVariationIndex !== null
                ? currentMoveIndex >= (variations[currentVariationIndex].moveIndex + variations[currentVariationIndex].moves.length)
                : currentMoveIndex >= moveHistory.length
            }>
              ⏭️ End
            </button>
            <button onClick={rotateBoard} className="rotate-btn">
              🔄 Rotate
            </button>
            <button onClick={resetBoard} className="reset-btn">
              🔄 Reset
            </button>
          </div>
          
          <div className="move-counter">
            Move {currentMoveIndex} of {isInVariation && currentVariationIndex !== null 
              ? variations[currentVariationIndex].moveIndex + variations[currentVariationIndex].moves.length
              : moveHistory.length}
            {isInVariation && <span className="variation-indicator"> (Variation {(currentVariationIndex || 0) + 1})</span>}
          </div>
          
          {variations.length > 0 && (
            <div className="variations-controls">
              <button onClick={goToMainLine} disabled={!isInVariation}>
                📖 Main Line
              </button>
              {variations.map((variation, index) => (
                <button 
                  key={index}
                  onClick={() => goToVariation(index)}
                  className={currentVariationIndex === index ? 'active' : ''}
                >
                  🔀 Variation {index + 1} ({variation.moves.length} moves)
                </button>
              ))}
            </div>
          )}
          
          <div className="keyboard-help">
            <small>
              Global Shortcuts: ← Previous | → Next | ↓ Start | ↑ End | R Rotate | Esc Reset | M Main Line | 1-3 Variations
            </small>
          </div>
        </div>
      )}
    </div>
  );
};