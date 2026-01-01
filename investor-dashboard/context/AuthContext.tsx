"use client";
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  wallet?: {
    id: string;
    balance: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('investorToken');
    const storedUser = localStorage.getItem('investorUser');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      // Refresh wallet balance by fetching from wallet endpoint
      const walletResponse = await api.get('/wallet/balance');
      if (user && walletResponse.data) {
        const updatedUser = {
          ...user,
          wallet: {
            ...user.wallet!,
            balance: walletResponse.data.ngn // Use 'ngn' property (balance in kobo)
          }
        };
        localStorage.setItem('investorUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login-investor', { email, password });
      const { token: newToken, user: newUser } = response.data;
      
      // Backend already validates P2P_LENDER role, but double-check
      if (!newUser.roles.includes('P2P_LENDER') && !newUser.roles.includes('ADMIN')) {
        throw new Error('Access denied. This portal is for investors only.');
      }
      
      localStorage.setItem('investorToken', newToken);
      localStorage.setItem('investorUser', JSON.stringify(newUser));
      
      setToken(newToken);
      setUser(newUser);
      
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('investorToken');
    localStorage.removeItem('investorUser');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
