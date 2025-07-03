export interface ChessGame {
  id: string;
  white: string;
  black: string;
  result: string;
  date: string;
  eco?: string;
  pgn: string;
  timeControl?: string;
  event?: string;
}

export interface LichessUser {
  id: string;
  username: string;
  online: boolean;
  perfs: {
    [key: string]: {
      games: number;
      rating: number;
      rd: number;
      prog: number;
      prov?: boolean;
    };
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: LichessUser | null;
  accessToken: string | null;
}