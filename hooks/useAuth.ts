// hooks/useAuth.ts
import StreamClient from '@/utils/streamClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert } from 'react-native';

// Simple in-memory user storage (replace with API/database in production)
// For demo, we'll store in AsyncStorage
const DEMO_USERS_KEY = '@demo_users';
const CURRENT_USER_KEY = '@current_user';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize demo users
  const initDemoUsers = async () => {
    try {
      const users = await AsyncStorage.getItem(DEMO_USERS_KEY);
      if (!users) {
        // Default demo users
        const demoUsers = [
          { id: 'leo31', email: 'leo@example.com', password: 'password123', name: 'Leo' },
          { id: 'maria42', email: 'maria@example.com', password: 'password123', name: 'Maria' },
        ];
        await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoUsers));
      }
    } catch (error) {
      console.error('Error initializing demo users:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Initialize demo users if needed
      await initDemoUsers();
      
      // Get stored users
      const usersJson = await AsyncStorage.getItem(DEMO_USERS_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      // Find user
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Connect to Stream Chat
      await StreamClient.connectUser(user.id, user.name);
      
      // Store current user session
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
      }));
      
      return user;
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // Initialize demo users if needed
      await initDemoUsers();
      
      // Get existing users
      const usersJson = await AsyncStorage.getItem(DEMO_USERS_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      // Check if user exists
      if (users.some((u: any) => u.email === email)) {
        throw new Error('User already exists');
      }
      
      // Create new user ID
      const userId = `${name.toLowerCase()}${Date.now().toString().slice(-3)}`;
      
      // Create new user
      const newUser = {
        id: userId,
        email,
        password, // In production, hash this password!
        name,
      };
      
      // Add to users
      users.push(newUser);
      await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
      
      // Connect to Stream Chat
      await StreamClient.connectUser(userId, name);
      
      // Store current user session
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        id: userId,
        email,
        name,
      }));
      
      return newUser;
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await StreamClient.disconnectUser();
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getCurrentUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  // Add password reset functions here:
  const resetPassword = async (email: string, newPassword: string) => {
    setIsLoading(true);
    try {
      // Get all users
      const usersJson = await AsyncStorage.getItem(DEMO_USERS_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      // Find user by email
      const userIndex = users.findIndex((u: any) => u.email === email);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Update password
      users[userIndex].password = newPassword; // In production, hash this!
      
      // Save updated users
      await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
      
      return true;
    } catch (error: any) {
      Alert.alert('Reset Password Error', error.message || 'Failed to reset password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Add these for the code verification approach
  const generateResetCode = async (email: string) => {
    try {
      // Check if user exists
      const usersJson = await AsyncStorage.getItem(DEMO_USERS_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      if (!users.some((u: any) => u.email === email)) {
        throw new Error('User not found');
      }
      
      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a real app, you would send this code via email
      // For demo, we'll just show it in an alert
      Alert.alert(
        'Reset Code Generated',
        `Demo: Your reset code is ${resetCode}\n(In production, this would be sent via email)`,
        [{ text: 'OK' }]
      );
      
      return { success: true, email, code: resetCode };
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate reset code');
      throw error;
    }
  };

  const verifyResetCode = async (email: string, code: string, newPassword: string) => {
    try {
      // For demo, we'll just accept any code
      // In production, you would verify against a stored code
      
      // Update password
      const usersJson = await AsyncStorage.getItem(DEMO_USERS_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      const userIndex = users.findIndex((u: any) => u.email === email);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      users[userIndex].password = newPassword;
      await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
      
      return { success: true };
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
      throw error;
    }
  };

  return {
    login,
    register,
    logout,
    getCurrentUser,
    resetPassword,
    generateResetCode,
    verifyResetCode,
    isLoading,
  };
};