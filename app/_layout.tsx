import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { batteryOptimization } from '../utils/batteryOptimization';
import { hasNativeFeatures } from '../utils/platformUtils';
import CustomSplashScreen from './_splash';

// Keep the native splash screen visible while we load
SplashScreen.preventAutoHideAsync();

// ===== TALKJS PUSH NOTIFICATION SETUP =====
// CRITICAL: Register TalkJS push notification handlers
// This MUST be called at app level (not inside any component)
if (hasNativeFeatures()) {
  try {
    const TalkRn = require('@talkjs/expo');
    
    console.log('🔔 Registering TalkJS push notification handlers...');
    
    // Platform-specific configuration
    const platformConfig = Platform.OS === 'android' 
      ? { useFirebase: true }  // Android: Use Firebase Cloud Messaging
      : { useFirebase: false }; // iOS: Use APNs (Apple Push Notification service)
    
    // Register handlers - this is REQUIRED for TalkJS notifications to work!
    TalkRn.registerPushNotificationHandlers(
      {
        channelId: 'com.dots.app',
        channelName: 'Messages',
        badge: true,
      },
      platformConfig
    );
    
    console.log(`✅ TalkJS push notification handlers registered for ${Platform.OS}!`);
    if (Platform.OS === 'android') {
      console.log('   📱 Using Firebase Cloud Messaging (FCM)');
    } else if (Platform.OS === 'ios') {
      console.log('   🍎 Using Apple Push Notification service (APNs)');
    }
  } catch (error) {
    console.error('❌ Failed to register TalkJS handlers:', error);
  }
}

