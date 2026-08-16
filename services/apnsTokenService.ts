// APNs Token Service for iOS
// Handles Apple Push Notification service token retrieval and registration with TalkJS
// Configuration is loaded from environment variables (see .env.example).

import { Platform } from 'react-native';

const TALKJS_APP_ID = process.env.EXPO_PUBLIC_TALKJS_APP_ID || '';

class APNsTokenService {
  private currentToken: string | null = null;

  /**
   * Get the current APNs device token from iOS
   * This is the token that TalkJS needs to send push notifications to iOS devices
   */
  async getAPNsToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (Platform.OS !== 'ios') {
        return { 
          success: false, 
          error: 'APNs tokens are only for iOS. Android uses FCM tokens.' 
        };
      }

      // Dynamically import PushNotificationIOS (only available in native iOS builds)
      const PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
      
      // Request device token (this is async and returns via event listener)
      return new Promise((resolve) => {
        // Set up listener for the device token
        PushNotificationIOS.addEventListener('register', (token: string) => {
          if (!token) {
            resolve({ success: false, error: 'Failed to get APNs token' });
            return;
          }

          this.currentToken = token;
          
          console.log('✅ APNs Token retrieved successfully');
          console.log('🔑 Token:', token);
          
          resolve({ success: true, token });
        });

        // Set up listener for registration errors
        PushNotificationIOS.addEventListener('registrationError', (error: any) => {
          console.error('❌ APNs registration error:', error);
          resolve({ 
            success: false, 
            error: error?.message || 'APNs registration failed' 
          });
        });

        // Request permissions and get token
        PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });
      });
    } catch (error) {
      console.error('❌ Failed to get APNs token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Register the APNs token with TalkJS
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
    apnsToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get token if not provided
      const token = apnsToken || this.currentToken;
      
      if (!token) {
        console.log('⏳ Requesting APNs token...');
        const tokenResult = await this.getAPNsToken();
        if (!tokenResult.success || !tokenResult.token) {
          return { success: false, error: 'No APNs token available' };
        }
      }

      console.log('ℹ️ iOS APNs Token registration info:');
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
      console.log('   4. Your APNs token should appear there automatically');
      console.log('');

      // Return success - TalkJS Expo SDK handles registration automatically
      return { 
        success: true, 
        error: undefined 
      };
    } catch (error) {
      console.error('❌ Error checking iOS token info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if PushNotificationIOS is available (native iOS build)
   */
  isAPNsAvailable(): boolean {
    try {
      if (Platform.OS !== 'ios') return false;
      require('@react-native-community/push-notification-ios');
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
    console.log('ℹ️ iOS Token refresh is handled automatically by @talkjs/expo');
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
    const result = await this.getAPNsToken();
    
    if (result.success && result.token) {
      console.log('\n' + '='.repeat(80));
      console.log('📋 APNs TOKEN FOR DEBUGGING (iOS)');
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
      console.log('1. Ensure you have uploaded your .p8 file to TalkJS Dashboard');
      console.log('2. Send a message from another user');
      console.log('3. You should receive a push notification on your iOS device');
      console.log('='.repeat(80) + '\n');
    } else {
      console.error('❌ Could not get iOS token for debugging:', result.error);
    }
  }

  /**
   * Request iOS push notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') {
        console.log('⚠️ requestPermissions is iOS-only');
        return false;
      }

      const PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
      
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
        lockScreen: true,
        notificationCenter: true,
      });

      console.log('✅ iOS notification permissions:', permissions);
      
      // Check if any permission was granted
      const granted = permissions.alert || permissions.badge || permissions.sound;
      return granted;
    } catch (error) {
      console.error('❌ Failed to request iOS permissions:', error);
      return false;
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions(): Promise<{
    alert: boolean;
    badge: boolean;
    sound: boolean;
  }> {
    try {
      if (Platform.OS !== 'ios') {
        return { alert: false, badge: false, sound: false };
      }

      const PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
      
      return new Promise((resolve) => {
        PushNotificationIOS.checkPermissions((permissions: any) => {
          resolve({
            alert: permissions.alert || false,
            badge: permissions.badge || false,
            sound: permissions.sound || false,
          });
        });
      });
    } catch (error) {
      console.error('❌ Failed to check iOS permissions:', error);
      return { alert: false, badge: false, sound: false };
    }
  }
}

export const apnsTokenService = new APNsTokenService();

