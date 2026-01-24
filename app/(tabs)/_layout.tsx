// app/(tabs)/_layout.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      
      {/* Existing tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />


      
            {/* messaging */}
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Chat',
          // ✅ Using correct AntDesign icon name
          tabBarIcon: ({ color }) => <AntDesign name="message" size={28} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="explore"
                options={{
          href: null, // Hide this tab
        }}
      />
      
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <AntDesign name="calendar" size={28} color={color} />,
        }}
      />
      
      {/* Add contact page - using correct AntDesign icon name */}
      <Tabs.Screen
        name="add-contact"
        options={{
          title: 'Add Contact',
          // ✅ Using correct AntDesign icon name
          tabBarIcon: ({ color }) => <AntDesign name="user-add" size={28} color={color} />,
        }}
      />
      

      
                  {/* Dynamic route page - not shown in tab bar */}
      <Tabs.Screen
        name="chat/[cid]"
        options={{
          href: null, // Hide this tab
        }}
      />

      
    </Tabs>
  );
}