// components/ChatProvider.tsx
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<any>(null);

  useEffect(() => {
    // Critical: Check if in Web server-side environment
    const isServer = Platform.OS === 'web' && typeof window === 'undefined';
    if (isServer) {
      console.log('Skipping ALL Stream Chat loading during SSR');
      return; // Do nothing on server side
    }

    const initChat = async () => {
      try {
        console.log('🌐 Starting dynamic import of Stream Chat SDK...');
        
        // 1. Dynamically import core SDK
        const { StreamChat } = await import('stream-chat');
        
        // 2. Dynamically import UI components (critical step!)
        const { Chat, OverlayProvider } = await import('stream-chat-expo');
        
        // 3. Use hard-coded configuration
        const config = {
          apiKey: 'qauhxd7xsspd',
          userId: 'leo31',
          userName: 'Leo',
        };

        // 4. Create client
        const chatClient = new StreamChat(config.apiKey);
        
        // 5. Use devToken method
        const userToken = chatClient.devToken(config.userId);
        
        // 6. Connect user
        await chatClient.connectUser(
          {
            id: config.userId,
            name: config.userName,
          },
          userToken
        );
        
        // 7. Store client and components
        clientRef.current = chatClient;
        // Store dynamically imported components
        (window as any).__streamComponents = { Chat, OverlayProvider };
        
        setIsReady(true);
        console.log('✅ Stream Chat fully loaded on:', Platform.OS);
      } catch (error) {
        console.error('❌ Failed to initialize Stream Chat:', error);
      }
    };

    initChat();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(console.error);
        clientRef.current = null;
      }
    };
  }, []);

  // Critical: Before ready, don't render any Stream Chat related content
  if (!isReady) {
    // Return child components without wrapping Chat context
    return <>{children}</>;
  }

  // Get dynamically imported components from global object
  const { Chat, OverlayProvider } = (window as any).__streamComponents || {};

  // Safe rendering
  if (!Chat || !OverlayProvider || !clientRef.current) {
    return <>{children}</>;
  }

  return (
    <OverlayProvider>
      <Chat client={clientRef.current}>
        {children}
      </Chat>
    </OverlayProvider>
  );
}