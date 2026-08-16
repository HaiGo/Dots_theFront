// TalkJS Service for user synchronization and conversation management
// Configuration is loaded from environment variables (see .env.example).

const TALKJS_APP_ID = process.env.EXPO_PUBLIC_TALKJS_APP_ID || '';
const TALKJS_SECRET_KEY = process.env.EXPO_PUBLIC_TALKJS_SECRET_KEY || '';

interface TalkJSUser {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role?: string;
}

class TalkJSService {
  /**
   * Sync user with TalkJS (create or update)
   * This is called on login/registration to ensure users exist in TalkJS
   */
  async syncUser(userId: string, email: string, name?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Syncing user with TalkJS:', { userId, email, name });
      
      // Call the private method that actually syncs with TalkJS REST API
      const result = await this.syncUserWithTalkJS(userId, email, name);
      
      if (result.success) {
        console.log('✅ User synced with TalkJS successfully');
      } else {
        console.error('❌ Failed to sync user with TalkJS:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error syncing user with TalkJS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync user' 
      };
    }
  }

  /**
   * Get user data for TalkJS
   */
  getTalkJSUser(userId: string, email: string, name?: string): TalkJSUser {
    return {
      id: userId,
      name: name || email.split('@')[0], // Use email prefix as name if no name provided
      email: email,
      photoUrl: undefined,
      role: 'default',
    };
  }

  /**
   * Search users by email (for adding friends)
   * This simulates a search - in production, call your backend
   */
  async searchUsersByEmail(email: string): Promise<{ success: boolean; users?: any[]; error?: string }> {
    try {
      // TODO: Call your backend API to search users
      // const response = await fetch(`YOUR_API/users/search?email=${email}`);
      // const data = await response.json();
      
      // For now, return empty results
      console.log('Searching for users with email:', email);
      return { 
        success: true, 
        users: [] 
      };
    } catch (error) {
      console.error('Failed to search users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search users' 
      };
    }
  }

  /**
   * Create a conversation ID between two users
   * Format matches TalkRn.oneOnOneId(): sorted user IDs joined with underscore
   * This ensures photos are sent to the same conversation as regular chat
   */
  getConversationId(userId1: string, userId2: string): string {
    // Create a consistent conversation ID regardless of order
    // Format: "userId1_userId2" (sorted alphabetically, matches TalkJS oneOnOneId)
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Sync a user with TalkJS
   * Users MUST be synced before they can participate in conversations
   */
  private async syncUserWithTalkJS(
    userid: string,
    email?: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('  Syncing user with TalkJS:', userid, email ? `(${email})` : '');

      const userUrl = `https://api.talkjs.com/v1/${TALKJS_APP_ID}/users/${userid}`;
      
      // Prepare email as array (TalkJS format)
      const emailArray = email ? [email] : [`${userid}@app.local`];
      
      const userData = {
        name: name || userid,
        email: emailArray,
        role: 'default',
      };
      
      console.log('  User data:', JSON.stringify(userData));
      
      const response = await fetch(userUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log('  User synced successfully:', userid);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error('  Failed to sync user:', response.status, errorText);
        return { success: false, error: `Failed to sync user ${userid}` };
      }
    } catch (error) {
      console.error('  Error syncing user:', error);
      return { success: false, error: 'Failed to sync user' };
    }
  }

