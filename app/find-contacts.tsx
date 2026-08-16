import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserProfile } from '../config/api';
import { socialService } from '../services/socialService';

// Interface for contacts list (includes app users and non-users)
interface ContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  inApp: boolean;
  userData?: UserProfile; // Only if inApp is true
}

/**
 * Format phone number to backend format: +digits only
 * Removes all special characters, spaces, and ensures + prefix
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except the leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Remove any + that's not at the start
  cleaned = cleaned.replace(/(?!^)\+/g, '');
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    // If it starts with country code without +, add +
    cleaned = '+' + cleaned;
  }
  
  // Final validation: should be + followed by digits only
  const validFormat = /^\+\d+$/;
  if (!validFormat.test(cleaned)) {
    // If still invalid, just return digits with +
    const digitsOnly = cleaned.replace(/\D/g, '');
    return digitsOnly ? `+${digitsOnly}` : '';
  }
  
  return cleaned;
};

export default function FindContactsScreen() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [addingFriends, setAddingFriends] = useState(false);

  useEffect(() => {
    // Auto-sync on mount
    handleSyncContacts();
  }, []);

  const handleSyncContacts = async () => {
    try {
      setSyncing(true);

      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts access to find friends from your contacts.'
        );
        setSyncing(false);
        return;
      }

      // Get device contacts with names
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on your device.');
        setSyncing(false);
        return;
      }

      // Build map of phone numbers to contacts
      const phoneToContactMap = new Map<string, { name: string; phone: string; id: string }>();
      const phoneNumbers: string[] = [];

      data.forEach(contact => {
        const name = contact.name || 'Unknown';
        contact.phoneNumbers?.forEach(phone => {
          if (!phone.number) return;
          
          // Format phone number: +digits only, no special characters or spaces
          const formatted = formatPhoneNumber(phone.number);
          
          if (formatted && formatted.length > 1) { // At least + and one digit
            const contactId = `${contact.id}_${formatted}`;
            phoneToContactMap.set(formatted, { 
              name, 
              phone: phone.number, // Keep original for display
              id: contactId 
            });
            phoneNumbers.push(formatted);
          }
        });
      });

      if (phoneNumbers.length === 0) {
        Alert.alert('No Contacts', 'No phone numbers found in your contacts.');
        setSyncing(false);
        return;
      }

      // Find users in app (limit to 500)
      const limitedPhones = phoneNumbers.slice(0, 500);
      
      // Log formatted phone numbers for debugging
      console.log(`Sending ${limitedPhones.length} formatted phone numbers to backend`);
      console.log('Sample formatted numbers:', limitedPhones.slice(0, 5));
      
      const result = await socialService.findByPhones(limitedPhones);

      // Create phone to user data map
      const phoneToUserMap = new Map<string, UserProfile>();
      if (result.success && result.data) {
        result.data.forEach(user => {
          if (user.phone_number) {
            // Format the returned phone number to match our format
            const formatted = formatPhoneNumber(user.phone_number);
            phoneToUserMap.set(formatted, user);
          }
        });
      }

      // Build contacts list with inApp flag
      const contactsList: ContactItem[] = [];
      phoneToContactMap.forEach((contactInfo, phone) => {
        const userData = phoneToUserMap.get(phone);
        contactsList.push({
          id: contactInfo.id,
          name: contactInfo.name,
          phoneNumber: contactInfo.phone,
          inApp: !!userData,
          userData: userData,
        });
      });

      // Sort: app users first, then others
      contactsList.sort((a, b) => {
        if (a.inApp && !b.inApp) return -1;
        if (!a.inApp && b.inApp) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(contactsList);
      setSyncing(false);
    } catch (error) {
      console.error('Sync contacts error:', error);
      Alert.alert('Error', 'Failed to sync contacts. Please try again.');
      setSyncing(false);
    }
  };

  const toggleSelection = (contact: ContactItem) => {
    if (!contact.inApp || !contact.userData) return;
    
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contact.id)) {
        newSet.delete(contact.id);
      } else {
        newSet.add(contact.id);
      }
      return newSet;
    });
  };

  const handleAddSelectedFriends = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Selection', 'Please select at least one contact to add as friend.');
      return;
    }

    setAddingFriends(true);

    const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
    let successCount = 0;
    let alreadyFriendsCount = 0;
    let errorCount = 0;

    for (const contact of selectedContactsList) {
      if (contact.userData) {
        const result = await socialService.addFriend(contact.userData.userid);
        
        if (result.success) {
          successCount++;
        } else if (result.errorCode === 'SOCIAL_FRIENDSHIP_EXISTS' || result.errorCode === 'FRIENDSHIP_EXISTS') {
          alreadyFriendsCount++;
        } else {
          errorCount++;
        }
      }
    }

    setAddingFriends(false);
    setSelectedContacts(new Set()); // Clear selection

    // Show summary
    let message = '';
    if (successCount > 0) {
      message += `Added ${successCount} friend${successCount > 1 ? 's' : ''} successfully!\n`;
    }
    if (alreadyFriendsCount > 0) {
      message += `${alreadyFriendsCount} already friend${alreadyFriendsCount > 1 ? 's' : ''}.\n`;
    }
    if (errorCount > 0) {
      message += `Failed to add ${errorCount} contact${errorCount > 1 ? 's' : ''}.`;
    }

    Alert.alert('Done', message.trim());
  };

  const renderContact = ({ item }: { item: ContactItem }) => {
    const isSelected = selectedContacts.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userCard, !item.inApp && styles.userCardInactive]}
        onPress={() => toggleSelection(item)}
        disabled={!item.inApp || addingFriends}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.inApp && item.userData?.profile_picture_url ? (
            <Image
              source={{ uri: item.userData.profile_picture_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, !item.inApp && styles.avatarInactive]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, !item.inApp && styles.userNameInactive]}>
              {item.name}
            </Text>
            <Text style={styles.userPhone}>{item.phoneNumber}</Text>
            {item.inApp && item.userData && (
              <Text style={styles.userUsername}>@{item.userData.userid}</Text>
            )}
          </View>
        </View>
        {item.inApp ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
          </View>
        ) : (
          <TouchableOpacity style={styles.inviteButton} disabled>
            <Ionicons name="mail-outline" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <TouchableOpacity onPress={handleSyncContacts} style={styles.syncButton}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {syncing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C1FF72" />
          <Text style={styles.loadingText}>Syncing your contacts...</Text>
          <Text style={styles.loadingSubtext}>
            Finding friends who are already using the app
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>No Contacts Found</Text>
          <Text style={styles.emptyText}>
            No contacts found on your device.{'\n'}
            Try syncing again.
          </Text>
          <TouchableOpacity style={styles.syncAgainButton} onPress={handleSyncContacts}>
            <Ionicons name="refresh" size={20} color="#000" />
            <Text style={styles.syncAgainButtonText}>Sync Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.listContainer}>
            <Text style={styles.resultText}>
              {contacts.filter(c => c.inApp).length} of {contacts.length} contacts using the app
              {selectedContacts.size > 0 && ` • ${selectedContacts.size} selected`}
            </Text>
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
          {selectedContacts.size > 0 && (
            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity
                style={[styles.addFriendsButton, addingFriends && styles.addFriendsButtonDisabled]}
                onPress={handleAddSelectedFriends}
                disabled={addingFriends}
              >
                {addingFriends ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.addFriendsButtonText}>
                    Add {selectedContacts.size} Friend{selectedContacts.size > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
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
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C1FF72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
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
    color: '#000',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 24,
  },
  syncAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#C1FF72',
    borderRadius: 10,
    marginTop: 30,
  },
  syncAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  userCardInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    opacity: 0.6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5e6ffb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInactive: {
    backgroundColor: '#444',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userNameInactive: {
    color: '#666',
  },
  userPhone: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 12,
    color: '#5e6ffb',
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addFriendsButton: {
    backgroundColor: '#C1FF72',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendsButtonDisabled: {
    opacity: 0.6,
  },
  addFriendsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

