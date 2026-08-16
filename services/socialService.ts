import {
  API_CONFIG,
  ApiResponse,
  ApiResult,
  FriendData,
  LocationUpdate,
  UserProfile
} from '../config/api';
import { authService } from './authService';

/**
 * Helper function to handle standardized API responses
 */
function handleApiResponse<T>(apiResponse: ApiResponse<T>): ApiResult<T> {
  // Check if response has the success property
  if (!apiResponse || typeof apiResponse.success === 'undefined') {
    return {
      success: false,
      error: 'Invalid server response',
      errorCode: 'INVALID_RESPONSE'
    };
  }

  if (apiResponse.success) {
    return {
      success: true,
      data: apiResponse.data,
      errorCode: apiResponse.code
    };
  } else {
    // Safely access error properties
    const error = apiResponse.error || { message: 'Unknown error', code: 'UNKNOWN_ERROR' };
    return {
      success: false,
      error: error.message || 'An error occurred',
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}

class SocialService {
  /**
   * Search for users with real-time suggestions
   * Supports both query and userid parameters
   * Backend can return standardized format OR old format
   */
  async searchUsers(
    query: string, 
    limit: number = 10
  ): Promise<ApiResult<{ users: UserProfile[]; count: number }>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH_USER}?query=${encodeURIComponent(query)}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      // Backend returns standardized format: { "success": true, "code": "...", "data": { users: [...], count: N } }
      if (data.success && data.data) {
        return { success: true, data: data.data };
      } else if (data.success === false && data.error) {
        // Error in standardized format
        return {
          success: false,
          error: data.error.message || data.error,
          errorCode: data.error.code || 'SEARCH_FAILED'
        };
      } else {
        // Fallback for unexpected format
        return { 
          success: false, 
          error: 'Search failed',
          errorCode: 'SEARCH_FAILED'
        };
      }
    } catch (error) {
      console.error('Search users error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Search for a user by their userid (legacy method)
   * Use searchUsers instead for better results
   */
  async searchUserByUserid(userid: string): Promise<ApiResult<UserProfile>> {
    const result = await this.searchUsers(userid, 1);
    if (result.success && result.data && result.data.users.length > 0) {
      return { success: true, data: result.data.users[0] };
    } else if (result.success && result.data && result.data.users.length === 0) {
      return { success: false, error: 'User not found', errorCode: 'SOCIAL_USER_NOT_FOUND' };
    } else {
      return { 
        success: false, 
        error: result.error || 'Search failed',
        errorCode: result.errorCode
      };
    }
  }

  /**
   * Update the current user's userid
   */
  async updateUserid(newUserid: string): Promise<ApiResult<UserProfile>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_USERID}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userid: newUserid }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        return { success: true, data: data.user };
      } else if (response.status === 409) {
        return { success: false, error: 'User ID already taken' };
      } else {
        return { success: false, error: data.error || 'Failed to update userid' };
      }
    } catch (error) {
      console.error('Update userid error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update the current user's location
   * Call this every 30-60 seconds when app is active
   */
  async updateLocation(latitude: number, longitude: number): Promise<ApiResult<LocationUpdate>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_LOCATION}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        }
      );

      const data = await response.json();
      
      // Backend returns: { "message": "...", "location": { latitude, longitude, last_update } }
      if (response.ok && data.location) {
        return { 
          success: true, 
          data: data.location
        };
      } else {
        // Error response: { "error": "..." }
        return { 
          success: false, 
          error: data.error || 'Failed to update location',
          errorCode: 'LOCATION_UPDATE_FAILED'
        };
      }
    } catch (error) {
      console.error('Update location error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Add a friend by userid or user id
   */
  async addFriend(friendUserid?: string, friendId?: number): Promise<ApiResult<UserProfile>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const body: any = {};
      if (friendUserid) {
        body.friend_userid = friendUserid;
      } else if (friendId) {
        body.friend_id = friendId;
      } else {
        return { success: false, error: 'Friend userid or id required', errorCode: 'VALIDATION_ERROR' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADD_FRIEND}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      // Backend returns: { "message": "Friend added successfully", "friend": {...} }
      if (response.ok && data.friend) {
        return { 
          success: true, 
          data: data.friend
        };
      } else {
        // Error response: { "error": "..." }
        return {
          success: false,
          error: data.error || 'Failed to add friend',
          errorCode: response.status === 409 ? 'FRIENDSHIP_EXISTS' : 'ADD_FRIEND_FAILED'
        };
      }
    } catch (error) {
      console.error('Add friend error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Remove a friend by userid or user id
   */
  async removeFriend(friendUserid?: string, friendId?: number): Promise<ApiResult<void>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const body: any = {};
      if (friendUserid) {
        body.friend_userid = friendUserid;
      } else if (friendId) {
        body.friend_id = friendId;
      } else {
        return { success: false, error: 'Friend userid or id required', errorCode: 'VALIDATION_ERROR' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REMOVE_FRIEND}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      
      // Backend returns: { "message": "Friend removed successfully" }
      if (response.ok) {
        return { success: true };
      } else {
        // Error response: { "error": "..." }
        return { 
          success: false, 
          error: data.error || 'Failed to remove friend',
          errorCode: 'REMOVE_FRIEND_FAILED'
        };
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Get list of friends with their locations
   */
  async getFriends(): Promise<ApiResult<FriendData[]>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_FRIENDS}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      // Handle both old and new response formats
      if (data.friends) {
        // Old format: { friends: [...], count: N }
        return { success: true, data: data.friends };
      } else if (data.success && data.data && data.data.friends) {
        // New standardized format: { success: true, data: { friends: [...] } }
        return { success: true, data: data.data.friends };
      } else if (data.success) {
        // New format without nested data
        return handleApiResponse(data);
      } else {
        // Error response
        return {
          success: false,
          error: data.error?.message || data.error || 'Failed to get friends',
          errorCode: data.error?.code || 'UNKNOWN_ERROR'
        };
      }
    } catch (error) {
      console.error('Get friends error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Find users by phone numbers (contact matching)
   */
  async findByPhones(phoneNumbers: string[]): Promise<ApiResult<UserProfile[]>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      // Limit to 500 phone numbers as per API docs
      const limitedPhones = phoneNumbers.slice(0, 500);
      console.log('Finding users by phones:', limitedPhones);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FIND_BY_PHONES}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone_numbers: limitedPhones }),
        }
      );

      const data = await response.json();

      // Backend returns: { "count": 2, "users": [...] }
      if (response.ok && data.users) {
        return { success: true, data: data.users };
      } else {
        // Error response: { "error": "..." }
        return { 
          success: false, 
          error: data.error || 'Failed to find users',
          errorCode: 'FIND_BY_PHONES_FAILED'
        };
      }
    } catch (error) {
      console.error('Find by phones error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<ApiResult<UserProfile>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_PROFILE}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      // Backend returns the profile directly: { "id": 1, "email": "...", "userid": "...", ... }
      if (response.ok && data.id) {
        return { success: true, data };
      } else {
        // Error response: { "error": "..." }
        return { 
          success: false, 
          error: data.error || 'Failed to get profile',
          errorCode: 'GET_PROFILE_FAILED'
        };
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Update user profile (userid and/or phone_number)
   */
  async updateProfile(userid?: string, phoneNumber?: string): Promise<ApiResult<UserProfile>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const body: any = {};
      if (userid) body.userid = userid;
      if (phoneNumber) body.phone_number = phoneNumber;

      if (Object.keys(body).length === 0) {
        return { success: false, error: 'No fields to update', errorCode: 'VALIDATION_ERROR' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_PROFILE}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      // Backend returns: { "message": "...", "user": {...} }
      if (response.ok && data.user) {
        return { success: true, data: data.user };
      } else {
        // Error response: { "error": "..." }
        return { 
          success: false, 
          error: data.error || 'Failed to update profile',
          errorCode: response.status === 409 ? 'PROFILE_CONFLICT' : 'UPDATE_PROFILE_FAILED'
        };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(imageUri: string): Promise<ApiResult<{ profile_picture_url: string }>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        console.error('Upload profile picture: No token available');
        return { success: false, error: 'Not authenticated' };
      }

      // Create form data
      const formData = new FormData();
      
      // Get filename from URI
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileExtension = match ? match[1].toLowerCase() : 'jpeg';
      
      // Map file extensions to proper MIME types
      const mimeTypeMap: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      const type = mimeTypeMap[fileExtension] || 'image/jpeg';

      console.log('Preparing upload:', { 
        filename, 
        type, 
        uri: imageUri,
        fileExtension 
      });

      // React Native FormData expects this structure
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      console.log('Sending request to:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_PROFILE_PICTURE}`);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_PROFILE_PICTURE}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - let FormData set it with boundary
          },
          body: formData,
        }
      );

      console.log('Upload response status:', response.status);

      let data;
      try {
        const responseText = await response.text();
        console.log('Upload response body:', responseText);
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        return { success: false, error: 'Invalid server response' };
      }

      if (response.ok) {
        console.log('Upload successful:', data);
        return { success: true, data };
      } else {
        console.error('Upload failed:', response.status, data);
        return { success: false, error: data.error || data.message || 'Failed to upload profile picture' };
      }
    } catch (error) {
      console.error('Upload profile picture error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResult<void>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_PASSWORD}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      // Backend returns standardized format for this endpoint
      if (data.success) {
        return { success: true };
      } else if (data.success === false && data.error) {
        return {
          success: false,
          error: data.error.message || data.error,
          errorCode: data.error.code || 'PASSWORD_UPDATE_FAILED'
        };
      } else {
        // Fallback
        return { 
          success: false, 
          error: data.error || 'Failed to update password',
          errorCode: 'PASSWORD_UPDATE_FAILED'
        };
      }
    } catch (error) {
      console.error('Update password error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Get location sharing settings
   */
  async getLocationSharingSettings(): Promise<ApiResult<{
    share_location_globally: boolean;
    selective_sharing_enabled: boolean;
    friends_with_access: string[];
  }>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_LOCATION_SETTINGS}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      // Check if this uses standardized format or direct response
      if (data.success && data.data) {
        return { success: true, data: data.data };
      } else if (data.share_location_globally !== undefined) {
        // Direct response format
        return { success: true, data };
      } else if (data.success === false && data.error) {
        return {
          success: false,
          error: data.error.message || data.error,
          errorCode: data.error.code || 'GET_SETTINGS_FAILED'
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to get location settings',
          errorCode: 'GET_SETTINGS_FAILED'
        };
      }
    } catch (error) {
      console.error('Get location settings error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Update location sharing settings (global toggle)
   */
  async updateLocationSharingSettings(shareLocationGlobally: boolean): Promise<ApiResult<void>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_LOCATION_SETTINGS}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ share_location_globally: shareLocationGlobally }),
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to update location settings',
          errorCode: 'UPDATE_SETTINGS_FAILED'
        };
      }
    } catch (error) {
      console.error('Update location settings error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Share location with specific friend
   */
  async shareLocationWith(friendUserid: string): Promise<ApiResult<void>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SHARE_LOCATION_WITH}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ friend_userid: friendUserid }),
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to share location',
          errorCode: 'SHARE_LOCATION_FAILED'
        };
      }
    } catch (error) {
      console.error('Share location with error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Stop sharing location with specific friend
   */
  async stopSharingLocationWith(friendUserid: string): Promise<ApiResult<void>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated', errorCode: 'AUTH_TOKEN_MISSING' };
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STOP_SHARING_LOCATION_WITH}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ friend_userid: friendUserid }),
        }
      );

      const data = await response.json();

      if (data.success || response.ok) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to stop sharing location',
          errorCode: 'STOP_SHARING_FAILED'
        };
      }
    } catch (error) {
      console.error('Stop sharing location error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }
}

export const socialService = new SocialService();

