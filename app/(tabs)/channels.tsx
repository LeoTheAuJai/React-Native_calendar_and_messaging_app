// app/(tabs)/channels.tsx - FIXED VERSION
import { useAuth } from '@/hooks/useAuth';
import StreamClient from '@/utils/streamClient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { ChannelList, useChatContext } from 'stream-chat-expo';

export default function ChannelListScreen() {
  const { client } = useChatContext();
  const router = useRouter();
  const { getCurrentUser } = useAuth();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Load the current logged-in user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      // Method 1: Try to get from your auth hook (from AsyncStorage)
      const userData = await getCurrentUser();
      if (userData?.id) {
        console.log('Loaded user from auth:', userData.id);
        setCurrentUserId(userData.id);
        return;
      }
      
      // Method 2: Try to get from Stream client
      const streamClient = StreamClient.getInstance();
      if (streamClient.userID) {
        console.log('Loaded user from Stream client:', streamClient.userID);
        setCurrentUserId(streamClient.userID);
        return;
      }
      
      // Method 3: Try to get from chat context
      if (client?.userID) {
        console.log('Loaded user from chat context:', client.userID);
        setCurrentUserId(client.userID);
        return;
      }
      
      // No user found
      console.warn('No user found. User might not be logged in.');
      setError('Please login to view your messages');
      
    } catch (error) {
      console.error('Error loading current user:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Check if user is properly connected to Stream
  const checkConnection = () => {
    const streamClient = StreamClient.getInstance();
    const isConnected = !!streamClient.userID;
    
    console.log('Connection check:', {
      streamClientUserId: streamClient.userID,
      chatContextUserId: client?.userID,
      currentUserId,
      isConnected
    });
    
    return isConnected;
  };

  // 3. Handle reconnection if needed
  const handleReconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await getCurrentUser();
      if (!userData?.id) {
        setError('No user data found. Please login again.');
        router.replace('/(auth)/login');
        return;
      }
      
      // Reconnect to Stream with the correct user
      await StreamClient.connectUser(userData.id, userData.name);
      setCurrentUserId(userData.id);
      
      // Reload the component
      loadCurrentUser();
      
    } catch (error) {
      console.error('Reconnection failed:', error);
      setError('Failed to reconnect. Please try logging in again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Custom empty state component
  const EmptyStateIndicator = useCallback(() => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Reconnect"
              onPress={handleReconnect}
              color="#007AFF"
            />
            <View style={{ height: 10 }} />
            <Button
              title="Go to Login"
              onPress={() => router.replace('/(auth)/login')}
              color="#FF9500"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>💬</Text>
        </View>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Start chatting by adding your first contact
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Add First Contact"
            onPress={() => router.push('/(tabs)/add-contact')}
            color="#007AFF"
          />
        </View>
        <Text style={styles.tipText}>
          💡 Tip: You can also create test users in Stream Dashboard
        </Text>
      </View>
    );
  }, [router, error, handleReconnect]);

  // 5. Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your messages...</Text>
      </View>
    );
  }

  // 6. If no user ID found, show error
  if (!currentUserId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            Your ID: Not signed in
          </Text>
        </View>
        <EmptyStateIndicator />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          Your ID: {currentUserId || 'Not signed in'}
        </Text>
        {!checkConnection() && (
          <Text style={styles.warningText}>
            ⚠️ Not connected to chat. Messages may not sync.
          </Text>
        )}
      </View>
      
      {/* Only render ChannelList if we have a valid user ID */}
      {currentUserId ? (
        // In channels.tsx, update the ChannelList filters
// In channels.tsx, update the ChannelList component
<ChannelList
  filters={{ 
    type: 'messaging',
    members: { $in: [currentUserId] }
  }}
  sort={{ last_message_at: -1 as const }} // Add "as const" here
  onSelect={(channel) => {
    router.push(`/(tabs)/chat/${channel.id}`);
  }}
  EmptyStateIndicator={EmptyStateIndicator}
  additionalFlatListProps={{
    contentContainerStyle: styles.listContent,
  }}
/>
      ) : (
        <EmptyStateIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: "#1b72ffff",
  },
  headerTitle: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 4,
    borderRadius: 4,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFF5F5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '80%',
    marginBottom: 20,
  },
  tipText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});