'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSidebar } from '../contexts/SidebarContext';
import { useNotifications } from '../contexts/NotificationContext';
import { usePageLoading } from '../contexts/PageLoadingContext';
import { 
  BarChart3, Settings, LogOut,
  Home, Bot, Menu, Loader
} from 'lucide-react';

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { notifications } = useNotifications();
  const { dashboard, assistant, training } = usePageLoading();

  // Check if training is currently active
  const isTrainingActive = notifications.some(notification => 
    (notification.type === 'model_training_start' || 
     notification.type === 'auto_training_init' ||
     notification.type === 'training_start') &&
    notification.model_name !== 'Background Training' // Exclude background processes
  );

  // Loading spinner component
  const LoadingSpinner = ({ size = 'h-4 w-4' }: { size?: string }) => (
    <Loader className={`${size} animate-spin`} />
  );

  // Loading progress indicator component
  const LoadingProgressIndicator = ({ 
    progress, 
    isLoading, 
    backgroundProcesses, 
    size = 'small' 
  }: { 
    progress: number; 
    isLoading: boolean; 
    backgroundProcesses: string[]; 
    size?: 'small' | 'medium' 
  }) => {
    if (!isLoading && backgroundProcesses.length === 0) return null;

    const isSmall = size === 'small';
    const radius = isSmall ? 8 : 10;
    const strokeWidth = isSmall ? 2 : 2.5;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`relative ${isSmall ? 'w-4 h-4' : 'w-5 h-5'}`} title={`${progress}% - ${backgroundProcesses.join(', ') || 'Loading...'}`}>
        <svg className="transform -rotate-90" width={isSmall ? 16 : 20} height={isSmall ? 16 : 20}>
          {/* Background circle */}
          <circle
            cx={isSmall ? 8 : 10}
            cy={isSmall ? 8 : 10}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx={isSmall ? 8 : 10}
            cy={isSmall ? 8 : 10}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 opacity-80"
            style={{
              strokeLinecap: 'round',
            }}
          />
        </svg>
        {/* Center dot for activity indication */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`${isSmall ? 'w-1 h-1' : 'w-1.5 h-1.5'} bg-current rounded-full ${isLoading ? 'animate-pulse' : ''}`} />
        </div>
      </div>
    );
  };

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

  // Main navigation items (top section) with loading states
  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, loadingState: dashboard },
    { name: 'Assistant', href: '/assistant', icon: Bot, loadingState: assistant },
    { name: 'Training', href: '/training', icon: BarChart3, loadingState: training },
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
            const isTraining = item.name === 'Training';
            const hasActivity = item.loadingState.isLoading || item.loadingState.backgroundProcesses.length > 0;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                title={`${item.name}${hasActivity ? ` - ${item.loadingState.status}` : ''}`}
                className={`p-2 rounded-lg transition-colors relative ${
                  isActive(item.href)
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                
                {/* Loading progress indicator overlay */}
                {hasActivity && (
                  <div className="absolute -top-1 -right-1">
                    <LoadingProgressIndicator
                      progress={item.loadingState.progress}
                      isLoading={item.loadingState.isLoading}
                      backgroundProcesses={item.loadingState.backgroundProcesses}
                      size="small"
                    />
                  </div>
                )}
                
                {/* Fallback training spinner for backward compatibility */}
                {isTraining && isTrainingActive && !hasActivity && (
                  <div className="absolute -top-1 -right-1">
                    <LoadingSpinner size="h-3 w-3" />
                  </div>
                )}
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
            const isTraining = item.name === 'Training';
            const hasActivity = item.loadingState.isLoading || item.loadingState.backgroundProcesses.length > 0;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600'
                    : 'text-black dark:text-white hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </div>
                
                {/* Right side loading indicators and progress */}
                <div className="flex items-center space-x-2">
                  {/* Loading progress percentage */}
                  {hasActivity && (
                    <span className="text-xs opacity-70 min-w-[32px]">
                      {item.loadingState.progress}%
                    </span>
                  )}
                  
                  {/* Loading progress indicator */}
                  {hasActivity && (
                    <LoadingProgressIndicator
                      progress={item.loadingState.progress}
                      isLoading={item.loadingState.isLoading}
                      backgroundProcesses={item.loadingState.backgroundProcesses}
                      size="medium"
                    />
                  )}
                  
                  {/* Fallback training spinner for backward compatibility */}
                  {isTraining && isTrainingActive && !hasActivity && (
                    <LoadingSpinner size="h-4 w-4" />
                  )}
                </div>
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
          Toggle
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