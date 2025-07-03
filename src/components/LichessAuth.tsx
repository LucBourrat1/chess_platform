import React, { useState, useEffect } from 'react';
import { LichessApi } from '../services/lichessApi';
import { LichessUser, AuthState } from '../types/chess';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  buildAuthUrl,
  exchangeCodeForToken 
} from '../utils/oauth';

interface LichessAuthProps {
  onAuthChange: (authState: AuthState) => void;
}

export const LichessAuth: React.FC<LichessAuthProps> = ({ onAuthChange }) => {
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null
  });

  const lichessApi = new LichessApi();

  useEffect(() => {
    // Check for existing token in localStorage
    const savedToken = localStorage.getItem('lichess_access_token');
    const savedUser = localStorage.getItem('lichess_user');
    
    if (savedToken && savedUser) {
      const user = JSON.parse(savedUser);
      const newAuthState = {
        isAuthenticated: true,
        user,
        accessToken: savedToken
      };
      setAuthState(newAuthState);
      onAuthChange(newAuthState);
      lichessApi.setAccessToken(savedToken);
    }

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const savedState = localStorage.getItem('oauth_state');
      const savedCodeVerifier = localStorage.getItem('code_verifier');
      
      if (state !== savedState || !savedCodeVerifier) {
        setError('Invalid OAuth state');
        return;
      }

      const tokenResponse = await exchangeCodeForToken(code, savedCodeVerifier);
      const accessToken = tokenResponse.access_token;
      
      lichessApi.setAccessToken(accessToken);
      const user = await lichessApi.getCurrentUser();
      
      localStorage.setItem('lichess_access_token', accessToken);
      localStorage.setItem('lichess_user', JSON.stringify(user));
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('code_verifier');
      
      const newAuthState = {
        isAuthenticated: true,
        user,
        accessToken
      };
      setAuthState(newAuthState);
      onAuthChange(newAuthState);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setError('Failed to authenticate with Lichess');
      console.error('OAuth error:', error);
    }
  };

  const validateUsername = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const user = await lichessApi.validateUser(username);
      if (user) {
        initiateOAuth();
      } else {
        setError('User not found on Lichess');
      }
    } catch (error) {
      setError('Failed to validate username');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const initiateOAuth = async () => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();
      
      localStorage.setItem('code_verifier', codeVerifier);
      localStorage.setItem('oauth_state', state);
      
      const authUrl = buildAuthUrl(codeChallenge, state);
      window.location.href = authUrl;
    } catch (error) {
      setError('Failed to initiate OAuth');
      console.error('OAuth initiation error:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('lichess_access_token');
    localStorage.removeItem('lichess_user');
    const newAuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null
    };
    setAuthState(newAuthState);
    onAuthChange(newAuthState);
  };

  if (authState.isAuthenticated && authState.user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <h3>Connected to Lichess</h3>
          <p>Username: {authState.user.username}</p>
          <p>Online: {authState.user.online ? 'Yes' : 'No'}</p>
          <button onClick={logout} className="logout-btn">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h3>Connect to Lichess</h3>
      <div className="auth-form">
        <input
          type="text"
          placeholder="Enter your Lichess username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isValidating}
        />
        <button 
          onClick={validateUsername} 
          disabled={isValidating || !username.trim()}
          className="connect-btn"
        >
          {isValidating ? 'Validating...' : 'Connect Lichess Account'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};