  /**
   * Check if a conversation already exists
   */
  private async checkConversationExists(conversationId: string): Promise<boolean> {
    try {
      const conversationUrl = `https://api.talkjs.com/v1/${TALKJS_APP_ID}/conversations/${conversationId}`;
      
      const response = await fetch(conversationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('  Error checking conversation:', error);
      return false;
    }
  }

  /**
   * Find existing conversation between two users
   * Searches all conversations for the current user to find one with the friend
   * Returns the conversation ID if found, null otherwise
   */
  async findExistingConversation(
    currentUserId: string, 
    friendUserId: string
  ): Promise<string | null> {
    try {
      console.log('  🔍 Searching for existing conversation...');
      console.log('  Between:', currentUserId, 'and', friendUserId);
      
      // Get all conversations for the current user
      const conversationsUrl = `https://api.talkjs.com/v1/${TALKJS_APP_ID}/users/${currentUserId}/conversations`;
      
      const response = await fetch(conversationsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        console.log('  ⚠️ Could not fetch conversations:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('  Found', data.data?.length || 0, 'conversations');

      // Look through conversations to find one with both users
      if (data.data && Array.isArray(data.data)) {
        for (const conversation of data.data) {
          const participants = conversation.participants || [];
          const participantIds = Object.keys(participants);
          
          // Check if both users are participants
          const hasCurrentUser = participantIds.includes(currentUserId);
          const hasFriend = participantIds.includes(friendUserId);
          
          // If this is a 1-on-1 conversation with exactly these two users
          if (hasCurrentUser && hasFriend && participantIds.length === 2) {
            console.log('  ✅ Found existing conversation:', conversation.id);
            return conversation.id;
          }
        }
      }

      console.log('  ℹ️ No existing conversation found');
      return null;
    } catch (error) {
      console.error('  ❌ Error finding existing conversation:', error);
      return null;
    }
  }

  /**
   * Create or get a conversation between two users
   * Uses userid as unique identifiers for TalkJS users (matching chat.tsx)
   * This creates the conversation on TalkJS backend, which is REQUIRED for notifications!
   */
  async ensureConversation(
    conversationId: string,
    currentUserId: string,
    friendUserId: string,
    currentUserEmail: string,
    friendEmail: string,
    currentUserName?: string,
    friendName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Check if conversation already exists
      console.log('  Checking if conversation exists:', conversationId);
      const exists = await this.checkConversationExists(conversationId);
      
      if (exists) {
        console.log('  Conversation already exists, using existing one');
        return { success: true };
      }

      console.log('  Conversation does not exist, creating new one...');

      // Step 2: Sync both users with TalkJS (using userid as ID)
      console.log('  Syncing users with TalkJS...');
      
      const currentUserSync = await this.syncUserWithTalkJS(
        currentUserId,
        currentUserEmail,
        currentUserName || currentUserId
      );
      
      if (!currentUserSync.success) {
        return currentUserSync;
      }

      const friendUserSync = await this.syncUserWithTalkJS(
        friendUserId,
        friendEmail,
        friendName || friendUserId
      );
      
      if (!friendUserSync.success) {
        return friendUserSync;
      }

      // Step 3: Create conversation with participants array (TalkJS format)
      console.log('  Creating conversation:', conversationId);
      console.log('  Participants:', [currentUserId, friendUserId]);

      const conversationUrl = `https://api.talkjs.com/v1/${TALKJS_APP_ID}/conversations/${conversationId}`;
      
      // First, create conversation with simple participant array
      const conversationData = {
        participants: [currentUserId, friendUserId]
      };
      
      console.log('  Creating conversation with participants...');
      
      const response = await fetch(conversationUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('  ❌ Failed to create conversation:', errorText);
        return { success: false, error: 'Failed to create conversation' };
      }
      
      console.log('  ✅ Conversation created');
      
      // Step 4: Enable notifications for each participant
      console.log('  Enabling notifications for participants...');
      
      try {
        // Set notify=true for currentUser
        await fetch(`${conversationUrl}/participants/${currentUserId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access: "ReadWrite",
            notify: true
          }),
        });
        
        // Set notify=true for friendUser
        await fetch(`${conversationUrl}/participants/${friendUserId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access: "ReadWrite",
            notify: true
          }),
        });
        
        console.log('  ✅ Notifications enabled for both participants');
      } catch (participantError) {
        console.warn('  ⚠️ Failed to set notification settings:', participantError);
        // Continue anyway - conversation is created
      }
      
      return { success: true };
    } catch (error) {
      console.error('  Error creating conversation:', error);
      return { success: false, error: 'Failed to create conversation' };
    }
  }

