/**
 * Global API Error Handler
 * Provides centralized error handling for API calls, especially 401 (unauthorized) responses
 */

import { router } from 'expo-router';
import { authService } from '../services/authService';

let isRedirectingToLogin = false;

/**
 * Handle 401 Unauthorized responses globally
 * First tries to refresh token, then logs out if refresh fails
 */
export async function handle401Error(errorContext?: string): Promise<boolean> {
  // Prevent multiple simultaneous redirects
  if (isRedirectingToLogin) {
    return false;
  }

  console.warn('🚨 401 Unauthorized detected -', errorContext || 'Unknown context');
  
  try {
    // First, try to refresh the access token
    console.log('🔄 Attempting to refresh access token...');
    const newToken = await authService.refreshAccessToken();
    
    if (newToken) {
      console.log('✅ Token refreshed successfully - request can be retried');
      return true; // Token refreshed, caller can retry
    }
    
    // Refresh failed, log out user
    isRedirectingToLogin = true;
    console.warn('❌ Token refresh failed - logging out user');
    
    // Log out and clear all auth data
    await authService.logout();
    
    // Small delay to ensure logout completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to login
    router.replace('/(auth)/login');
    
    console.log('➡️  Redirected to login');
    return false;
  } catch (error) {
    console.error('Error handling 401:', error);
    
    // On error, log out anyway
    isRedirectingToLogin = true;
    await authService.logout();
    router.replace('/(auth)/login');
    return false;
  } finally {
    // Reset flag after a delay
    setTimeout(() => {
      isRedirectingToLogin = false;
    }, 1000);
  }
}

/**
 * Enhanced fetch with automatic 401 handling and token refresh
 * Use this instead of regular fetch for authenticated API calls
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // First attempt with current token
    let response = await fetch(url, options);

    // Handle 401 - try to refresh and retry
    if (response.status === 401) {
      console.warn('⚠️ API returned 401:', url);
      const refreshed = await handle401Error(url);
      
      if (refreshed) {
        // Token was refreshed, retry the request with new token
        console.log('🔄 Retrying request with new token...');
        
        // Get new token and update Authorization header
        const newToken = await authService.getToken();
        if (newToken && options.headers) {
          const headers = new Headers(options.headers);
          headers.set('Authorization', `Bearer ${newToken}`);
          options.headers = headers;
        }
        
        // Retry the request
        response = await fetch(url, options);
        
        if (response.ok) {
          console.log('✅ Request succeeded after token refresh');
        }
      } else {
        // Refresh failed, user was logged out
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  } catch (error) {
    // Re-throw the error for the caller to handle
    throw error;
  }
}

/**
 * Check if token is about to expire and warn user
 * @param minutesThreshold - Warn if token expires within this many minutes
 */
export async function checkTokenExpiration(minutesThreshold: number = 30): Promise<{
  shouldWarn: boolean;
  timeRemaining: number;
}> {
  try {
    const isValid = await authService.isTokenValid(minutesThreshold);
    
    if (!isValid) {
      const tokenInfo = await authService.getTokenDebugInfo();
      return {
        shouldWarn: true,
        timeRemaining: tokenInfo.timeRemaining || 0,
      };
    }

    return {
      shouldWarn: false,
      timeRemaining: 0,
    };
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return {
      shouldWarn: false,
      timeRemaining: 0,
    };
  }
}

/**
 * API error types for consistent error handling
 */
export enum ApiErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Parse API error and return structured error info
 */
export function parseApiError(
  error: any,
  response?: Response
): {
  type: ApiErrorType;
  message: string;
  statusCode?: number;
} {
  // Handle 401 Unauthorized
  if (response?.status === 401) {
    return {
      type: ApiErrorType.UNAUTHORIZED,
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
    };
  }

  // Handle 404 Not Found
  if (response?.status === 404) {
    return {
      type: ApiErrorType.NOT_FOUND,
      message: 'The requested resource was not found.',
      statusCode: 404,
    };
  }

  // Handle 500 Server Error
  if (response?.status && response.status >= 500) {
    return {
      type: ApiErrorType.SERVER_ERROR,
      message: 'Server error. Please try again later.',
      statusCode: response.status,
    };
  }

  // Handle 400 Validation Error
  if (response?.status === 400) {
    return {
      type: ApiErrorType.VALIDATION_ERROR,
      message: error.message || 'Invalid request.',
      statusCode: 400,
    };
  }

  // Handle network errors
  if (error.message?.includes('Network') || error.message?.includes('fetch')) {
    return {
      type: ApiErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your connection.',
    };
  }

  // Unknown error
  return {
    type: ApiErrorType.UNKNOWN,
    message: error.message || 'An unexpected error occurred.',
  };
}

