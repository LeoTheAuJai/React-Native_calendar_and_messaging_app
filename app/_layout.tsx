// app/_layout.tsx - 正确版本
import { AuthProvider } from '@/components/AuthProvider';
import ChatProvider from '@/components/ChatProvider';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChatProvider>
          <SafeAreaProvider>
            <Slot />
          </SafeAreaProvider>
        </ChatProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}