  /**
   * Send a message with image via TalkJS REST API
   * Uses userid as the TalkJS identifier (matching chat.tsx implementation)
   * ⚠️ WARNING: This exposes the TalkJS secret key in the app
   * For production, use a backend proxy to keep the secret key secure
   * 
   * @param friendUserid - The friend's userid
   * @param photoUrl - URL of the photo to share
   * @param message - Optional message text
   * @param conversationId - Optional conversation ID (if not provided, will generate one)
   */
  async sendPhotoMessage(
    friendUserid: string,
    photoUrl: string,
    message: string = '📸 Check out this photo!',
    conversationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user profile (like chat.tsx does)
      const { socialService } = await import('./socialService');
      const profileResult = await socialService.getProfile();
      
      if (!profileResult.success || !profileResult.data) {
        return { success: false, error: 'Could not get user profile' };
      }

      const currentUserData = profileResult.data;
      const currentUserId = currentUserData.userid || currentUserData.email || `user_${currentUserData.id}`;
      const currentUserEmail = currentUserData.email;

      console.log('Sending photo message:');
      console.log('  From:', currentUserId, `(${currentUserEmail})`);
      console.log('  To:', friendUserid);
      console.log('  Photo URL:', photoUrl);

      // Get friend's data from friends list
      const friendsResult = await socialService.getFriends();
      console.log('  Friends list result:', friendsResult.success ? 'success' : 'failed');
      
      if (!friendsResult.success || !friendsResult.data) {
        return { success: false, error: 'Could not load friends list' };
      }

      const friend = friendsResult.data.find(f => f.userid === friendUserid);
      if (!friend) {
        console.error('  Friend not found in friends list!');
        console.log('  Looking for:', friendUserid);
        console.log('  Available friends:', friendsResult.data.map(f => f.userid));
        return { success: false, error: `Friend ${friendUserid} not found` };
      }

      const friendEmail = friend.email;
      console.log('  Found friend:', friendUserid, `(${friendEmail})`);

      // Step 1: Try to find existing conversation first!
      let finalConversationId: string;
      
      if (conversationId) {
        // Use the conversation ID explicitly provided
        finalConversationId = conversationId;
        console.log('  📝 Using provided conversation ID:', finalConversationId);
      } else {
        // Try to find existing conversation
        const existingId = await this.findExistingConversation(currentUserId, friendUserid);
        
        if (existingId) {
          // Use existing conversation (photos go to same place as messages!)
          finalConversationId = existingId;
          console.log('  ✅ Using existing conversation:', finalConversationId);
        } else {
          // No existing conversation - generate new ID matching TalkRn.oneOnOneId() format
          const sortedIds = [currentUserId, friendUserid].sort();
          finalConversationId = `${sortedIds[0]}_${sortedIds[1]}`;
          console.log('  🆕 Creating new conversation:', finalConversationId);
        }
      }
      
      console.log('  📌 Final conversation ID:', finalConversationId);

      // Step 1: Ensure conversation exists (sync users + create conversation)
      const conversationResult = await this.ensureConversation(
        finalConversationId,
        currentUserId,
        friendUserid,
        currentUserEmail,
        friendEmail,
        currentUserId, // Use userid as name
        friendUserid   // Use userid as name
      );

      if (!conversationResult.success) {
        return conversationResult;
      }

      // Step 2: Send message to the conversation
      const messagesUrl = `https://api.talkjs.com/v1/${TALKJS_APP_ID}/conversations/${finalConversationId}/messages`;
      
      console.log('  Sending message to:', messagesUrl);

      const response = await fetch(messagesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TALKJS_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            text: `${message}\n\n${photoUrl}`,
            sender: currentUserId,
            type: 'UserMessage',
            custom: {
              type: 'photo',
              imageUrl: photoUrl,
            }
          }
        ]),
      });

      console.log('  TalkJS Response Status:', response.status);

      // Check if response is successful
      if (response.ok) {
        const data = await response.json();
        console.log('  Message sent successfully:', data);
        // TalkJS returns array of message IDs: [{"id": "msg_abc123"}]
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error('  TalkJS API Error:', response.status, errorText);
        
        // Try to parse error as JSON
        try {
          const errorData = JSON.parse(errorText);
          return { 
            success: false, 
            error: errorData.message || errorData.error || 'Failed to send message via TalkJS' 
          };
        } catch {
          return { 
            success: false, 
            error: `TalkJS API error (${response.status})` 
          };
        }
      }
    } catch (error) {
      console.error('Failed to send photo message:', error);
      
      if (error instanceof Error) {
        return { 
          success: false, 
          error: `Error: ${error.message}` 
        };
      }
      
      return { 
        success: false, 
        error: 'Failed to send message. Please try again.' 
      };
    }
  }
}

export const talkjsService = new TalkJSService();
export type { TalkJSUser };

