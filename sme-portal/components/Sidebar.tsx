"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  Landmark, 
  User, 
  LogOut,
  History,
  Wallet,
  Shield,
  CheckCircle,
  X // Added Close icon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Shop', href: '/dashboard/shop', icon: Store },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Funding', href: '/dashboard/funding', icon: Landmark },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Reputation', href: '/dashboard/reputation', icon: Shield },
  { name: 'Verify Reputation', href: '/verify', icon: CheckCircle },
  { name: 'Transactions', href: '/dashboard/transactions', icon: History },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

// --- 1. Define Props ---
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const pathname = usePathname();

  return (
    <>
      {/* --- 2. The Overlay (Mobile Only) --- */}
      {/* Clicking this dark background closes the menu */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* --- 3. The Sidebar Itself --- */}
      <div className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-lg 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between h-20 border-b border-gray-200 px-6">
          <h1 className="text-2xl font-bold text-indigo-600">Catalyst</h1>
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow mt-6 space-y-2 px-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onClose} // Close sidebar when link is clicked (Mobile UX)
                className={`
                  flex items-center px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <link.icon className="w-5 h-5 mr-3" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium
                       text-red-600 hover:bg-red-50
                       transition-all duration-200 ease-in-out"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}