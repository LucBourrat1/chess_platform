// OAuth2 PKCE utilities for Lichess authentication
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const buildAuthUrl = (codeChallenge: string, state: string): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'chess-platform-app',
    redirect_uri: window.location.origin + '/callback',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: state,
    scope: 'preference:read email:read'
  });
  
  return `https://lichess.org/oauth?${params.toString()}`;
};

export const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; token_type: string }> => {
  const response = await fetch('https://lichess.org/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'chess-platform-app',
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: window.location.origin + '/callback',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return await response.json();
};