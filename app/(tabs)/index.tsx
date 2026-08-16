import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { FriendData, UserProfile } from '../../config/api';
import { socialService } from '../../services/socialService';

const { width, height } = Dimensions.get('window');

// Custom Map Style with your color palette
const materialMapStyle = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#BAE3F3' }], // Water / light blue areas
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#22484E' }], // Dark teal for water labels
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F8F8F6' }], // Light background roads / map base
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#F1F2EC' }], // Secondary background
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }], // Roads in white
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }], // Highways in white
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ffffff' }], // Road borders in white
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#72796F' }], // Dark indigo for road labels
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#B8B4A8' }], // Accent areas (beige) for POI
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#DEE8CB' }], // Parks / green areas (light)
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#72796F' }], // Dark indigo for POI labels
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    elementType: 'geometry',
    stylers: [{ color: '#22484E' }], // Building polygons (dark teal)
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#F1F2EC' }], // Secondary background for transit
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ffffff' }], // Borders in white
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#72796F' }], // Dark indigo for general labels
  },
];

// Helper function to calculate time ago
function getTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (error) {
    return 'Unknown';
  }
}

export default function HomeScreen() {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Add Friends Modal States
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Refs
  const mapRef = useRef<MapView>(null);
  const backPressCount = useRef(0);
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load friends and start location updates
  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
      loadFriends();
      loadLocationSettings();
      requestLocationPermission();
      
      return () => {
        // Cleanup when screen loses focus
      };
    }, [])
  );

  // Handle Android back button - press twice to exit
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      backPressCount.current += 1;

      if (backPressCount.current === 1) {
        // First press - show toast message
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        
        // Reset counter after 2 seconds
        backPressTimer.current = setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
        
        return true; // Prevent default back action
      } else {
        // Second press - exit app
        if (backPressTimer.current) {
          clearTimeout(backPressTimer.current);
        }
        BackHandler.exitApp();
        return false;
      }
    });

    return () => {
      backHandler.remove();
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, []);

  // Set up location updates
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const setupLocationUpdates = async () => {
      if (locationSharingEnabled) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Update location every 30 seconds
            locationSubscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 30000, // 30 seconds
                distanceInterval: 50, // 50 meters
              },
              async (location: Location.LocationObject) => {
                setCurrentLocation(location);
                // Send location to backend (silently fail if error)
                try {
                  await socialService.updateLocation(
                    location.coords.latitude,
                    location.coords.longitude
                  );
                } catch (error) {
                  console.warn('Failed to update location on backend:', error);
                  // Don't show error to user, just log it
                }
              }
            );
          }
        } catch (error) {
          console.error('Location updates error:', error);
        }
      }
    };

    setupLocationUpdates();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSharingEnabled]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to share your location with friends',
          [{ text: 'OK' }]
        );
      } else {
        // Get current location immediately
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation(location);
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const loadCurrentUser = async () => {
    const result = await socialService.getProfile();
    
    if (result.success && result.data) {
      setCurrentUserId(result.data.id);
    } else {
      console.warn('Failed to load current user profile:', result.error);
    }
  };

  const loadFriends = async () => {
    setLoading(true);
    const result = await socialService.getFriends();
    
    if (result.success && result.data) {
      setFriends(result.data);
    } else {
      console.warn('Failed to load friends:', result.error);
      // Don't show error alert, just use empty friends list
      // User might not have friends yet or profile might not exist
      setFriends([]);
    }
    
    setLoading(false);
  };

  const loadLocationSettings = async () => {
    const result = await socialService.getLocationSharingSettings();
    
    if (result.success && result.data) {
      setLocationSharingEnabled(result.data.share_location_globally);
    } else {
      console.warn('Failed to load location settings:', result.error);
      // Default to true if settings can't be loaded
      setLocationSharingEnabled(true);
    }
  };

  const handleLocationSharingToggle = async (value: boolean) => {
    setSettingsLoading(true);
    
    // Update backend settings
    const result = await socialService.updateLocationSharingSettings(value);
    
    if (result.success) {
      setLocationSharingEnabled(value);
      console.log(`Location sharing ${value ? 'enabled' : 'disabled'} globally`);
    } else {
      console.error('Failed to update location settings:', result.error);
      Alert.alert('Error', 'Failed to update location sharing settings. Please try again.');
      // Revert the toggle
    }
    
    setSettingsLoading(false);
  };

  // Search Users Functions
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a username to search');
      return;
    }

    if (searchQuery.length < 2) {
      Alert.alert('Error', 'Search query must be at least 2 characters');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const searchResult = await socialService.searchUsers(searchQuery.toLowerCase(), 50);
      
      if (searchResult.success && searchResult.data) {
        setSearchResults(searchResult.data.users || []);
        
        if (searchResult.data.users.length === 0) {
          Alert.alert('No Results', `No users found matching "${searchQuery}"`);
        }
      } else {
        Alert.alert('Error', searchResult.error || 'Failed to search users');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (user: UserProfile) => {
    try {
      const addResult = await socialService.addFriend(user.userid);
      
      if (addResult.success) {
        Alert.alert('Success', `${user.userid} added as friend!`, [
          {
            text: 'Start Chat',
            onPress: () => {
              setShowAddFriendsModal(false);
              router.push({
                pathname: '/(tabs)/chat',
                params: {
                  otherUserId: user.userid,
                  otherUserEmail: user.email,
                  otherUserName: user.userid,
                },
              });
            },
          },
          {
            text: 'OK',
            onPress: () => {
              loadFriends(); // Refresh friends list
            },
            style: 'cancel',
          },
        ]);
      } else if (addResult.error === 'Friendship already exists') {
        setShowAddFriendsModal(false);
        router.push({
          pathname: '/(tabs)/chat',
          params: {
            otherUserId: user.userid,
            otherUserEmail: user.email,
            otherUserName: user.userid,
          },
        });
      } else {
        Alert.alert('Error', addResult.error || 'Failed to add friend');
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
      Alert.alert('Error', 'Failed to add friend');
    }
  };

  const closeModal = () => {
    setShowAddFriendsModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const centerOnUserLocation = () => {
    try {
      // Use the already-tracked location for instant response
      if (currentLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      } else if (mapRef.current) {
        // Fallback: If no location is available yet, show a message
        Alert.alert('Location Not Available', 'Waiting for location data. Please try again in a moment.');
      }
    } catch (error) {
      console.error('Failed to center on location:', error);
      Alert.alert('Error', 'Could not center on your location');
    }
  };

  const openDirections = (latitude: number, longitude: number) => {
    try {
      // Universal URL that works for both iOS and Android
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open maps application');
        }
      }).catch((error) => {
        console.error('Failed to open directions:', error);
        Alert.alert('Error', 'Could not open directions');
      });
    } catch (error) {
      console.error('Failed to open directions:', error);
      Alert.alert('Error', 'Could not open directions');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#C1FF72" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  // Determine initial map region safely
  const initialRegion = {
    latitude: currentLocation?.coords?.latitude ?? friends[0]?.latitude ?? 37.7749,
    longitude: currentLocation?.coords?.longitude ?? friends[0]?.longitude ?? -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        loadingEnabled={true}
        loadingIndicatorColor="#C1FF72"
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        showsCompass={false}
        customMapStyle={materialMapStyle}
      >
        {/* Friend Markers - Exclude current user */}
        {friends
          .filter(friend => 
            friend.latitude && 
            friend.longitude && 
            friend.id !== currentUserId // Filter out current user's pin
          )
          .map((friend) => (
            <Marker
              key={friend.id}
              coordinate={{
                latitude: friend.latitude!,
                longitude: friend.longitude!,
              }}
              onPress={() => setSelectedFriend(friend)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerContainer} pointerEvents="box-only">
                <Image
                  source={require('../../assets/images/pin_logo.png')}
                  style={styles.pinBackground}
                  contentFit="contain"
                  pointerEvents="none"
                />
                <View style={styles.pinContentWrapper} pointerEvents="none">
                  {friend.profile_picture_url ? (
                    <Image
                      source={{ uri: friend.profile_picture_url }}
                      style={styles.markerImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.marker}>
                      <Text style={styles.markerText}>
                        {friend.userid.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Marker>
          ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationToggleContainer}>
          <View style={styles.locationToggle}>
            <View style={[styles.switchWrapper, { backgroundColor: locationSharingEnabled ? '#C1FF72' : '#000000' }]}>
              <Switch
                value={locationSharingEnabled}
                onValueChange={handleLocationSharingToggle}
                trackColor={{ false: '#000000', true: '#C1FF72' }}
                thumbColor={locationSharingEnabled ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor={locationSharingEnabled ? '#C1FF72' : '#000000'}
                disabled={settingsLoading}
                style={styles.switch}
              />
            </View>
            <Text style={styles.locationToggleText}>
              {locationSharingEnabled ? 'Sharing Location' : 'Location Off'}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={() => setShowAddFriendsModal(true)}
          >
            <Image
              source={require('../../assets/images/adduser_icon.png')}
              style={{ width: 44, height: 44 }}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => router.push('/gallery')}
          >
            <Image
              source={require('../../assets/images/galery_icon.png')}
              style={{ width: 44, height: 44 }}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={centerOnUserLocation}
      >
        <Ionicons name="locate" size={24} color="#000" />
      </TouchableOpacity>

      {/* Empty State - No Friends */}
      {!loading && friends.length === 0 && (
        <View style={styles.emptyFriendsCard}>
          <Ionicons name="people-outline" size={40} color="#999" />
          <Text style={styles.emptyFriendsTitle}>No Friends Yet</Text>
          <Text style={styles.emptyFriendsText}>
            Add friends to see their locations on the map
          </Text>
          <TouchableOpacity
            style={styles.addFriendsButton}
            onPress={() => setShowAddFriendsModal(true)}
          >
            <Ionicons name="person-add" size={20} color="#000" />
            <Text style={styles.addFriendsButtonText}>Add Friends</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Friend Info Card */}
      {selectedFriend && (
        <View style={styles.friendCard}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedFriend(null)}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
          
          {/* Elevated Profile Picture */}
          <View style={styles.friendAvatarContainer}>
            {selectedFriend.profile_picture_url ? (
              <Image
                source={{ uri: selectedFriend.profile_picture_url }}
                style={styles.friendAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>
                  {selectedFriend.userid.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          {/* Friend Info */}
          <View style={styles.friendCardContent}>
            <Text style={styles.friendName}>@{selectedFriend.userid}</Text>
            
            <View style={styles.lastSeenContainer}>
              <Ionicons name="location-outline" size={14} color="#999" />
              <Text style={styles.lastSeenText}>
                {selectedFriend.last_location_update 
                  ? getTimeAgo(selectedFriend.last_location_update)
                  : 'Location unknown'}
              </Text>
            </View>
            
            {/* Send Message Button */}
            <TouchableOpacity 
              style={styles.sendMessageButton}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/chat',
                  params: {
                    otherUserId: selectedFriend.userid,
                    otherUserEmail: selectedFriend.email,
                    otherUserName: selectedFriend.userid,
                  },
                });
              }}
            >
              <Ionicons name="chatbubble" size={20} color="#000" />
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>

            {/* Get Directions Button */}
            {selectedFriend.latitude && selectedFriend.longitude && (
              <TouchableOpacity 
                style={styles.directionsButton}
                onPress={() => openDirections(selectedFriend.latitude!, selectedFriend.longitude!)}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Add Friends Modal */}
      <Modal
        visible={showAddFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={styles.modalKeyboardView}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Friends</Text>
                <View style={styles.modalPlaceholder} />
              </View>

              {/* Search Bar */}
              <View style={styles.modalSearchSection}>
                <View style={styles.modalSearchContainer}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.modalSearchIcon} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Enter username..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text.toLowerCase())}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalSearchButton}
                  onPress={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSearchButtonText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <Text style={styles.modalInfoText}>
                Search for users by username to add as friend
              </Text>

              {/* Results */}
              <View style={styles.modalResultsWrapper}>
                {searching ? (
                  <View style={styles.modalEmptyState}>
                    <ActivityIndicator size="large" color="#C1FF72" />
                    <Text style={styles.modalEmptyText}>Searching...</Text>
                  </View>
                ) : hasSearched ? (
                  searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id.toString()}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.modalResultsContainer}
                      style={styles.modalFlatListStyle}
                      renderItem={({ item: user }) => (
                        <TouchableOpacity
                          style={styles.modalResultItem}
                          onPress={() => handleAddFriend(user)}
                        >
                          {user.profile_picture_url ? (
                            <Image
                              source={{ uri: user.profile_picture_url }}
                              style={styles.modalUserAvatar}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.modalUserAvatar}>
                              <Text style={styles.modalUserAvatarText}>
                                {user.userid?.charAt(0).toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.modalUserInfo}>
                            <Text style={styles.modalUserName}>@{user.userid}</Text>
                            <Text style={styles.modalUserEmail}>{user.email}</Text>
                          </View>
                          <Ionicons name="person-add-outline" size={24} color="#C1FF72" />
                        </TouchableOpacity>
                      )}
                    />
                  ) : (
                    <View style={styles.modalEmptyState}>
                      <Ionicons name="person-outline" size={80} color="#ccc" />
                      <Text style={styles.modalEmptyText}>No users found</Text>
                      <Text style={styles.modalEmptySubtext}>
                        Try searching with a different username
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={styles.modalEmptyState}>
                    <Ionicons name="search-outline" size={80} color="#ccc" />
                    <Text style={styles.modalEmptyText}>Search for friends</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Enter a username to find users
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  locationToggleContainer: {
    flex: 1,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  locationToggleText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  switchWrapper: {
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addFriendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 130 : 110,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 70,
  },
  pinBackground: {
    width: 50,
    height: 70,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pinContentWrapper: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyFriendsCard: {
    position: 'absolute',
    top: '40%',
    left: 40,
    right: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#C1FF72',
  },
  emptyFriendsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyFriendsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C1FF72',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  addFriendsButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  friendCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    left: '50%',
    transform: [{ translateX: -150 }],
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  friendAvatarContainer: {
    position: 'absolute',
    top: -35,
    alignSelf: 'center',
    zIndex: 1,
  },
  friendAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  friendAvatarText: {
    color: '#000',
    fontSize: 28,
    fontWeight: 'bold',
  },
  friendCardContent: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  lastSeenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  lastSeenText: {
    fontSize: 13,
    color: '#999',
  },
  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C1FF72',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sendMessageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  directionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalKeyboardView: {
    width: '90%',
    maxHeight: '85%',
    justifyContent: 'center',
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 15,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalSearchSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 10,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalSearchIcon: {
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
  },
  modalSearchButton: {
    backgroundColor: '#C1FF72',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalInfoText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  modalResultsWrapper: {
    flex: 1,
    minHeight: 200,
  },
  modalFlatListStyle: {
    flex: 1,
  },
  modalResultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  modalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 8,
  },
  modalUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  modalUserAvatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUserName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalUserEmail: {
    color: '#666',
    fontSize: 14,
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  modalEmptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
