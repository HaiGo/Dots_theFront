import { Image } from 'expo-image';
import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../../config/api';
import { socialService } from '../../services/socialService';

export default function TabLayout() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const result = await socialService.getProfile();
      if (result.success && result.data) {
        setUserProfile(result.data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 100 : 88,
          backgroundColor: '#e9e9e9',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 12,
          paddingHorizontal: 0,
          // Only show tab bar on map screen
          display: route.name === 'index' ? 'flex' : 'none',
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999',
        tabBarShowLabel: false,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          href: null, // Don't show as a tab, but it's the main screen
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Image
                source={require('../../assets/images/chat_icon.png')}
                style={styles.tabIcon}
                contentFit="contain"
              />
              <Text style={[styles.tabLabel, { color: focused ? '#000000' : '#000000' }]}>
                Chats
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <View style={[styles.cameraButtonInner, focused && styles.cameraButtonActive]}>
                <Image
                  source={require('../../assets/images/camera_logo.png')}
                  style={styles.cameraIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.tabLabel, { color: focused ? '#000000' : '#000000' }]}>
                Camera
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              {userProfile?.profile_picture_url ? (
                <Image
                  source={{ uri: userProfile.profile_picture_url }}
                  style={styles.profileAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarText}>
                    {userProfile?.userid?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <Text style={[styles.tabLabel, { color: focused ? '#000000' : '#000000' }]}>
                Profile
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide this tab
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
    height: 90,
  },
  tabIcon: {
    width: 45,
    height: 45,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  cameraButtonInner: {
    width: 77,
    height: 77,
    borderRadius: 38.5,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9e9e9',
  },
  cameraButtonActive: {
    backgroundColor: '#a8e05f',
  },
  cameraIcon: {
    width: 40,
    height: 40,
  },
  profileAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
  },
  profileAvatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
});
