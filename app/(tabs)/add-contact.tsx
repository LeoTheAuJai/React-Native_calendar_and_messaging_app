// app/(tabs)/add-contact.tsx - FIXED VERSION
import { useAuth } from '@/hooks/useAuth';
import StreamClient from '@/utils/streamClient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddContactScreen() {
  const [contactId, setContactId] = useState('');
  const [contactName, setContactName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidatingUser, setIsValidatingUser] = useState(false);
  
  const router = useRouter();
  const { getCurrentUser } = useAuth();

  // Load the current logged-in user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      const userData = await getCurrentUser();
      if (userData?.id) {
        console.log('Loaded user from auth:', userData.id);
        setCurrentUserId(userData.id);
        return;
      }
      
      const streamClient = StreamClient.getInstance();
      if (streamClient.userID) {
        console.log('Loaded user from Stream client:', streamClient.userID);
        setCurrentUserId(streamClient.userID);
        return;
      }
      
      console.warn('No user found. User might not be logged in.');
      
    } catch (error) {
      console.error('Error loading current user:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user exists in Stream
  const checkUserExists = async (userId: string): Promise<boolean> => {
    if (!userId.trim()) {
      return false;
    }

    if (!currentUserId) {
      throw new Error('You must be logged in to check users');
    }

    if (userId === currentUserId) {
      Alert.alert('Invalid User', 'You cannot chat with yourself');
      return false;
    }

    console.log(`Checking if user "${userId}" exists...`);
    
    try {
      const client = StreamClient.getInstance();
      
      // Method 1: Try to query user directly - Most reliable
      try {
        const response = await client.queryUsers({ 
          id: { $eq: userId } 
        });
        
        console.log('Query users response:', {
          users: response.users,
          count: response.users.length
        });
        
        if (response.users && response.users.length > 0) {
          const foundUser = response.users[0];
          console.log(`✅ User "${userId}" exists!`, {
            id: foundUser.id,
            name: foundUser.name,
            role: foundUser.role
          });
          return true;
        }
      } catch (queryError: any) {
        console.warn('Query users failed:', queryError.message);
        // Continue to fallback method
      }
      
      // Method 2: Try to create a test channel - Stream will validate
      console.log('Trying fallback validation method...');
      try {
        // Create a unique test channel ID
        const testChannelId = `validate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const testChannel = client.channel('messaging', testChannelId, {
          name: 'Validation Test',
          members: [currentUserId, userId],
        });
        
        // Try to watch (not create) - this will fail if users don't exist
        await testChannel.watch();
        
        console.log(`✅ User "${userId}" exists (via channel watch)!`);
        
        // Clean up by stopping watching
        await testChannel.stopWatching();
        
        return true;
      } catch (watchError: any) {
        console.log('Channel watch error:', watchError.message);
        
        // Parse the error to check if it's about non-existent users
        const errorMsg = watchError.message?.toLowerCase() || '';
        const errorData = watchError.data || {};
        
        console.log('Error analysis:', { errorMsg, errorData });
        
        if (errorMsg.includes('don\'t exist') || 
            errorMsg.includes('does not exist') ||
            errorMsg.includes('user not found') ||
            (errorData.details && typeof errorData.details === 'string' && errorData.details.includes('don\'t exist')) ||
            errorMsg.includes('invalid user') ||
            errorMsg.includes('not a valid user')) {
          console.log(`❌ User "${userId}" does not exist according to Stream`);
          return false;
        }
        
        // If we get a permission error, the user might exist but we can't access
        if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
          console.log(`⚠️ Can't verify user "${userId}" due to permissions`);
          // Assume user exists for now
          return true;
        }
        
        // For other errors, we can't determine
        console.log(`❓ Could not determine if user "${userId}" exists`);
        return false;
      }
      
    } catch (error: any) {
      console.error('Error checking user existence:', error);
      
      // If we can't determine, assume user doesn't exist to prevent errors
      console.log(`❌ Could not verify user "${userId}" - assuming not found`);
      return false;
    }
  };

  // Check existing channel between users
  const checkExistingChannel = async (otherUserId: string) => {
    if (!currentUserId) {
      Alert.alert('Error', 'User not authenticated');
      return null;
    }
    
    try {
      console.log(`Checking existing channels between ${currentUserId} and ${otherUserId}`);
      
      const client = StreamClient.getInstance();
      
      const channels = await client.queryChannels(
        {
          type: 'messaging',
          members: { $in: [currentUserId, otherUserId] },
          member_count: 2,
        },
        [{ last_message_at: -1 }], // Sort
        { limit: 5 }
      );
      
      console.log(`Found ${channels.length} potential channels`);
      
      // Find exact 1:1 conversation
      for (const channel of channels) {
        const members = channel.state?.members || {};
        const memberIds = Object.keys(members);
        
        console.log(`Channel ${channel.id} has members:`, memberIds);
        
        if (memberIds.length === 2 && 
            memberIds.includes(currentUserId) && 
            memberIds.includes(otherUserId)) {
          console.log('✅ Found exact match:', channel.id);
          return channel;
        }
      }
      
      console.log('❌ No exact match found');
      return null;
      
    } catch (error: any) {
      console.error('Error checking channels:', error.message);
      return null;
    }
  };

  // Create new channel
  const createNewChannel = async (otherUserId: string, otherUserName: string) => {
    try {
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      // Create simple channel ID
      const channelId = `chat_${currentUserId}_${otherUserId}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      
      console.log('Creating channel with ID:', channelId);
      
      const client = StreamClient.getInstance();
      const channel = client.channel('messaging', channelId, {
        name: `Chat with ${otherUserName}`,
        members: [currentUserId, otherUserId],
        created_by_id: currentUserId,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserName)}&background=007AFF&color=fff`,
      });

      // Create the channel
      await channel.create();
      
      // Send welcome message
      await channel.sendMessage({
        text: `Hello ${otherUserName}! 👋`,
      });
      
      // Navigate to new channel
      Alert.alert(
        'Success', 
        `Chat created with ${otherUserName}`,
        [
          {
            text: 'Go to Chat',
            onPress: () => {
              router.push(`/(tabs)/chat/${channelId}`);
            },
          },
          {
            text: 'Stay Here',
            style: 'cancel',
          },
        ]
      );
      
      setContactId('');
      setContactName('');
      
      return channel;
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      
      // Check for "user doesn't exist" error
      const errorMessage = error.message?.toLowerCase() || '';
      const errorData = error.data || {};
      const errorCode = error.code;
      
      console.log('Error details:', {
        message: errorMessage,
        data: errorData,
        code: errorCode
      });
      
      // Check for StreamChat error about non-existent users
      if (errorMessage.includes('don\'t exist') || 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('user not found') ||
          (errorData.details && typeof errorData.details === 'string' && errorData.details.includes('don\'t exist')) ||
          errorCode === 4) {
        throw new Error(`User "${otherUserId}" does not exist. Please ask them to sign up first.`);
      }
      
      // Check for other common errors
      if (errorMessage.includes('already exists')) {
        throw new Error('Chat already exists with this user');
      }
      
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        throw new Error('You don&apos;t have permission to create this chat');
      }
      
      throw new Error(`Failed to create chat: ${error.message || 'Unknown error'}`);
    }
  };

  const createChannel = async () => {
    if (!contactId.trim() || !contactName.trim()) {
      Alert.alert('Error', 'Please enter both user ID and name');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validate user ID format
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(contactId)) {
      Alert.alert('Invalid Format', 'User ID: only letters, numbers, _, -');
      return;
    }

    // Prevent self-chatting
    if (contactId === currentUserId) {
      Alert.alert('Invalid User', 'You cannot chat with yourself');
      return;
    }

    setIsChecking(true);
    setIsValidatingUser(true);
    
    try {
      // STEP 1: Check if user exists BEFORE attempting to create channel
      console.log('STEP 1: Checking if user exists...');
      const userExists = await checkUserExists(contactId);
      
      if (!userExists) {
        Alert.alert(
          'User Not Found',
          `User "${contactId}" does not exist in the system.\n\nPlease make sure:\n• User ID is correct\n• User has signed up\n• Ask them to create an account first`,
          [{ text: 'OK', style: 'cancel' }]
        );
        setIsChecking(false);
        setIsValidatingUser(false);
        return;
      }
      
      console.log('✅ User exists, proceeding...');
      setIsValidatingUser(false);
      
      // STEP 2: Check existing channel
      console.log('STEP 2: Checking for existing channels...');
      const existingChannel = await checkExistingChannel(contactId);
      
      if (existingChannel) {
        Alert.alert(
          'Channel Exists',
          `You already have a chat with ${contactName}. Open it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Chat',
              onPress: () => {
                const channelId = existingChannel.id;
                router.push(`/(tabs)/chat/${channelId}`);
              },
            },
          ]
        );
        setIsChecking(false);
        return;
      }
      
      // STEP 3: Create new channel
      console.log('STEP 3: Creating new channel...');
      await proceedWithNewChannel();
      
    } catch (error: any) {
      console.error('Error in createChannel:', error);
      
      // Handle specific error messages
      if (error.message.includes('does not exist')) {
        Alert.alert(
          'User Not Found',
          error.message,
          [{ text: 'OK', style: 'cancel' }]
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to create chat. Please try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
      
      setIsChecking(false);
      setIsValidatingUser(false);
    }
  };

  const proceedWithNewChannel = async () => {
    setIsCreating(true);
    
    try {
      await createNewChannel(contactId, contactName);
    } catch (error: any) {
      // Handle specific errors from createNewChannel
      if (error.message.includes('already exists')) {
        // Try to find and open the existing channel
        Alert.alert('Exists', 'Chat already exists. Opening...');
        const existing = await checkExistingChannel(contactId);
        if (existing) {
          router.push(`/(tabs)/chat/${existing.id}`);
        }
      } else if (error.message.includes('does not exist')) {
        Alert.alert(
          'User Not Found',
          error.message,
          [{ text: 'OK', style: 'cancel' }]
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to create chat',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } finally {
      setIsCreating(false);
      setIsChecking(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Contact</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter exact user ID"
          value={contactId}
          onChangeText={setContactId}
          autoCapitalize="none"
          editable={!isChecking && !isCreating}
        />
        <Text style={styles.hint}>
          Must match their exact account ID
        </Text>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="How they should appear"
          value={contactName}
          onChangeText={setContactName}
          editable={!isChecking && !isCreating}
        />
        <Text style={styles.hint}>
          This is just for your reference
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title={
            isValidatingUser 
              ? "Checking User..." 
              : isCreating 
                ? "Creating Chat..." 
                : isChecking
                  ? "Checking..."
                  : "Start Chat"
          }
          onPress={createChannel}
          disabled={
            isValidatingUser || 
            isChecking || 
            isCreating || 
            !contactId.trim() || 
            !contactName.trim() || 
            !currentUserId
          }
          color="#007AFF"
        />
      </View>
      
      {isValidatingUser && (
        <View style={styles.validationContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.validationText}>Checking if user exists...</Text>
        </View>
      )}
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Important Notes:</Text>
        <Text style={styles.infoText}>
          • User must exist in the system{'\n'}
          • We check user existence first{'\n'}
          • No duplicate chats allowed{'\n'}
          • Your ID: <Text style={styles.userId}>{currentUserId || 'Not logged in'}</Text>
        </Text>
      </View>
      
      {currentUserId && (
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Tip:</Text>
          <Text style={styles.tipText}>
            Ask the user for their exact User ID. It&apos;s case-sensitive and must match their account ID in the system.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 16, 
    color: '#666', 
    marginTop: 10 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 25, 
    color: '#000',
    textAlign: 'center'
  },
  inputContainer: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: '#333' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: '#fff' 
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic'
  },
  buttonContainer: { 
    marginTop: 25, 
    marginBottom: 10 
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B3E0FF',
  },
  validationText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500'
  },
  infoBox: { 
    backgroundColor: '#E6F4FE', 
    borderRadius: 8, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#B3E0FF',
    marginTop: 20
  },
  infoTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 8, 
    color: '#0066CC' 
  },
  infoText: { 
    fontSize: 14, 
    color: '#333', 
    lineHeight: 22 
  },
  userId: { 
    fontWeight: 'bold', 
    color: '#007AFF' 
  },
  tipBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE58F',
    marginTop: 15
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#D48806'
  },
  tipText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18
  }
});