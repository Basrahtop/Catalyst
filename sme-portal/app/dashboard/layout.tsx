"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Menu } from 'lucide-react'; // Added Menu icon
import WalletConnectButton from '@/components/WalletConnectButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  
  // --- 1. New State for Mobile Menu ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading || !user) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <h1 className="ml-4 text-2xl font-medium text-gray-700">Loading Your Portal...</h1>
      </div>
    );
  }

  if (token) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* --- 2. Pass state to Sidebar --- */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
          
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                
                {/* --- 3. Left Side: Hamburger (Mobile) & Welcome (Desktop) --- */}
                <div className="flex items-center">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 md:hidden mr-3"
                  >
                    <Menu className="w-6 h-6" />
                  </button>

                  <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                    Welcome, {user.sme?.businessName || user.firstName || 'User'}!
                  </h1>
                </div>
                
                {/* Right Side: Wallet + Logout */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <WalletConnectButton />
                  <button 
                    onClick={logout}
                    className="px-3 py-2 sm:px-4 sm:py-2 font-medium text-xs sm:text-sm text-white 
                               bg-gradient-to-r from-red-500 to-red-600 
                               rounded-lg shadow-md 
                               hover:from-red-600 hover:to-red-700
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                               transition-all duration-300 ease-in-out
                               hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Scrollable Area */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
}