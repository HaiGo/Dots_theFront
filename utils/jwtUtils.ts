/**
 * JWT Token Utilities
 * Utilities for decoding and validating JWT tokens client-side
 */

interface JWTPayload {
  exp?: number; // Expiration timestamp (seconds since epoch)
  iat?: number; // Issued at timestamp
  identity?: number; // User ID
  [key: string]: any;
}

/**
 * Decode a JWT token (client-side only - no verification)
 * WARNING: This does NOT verify the signature, only decodes the payload
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (base64url)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token - JWT token string
 * @param bufferMinutes - Optional buffer time in minutes (default: 5)
 *                        Token is considered expired if it expires within this buffer
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string, bufferMinutes: number = 5): boolean {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      console.warn('JWT has no expiration field');
      return true; // Treat as expired if we can't determine
    }

    const now = Date.now() / 1000; // Convert to seconds
    const bufferSeconds = bufferMinutes * 60;
    
    // Token is expired if: current time + buffer > expiration time
    return (now + bufferSeconds) >= payload.exp;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Treat as expired on error
  }
}

/**
 * Get the expiration date of a JWT token
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000); // Convert from seconds to milliseconds
  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
}

/**
 * Get the time remaining until token expiration
 * @returns milliseconds until expiration, or 0 if expired/invalid
 */
export function getTokenTimeRemaining(token: string): number {
  try {
    const expirationDate = getTokenExpiration(token);
    if (!expirationDate) {
      return 0;
    }

    const remaining = expirationDate.getTime() - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    console.error('Error getting token time remaining:', error);
    return 0;
  }
}

/**
 * Get token info for debugging
 */
export function getTokenInfo(token: string): {
  isExpired: boolean;
  expiresAt: Date | null;
  timeRemaining: number;
  payload: JWTPayload | null;
} {
  const payload = decodeJWT(token);
  const isExpired = isTokenExpired(token, 0); // No buffer for info
  const expiresAt = getTokenExpiration(token);
  const timeRemaining = getTokenTimeRemaining(token);

  return {
    isExpired,
    expiresAt,
    timeRemaining,
    payload,
  };
}

/**
 * Format time remaining in a human-readable way
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Less than 1m';
  }
}

