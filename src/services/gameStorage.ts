import type { ChessGame } from '../types/chess';

export class GameStorage {
  private dbName = 'chess_platform_db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('games')) {
          const gameStore = db.createObjectStore('games', { keyPath: 'id' });
          gameStore.createIndex('username', 'username', { unique: false });
          gameStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  async saveGames(username: string, games: ChessGame[]): Promise<void> {
    if (!this.db) await this.init();
    
    console.log(`Saving ${games.length} games for user: ${username}`);
    
    try {
      // Clear existing games for this user first
      await this.clearUserGames(username);
      console.log('Cleared existing games');
      
      if (games.length === 0) {
        console.log('No games to save');
        return;
      }
      
      // Create a new transaction for adding games
      const transaction = this.db!.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      
      console.log('Created new transaction for adding games');
      
      // Add username to each game and save
      const promises = games.map((game, index) => {
        const gameWithUser = { ...game, username };
        return new Promise<void>((resolve, reject) => {
          const request = store.add(gameWithUser);
          request.onsuccess = () => {
            if (index < 3) console.log(`Added game ${index + 1}: ${game.white} vs ${game.black}`);
            resolve();
          };
          request.onerror = () => {
            console.error(`Failed to add game ${index + 1}:`, request.error);
            reject(request.error);
          };
        });
      });
      
      // Wait for transaction to complete
      const transactionPromise = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log('Transaction completed successfully');
          resolve();
        };
        transaction.onerror = () => {
          console.error('Transaction failed:', transaction.error);
          reject(transaction.error);
        };
      });
      
      await Promise.all([...promises, transactionPromise]);
      console.log(`Successfully saved ${games.length} games to IndexedDB`);
      
      // Also save as files in the data directory
      await this.saveGamesAsFiles(username, games);
      console.log('Games also saved as files');
      
    } catch (error) {
      console.error('Error saving games:', error);
      throw error;
    }
  }

  async getUserGames(username: string): Promise<ChessGame[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const index = store.index('username');
      const request = index.getAll(username);
      
      request.onsuccess = () => {
        const games = request.result.map(game => ({
          id: game.id,
          white: game.white,
          black: game.black,
          result: game.result,
          date: game.date,
          eco: game.eco,
          pgn: game.pgn,
          timeControl: game.timeControl,
          event: game.event,
        }));
        resolve(games);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearUserGames(username: string): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['games'], 'readwrite');
    const store = transaction.objectStore('games');
    const index = store.index('username');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(username);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async saveGamesAsFiles(username: string, games: ChessGame[]): Promise<void> {
    // Create a combined PGN file
    const pgnContent = games.map(game => game.pgn).join('\n\n');
    
    // Create a JSON file with game metadata
    const gamesData = {
      username,
      downloadDate: new Date().toISOString(),
      gamesCount: games.length,
      games: games.map(game => ({
        id: game.id,
        white: game.white,
        black: game.black,
        result: game.result,
        date: game.date,
        eco: game.eco,
        timeControl: game.timeControl,
        event: game.event,
      }))
    };
    
    // Since we're in a browser environment, we'll use localStorage as a fallback
    // and provide download functionality
    localStorage.setItem(`games_${username}`, JSON.stringify(gamesData));
    localStorage.setItem(`pgn_${username}`, pgnContent);
  }

  async downloadGamesAsFile(username: string): Promise<void> {
    // Get games from IndexedDB instead of localStorage
    const games = await this.getUserGames(username);
    
    if (games.length === 0) {
      throw new Error('No games found to export');
    }
    
    // Create NDJSON format (one JSON object per line)
    const ndjsonContent = games.map(game => JSON.stringify(game)).join('\n');
    
    // Download NDJSON file with the requested naming format
    const ndjsonBlob = new Blob([ndjsonContent], { type: 'application/x-ndjson' });
    const ndjsonUrl = URL.createObjectURL(ndjsonBlob);
    const ndjsonLink = document.createElement('a');
    ndjsonLink.href = ndjsonUrl;
    ndjsonLink.download = `${username}_games.ndjson`;
    ndjsonLink.click();
    URL.revokeObjectURL(ndjsonUrl);
  }
}