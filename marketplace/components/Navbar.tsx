"use client";
import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Search } from 'lucide-react';
import { useCart } from '@/context/CartContext'; // Connect to the brain

export default function Navbar() {
  const { cartCount } = useCart();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* 1. Brand Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-indigo-600">Catalyst</span>
            <span className="ml-2 text-sm font-medium text-gray-500 hidden sm:block">Marketplace</span>
          </Link>

          {/* 2. Search Bar (Visual only for now) */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search for Aso-Oke, Rice, etc..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 3. Cart Icon & Login */}
          <div className="flex items-center space-x-6">
            <Link href="/cart" className="relative group">
              <div className="p-2 rounded-full bg-gray-100 group-hover:bg-indigo-50 transition-colors">
                <ShoppingBag className="w-6 h-6 text-gray-700 group-hover:text-indigo-600" />
              </div>
              {/* The Red Badge Count */}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {/* We can add Customer Login later */}
            <button className="text-sm font-semibold text-gray-700 hover:text-indigo-600">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}