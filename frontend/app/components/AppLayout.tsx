'use client';

import React from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import Sidebar from './Sidebar';
import SidebarToggle from './SidebarToggle';
import NotificationSidebar from './NotificationSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  showNotificationSidebar?: boolean;
}

export default function AppLayout({ children, showNotificationSidebar = false }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen">
      {/* Main Sidebar */}
      <Sidebar />
      
      {/* Sidebar Toggle Button */}
      <SidebarToggle />
      
      {/* Main Content Area */}
      <div className={`flex-1 flex transition-all duration-300 ease-in-out ${
        isCollapsed ? 'ml-0' : 'ml-0'
      }`}>
        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        
        {/* Notification Sidebar */}
        {showNotificationSidebar && <NotificationSidebar />}
      </div>
    </div>
  );
}
