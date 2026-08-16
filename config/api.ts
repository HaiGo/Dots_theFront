// API Configuration
// The base URL is loaded from environment variables.
// Set EXPO_PUBLIC_API_BASE_URL in your .env file (see .env.example).
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',
  ENDPOINTS: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    START_SESSION: '/mobile/start-session',
    TRIGGER_PHOTO: '/mobile/trigger-photo',
    GALLERY: '/mobile/gallery',
    // Social endpoints
    SEARCH_USER: '/social/search-user',
    UPDATE_USERID: '/social/update-userid',
    UPDATE_LOCATION: '/social/update-location',
    ADD_FRIEND: '/social/add-friend',
    REMOVE_FRIEND: '/social/remove-friend',
    GET_FRIENDS: '/social/friends',
    FIND_BY_PHONES: '/social/find-by-phones',
    GET_PROFILE: '/social/profile',
    UPDATE_PROFILE: '/social/profile',
    UPLOAD_PROFILE_PICTURE: '/social/upload-profile-picture',
    UPDATE_PASSWORD: '/auth/update-password',
    GET_LOCATION_SETTINGS: '/social/location-sharing-settings',
    UPDATE_LOCATION_SETTINGS: '/social/location-sharing-settings',
    SHARE_LOCATION_WITH: '/social/share-location-with',
    STOP_SHARING_LOCATION_WITH: '/social/stop-sharing-location-with',
    UPLOAD_PHOTO: '/mobile/upload-photo',
    // Note: TalkJS messages are sent directly to TalkJS API, not through our backend
  },
  TIMEOUTS: {
    DEFAULT: 10000, // 10 seconds
    PHOTO_WAIT: 3000, // 3 seconds after trigger
  },
};

// ==================== NEW STANDARDIZED API TYPES ====================

/**
 * Standard API Success Response Format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  code: string;        // e.g., "SUCCESS_LOGIN", "SUCCESS_EMAIL_VERIFICATION_SENT"
  message: string;     // Human-readable message
  data?: T;            // Optional response data
}

/**
 * Standard API Error Response Format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;      // e.g., "AUTH_INVALID_CREDENTIALS", "AUTH_EMAIL_NOT_VERIFIED"
    message: string;   // Human-readable error message
    [key: string]: any; // Additional error context
  };
}

/**
 * Combined API Response Type
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Legacy ApiResult type for backward compatibility
 */
export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;  // Added for error code support
  needsVerification?: boolean; // Flag for email verification needed
}

// ==================== AUTH TYPES ====================

/**
 * Login Response Data
 */
export interface LoginData {
  access_token: string;
  user_id: number;
  email: string;
  userid: string;
}

/**
 * Register Response Data
 */
export interface RegisterData {
  email: string;
}

// ==================== LEGACY TYPES (for backward compatibility) ====================

export interface Photo {
  id: number;
  url: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface RegisterResponse {
  message: string;
}

export interface SessionResponse {
  message: string;
  frame_folder?: string; // Optional frame category from QR code
}

export interface TriggerResponse {
  status: string;
  pi_device_id: number;
}

// Social feature types
export interface UserProfile {
  id: number;
  email: string;
  userid: string;
  phone_number?: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  last_location_update?: string;
  profile_picture_url?: string;
  share_location_globally?: boolean;
}

export interface FriendData extends UserProfile {
  // Includes all UserProfile fields plus location
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  last_update?: string;
}

// QR Code data structure
export interface QRCodeData {
  session_key: string;
  frame_folder?: string; // Optional frame category identifier
}

/**
 * Parse QR code data
 * Expected format: dots://link?session=ABC123&frame_folder=birthday
 */
export function parseQRCode(qrData: string): QRCodeData | null {
  try {
    const url = new URL(qrData);
    
    // Check if it's a valid Dots URL
    if (url.protocol !== 'dots:') {
      return null;
    }
    
    const sessionKey = url.searchParams.get('session');
    if (!sessionKey) {
      return null;
    }
    
    const frameFolder = url.searchParams.get('frame_folder');
    
    return {
      session_key: sessionKey,
      frame_folder: frameFolder || undefined,
    };
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}

