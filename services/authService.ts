import * as SecureStore from 'expo-secure-store';
import {
    API_CONFIG,
    ApiResponse,
    ApiResult,
    LoginData,
    RegisterData
} from '../config/api';
import { getTokenInfo, isTokenExpired } from '../utils/jwtUtils';

const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';
const TOKEN_TIMESTAMP_KEY = 'jwt_token_timestamp';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';
const USER_USERID_KEY = 'user_userid';

class AuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private userId: number | null = null;
  private userEmail: string | null = null;
  private userUserid: string | null = null;

  /**
   * Register a new user
   * Now returns email verification message
   */
  async register(
    email: string, 
    password: string, 
    userid: string, 
    phoneNumber?: string
  ): Promise<ApiResult<RegisterData>> {
    try {
      const body: any = { email, password, userid };
      if (phoneNumber) {
        body.phone_number = phoneNumber;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const apiResponse: ApiResponse<RegisterData> = await response.json();

      if (apiResponse.success) {
        // Success - email verification sent
        return { 
          success: true, 
          data: apiResponse.data,
          errorCode: apiResponse.code 
        };
      } else {
        // Handle specific error codes
        const errorCode = apiResponse.error.code;
        const errorMessage = apiResponse.error.message;
        
        return { 
          success: false, 
          error: errorMessage,
          errorCode: errorCode
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Login user and get JWT token
   * Now stores user data and handles new response format
   */
  async login(email: string, password: string): Promise<ApiResult<LoginData>> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const apiResponse: ApiResponse<LoginData> = await response.json();

      if (apiResponse.success && apiResponse.data) {
        // Store authentication data (both tokens now!)
        this.token = apiResponse.data.access_token;
        this.refreshToken = apiResponse.data.refresh_token;
        this.userId = apiResponse.data.user_id;
        this.userEmail = apiResponse.data.email;
        this.userUserid = apiResponse.data.userid;

        await this.saveToken(apiResponse.data.access_token);
        await this.saveRefreshToken(apiResponse.data.refresh_token);
        await this.saveUserData(
          apiResponse.data.user_id,
          apiResponse.data.email,
          apiResponse.data.userid
        );

        return { 
          success: true, 
          data: apiResponse.data 
        };
      } else {
        // Handle specific error codes
        const errorCode = apiResponse.success ? 'UNKNOWN_ERROR' : apiResponse.error.code;
        const errorMessage = apiResponse.success ? 'Login failed' : apiResponse.error.message;
        
        // Set flags for specific errors
        const needsVerification = errorCode === 'AUTH_EMAIL_NOT_VERIFIED';
        
        return { 
          success: false, 
          error: errorMessage,
          errorCode: errorCode,
          needsVerification: needsVerification
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Logout user and clear all stored data
   */
  async logout(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    this.userId = null;
    this.userEmail = null;
    this.userUserid = null;
    await this.clearToken();
    await this.clearRefreshToken();
    await this.clearUserData();
  }

  /**
   * Save JWT token securely with timestamp
   */
  private async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      // Save timestamp when token was stored
      await SecureStore.setItemAsync(TOKEN_TIMESTAMP_KEY, Date.now().toString());
      
      // Log token info for debugging
      const tokenInfo = getTokenInfo(token);
      console.log('🔑 Token saved:', {
        expiresAt: tokenInfo.expiresAt?.toLocaleString(),
        timeRemaining: tokenInfo.timeRemaining,
        isExpired: tokenInfo.isExpired
      });
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Save user data securely
   * SecureStore only accepts strings, so we convert all values
   */
  private async saveUserData(userId: number, email: string, userid: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
      await SecureStore.setItemAsync(USER_EMAIL_KEY, String(email));
      await SecureStore.setItemAsync(USER_USERID_KEY, String(userid));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  /**
   * Load JWT token from secure storage
   */
  async loadToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      this.token = token;
      return token;
    } catch (error) {
      console.error('Error loading token:', error);
      return null;
    }
  }

  /**
   * Load user data from secure storage
   */
  async loadUserData(): Promise<{ userId: number; email: string; userid: string } | null> {
    try {
      const userIdStr = await SecureStore.getItemAsync(USER_ID_KEY);
      const email = await SecureStore.getItemAsync(USER_EMAIL_KEY);
      const userid = await SecureStore.getItemAsync(USER_USERID_KEY);

      if (userIdStr && email && userid) {
        this.userId = parseInt(userIdStr, 10);
        this.userEmail = email;
        this.userUserid = userid;

        return {
          userId: this.userId,
          email: this.userEmail,
          userid: this.userUserid,
        };
      }

      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  /**
   * Save refresh token securely
   */
  private async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      console.log('🔐 Refresh token saved');
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  /**
   * Load refresh token from secure storage
   */
  async loadRefreshToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      this.refreshToken = refreshToken;
      return refreshToken;
    } catch (error) {
      console.error('Error loading refresh token:', error);
      return null;
    }
  }

  /**
   * Get current refresh token (loads from storage if not in memory)
   */
  async getRefreshToken(): Promise<string | null> {
    if (!this.refreshToken) {
      await this.loadRefreshToken();
    }
    return this.refreshToken;
  }

  /**
   * Clear JWT token from secure storage
   */
  private async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  /**
   * Clear refresh token from secure storage
   */
  private async clearRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing refresh token:', error);
    }
  }

  /**
   * Clear user data from secure storage
   */
  private async clearUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
      await SecureStore.deleteItemAsync(USER_USERID_KEY);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  /**
   * Get current JWT token (loads from storage if not in memory)
   */
  async getToken(): Promise<string | null> {
    if (!this.token) {
      await this.loadToken();
    }
    return this.token;
  }

  /**
   * Get current user ID (loads from storage if not in memory)
   */
  async getUserId(): Promise<number | null> {
    if (!this.userId) {
      await this.loadUserData();
    }
    return this.userId;
  }

  /**
   * Get current user email (loads from storage if not in memory)
   */
  async getUserEmail(): Promise<string | null> {
    if (!this.userEmail) {
      await this.loadUserData();
    }
    return this.userEmail;
  }

  /**
   * Get current userid (loads from storage if not in memory)
   */
  async getUserUserid(): Promise<string | null> {
    if (!this.userUserid) {
      await this.loadUserData();
    }
    return this.userUserid;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.token) {
      await this.loadToken();
    }
    return !!this.token;
  }

  /**
   * Check if the current token is valid (not expired)
   * @param bufferMinutes - Consider token expired if it expires within this many minutes
   */
  async isTokenValid(bufferMinutes: number = 5): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(token, bufferMinutes)) {
      console.warn('⚠️ Token is expired or expiring soon');
      return false;
    }

    return true;
  }

  /**
   * Get token timestamp (when it was stored)
   */
  async getTokenTimestamp(): Promise<number | null> {
    try {
      const timestamp = await SecureStore.getItemAsync(TOKEN_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting token timestamp:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * Returns new access token or null if refresh failed
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        console.log('❌ No refresh token found');
        return null;
      }

      console.log('🔄 Attempting to refresh access token...');

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store new access token
        this.token = data.access_token;
        await this.saveToken(data.access_token);
        
        console.log('✅ Access token refreshed successfully');
        return data.access_token;
      } else if (response.status === 401) {
        console.warn('⚠️ Refresh token expired or invalid');
        // Refresh token expired, user must re-login
        await this.logout();
        return null;
      } else {
        console.warn('⚠️ Token refresh failed with status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Validate token with backend API using new /auth/me endpoint
   * Makes a lightweight API call to verify the token is still accepted
   */
  async validateTokenWithBackend(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // Use new /auth/me endpoint for validation
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ Token validated with backend');
        return true;
      } else if (response.status === 401) {
        console.warn('⚠️ Token rejected by backend (401), attempting refresh...');
        
        // Try to refresh the token
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          console.log('✅ Token refreshed, validation succeeded');
          return true;
        }
        
        // Refresh failed, token is invalid
        await this.logout();
        return false;
      } else {
        console.warn('⚠️ Backend validation failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error validating token with backend:', error);
      // On network error, assume token might still be valid
      return true;
    }
  }

  /**
   * Get current user info from /auth/me endpoint
   */
  async getCurrentUser(): Promise<ApiResult<any>> {
    try {
      const token = await this.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { success: true, data: user };
      } else if (response.status === 401) {
        // Try to refresh token
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Retry with new token
          const retryResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          });
          
          if (retryResponse.ok) {
            const user = await retryResponse.json();
            return { success: true, data: user };
          }
        }
        
        return { success: false, error: 'Session expired. Please log in again.' };
      } else {
        return { success: false, error: 'Failed to get user info' };
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Check authentication status with full validation
   * - Checks if token exists
   * - Checks if token is expired (client-side)
   * - Optionally validates with backend
   */
  async checkAuthStatus(validateWithBackend: boolean = false): Promise<{
    isAuthenticated: boolean;
    reason?: string;
  }> {
    const token = await this.getToken();
    
    if (!token) {
      return { isAuthenticated: false, reason: 'No token found' };
    }

    // Check token expiration client-side
    if (isTokenExpired(token)) {
      console.warn('⚠️ Token expired (client-side check)');
      await this.logout();
      return { isAuthenticated: false, reason: 'Token expired' };
    }

    // Optionally validate with backend
    if (validateWithBackend) {
      const isValid = await this.validateTokenWithBackend();
      if (!isValid) {
        return { isAuthenticated: false, reason: 'Token rejected by backend' };
      }
    }

    return { isAuthenticated: true };
  }

  /**
   * Get detailed token information for debugging
   */
  async getTokenDebugInfo(): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      return { error: 'No token found' };
    }

    const tokenInfo = getTokenInfo(token);
    const timestamp = await this.getTokenTimestamp();

    return {
      hasToken: true,
      storedAt: timestamp ? new Date(timestamp).toLocaleString() : 'Unknown',
      expiresAt: tokenInfo.expiresAt?.toLocaleString() || 'Unknown',
      isExpired: tokenInfo.isExpired,
      timeRemaining: tokenInfo.timeRemaining,
      payload: tokenInfo.payload,
    };
  }
}

export const authService = new AuthService();

