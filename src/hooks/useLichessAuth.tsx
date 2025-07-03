import { useState, useEffect } from 'react';
import { LichessApi } from '../services/lichessApi';
import type { AuthState } from '../types/chess';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  buildAuthUrl,
  exchangeCodeForToken 
} from '../utils/oauth';

export const useLichessAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null
  });
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setError('Failed to authenticate with Lichess');
      console.error('OAuth error:', error);
    }
  };

  const validateAndConnect = async (username: string) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const user = await lichessApi.validateUser(username);
      if (user) {
        await initiateOAuth();
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
    setError(null);
  };

  return {
    authState,
    isValidating,
    error,
    validateAndConnect,
    logout
  };
};