'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSidebar } from '../contexts/SidebarContext';
import { 
  BarChart3, Settings, LogOut,
  Home, Bot
} from 'lucide-react';

export default function Sidebar() {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();

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
    { name: 'Assistant', href: '/assistant', icon: Bot },
    { name: 'Training', href: '/training', icon: BarChart3 },
  ];

  // Bottom navigation items (above sign out)
  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  // Don't render anything if collapsed
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="h-screen w-64 border-r border-gray-600 flex flex-col" style={{backgroundColor: '#212121'}}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center">
          <Image 
            src="/ContextCleanse-no-padding-transparent-dark-mode.png" 
            alt="ContextCleanse Logo" 
            width={32}
            height={32}
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
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-black dark:text-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white'
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
      <div className="p-4">
        {/* Version and Copyright Info */}
        <div className="mb-4 px-3 py-2 text-xs text-gray-400 border-b border-gray-600">
          <div className="text-center space-y-1">
            <div className="font-medium text-white">ContextCleanse v0.1.0</div>
            <div>© 2025 ContextCleanse</div>
          </div>
        </div>
        
        <div className="space-y-2">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-black dark:text-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white'
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
          className="w-full flex items-center px-3 py-2 mt-2 rounded-lg text-sm font-medium text-black dark:text-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign out
        </button>
      </div>
    </div>
  );
} 