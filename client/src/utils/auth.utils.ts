/**
 * Authentication utilities for token management
 */

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Get authentication tokens from localStorage
 * @throws Error if not authenticated or tokens not found
 */
export function getAuthTokens(): AuthTokens {
  const authData = localStorage.getItem('ambient-agents-auth');
  if (!authData) {
    throw new Error('Not authenticated');
  }
  
  const { tokens: tokenString } = JSON.parse(authData);
  if (!tokenString) {
    throw new Error('No tokens found');
  }
  
  return typeof tokenString === 'string' 
    ? JSON.parse(decodeURIComponent(tokenString)) 
    : tokenString;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    getAuthTokens();
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  localStorage.removeItem('ambient-agents-auth');
} 