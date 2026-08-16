import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { UserProfile } from '../config/api';
import { socialService } from '../services/socialService';

export default function SearchUsersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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
      // Search for users (returns multiple matches)
      const searchResult = await socialService.searchUsers(searchQuery.toLowerCase(), 50);
      
      if (searchResult.success && searchResult.data) {
        // Found users
        setResults(searchResult.data.users || []);
        
        if (searchResult.data.users.length === 0) {
          Alert.alert('No Results', `No users found matching "${searchQuery}"`);
        }
      } else {
        // Search failed
        Alert.alert('Error', searchResult.error || 'Failed to search users');
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (user: UserProfile) => {
    try {
      // First add as friend
      const addResult = await socialService.addFriend(user.userid);
      
      if (addResult.success) {
        Alert.alert('Success', `${user.userid} added as friend!`, [
          {
            text: 'Start Chat',
            onPress: () => {
              // Navigate to chat with this user
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
            style: 'cancel',
          },
        ]);
      } else if (addResult.error === 'Friendship already exists') {
        // Already friends, just open chat
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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Users</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
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
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          Search for users by username to add as friend and start chatting
        </Text>

        {/* Results */}
        <View style={styles.resultsWrapper}>
            {searching ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#C1FF72" />
                <Text style={styles.emptyText}>Searching...</Text>
              </View>
          ) : hasSearched ? (
            results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.resultsContainer}
                style={styles.flatListStyle}
                renderItem={({ item: user }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleAddFriend(user)}
                  >
                    {user.profile_picture_url ? (
                      <Image
                        source={{ uri: user.profile_picture_url }}
                        style={styles.userAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {user.userid?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>@{user.userid}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <Ionicons name="person-add-outline" size={24} color="#C1FF72" />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={80} color="#ccc" />
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching with a different username
                </Text>
              </View>
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>Search for friends</Text>
              <Text style={styles.emptySubtext}>
                Enter a username to find users
              </Text>
            </View>
          )}
          </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 44,
  },
  searchSection: {
    paddingHorizontal: 20,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#000000',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#C1FF72',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  resultsWrapper: {
    flex: 1,
  },
  flatListStyle: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  userAvatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#666666',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtext: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

