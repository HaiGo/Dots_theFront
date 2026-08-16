import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { UserProfile } from '../../config/api';
import { authService } from '../../services/authService';
import { socialService } from '../../services/socialService';

// ========== DETAILED ENVIRONMENT LOGGING ==========
console.log('=== PROFILE SCREEN MODULE LOADING ===');
console.log('📱 App Ownership:', Constants.appOwnership);
console.log('📱 Is Expo Go?:', Constants.appOwnership === 'expo');
console.log('📱 Execution Environment:', Constants.executionEnvironment);
console.log('📱 Expo Runtime Version:', Constants.expoRuntimeVersion);
console.log('📱 Dev Client?:', Constants.expoConfig?.extra?.eas?.projectId ? 'YES (has project ID)' : 'NO');
console.log('📱 Platform:', Constants.platform);

// Dynamic import to prevent crash if module not in build
let ImagePicker: any = null;
let imagePickerLoadError: any = null;
try {
  console.log('🔍 Attempting to require("expo-image-picker")...');
  ImagePicker = require('expo-image-picker');
  console.log('✅ SUCCESS: expo-image-picker module loaded!');
  console.log('✅ Type:', typeof ImagePicker);
  console.log('✅ Has launchImageLibraryAsync?:', typeof ImagePicker.launchImageLibraryAsync);
  console.log('✅ Available methods:', Object.keys(ImagePicker).join(', '));
} catch (e) {
  imagePickerLoadError = e;
  console.error('❌ FAILED to load expo-image-picker!');
  console.error('❌ Error name:', (e as any)?.name);
  console.error('❌ Error message:', (e as any)?.message);
  console.error('❌ Error code:', (e as any)?.code);
  console.error('❌ Full error object:', e);
  console.warn('ImagePicker native module not available - rebuild APK to enable');
}

console.log('📊 Final ImagePicker status:', ImagePicker ? '✅ LOADED' : '❌ NOT LOADED');
if (!ImagePicker && imagePickerLoadError) {
  console.log('📊 Load failed because:', imagePickerLoadError?.message || 'Unknown reason');
}
console.log('=== END PROFILE MODULE LOADING ===\n');

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    const result = await socialService.getProfile();
    if (result.success && result.data) {
      setProfile(result.data);
    }
    setLoading(false);
  };

  const handlePickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        'Module Not Found',
        'expo-image-picker native module is not included in your build.\n\nPlease check:\n1. app.json has expo-image-picker plugin\n2. Build was done with --clear-cache\n3. Installed the LATEST built APK',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload profile picture');
        return;
      }

      // Add a small delay to ensure the launcher is properly registered
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        console.log('Uploading profile picture from URI:', result.assets[0].uri);
        const uploadResult = await socialService.uploadProfilePicture(result.assets[0].uri);
        
        if (uploadResult.success) {
          console.log('Profile picture uploaded successfully:', uploadResult.data);
          Alert.alert('Success', 'Profile picture updated!');
          // Reload profile to get new picture URL
          await loadProfile();
        } else {
          console.error('Failed to upload profile picture:', uploadResult.error);
          Alert.alert('Error', uploadResult.error || 'Failed to upload picture');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('ActivityResultLauncher')) {
        Alert.alert(
          'Image Picker Error',
          'There was an issue launching the image picker. Please try again or restart the app.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to pick image: ' + errorMessage);
      }
      setUploading(false);
    }
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      section: 'Social',
      items: [
        { icon: 'people', label: 'My Friends', onPress: () => router.push('/friends-list') },
        { icon: 'person-add', label: 'Find Contacts', onPress: () => router.push('/find-contacts') },
        { icon: 'search', label: 'Search Users', onPress: () => router.push('/search-users') },
      ],
    },
    {
      section: 'Account',
      items: [
        { icon: 'key-outline', label: 'Change Password', onPress: handleChangePassword },
      ],
    },
    {
      section: 'Content',
      items: [
        { icon: 'images-outline', label: 'My Photos', onPress: () => router.push('/gallery') },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        {loading ? (
          <ActivityIndicator size="large" color="#C1FF72" />
        ) : (
          <>
            <View style={styles.avatarContainer}>
              {profile?.profile_picture_url ? (
                <Image
                  source={{ uri: profile.profile_picture_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarPlaceholder}>
                    {profile?.userid?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handlePickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#000" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{profile?.userid || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          </>
        )}
      </View>

      {/* Settings List */}
      <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
        {settingsOptions.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.settingsItem}
                onPress={item.onPress}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={item.icon as any} size={20} color="#000" />
                  </View>
                  <Text style={styles.settingsItemLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666666" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={styles.logoutIconCircle}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerPlaceholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#C1FF72',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#a8e05f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 15,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  settingsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 5,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsItemLabel: {
    fontSize: 16,
    color: '#000000',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  bottomSpacer: {
    height: 100,
  },
});

