'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSidebar } from '../contexts/SidebarContext';
import { 
  BarChart3, Settings, LogOut,
  Home, Bot, Menu
} from 'lucide-react';

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
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

  // Collapsed (narrow icon-only) sidebar
  if (isCollapsed) {
    return (
      <div className="h-screen w-16 border-r border-gray-600 flex flex-col items-center py-4" style={{backgroundColor: '#212121'}}>
        {/* Logo */}
        <div className="mb-6">
          <Image 
            src="/ContextCleanse-no-padding-transparent-dark-mode.png" 
            alt="ContextCleanse Logo" 
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </div>

        {/* Main Navigation Icons */}
        <nav className="flex-1 flex flex-col space-y-3">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`p-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation Icons */}
        <div className="flex flex-col space-y-3 mt-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={toggleSidebar}
            title="Expand sidebar"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Settings */}
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`p-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}

          {/* Sign Out Icon */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded sidebar
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
        
        {/* Hamburger Menu Button (above Settings) */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center px-3 py-2 mb-2 rounded-lg text-sm font-medium text-black dark:text-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5 mr-3" />
          Toggle Sidebar
        </button>
        
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