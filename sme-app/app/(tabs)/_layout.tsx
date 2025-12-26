import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // 1. Import StatusBar
import { Ionicons } from '@expo/vector-icons'; // 2. Import Icons

export default function TabLayout() {
  return (
    <>
      {/* 3. THIS IS THE STATUS BAR FIX! 
          We put it here, inside the component that is definitely rendering. */}
      <StatusBar style="dark" />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#004a99', // 4. YOUR BLUE COLOR IS BACK!
          tabBarInactiveTintColor: '#888',
          headerShown: false, // Hide headers on all tabs
        }}>
        
        {/* TAB 1: HOME (index.tsx) */}
        <Tabs.Screen
          name="index" // This links to index.tsx
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />

        {/* TAB 2: MY SHOP (shop.tsx) - NEW! */}
        <Tabs.Screen
          name="shop" // This will link to our new app/(tabs)/shop.tsx
          options={{
            title: 'My Shop',
            tabBarIcon: ({ color }) => (
              <Ionicons name="storefront-outline" size={24} color={color} />
            ),
          }}
        />

        {/* TAB 3: REPAY (repay.tsx) - NEW! */}
        <Tabs.Screen
          name="repay" // This will link to our new app/(tabs)/repay.tsx
          options={{
            title: 'Repay',
            tabBarIcon: ({ color }) => (
              <Ionicons name="receipt-outline" size={24} color={color} />
            ),
          }}
        />
        
      </Tabs>
    </>
  );
}