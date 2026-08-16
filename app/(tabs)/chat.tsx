import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apnsTokenService } from '../../services/apnsTokenService';
import { authService } from '../../services/authService';
import { fcmTokenService } from '../../services/fcmTokenService';
import { socialService } from '../../services/socialService';
import { talkjsService } from '../../services/talkjsService';
import { hasNativeFeatures } from '../../utils/platformUtils';

// Conditionally import TalkJS - only available in development/production builds
let TalkRn: any = null;
if (hasNativeFeatures()) {
  try {
    TalkRn = require('@talkjs/expo');
    console.log('✅ TalkJS SDK loaded');
  } catch (error) {
    console.warn('⚠️ TalkJS not available:', error);
  }
}

// Configuration loaded from environment variables (see .env.example)
const TALKJS_APP_ID = process.env.EXPO_PUBLIC_TALKJS_APP_ID || '';

// Brand color
const BRAND_COLOR = '#C1FF72';
const BRAND_COLOR_DARK = '#a8e05f';
const DARK_BG = '#040112';

// Cache for user sync status - prevents redundant API calls
const userSyncCache = new Map<string, boolean>();

// Helper function to validate E.164 phone format
const isValidE164Phone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  // E.164 format: starts with +, followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

// Simplified TalkJS theme for faster loading
// Only customize the most important colors
const customTheme = {
  custom: {
    accentColor: BRAND_COLOR,
    accentTextColor: '#000000',
  }
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ otherUserId?: string; otherUserEmail?: string; otherUserName?: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversationBuilder, setConversationBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Smart back button handler
  const handleBackPress = () => {
    // If we're viewing a specific conversation, go back to conversation list
    if (conversationBuilder || params.otherUserId) {
      // Clear the conversation builder
      setConversationBuilder(null);
      // If we came from another screen with params, clear them
      if (params.otherUserId) {
        router.push('/(tabs)/chat');
      }
    } else {
      // Otherwise, go back to previous screen
      router.back();
    }
  };

  // Refresh conversations handler
  const handleRefresh = async () => {
    if (conversationBuilder || isRefreshing) {
      // Don't refresh while in a conversation or already refreshing
      return;
    }
    
    console.log('🔄 Refreshing conversations...');
    setIsRefreshing(true);
    
    // Start spinning animation
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Change the key to force TalkJS Session to remount
    // This will reload all conversations
    setRefreshKey(prev => prev + 1);
    
    // Wait a bit for the refresh to complete
    setTimeout(() => {
      spinValue.stopAnimation();
      spinValue.setValue(0);
      setIsRefreshing(false);
      console.log('✅ Conversations refreshed');
    }, 1500);
  };

  useEffect(() => {
    console.log('🚀 Chat screen mounted');
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser && params.otherUserId && params.otherUserEmail) {
      console.log('🔄 Switching to direct conversation');
      setupConversation();
    } else {
      // Clear conversation builder when params are cleared
      setConversationBuilder(null);
    }
  }, [currentUser, params.otherUserId, params.otherUserEmail]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [conversationBuilder, params.otherUserId]);

  const loadUser = async () => {
    try {
      console.log('📝 Loading user for TalkJS...');
      
      // Check auth status with validation
      const authStatus = await authService.checkAuthStatus(false);
      if (!authStatus.isAuthenticated) {
        console.log('❌ Not authenticated');
        router.replace('/(auth)/login');
        return;
      }
      
      const token = await authService.loadToken();
      if (!token) {
        console.log('❌ No auth token');
        router.replace('/(auth)/login');
        return;
      }

      // Get user profile from backend
      const profileResult = await socialService.getProfile();
      
      if (profileResult.success && profileResult.data) {
        const userData = profileResult.data;
        const userId = userData.userid || userData.email || `user_${userData.id}`;
        
        // Create TalkJS user object FIRST (don't block UI on sync)
        const talkUser: any = {
          id: userId,
          name: userId,
          email: userData.email,
          photoUrl: userData.profile_picture_url,
          role: 'default',
        };
        
        // Only include phone if it's in E.164 format
        if (userData.phone_number && isValidE164Phone(userData.phone_number)) {
          talkUser.phone = userData.phone_number;
        }
        
        console.log('✅ User loaded:', userId);
        setCurrentUser(talkUser);
        setLoading(false); // Show UI immediately!
        
        // Sync user with TalkJS in background (non-blocking, cached)
        // Only sync once per user per session
        if (!userSyncCache.has(userId)) {
          console.log('🔄 Syncing user with TalkJS (background)...');
          talkjsService.syncUser(userId, userData.email, userId).then(() => {
            userSyncCache.set(userId, true);
            console.log('✅ User synced in background');
          }).catch(err => {
            console.warn('⚠️ Background user sync failed:', err);
          });
        } else {
          console.log('✅ User already synced (cached)');
        }

        // Setup push notifications in background (non-blocking)
        if (hasNativeFeatures()) {
          if (Platform.OS === 'android') {
            // Android: Setup FCM (Firebase Cloud Messaging)
            Promise.all([
              fcmTokenService.logTokenForDebugging(),
              fcmTokenService.registerTokenWithTalkJS(userId),
              fcmTokenService.setupTokenRefreshListener(userId)
            ]).then(() => {
              console.log('✅ Android push notifications ready (FCM)');
            }).catch(fcmError => {
              console.warn('⚠️ FCM setup warning:', fcmError);
            });
          } else if (Platform.OS === 'ios') {
            // iOS: Setup APNs (Apple Push Notification service)
            Promise.all([
              apnsTokenService.logTokenForDebugging(),
              apnsTokenService.registerTokenWithTalkJS(userId),
              apnsTokenService.setupTokenRefreshListener(userId)
            ]).then(() => {
              console.log('✅ iOS push notifications ready (APNs)');
            }).catch(apnsError => {
              console.warn('⚠️ APNs setup warning:', apnsError);
            });
          }
        }
      } else {
        // Profile might not exist yet, use email as fallback
        const tempUserId = `temp_${Date.now()}`;
        const talkUser: any = {
          id: tempUserId,
          name: tempUserId,
          email: 'temp@user.com',
          role: 'default',
        };
        console.log('⚠️ Using temporary user:', tempUserId);
        setCurrentUser(talkUser);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Failed to load user:', error);
      
      // Don't redirect, use fallback identity
      const tempUserId = `temp_${Date.now()}`;
      const talkUser: any = {
        id: tempUserId,
        name: tempUserId,
        email: 'temp@user.com',
        role: 'default',
      };
      setCurrentUser(talkUser);
      setLoading(false);
    }
  };

  const setupConversation = async () => {
    if (!currentUser || !params.otherUserId || !params.otherUserEmail || !TalkRn) {
      console.log('⚠️ Missing required data for conversation setup');
      return;
    }

    try {
      console.log('🔄 Setting up conversation with:', params.otherUserId);
      
      // Create the other user
      const otherUser: any = {
        id: params.otherUserId,
        name: params.otherUserName || params.otherUserEmail.split('@')[0],
        email: params.otherUserEmail,
        role: 'default',
      };

      // Get conversation ID
      const conversationId = TalkRn.oneOnOneId(currentUser, otherUser);
      console.log('📝 Conversation ID:', conversationId);
      
      // Get conversation builder for UI IMMEDIATELY (don't wait for backend)
      const builder = TalkRn.getConversationBuilder(conversationId);
      
      // Set participants
      builder.setParticipant(currentUser);
      builder.setParticipant(otherUser);
      
      // Show conversation IMMEDIATELY
      setConversationBuilder(builder);
      console.log('✅ Conversation UI ready:', conversationId);
      
      // Create conversation on backend in background (non-blocking)
      // This ensures notifications work, but doesn't block UI
      talkjsService.ensureConversation(
        conversationId,
        currentUser.id,
        otherUser.id,
        currentUser.email,
        otherUser.email,
        currentUser.name,
        otherUser.name
      ).then(conversationResult => {
        if (conversationResult.success) {
          console.log('✅ Conversation verified on backend');
        } else {
          console.warn('⚠️ Backend conversation creation failed:', conversationResult.error);
        }
      }).catch(error => {
        console.warn('⚠️ Background conversation setup error:', error);
      });
    } catch (error) {
      console.error('❌ Failed to setup conversation:', error);
    }
  };

  if (loading || !currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {conversationBuilder ? params.otherUserName || 'Chat' : 'Messages'}
        </Text>
        <View style={styles.headerButtons}>
          {!conversationBuilder && (
            <TouchableOpacity
              style={[styles.refreshButton, isRefreshing && styles.refreshButtonActive]}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}
              >
                <Ionicons 
                  name="refresh" 
                  size={24} 
                  color={isRefreshing ? BRAND_COLOR : '#fff'} 
                />
              </Animated.View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/search-users')}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TalkJS Chat UI - Native SDK */}
      <View style={styles.chatContainer}>
        {TalkRn ? (
          <>
            
            <TalkRn.Session 
              key={refreshKey}
              appId={TALKJS_APP_ID} 
              me={currentUser}
              enablePushNotifications={true}
              syncInterval={5000}
            >
              {conversationBuilder ? (
                <TalkRn.Chatbox
                  conversationBuilder={conversationBuilder}
                  showChatHeader={true}
                  style={styles.chatbox}
                />
              ) : (
                <TalkRn.ConversationList
                  showFeedHeader={true}
                  style={styles.conversationList}
                  onSelectConversation={(event: any) => {
                    try {
                      const others = event.others;
                      if (others && others.length > 0) {
                        const otherUserRaw = others[0];
                        const conversationId = event.conversation.id;
                        
                        console.log('🔄 Opening conversation:', conversationId);
                        
                        // Create sanitized other user object (remove invalid phone)
                        const otherUser: any = {
                          id: otherUserRaw.id,
                          name: otherUserRaw.name,
                          email: otherUserRaw.email,
                          role: otherUserRaw.role || 'default',
                        };
                        
                        // Only include optional fields if they're valid
                        if (otherUserRaw.photoUrl) {
                          otherUser.photoUrl = otherUserRaw.photoUrl;
                        }
                        
                        // Validate phone number before including it
                        if (otherUserRaw.phone && isValidE164Phone(otherUserRaw.phone)) {
                          otherUser.phone = otherUserRaw.phone;
                        }
                        
                        // Create conversation builder IMMEDIATELY (don't block UI)
                        const builder = TalkRn.getConversationBuilder(conversationId);
                        builder.setParticipant(currentUser);
                        builder.setParticipant(otherUser);
                        
                        setConversationBuilder(builder);
                        console.log('✅ Conversation opened:', conversationId);
                        
                        // Ensure conversation exists on backend in background (non-blocking)
                        talkjsService.ensureConversation(
                          conversationId,
                          currentUser.id,
                          otherUser.id,
                          currentUser.email,
                          otherUser.email,
                          currentUser.name,
                          otherUser.name
                        ).then(conversationResult => {
                          if (conversationResult.success) {
                            console.log('✅ Conversation verified on backend');
                          } else {
                            console.warn('⚠️ Backend verification failed:', conversationResult.error);
                          }
                        }).catch(error => {
                          console.warn('⚠️ Background verification error:', error);
                        });
                      }
                    } catch (error) {
                      console.error('❌ Failed to open conversation:', error);
                    }
                  }}
                />
              )}
            </TalkRn.Session>
          </>
        ) : (
          <View style={styles.expoGoWarning}>
            <Ionicons name="information-circle" size={64} color={BRAND_COLOR} />
            <Text style={styles.warningTitle}>Native Build Required</Text>
            <Text style={styles.warningText}>
              Chat features require a development build and are not available in Expo Go.
            </Text>
            <Text style={styles.warningSubtext}>
              TalkJS uses native modules that need to be compiled into your app.
            </Text>
            <TouchableOpacity
              style={styles.buildButton}
              onPress={() => {
                Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/');
              }}
            >
              <Text style={styles.buildButtonText}>Learn About Development Builds</Text>
              <Ionicons name="open-outline" size={16} color="#000" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            <View style={styles.commandBox}>
              <Text style={styles.commandLabel}>Build command:</Text>
              <Text style={styles.commandText}>eas build --profile development --platform android</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#040112',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonActive: {
    backgroundColor: 'rgba(193, 255, 114, 0.2)',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(193, 255, 114, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatbox: {
    flex: 1,
  },
  conversationList: {
    flex: 1,
  },
  expoGoWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C1FF72',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  buildButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  commandBox: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  commandLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  commandText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
