// utils/streamClient.ts - 确保有这个版本
import { chatConfig } from '@/app/config/chat';
import { StreamChat } from 'stream-chat';

class StreamClient {
  private static instance: StreamChat | null = null;
  
  static getInstance(): StreamChat {
    if (!StreamClient.instance) {
      StreamClient.instance = StreamChat.getInstance(chatConfig.apiKey);
    }
    return StreamClient.instance;
  }
  
  static async connectUser(userId: string, userName: string) {
    const client = this.getInstance();
    
    // For Expo development - using dev token
    const devToken = client.devToken(userId);
    
    await client.connectUser(
      {
        id: userId,
        name: userName,
      },
      devToken
    );
    
    // Store the token on client for file uploads
    (client as any).token = devToken;
    (client as any).apiKey = chatConfig.apiKey;
    
    return client;
  }
  
  static disconnectUser() {
    if (StreamClient.instance) {
      const client = StreamClient.instance;
      // Clear stored tokens
      (client as any).token = null;
      (client as any).apiKey = null;
      return client.disconnectUser();
    }
  }
  
  // Get the current token for API requests
  static getToken(): string | null {
    if (!StreamClient.instance) return null;
    return (StreamClient.instance as any).token || null;
  }
  
  // Get the API key
  static getApiKey(): string {
    return chatConfig.apiKey;
  }
}

export default StreamClient;