import { useState } from 'react'
import { Navbar } from './components/Navbar'
import { ConnectPopup } from './components/ConnectPopup'
import { ImportGamesPopup } from './components/ImportGamesPopup'
import { GamesList } from './components/GamesList'
import { MovesViewer } from './components/MovesViewer'
import { ChessBoardComponent } from './components/ChessBoard'
import { useLichessAuth } from './hooks/useLichessAuth'
import type { ChessGame } from './types/chess'
import './App.css'

function App() {
  const [selectedGame, setSelectedGame] = useState<ChessGame | null>(null);
  const [isConnectPopupOpen, setIsConnectPopupOpen] = useState(false);
  const [isImportPopupOpen, setIsImportPopupOpen] = useState(false);
  const [refreshGames, setRefreshGames] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [variations, setVariations] = useState<{moveIndex: number, moves: string[]}[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const { authState, isValidating, error, validateAndConnect, logout } = useLichessAuth();

  const handleGameSelect = (game: ChessGame) => {
    setSelectedGame(game);
    setCurrentMoveIndex(0);
    setVariations([]);
    setMoveHistory([]);
  };

  const handleMoveIndexChange = (moveIndex: number) => {
    setCurrentMoveIndex(moveIndex);
  };

  const handleVariationsChange = (newVariations: {moveIndex: number, moves: string[]}[]) => {
    setVariations(newVariations);
  };

  const handleMoveHistoryChange = (newMoveHistory: string[]) => {
    setMoveHistory(newMoveHistory);
  };

  return (
    <div className="app">
      <Navbar 
        authState={authState}
        onConnectClick={() => setIsConnectPopupOpen(true)}
        onImportClick={() => setIsImportPopupOpen(true)}
        onDisconnect={() => {
          logout();
          setSelectedGame(null);
        }}
      />
      
      <ConnectPopup
        isOpen={isConnectPopupOpen}
        onClose={() => setIsConnectPopupOpen(false)}
        onConnect={validateAndConnect}
        authState={authState}
        isValidating={isValidating}
        error={error}
        onLogout={() => {
          logout();
          setIsConnectPopupOpen(false);
          setSelectedGame(null);
        }}
      />
      
      <ImportGamesPopup
        isOpen={isImportPopupOpen}
        onClose={() => setIsImportPopupOpen(false)}
        authState={authState}
        onGamesImported={() => {
          setRefreshGames(prev => prev + 1);
        }}
      />
      
      <main className="app-main">
        <div className="content-layout">
          {authState.isAuthenticated && (
            <div className="games-sidebar">
              <GamesList 
                authState={authState}
                onGameSelect={handleGameSelect}
                selectedGameId={selectedGame?.id}
                refreshTrigger={refreshGames}
              />
            </div>
          )}
          
          <div className="board-section-centered">
            <ChessBoardComponent 
              game={selectedGame || undefined}
              currentMoveIndex={currentMoveIndex}
              onMoveIndexChange={handleMoveIndexChange}
              onVariationsChange={handleVariationsChange}
              onMoveHistoryChange={handleMoveHistoryChange}
            />
          </div>

          <MovesViewer 
            game={selectedGame || undefined}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={handleMoveIndexChange}
            variations={variations}
            moveHistory={moveHistory}
          />
        </div>
      </main>
    </div>
  )
}

export default App
