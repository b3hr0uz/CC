'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  BarChart3, Settings, User, LogOut,
  Home
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Clear any local storage or session storage if used
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Sign out with NextAuth
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect on error
      window.location.href = '/';
    }
  };

  // Main navigation items (top section)
  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Training', href: '/training', icon: BarChart3 },
  ];

  // Bottom navigation items (above sign out)
  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="h-screen w-64 bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-gray-600 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center">
          <img 
            src="/ContextCleanse.png" 
            alt="ContextCleanse Logo" 
            className="h-8 w-8 object-contain"
          />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">ContextCleanse</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-600">
        <div className="space-y-2">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 mt-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign out
        </button>
      </div>
    </div>
  );
} 