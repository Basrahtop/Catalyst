"use client"; // This must be a "Client Component" because it uses state and effects

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // --- THIS LINE IS NOW FIXED --- (Uses the '@/' alias)

// 1. Define the "shape" of our user and context
interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  sme: {
    id: string;
    businessName: string;
  } | null;
  // Add other fields as we need them
}

interface AuthContextType {
  user: User | null; // The logged-in user, or null
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// 2. Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the "Provider" - this is the component that will wrap our app
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 4. This 'useEffect' runs *once* when the app first loads
  // It checks if we already have a token saved in the browser
  useEffect(() => {
    const savedToken = localStorage.getItem('catalyst_token');
    if (savedToken) {
      setToken(savedToken);
      // If we have a token, fetch the user's profile to make sure it's valid
      api.get('/users/me')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token is invalid or expired
          localStorage.removeItem('catalyst_token');
          setToken(null);
          router.push('/login');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false); // No token, we're done loading
    }
  }, [router]);

  // 5. Login function
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('catalyst_token', newToken);
    setToken(newToken);
    setUser(newUser);
    router.push('/dashboard'); // Redirect to the main dashboard
  };

  // 6. Logout function
  const logout = () => {
    localStorage.removeItem('catalyst_token');
    setToken(null);
    setUser(null);
    router.push('/login'); // Redirect to login page
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 7. Create a simple "hook" to let our pages easily access this "brain"
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};