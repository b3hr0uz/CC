'use client';

import React from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import Sidebar from './Sidebar';
import NotificationSidebar from './NotificationSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  showNotificationSidebar?: boolean;
}

export default function AppLayout({ children, showNotificationSidebar = false }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Sidebar (now handles its own toggle) */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0">
        {/* Page Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
        
        {/* Notification Sidebar */}
        {showNotificationSidebar && (
          <div className="flex-shrink-0">
            <NotificationSidebar />
          </div>
        )}
      </div>
    </div>
  );
}
