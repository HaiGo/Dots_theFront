import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FriendData } from '../config/api';
import { socialService } from '../services/socialService';

type SortMode = 'name' | 'location';

export default function FriendsListScreen() {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingFriends, setRemovingFriends] = useState<Set<number>>(new Set());
  const [friendsWithLocationAccess, setFriendsWithLocationAccess] = useState<Set<string>>(new Set());
  const [togglingLocation, setTogglingLocation] = useState<Set<number>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [globalLocationSharing, setGlobalLocationSharing] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadLocationSettings();
    }, [])
  );

  // Reapply sorting when friendsWithLocationAccess changes
  useEffect(() => {
    if (friends.length > 0) {
      applySortingAndFiltering(friends, searchQuery, sortMode);
    }
  }, [friendsWithLocationAccess]);

  const loadFriends = async () => {
    setLoading(true);
    const result = await socialService.getFriends();
    if (result.success && result.data) {
      setFriends(result.data);
      applySortingAndFiltering(result.data, searchQuery, sortMode);
    } else {
      Alert.alert('Error', result.error || 'Failed to load friends');
    }
    setLoading(false);
  };

  const loadLocationSettings = async () => {
    const result = await socialService.getLocationSharingSettings();
    if (result.success && result.data) {
      setGlobalLocationSharing(result.data.share_location_globally);
      // Convert array to Set for faster lookups
      const accessSet = new Set(
        result.data.friends_with_access.map((f: any) => f.userid || f)
      );
      setFriendsWithLocationAccess(accessSet);
    }
  };

  const applySortingAndFiltering = (
    friendsList: FriendData[],
    query: string,
    sort: SortMode
  ) => {
    let filtered = friendsList;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = friendsList.filter(
        friend =>
          friend.userid?.toLowerCase().includes(query.toLowerCase()) ||
          friend.email?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'location') {
        // Sort by location sharing status first
        const aHasAccess = friendsWithLocationAccess.has(a.userid);
        const bHasAccess = friendsWithLocationAccess.has(b.userid);
        
        if (aHasAccess && !bHasAccess) return -1;
        if (!aHasAccess && bHasAccess) return 1;
        
        // If same status, sort by name
        return (a.userid || '').localeCompare(b.userid || '');
      } else {
        // Sort by name
        return (a.userid || '').localeCompare(b.userid || '');
      }
    });

    setFilteredFriends(sorted);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applySortingAndFiltering(friends, query, sortMode);
  };

  const toggleSortMode = () => {
    const newMode: SortMode = sortMode === 'name' ? 'location' : 'name';
    setSortMode(newMode);
    applySortingAndFiltering(friends, searchQuery, newMode);
  };

  const handleToggleLocationSharing = async (friend: FriendData) => {
    if (globalLocationSharing) {
      Alert.alert(
        'Global Sharing Enabled',
        'You are currently sharing your location with all friends. Turn off global sharing first to manage individual permissions.',
        [{ text: 'OK' }]
      );
      return;
    }

    setTogglingLocation(prev => new Set(prev).add(friend.id));

    const hasAccess = friendsWithLocationAccess.has(friend.userid);

    if (hasAccess) {
      // Stop sharing with this friend
      const result = await socialService.stopSharingLocationWith(friend.userid);
      if (result.success) {
        setFriendsWithLocationAccess(prev => {
          const newSet = new Set(prev);
          newSet.delete(friend.userid);
          return newSet;
        });
        // Reapply sorting after update
        applySortingAndFiltering(friends, searchQuery, sortMode);
      } else {
        Alert.alert('Error', result.error || 'Failed to update location sharing');
      }
    } else {
      // Start sharing with this friend
      const result = await socialService.shareLocationWith(friend.userid);
      if (result.success) {
        setFriendsWithLocationAccess(prev => new Set(prev).add(friend.userid));
        // Reapply sorting after update
        applySortingAndFiltering(friends, searchQuery, sortMode);
      } else {
        Alert.alert('Error', result.error || 'Failed to update location sharing');
      }
    }

    setTogglingLocation(prev => {
      const newSet = new Set(prev);
      newSet.delete(friend.id);
      return newSet;
    });
  };

  const handleStartChat = async (friend: FriendData) => {
    try {
      // Navigate to chat with the friend's details
      router.push({
        pathname: '/(tabs)/chat',
        params: { 
          otherUserId: friend.userid || `user_${friend.id}`,
          otherUserEmail: friend.email,
          otherUserName: friend.userid || friend.email.split('@')[0]
        },
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const handleRemoveFriend = async (friend: FriendData) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.userid} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingFriends(prev => new Set(prev).add(friend.id));

            const result = await socialService.removeFriend(friend.userid);

            if (result.success) {
              // Remove from list
              setFriends(prev => prev.filter(f => f.id !== friend.id));
              setFilteredFriends(prev => prev.filter(f => f.id !== friend.id));
              Alert.alert('Success', 'Friend removed');
            } else {
              Alert.alert('Error', result.error || 'Failed to remove friend');
            }

            setRemovingFriends(prev => {
              const newSet = new Set(prev);
              newSet.delete(friend.id);
              return newSet;
            });
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }: { item: FriendData }) => {
    const hasLocationAccess = friendsWithLocationAccess.has(item.userid);
    const isTogglingLocation = togglingLocation.has(item.id);

    return (
      <View style={styles.friendCard}>
        <TouchableOpacity
          style={styles.friendInfo}
          onPress={() => handleStartChat(item)}
          activeOpacity={0.7}
        >
          {item.profile_picture_url ? (
            <Image
              source={{ uri: item.profile_picture_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.userid?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>@{item.userid}</Text>
            <Text style={styles.friendEmail}>{item.email}</Text>
            {item.latitude && item.longitude && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#C1FF72" />
                <Text style={styles.locationText}>Location shared</Text>
              </View>
            )}
            {!globalLocationSharing && (
              <View style={[styles.sharingBadge, hasLocationAccess && styles.sharingBadgeActive]}>
                <Ionicons 
                  name={hasLocationAccess ? "eye" : "eye-off"} 
                  size={10} 
                  color={hasLocationAccess ? "#C1FF72" : "#999"} 
                />
                <Text style={[styles.sharingBadgeText, hasLocationAccess && styles.sharingBadgeTextActive]}>
                  {hasLocationAccess ? 'Can see you' : 'Cannot see you'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.friendActions}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleStartChat(item)}
          >
            <Ionicons name="chatbubble" size={20} color="#000" />
          </TouchableOpacity>
          
          {!globalLocationSharing && (
            <TouchableOpacity
              style={[styles.locationButton, hasLocationAccess && styles.locationButtonActive]}
              onPress={() => handleToggleLocationSharing(item)}
              disabled={isTogglingLocation}
            >
              {isTogglingLocation ? (
                <ActivityIndicator size="small" color="#C1FF72" />
              ) : (
                <Ionicons 
                  name={hasLocationAccess ? "eye" : "eye-off"} 
                  size={20} 
                  color={hasLocationAccess ? "#000" : "#666"} 
                />
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFriend(item)}
            disabled={removingFriends.has(item.id)}
          >
            {removingFriends.has(item.id) ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <Ionicons name="person-remove" size={20} color="#FF6B6B" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={80} color="#666" />
      <Text style={styles.emptyTitle}>No Friends Yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No friends match your search'
          : 'Add friends to start chatting and sharing locations'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.findFriendsButton}
          onPress={() => router.push('/find-contacts')}
        >
          <Ionicons name="person-add" size={20} color="#000" />
          <Text style={styles.findFriendsButtonText}>Find Friends</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Friends</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleSortMode}
            style={styles.sortButton}
          >
            <Ionicons 
              name={sortMode === 'name' ? 'text' : 'eye'} 
              size={20} 
              color="#000" 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/find-contacts')}
            style={styles.addButton}
          >
            <Ionicons name="person-add" size={24} color="#C1FF72" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Mode Badge */}
      <View style={styles.sortBadgeContainer}>
        <Text style={styles.sortBadgeText}>
          Sorted by: {sortMode === 'name' ? 'Name' : 'Location Sharing'}
        </Text>
        {!globalLocationSharing && (
          <View style={styles.infoChip}>
            <Ionicons name="information-circle" size={14} color="#666" />
            <Text style={styles.infoChipText}>Tap eye icon to toggle sharing</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Friends List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C1FF72" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriend}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredFriends.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortBadgeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  sortBadgeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  infoChipText: {
    fontSize: 11,
    color: '#666666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#000000',
  },
  clearButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  friendEmail: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#C1FF72',
  },
  sharingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  sharingBadgeActive: {
    backgroundColor: '#f0fff4',
  },
  sharingBadgeText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  sharingBadgeTextActive: {
    color: '#C1FF72',
  },
  friendActions: {
    flexDirection: 'row',
    gap: 10,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationButtonActive: {
    backgroundColor: '#C1FF72',
    borderColor: '#C1FF72',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#C1FF72',
    borderRadius: 10,
    marginTop: 30,
  },
  findFriendsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

