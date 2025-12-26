// This is our NEW, clean Root Layout.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // 1. IMPORT THE STATUS BAR

export default function RootLayout() {
  return (
    <>
      {/* 2. THIS IS THE FIX! We add the dark status bar here */}
      <StatusBar style="dark" />
    
      {/* The Stack is our root navigator. */}
      <Stack>
        {/* This is our main "tabs" layout (My Shop). We hide the header. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* This is our "request-form" screen. */}
        <Stack.Screen 
          name="request-form" 
          options={{ 
            presentation: 'modal', 
            title: 'New Funding Request' 
          }} 
        />
      </Stack>
    </>
  );
}