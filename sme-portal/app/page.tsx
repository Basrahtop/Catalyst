"use client";
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [token, isLoading, router]);

  // Show a blank loading screen while we decide where to go
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl">Loading Catalyst...</h1>
    </div>
  );
}