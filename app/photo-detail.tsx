import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image as ExpoImage } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import ViewShot from 'react-native-view-shot';
import { FriendData } from '../config/api';
import { Frame, frameService } from '../services/frameService';
import { photoService } from '../services/photoService';
import { socialService } from '../services/socialService';
import { talkjsService } from '../services/talkjsService';

const { width, height } = Dimensions.get('window');

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Portrait dimensions for consistent frame sizing
const PORTRAIT_WIDTH = 720;
const PORTRAIT_HEIGHT = 1280;

// Helper function to clean image URLs (same as index.tsx)
const cleanImageUrl = (url: string) => {
  return url.replace(':443/', '/').replace(':80/', '/');
};

export default function PhotoDetailScreen() {
  const { photoUrl, frameFolder, showAllFrames } = useLocalSearchParams<{ 
    photoUrl: string; 
    frameFolder?: string;
    showAllFrames?: string;
  }>();

  const viewShotRef = useRef<ViewShot>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(-1); // -1 means no frame
  const [isSaving, setIsSaving] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Sharing functionality state
  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Load frames on mount - ALWAYS load frames regardless of parameters
  React.useEffect(() => {
    console.log('=== FRAME LOADING START ===');
    console.log('Params received:', { showAllFrames, frameFolder });
    
    // Get all available categories
    const allCategories = frameService.getAllCategories();
    console.log('Total categories available:', allCategories.length);
    console.log('Categories:', allCategories.map(cat => `${cat.id} (${cat.frames.length} frames)`));
    
    if (allCategories.length === 0) {
      console.error('❌ NO FRAME CATEGORIES FOUND! Check assets/frames/');
      setFrames([]);
      setCurrentFrameIndex(-1);
      return;
    }

    // Determine which frames to load
    let framesToLoad: Frame[] = [];
    let selectedCat = '';
    
    // Try specific category first (if provided and valid)
    if (frameFolder && frameFolder.trim() !== '') {
      console.log(`Checking for category: "${frameFolder}"`);
      const categoryFrames = frameService.getFramesForCategory(frameFolder);
      
      if (categoryFrames && categoryFrames.length > 0) {
        console.log(`✅ Found ${categoryFrames.length} frames in category "${frameFolder}"`);
        framesToLoad = categoryFrames;
        selectedCat = frameFolder;
      } else {
        console.log(`⚠️ Category "${frameFolder}" not found or empty, using first category as fallback`);
      }
    }
    
    // Fallback: Use first available category
    if (framesToLoad.length === 0) {
      const firstCategory = allCategories[0];
      framesToLoad = firstCategory.frames;
      selectedCat = firstCategory.id;
      console.log(`Using first category: "${firstCategory.id}" with ${firstCategory.frames.length} frames`);
    }
    
    // Set state
    setCategories(allCategories.map(cat => cat.id));
    setSelectedCategory(selectedCat);
    setFrames(framesToLoad);
    setCurrentFrameIndex(-1);
    
    console.log(`✅ FINAL: Loaded ${framesToLoad.length} frames from "${selectedCat}"`);
    console.log('Frame IDs:', framesToLoad.map(f => f.id));
    console.log('=== FRAME LOADING END ===\n');
  }, [frameFolder, showAllFrames]);

  // Request media library permissions (photos only, no audio)
  // Skip in Expo Go on Android due to permission limitations
  React.useEffect(() => {
    if (isExpoGo && Platform.OS === 'android') {
      // Expo Go on Android doesn't support media library
      setHasMediaPermission(false);
      return;
    }
    
    (async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(false);
        setHasMediaPermission(status === 'granted');
      } catch (error) {
        console.warn('Media library permission error:', error);
        setHasMediaPermission(false);
      }
    })();
  }, []);

  // Handle frame selection
  const handleFrameSelect = (index: number) => {
    setCurrentFrameIndex(index);
  };

  // Handle swipe gestures
  const handleGesture = (event: any) => {
    const { translationX } = event.nativeEvent;
    
    if (frames.length === 0) return;

    // Swipe left (next frame)
    if (translationX < -50) {
      setCurrentFrameIndex((prev) => {
        if (prev < frames.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }
    // Swipe right (previous frame)
    else if (translationX > 50) {
      setCurrentFrameIndex((prev) => {
        if (prev > -1) {
          return prev - 1;
        }
        return prev;
      });
    }
  };

  // Save composited image to gallery
  const handleSave = async () => {
    // Check if running in Expo Go on Android
    if (isExpoGo && Platform.OS === 'android') {
      Alert.alert(
        'Development Build Required',
        'Saving to gallery is not supported in Expo Go on Android.\n\n' +
        'To test this feature:\n' +
        '1. Run: npx expo run:android\n' +
        '2. Or test on iOS\n' +
        '3. Or create a development build',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!hasMediaPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant permission to save photos to your gallery.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              try {
                const { status } = await MediaLibrary.requestPermissionsAsync(false);
                setHasMediaPermission(status === 'granted');
                if (status === 'granted') {
                  handleSave();
                }
              } catch (error) {
                console.error('Permission error:', error);
                Alert.alert('Error', 'Failed to request permissions');
              }
            }
          }
        ]
      );
      return;
    }

    try {
      setIsSaving(true);

      // Capture the composited view as an image at portrait size
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(uri);
        
        Alert.alert(
          'Success!',
          'Photo saved to your gallery',
          [
            { text: 'OK' }
          ]
        );
      } else {
        throw new Error('View shot reference not available');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Switch between frame categories (for gallery mode)
  const handleCategoryChange = (direction: 'next' | 'prev') => {
    if (categories.length === 0) return;
    
    const currentIndex = categories.indexOf(selectedCategory);
    let newIndex = currentIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % categories.length;
    } else {
      newIndex = currentIndex === 0 ? categories.length - 1 : currentIndex - 1;
    }
    
    const newCategory = categories[newIndex];
    setSelectedCategory(newCategory);
    const newFrames = frameService.getFramesForCategory(newCategory);
    setFrames(newFrames);
    setCurrentFrameIndex(-1); // Reset to no frame
  };

  // Load friends for sharing
  const loadFriends = async () => {
    setLoadingFriends(true);
    const result = await socialService.getFriends();
    
    if (result.success && result.data) {
      setFriends(result.data);
    } else {
      console.warn('Failed to load friends:', result.error);
      setFriends([]);
    }
    
    setLoadingFriends(false);
  };

  // Handle share button click
  const handleShare = async () => {
    // Load friends when share modal opens
    await loadFriends();
    setSelectedFriends(new Set());
    setShowShareModal(true);
  };

  // Toggle friend selection
  const toggleFriendSelection = (friendUserid: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendUserid)) {
        newSet.delete(friendUserid);
      } else {
        newSet.add(friendUserid);
      }
      return newSet;
    });
  };

  // Send photo to selected friends
  const handleSendToFriends = async () => {
    if (selectedFriends.size === 0) {
      Alert.alert('No Friends Selected', 'Please select at least one friend to share with');
      return;
    }

    try {
      setIsSharing(true);

      console.log('Starting photo sharing process...');
      console.log('Selected friends:', Array.from(selectedFriends));

      // 1. Capture the composited image
      if (!viewShotRef.current || !viewShotRef.current.capture) {
        throw new Error('View shot reference not available');
      }

      console.log('Capturing composited image...');
      const uri = await viewShotRef.current.capture();
      console.log('Image captured:', uri);
      
      // 2. Upload the photo to get a URL
      console.log('Uploading photo to server...');
      const uploadResult = await photoService.uploadPhoto(uri);
      console.log('Upload result:', uploadResult);
      
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload photo');
      }

      // Clean the photo URL (remove :443 port issue)
      const rawPhotoUrl = uploadResult.data.url;
      const photoUrl = cleanImageUrl(rawPhotoUrl);
      console.log('Photo uploaded successfully:', photoUrl);
      console.log('Original URL:', rawPhotoUrl);
      console.log('Cleaned URL:', photoUrl);

      // 3. Send to each selected friend via TalkJS
      console.log('Sending to friends via TalkJS...');
      const sendPromises = Array.from(selectedFriends).map(async (friendUserid) => {
        console.log(`Sending to friend: ${friendUserid}`);
        const result = await talkjsService.sendPhotoMessage(friendUserid, photoUrl);
        console.log(`Result for ${friendUserid}:`, result);
        return result;
      });

      const results = await Promise.all(sendPromises);
      console.log('All results:', results);
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(`Success: ${successCount}, Failed: ${failedCount}`);

      if (failedCount === 0) {
        Alert.alert(
          'Success!',
          `Photo shared with ${selectedFriends.size} friend${selectedFriends.size > 1 ? 's' : ''}. You can continue editing or share again.`,
          [{ text: 'OK', onPress: () => {
            setShowShareModal(false);
            setSelectedFriends(new Set()); // Clear selection for next share
          }}]
        );
      } else if (successCount === 0) {
        // All failed - show first error message
        const firstError = results.find(r => !r.success)?.error || 'Unknown error';
        Alert.alert(
          'Failed to Send',
          firstError,
          [{ text: 'OK', onPress: () => setShowShareModal(false) }]
        );
      } else {
        // Partially sent
        Alert.alert(
          'Partially Sent',
          `Photo sent to ${successCount} out of ${results.length} friends. You can try again with the failed ones.`,
          [{ text: 'OK', onPress: () => setShowShareModal(false) }]
        );
      }
    } catch (error) {
      console.error('Error sharing photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to share photo';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSharing(false);
    }
  };

  const currentFrame = currentFrameIndex >= 0 ? frames[currentFrameIndex] : null;
  const currentCategoryInfo = selectedCategory ? frameService.getCategory(selectedCategory) : null;

  // Clean the photo URL (same as index.tsx)
  const cleanedPhotoUrl = photoUrl ? cleanImageUrl(String(photoUrl)) : '';

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Frame</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButtonTop}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#000000" />
            )}
          </TouchableOpacity>
        </View>

        {/* Photo Preview - Fills remaining space */}
        <PanGestureHandler
          onEnded={handleGesture}
          activeOffsetX={[-10, 10]}
        >
          <View style={styles.photoPreview}>
            <View style={styles.photoFrame}>
              <ViewShot 
                ref={viewShotRef}
                options={{ 
                  format: 'jpg', 
                  quality: 0.9,
                  width: PORTRAIT_WIDTH,
                  height: PORTRAIT_HEIGHT,
                }}
                style={styles.viewShot}
              >
                {/* Base Photo - Using same pattern as index.tsx gallery */}
                <Image
                  source={{ uri: cleanedPhotoUrl }}
                  style={styles.photoImg}
                  resizeMode="cover"
                  resizeMethod="resize"
                />

                {/* Frame Overlay */}
                {currentFrame && (
                  <Image
                    source={frameService.getFrameSource(currentFrame)}
                    style={styles.frameOverlay}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                )}
              </ViewShot>
            </View>
          </View>
        </PanGestureHandler>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Debug Info - Remove after testing */}
          {frames.length === 0 && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                ⚠️ No frames loaded! Category: "{selectedCategory || 'none'}"
              </Text>
            </View>
          )}
          
          {/* Frame Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.frameSelector}
          >
            {/* No Frame Option */}
            <TouchableOpacity
              style={styles.frameOption}
              onPress={() => handleFrameSelect(-1)}
            >
              <View style={[
                styles.frameCircle,
                currentFrameIndex === -1 && styles.frameCircleSelected
              ]}>
                <Text style={[
                  styles.frameNumber,
                  currentFrameIndex === -1 && styles.frameNumberSelected
                ]}>
                  0
                </Text>
              </View>
            </TouchableOpacity>

            {/* Frame Options */}
            {frames.map((frame, index) => (
              <TouchableOpacity
                key={index}
                style={styles.frameOption}
                onPress={() => handleFrameSelect(index)}
              >
                <View style={[
                  styles.frameCircle,
                  currentFrameIndex === index && styles.frameCircleSelected
                ]}>
                  <Text style={[
                    styles.frameNumber,
                    currentFrameIndex === index && styles.frameNumberSelected
                  ]}>
                    {index + 1}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color="#000000" />
                <Text style={styles.shareBtnText}>Share with Friends</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Share Modal */}
        <Modal
          visible={showShareModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share with Friends</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowShareModal(false)}
                >
                  <Ionicons name="close" size={28} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Friends List */}
              {loadingFriends ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#C1FF72" />
                  <Text style={styles.modalLoadingText}>Loading friends...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="people-outline" size={80} color="#ccc" />
                  <Text style={styles.modalEmptyText}>No friends yet</Text>
                  <Text style={styles.modalEmptySubtext}>Add friends to share photos with them</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={friends}
                    keyExtractor={(item) => item.userid}
                    contentContainerStyle={styles.friendsList}
                    renderItem={({ item }) => {
                      const isSelected = selectedFriends.has(item.userid);
                      return (
                        <TouchableOpacity
                          style={[
                            styles.friendItem,
                            isSelected && styles.friendItemSelected
                          ]}
                          onPress={() => toggleFriendSelection(item.userid)}
                        >
                          {item.profile_picture_url ? (
                            <ExpoImage
                              source={{ uri: item.profile_picture_url }}
                              style={styles.friendAvatar}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.friendAvatar}>
                              <Text style={styles.friendAvatarText}>
                                {item.userid.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>@{item.userid}</Text>
                            <Text style={styles.friendEmail}>{item.email}</Text>
                          </View>
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected
                          ]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={18} color="#000000" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />

                  {/* Send Button */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        selectedFriends.size === 0 && styles.sendButtonDisabled
                      ]}
                      onPress={handleSendToFriends}
                      disabled={isSharing || selectedFriends.size === 0}
                    >
                      {isSharing ? (
                        <ActivityIndicator color="#000000" />
                      ) : (
                        <Text style={styles.sendButtonText}>
                          Send to {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Expo Go Warning (Android Only) */}
        {isExpoGo && Platform.OS === 'android' && (
          <View style={styles.expoGoWarning}>
            <Text style={styles.expoGoWarningText}>
              ⚠️ Expo Go Mode: Save feature disabled
            </Text>
            <Text style={styles.expoGoWarningSubtext}>
              Run: npx expo run:android for full features
            </Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    marginBottom: 10,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 60 : 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  saveButtonTop: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 60 : 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  // Photo Preview
  photoPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
    marginBottom: 5,
  },
  photoFrame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewShot: {
    width: width - 40,
    aspectRatio: PORTRAIT_WIDTH / PORTRAIT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  frameOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  // Bottom Section
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 10,
  },
  debugInfo: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  debugText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Frame Selector
  frameSelector: {
    gap: 31,
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  frameOption: {
    alignItems: 'center',
    gap: 4,
  },
  frameCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  frameCircleSelected: {
    borderColor: '#C1FF72',
    borderWidth: 3,
    backgroundColor: '#C1FF72',
  },
  frameNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  frameNumberSelected: {
    color: '#000000',
  },
  frameLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  frameLabelSelected: {
    color: '#000000',
  },
  // Share Button
  shareBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#C1FF72',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  shareBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Expo Go Warning
  expoGoWarning: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 153, 0, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 20,
  },
  expoGoWarningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  expoGoWarningSubtext: {
    color: '#fff',
    fontSize: 12,
  },
  // Share Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  modalEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  friendsList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendItemSelected: {
    backgroundColor: '#f0ffe0',
    borderColor: '#C1FF72',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  friendEmail: {
    fontSize: 14,
    color: '#666666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cccccc',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#C1FF72',
    borderColor: '#C1FF72',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  sendButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#C1FF72',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
