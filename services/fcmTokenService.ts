// FCM Token Service
// Handles Firebase Cloud Messaging token retrieval and registration with TalkJS
// Configuration is loaded from environment variables (see .env.example).

import { Platform } from 'react-native';

const TALKJS_APP_ID = process.env.EXPO_PUBLIC_TALKJS_APP_ID || '';
const TALKJS_SECRET_KEY = process.env.EXPO_PUBLIC_TALKJS_SECRET_KEY || '';

class FCMTokenService {
  private currentToken: string | null = null;

  /**
   * Get the current FCM token from Firebase
   * This is the token that TalkJS needs to send push notifications
   */
  async getFCMToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (Platform.OS !== 'android') {
        return { 
          success: false, 
          error: 'FCM tokens are only for Android. iOS uses APNs tokens.' 
        };
      }

      // Dynamically import Firebase messaging (only available in native builds)
      const messagingModule = require('@react-native-firebase/messaging');
      const messaging = messagingModule.default || messagingModule;
      
      // Get the FCM token using the instance
      const messagingInstance = typeof messaging === 'function' ? messaging() : messaging;
      const token = await messagingInstance.getToken();
      
      if (!token) {
        return { success: false, error: 'Failed to get FCM token' };
      }

      this.currentToken = token;
      
      console.log('✅ FCM Token retrieved successfully');
      console.log('🔑 Token:', token);
      
      return { success: true, token };
    } catch (error) {
      console.error('❌ Failed to get FCM token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Register the FCM token with TalkJS
   * 
   * NOTE: When using @talkjs/expo with enablePushNotifications={true},
   * TalkJS automatically handles token registration. This method is for
   * debugging and verification purposes only.
   * 
   * For manual registration via REST API, tokens should be registered through
   * your backend, not directly from the mobile app (to keep the secret key secure).
   */
  async registerTokenWithTalkJS(
    userId: string, 
    fcmToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get token if not provided
      const token = fcmToken || this.currentToken;
      
      if (!token) {
        const tokenResult = await this.getFCMToken();
        if (!tokenResult.success || !tokenResult.token) {
          return { success: false, error: 'No FCM token available' };
        }
      }

      console.log('ℹ️ Token registration info:');
      console.log('   User ID:', userId);
      console.log('   Token:', token?.substring(0, 20) + '...');
      console.log('');
      console.log('   ✅ When using @talkjs/expo with enablePushNotifications={true},');
      console.log('   ✅ TalkJS automatically registers your push token.');
      console.log('   ✅ No manual registration needed!');
      console.log('');
      console.log('   📍 To verify token is registered:');
      console.log('   1. Go to TalkJS Dashboard: https://talkjs.com/dashboard');
      console.log('   2. Navigate to: Users → [Your User]');
      console.log('   3. Check "Push Tokens" section');
      console.log('   4. Your FCM token should appear there automatically');
      console.log('');

      // Return success - TalkJS Expo SDK handles registration automatically
      return { 
        success: true, 
        error: undefined 
      };
    } catch (error) {
      console.error('❌ Error checking token info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if Firebase messaging is available (native build)
   */
  isFirebaseAvailable(): boolean {
    try {
      require('@react-native-firebase/messaging');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup token refresh listener
   * 
   * NOTE: @talkjs/expo automatically handles token refresh and re-registration.
   * You don't need to manually listen for token changes - TalkJS Expo SDK does this
   * automatically when you have enablePushNotifications={true} in your Session.
   */
  async setupTokenRefreshListener(
    userId: string,
    onTokenRefresh?: (token: string) => void
  ): Promise<void> {
    console.log('ℹ️ Token refresh is handled automatically by @talkjs/expo');
    console.log('   When enablePushNotifications={true} in Session:');
    console.log('   ✅ TalkJS monitors for token changes');
    console.log('   ✅ TalkJS automatically updates your push token');
    console.log('   ✅ No manual listener needed!');
  }

  /**
   * Get cached token (if available)
   */
  getCachedToken(): string | null {
    return this.currentToken;
  }

  /**
   * Log token for debugging
   */
  async logTokenForDebugging(): Promise<void> {
    const result = await this.getFCMToken();
    
    if (result.success && result.token) {
      console.log('\n' + '='.repeat(80));
      console.log('📋 FCM TOKEN FOR DEBUGGING');
      console.log('='.repeat(80));
      console.log('Token:', result.token);
      console.log('');
      console.log('📍 How to use this token:');
      console.log('1. Copy the token above');
      console.log('2. Go to TalkJS Dashboard: https://talkjs.com/dashboard');
      console.log('3. Navigate to: Users → [Your User] → Push Tokens');
      console.log('4. Verify this token is registered');
      console.log('');
      console.log('🧪 To test push notifications:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com');
      console.log('2. Cloud Messaging → Send test message');
      console.log('3. Paste this token and send');
      console.log('='.repeat(80) + '\n');
    } else {
      console.error('❌ Could not get token for debugging:', result.error);
    }
  }
}

export const fcmTokenService = new FCMTokenService();

