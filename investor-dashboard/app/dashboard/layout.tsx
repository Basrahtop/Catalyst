"use client";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer" onClick={() => router.push('/dashboard')}>
                Catalyst Investor
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <WalletConnectButton />
              <span className="text-gray-700">Welcome, {user.firstName || user.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white
                           hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {children}
      </main>
    </div>
  );
}
