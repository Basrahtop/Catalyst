"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// --- FIX: Correct relative paths ---
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
// --- END FIX ---
import { Loader2, Store, Mail, Lock, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  // --- Form State ---
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // <-- NEW FIELD
  
  // --- UI State ---
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // --- 1. THE "MATCH CHECK" LOGIC ---
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      setIsLoading(false);
      return; 
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      // We only send the valid data to the backend (no confirmPassword)
      const response = await api.post('/auth/register', {
        businessName,
        email,
        password
      });

      // Auto-login the user after successful registration
      if (response.data.token && response.data.user) {
        login(response.data.token, response.data.user);
        // Redirect will happen inside login() or we can force it here
        // router.push('/dashboard'); 
      } else {
        router.push('/login');
      }

    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Catalyst</h1>
          <p className="text-gray-500">Create your SME account to access funding.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="px-8 pb-8 space-y-5">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center border border-red-100">
              {error}
            </div>
          )}

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Folake's Fashions"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="folake@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* --- NEW: Confirm Password --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CheckCircle className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className={`w-full px-4 py-2 pl-12 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 
                  ${password && confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                `}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {/* Live feedback if they don't match */}
            {password && confirmPassword && password !== confirmPassword && (
               <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                       bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                       transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
          </button>

        </form>

        {/* Footer Link */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}