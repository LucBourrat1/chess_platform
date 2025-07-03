import axios from 'axios';
import type { LichessUser, ChessGame } from '../types/chess';

const LICHESS_API_BASE = 'https://lichess.org/api';

export class LichessApi {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
    };
  }

  async getCurrentUser(): Promise<LichessUser> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await axios.get(`${LICHESS_API_BASE}/account`, {
      headers: this.getHeaders(),
    });

    return response.data;
  }

  async validateUser(username: string): Promise<LichessUser | null> {
    try {
      const response = await axios.get(`${LICHESS_API_BASE}/user/${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getUserGames(username: string, max: number = 200): Promise<ChessGame[]> {
    console.log(`Fetching games for user: ${username}`);
    console.log(`Max games: ${max}`);
    console.log(`Access token available: ${!!this.accessToken}`);
    
    // First try without authentication to test basic connectivity
    try {
      console.log('Testing basic user endpoint first...');
      const userResponse = await axios.get(`${LICHESS_API_BASE}/user/${username}`);
      console.log('User exists:', userResponse.data.id);
    } catch (userError) {
      console.error('User validation failed:', userError);
      if (axios.isAxiosError(userError) && userError.response?.status === 404) {
        throw new Error(`User "${username}" not found on Lichess`);
      }
    }
    
    // Multiple fallback strategies for CORS issues
    const strategies = [
      // Strategy 1: Full request with all headers
      {
        name: 'Full request',
        config: {
          params: { max, pgnInJson: true, sort: 'dateDesc' },
          headers: {
            'Accept': 'application/x-ndjson',
            ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {})
          },
          responseType: 'text' as const,
          timeout: 30000,
        }
      },
      // Strategy 2: Simplified request
      {
        name: 'Simplified request',
        config: {
          params: { max, pgnInJson: true },
          headers: { 'Accept': 'application/x-ndjson' },
          responseType: 'text' as const,
        }
      },
      // Strategy 3: Basic request without special headers
      {
        name: 'Basic request',
        config: {
          params: { max },
          responseType: 'text' as const,
        }
      }
    ];
    
    let lastError: any;
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying strategy: ${strategy.name}`);
        console.log('Request config:', strategy.config);
        console.log('Request URL:', `${LICHESS_API_BASE}/games/user/${username}`);
        
        const response = await axios.get(`${LICHESS_API_BASE}/games/user/${username}`, strategy.config);
        
        console.log(`Strategy "${strategy.name}" succeeded!`);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data length:', response.data.length);
        console.log('Response data preview:', response.data.substring(0, 500));

        if (!response.data || response.data.trim() === '') {
          console.warn('Empty response from Lichess API');
          return [];
        }

        // Parse NDJSON response (newline-delimited JSON)
        const games: any[] = [];
        const lines = response.data.trim().split('\n');
        
        console.log(`Processing ${lines.length} lines`);
        
        for (const [index, line] of lines.entries()) {
          if (line.trim()) {
            try {
              const game = JSON.parse(line);
              games.push(game);
              if (index < 2) {
                console.log(`Game ${index + 1} sample:`, game);
              }
            } catch (e) {
              console.warn(`Failed to parse game line ${index + 1}:`, line.substring(0, 100));
              console.warn('Parse error:', e);
            }
          }
        }

        console.log(`Successfully parsed ${games.length} games from Lichess`);

        if (games.length === 0) {
          console.warn('No games found for user');
          return [];
        }

        return games.map((game: any) => ({
          id: game.id,
          white: game.players.white.user?.name || game.players.white.name || 'Anonymous',
          black: game.players.black.user?.name || game.players.black.name || 'Anonymous',
          result: this.formatResult(game.status, game.winner),
          date: new Date(game.createdAt).toLocaleDateString(),
          eco: game.opening?.eco,
          pgn: game.pgn,
          timeControl: this.formatTimeControl(game.clock, game.daysPerTurn),
          event: game.tournament?.name || game.source || 'Casual',
        }));
        
      } catch (error) {
        console.error(`Strategy "${strategy.name}" failed:`, error);
        lastError = error;
        continue; // Try next strategy
      }
    }
    
    // If all strategies failed, throw the last error
    console.error('All strategies failed. Last error:', lastError);
    
    if (axios.isAxiosError(lastError)) {
      console.error('Response status:', lastError.response?.status);
      console.error('Response data:', lastError.response?.data);
      console.error('Response headers:', lastError.response?.headers);
      
      if (lastError.response?.status === 404) {
        throw new Error(`User "${username}" not found on Lichess`);
      }
      if (lastError.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      }
      if (lastError.response?.status === 400) {
        throw new Error('Invalid request parameters');
      }
      if (lastError.response?.status === 403) {
        throw new Error('Access denied. User may have private games.');
      }
      
      throw new Error(`HTTP ${lastError.response?.status}: ${lastError.response?.statusText || 'Unknown error'}`);
    }
    
    throw new Error(`Network error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  }

  private formatTimeControl(clock?: any, daysPerTurn?: number): string {
    if (clock) {
      const minutes = Math.floor(clock.initial / 60);
      const increment = clock.increment;
      return `${minutes}+${increment}`;
    }
    if (daysPerTurn) {
      return `${daysPerTurn} days/move`;
    }
    return 'Unknown';
  }

  private formatResult(status: string, winner?: string): string {
    if (status === 'mate') {
      return winner === 'white' ? '1-0' : '0-1';
    }
    if (status === 'resign') {
      return winner === 'white' ? '1-0' : '0-1';
    }
    if (status === 'timeout') {
      return winner === 'white' ? '1-0' : '0-1';
    }
    if (status === 'draw' || status === 'stalemate') {
      return '1/2-1/2';
    }
    return '*';
  }
}