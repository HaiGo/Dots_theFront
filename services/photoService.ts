import { API_CONFIG, ApiResult, Photo, SessionResponse, TriggerResponse } from '../config/api';
import { handle401Error } from '../utils/apiErrorHandler';
import { authService } from './authService';

class PhotoService {
  /**
   * Link mobile app to Dots booth session
   */
  async startSession(sessionKey: string): Promise<ApiResult<SessionResponse>> {
    try {
      // Proactive token validation
      const isValid = await authService.isTokenValid();
      if (!isValid) {
        // Try to refresh token
        const newToken = await authService.refreshAccessToken();
        if (!newToken) {
          return { success: false, error: 'Session expired. Please login again.' };
        }
      }

      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.START_SESSION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_key: sessionKey }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else if (response.status === 404) {
        return { success: false, error: 'QR code expired. Please scan again.' };
      } else if (response.status === 401) {
        // Try to refresh and retry
        const refreshed = await handle401Error('startSession');
        if (refreshed) {
          // Retry with new token
          const newToken = await authService.getToken();
          const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.START_SESSION}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify({ session_key: sessionKey }),
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return { success: true, data };
          }
        }
        return { success: false, error: 'Session expired. Please login again.' };
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to connect to booth' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Trigger photo capture on Pi device
   */
  async triggerPhoto(sessionKey: string): Promise<ApiResult<TriggerResponse>> {
    try {
      // Proactive token validation
      const isValid = await authService.isTokenValid();
      if (!isValid) {
        // Try to refresh token
        const newToken = await authService.refreshAccessToken();
        if (!newToken) {
          return { success: false, error: 'Session expired. Please login again.' };
        }
      }

      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRIGGER_PHOTO}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_key: sessionKey }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else if (response.status === 404) {
        return { success: false, error: 'Session expired. Please scan QR code again.' };
      } else if (response.status === 403) {
        return { success: false, error: 'Not authorized. Please scan your own QR code.' };
      } else if (response.status === 401) {
        // Try to refresh and retry
        const refreshed = await handle401Error('triggerPhoto');
        if (refreshed) {
          // Retry with new token
          const newToken = await authService.getToken();
          const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRIGGER_PHOTO}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify({ session_key: sessionKey }),
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return { success: true, data };
          }
        }
        return { success: false, error: 'Session expired. Please login again.' };
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to trigger photo' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's photo gallery
   * Now returns standardized response format with data.photos
   */
  async getGallery(): Promise<ApiResult<Photo[]>> {
    try {
      // Proactive token validation
      const isValid = await authService.isTokenValid();
      if (!isValid) {
        // Try to refresh token
        const newToken = await authService.refreshAccessToken();
        if (!newToken) {
          return { success: false, error: 'Session expired. Please login again.' };
        }
      }

      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GALLERY}?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      const apiResponse = await response.json();

      if (response.ok) {
        // Handle new standardized response format: { success: true, data: { photos: [...], count: N } }
        if (apiResponse.success && apiResponse.data && apiResponse.data.photos) {
          return { success: true, data: apiResponse.data.photos };
        }
        // Fallback: Handle old format (direct array of photos)
        else if (Array.isArray(apiResponse)) {
          return { success: true, data: apiResponse };
        }
        // Fallback: If response is just the photos array directly
        else {
          return { success: true, data: [] };
        }
      } else if (response.status === 401) {
        // Try to refresh and retry
        const refreshed = await handle401Error('getGallery');
        if (refreshed) {
          // Retry with new token
          const newToken = await authService.getToken();
          const timestamp2 = new Date().getTime();
          const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GALLERY}?t=${timestamp2}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });
          
          const retryApiResponse = await retryResponse.json();
          
          if (retryResponse.ok) {
            if (retryApiResponse.success && retryApiResponse.data && retryApiResponse.data.photos) {
              return { success: true, data: retryApiResponse.data.photos };
            } else if (Array.isArray(retryApiResponse)) {
              return { success: true, data: retryApiResponse };
            }
          }
        }
        return { success: false, error: 'Session expired. Please login again.' };
      } else {
        // Handle standardized error format
        const errorMessage = apiResponse.error?.message || apiResponse.error || 'Failed to load gallery';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Get gallery error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Upload a photo to the server (for sharing)
   * Uses the new /mobile/upload-photo endpoint
   */
  async uploadPhoto(imageUri: string): Promise<ApiResult<{ url: string; photo_id: number; created_at: string }>> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      // Create form data
      const formData = new FormData();
      
      // Get filename from URI
      const filename = imageUri.split('/').pop() || 'photo.jpg';
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

      // React Native FormData expects this structure
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_PHOTO}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - let FormData set it with boundary
          },
          body: formData,
        }
      );

      const apiResponse = await response.json();

      // Handle new standardized response format
      if (response.ok && apiResponse.success && apiResponse.data) {
        return { 
          success: true, 
          data: {
            url: apiResponse.data.url,
            photo_id: apiResponse.data.photo_id,
            created_at: apiResponse.data.created_at
          }
        };
      } else if (response.status === 401) {
        // Try to refresh and retry
        const refreshed = await handle401Error('uploadPhoto');
        if (refreshed) {
          // Retry with new token
          const newToken = await authService.getToken();
          const retryResponse = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_PHOTO}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newToken}`,
              },
              body: formData,
            }
          );
          
          const retryApiResponse = await retryResponse.json();
          
          if (retryResponse.ok && retryApiResponse.success && retryApiResponse.data) {
            return { 
              success: true, 
              data: {
                url: retryApiResponse.data.url,
                photo_id: retryApiResponse.data.photo_id,
                created_at: retryApiResponse.data.created_at
              }
            };
          }
        }
        return { success: false, error: 'Session expired. Please login again.' };
      } else if (apiResponse.error) {
        // Handle standardized error format
        const errorMessage = apiResponse.error.message || apiResponse.error;
        const errorCode = apiResponse.error.code;
        
        // User-friendly error messages
        switch (errorCode) {
          case 'PHOTO_MISSING':
            return { success: false, error: 'No image file provided' };
          case 'PHOTO_INVALID_FORMAT':
            return { success: false, error: 'Invalid file type. Please use PNG, JPG, or GIF' };
          case 'PHOTO_UPLOAD_FAILED':
            return { success: false, error: 'Failed to upload photo. Please try again.' };
          default:
            return { success: false, error: errorMessage || 'Failed to upload photo' };
        }
      } else {
        return { success: false, error: 'Failed to upload photo' };
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }
}

export const photoService = new PhotoService();