// ===== CUSTOM BACKGROUND MESSAGE HANDLER (for debugging) =====
// This is optional - mainly for logging
// TalkJS handlers above will handle the actual notifications
if (hasNativeFeatures() && Platform.OS === 'android') {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const notifee = require('@notifee/react-native').default;
    
    console.log('🔧 Setting up background message handler...');
    
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('\n🔔 BACKGROUND MESSAGE RECEIVED!');
      console.log('================================================================================');
      console.log('Time:', new Date().toLocaleTimeString());
      console.log('Raw Data:', JSON.stringify(remoteMessage.data, null, 2));
      console.log('================================================================================');
      
      try {
        // Parse TalkJS data
        let title = 'New Message';
        let body = 'You have a new message';
        
        if (remoteMessage.data?.talkjs) {
          const talkjsData = JSON.parse(remoteMessage.data.talkjs);
          console.log('📦 Parsed TalkJS Data:', JSON.stringify(talkjsData, null, 2));
          
          // Extract sender and message
          const senderName = talkjsData.sender?.name || 'Someone';
          const messageText = talkjsData.message?.text || talkjsData.body || 'New message';
          
          title = senderName;
          body = messageText;
          
          console.log('✅ Extracted - Title:', title);
          console.log('✅ Extracted - Body:', body);
        }
        
        // Create notification channel
        const channelId = await notifee.createChannel({
          id: 'talkjs_messages',
          name: 'TalkJS Messages',
          sound: 'default',
          importance: 4, // High importance
          vibration: true,
        });
        
        // Display notification
        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId,
            smallIcon: 'ic_launcher',
            importance: 4,
            pressAction: {
              id: 'default',
            },
            sound: 'default',
            vibrationPattern: [300, 500],
          },
        });
        
        console.log('✅ Background notification displayed successfully!');
        console.log('================================================================================\n');
      } catch (error) {
        console.error('❌ Error displaying background notification:', error);
      }
    });
    
    console.log('✅ Background message handler registered!');
    console.log('✅ Firebase configured for Android push notifications');
  } catch (error) {
    console.warn('⚠️ Firebase initialization warning:', error);
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Request push notification permissions
        await requestPushNotificationPermissions();
        
        // Keep splash screen visible for at least 2 seconds for branding
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ App ready - TalkJS push notifications enabled');
      } catch (e) {
        console.warn('App initialization error:', e);
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  async function requestPushNotificationPermissions() {
    try {
      if (Platform.OS === 'ios') {
        // Request iOS push notification permissions
        console.log('📱 Requesting iOS push notification permissions...');
        const authStatus = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
          lockScreen: true,
          notificationCenter: true,
        });
        console.log('✅ iOS notification permissions:', authStatus);
        
        // Setup iOS notification handlers
        if (hasNativeFeatures()) {
          try {
            // Set up notification event handlers for iOS
            PushNotificationIOS.addEventListener('notification', (notification: any) => {
              console.log('🔔 iOS Notification received:', notification);
            });
            
            PushNotificationIOS.addEventListener('localNotification', (notification: any) => {
              console.log('🔔 iOS Local notification:', notification);
            });
            
            console.log('✅ iOS notification handlers set up');
          } catch (iosError) {
            console.warn('⚠️ iOS notification handler setup warning:', iosError);
          }
        }
      } else if (Platform.OS === 'android') {
        // Request Android POST_NOTIFICATIONS permission (required for Android 13+)
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('Android notification permission:', granted);
        
        // Get and log FCM token for debugging
        if (granted === 'granted' && hasNativeFeatures()) {
          try {
            const messaging = require('@react-native-firebase/messaging').default;
            const token = await messaging().getToken();
            console.log('🔑 FCM Token:', token);
            console.log('📋 Copy this token to test push notifications');
            console.log('📍 Add this token to TalkJS Dashboard to verify registration');
            
            // Set up foreground message listener for debugging
            setupForegroundMessageListener(messaging);
            
            // Prompt for battery optimization after a delay (so user can see the app first)
            setTimeout(() => {
              promptForBatteryOptimization();
            }, 3000); // Wait 3 seconds after app opens
          } catch (fcmError) {
            console.warn('⚠️ Could not get FCM token (requires native build with Firebase):', fcmError);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to request notification permissions:', error);
    }
  }

  async function promptForBatteryOptimization() {
    try {
      // Check if we've already prompted and user dismissed
      const hasPrompted = await AsyncStorage.getItem('battery_optimization_prompted');
      const userDismissed = await AsyncStorage.getItem('battery_optimization_dismissed');
      
      // Don't show if user dismissed it, but show once per app install
      if (userDismissed === 'true') {
        console.log('ℹ️  User previously dismissed battery optimization prompt');
        return;
      }
      
      // Show prompt first time or if user hasn't set it up yet
      if (!hasPrompted || hasPrompted === 'false') {
        console.log('🔔 Showing battery optimization prompt...');
        
        // Mark as prompted
        await AsyncStorage.setItem('battery_optimization_prompted', 'true');
        
        // Show the guide
        batteryOptimization.showNotificationReliabilityGuide();
        
        // If user taps "Later", mark as dismissed (won't show again unless they clear app data)
        // The batteryOptimization utility handles the user interaction
      } else {
        console.log('ℹ️  Battery optimization already prompted on previous launch');
      }
    } catch (error) {
      console.warn('⚠️ Error checking battery optimization prompt status:', error);
    }
  }

  function setupForegroundMessageListener(messaging: any) {
    try {
      // Listen for messages when app is in foreground
      const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
        console.log('\n🔔 FOREGROUND NOTIFICATION RECEIVED!');
        console.log('================================================================================');
        console.log('Time:', new Date().toLocaleTimeString());
        console.log('Raw Data:', JSON.stringify(remoteMessage.data, null, 2));
        console.log('================================================================================');
        
        // Parse TalkJS data from the payload
        let title = 'New Message';
        let body = 'You have a new message';
        
        try {
          if (remoteMessage.data?.talkjs) {
            const talkjsData = JSON.parse(remoteMessage.data.talkjs);
            console.log('📦 Parsed TalkJS Data:', JSON.stringify(talkjsData, null, 2));
            
            // Extract sender and message
            const senderName = talkjsData.sender?.name || 'Someone';
            const messageText = talkjsData.message?.text || talkjsData.body || 'New message';
            
            title = senderName;
            body = messageText;
            
            console.log('✅ Extracted - Title:', title);
            console.log('✅ Extracted - Body:', body);
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse TalkJS data:', parseError);
        }
        
        console.log('✅ Firebase is delivering messages successfully!');
        console.log('📱 App is in FOREGROUND - Displaying notification banner...');
        console.log('');
        
        // Display local notification using Notifee (shows even in foreground!)
        try {
          const notifee = require('@notifee/react-native').default;
          
          // Create notification channel (required for Android)
          const channelId = await notifee.createChannel({
            id: 'talkjs_messages',
            name: 'TalkJS Messages',
            sound: 'default',
            importance: 4, // High importance
            vibration: true,
          });
          
          // Display the notification with sound and vibration
          await notifee.displayNotification({
            title,
            body,
            android: {
              channelId,
              smallIcon: 'ic_launcher',
              importance: 4,
              pressAction: {
                id: 'default',
              },
              sound: 'default',
              vibrationPattern: [300, 500],
              showTimestamp: true,
              timestamp: Date.now(),
            },
          });
          
          console.log('✅ Foreground notification displayed with banner!');
          console.log('🔔 You should see/hear the notification now');
        } catch (notifeeError) {
          console.error('❌ Could not display notification with Notifee:', notifeeError);
        }
        
        console.log('================================================================================\n');
      });
      
      console.log('✅ Foreground message listener active');
      console.log('   📱 Notifications will display even when app is open');
      console.log('   🔔 With sound, vibration, and banner');
      
      // Return unsubscribe function (optional - we want to keep it active)
      return unsubscribe;
    } catch (error) {
      console.warn('⚠️ Could not set up foreground message listener:', error);
    }
  }

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="gallery"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="search-users"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="change-password"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="photo-capture"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="photo-detail"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}

