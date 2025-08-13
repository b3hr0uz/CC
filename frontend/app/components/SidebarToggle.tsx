'use client';

import React from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import { Menu, X } from 'lucide-react';

export default function SidebarToggle() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={`fixed top-4 z-50 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
        isCollapsed ? 'left-4' : 'left-[272px]'
      }`}
      title={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
      aria-label={isCollapsed ? 'Show sidebar' : 'Hide sidebar'}
    >
      {isCollapsed ? (
        <Menu className="h-5 w-5" />
      ) : (
        <X className="h-5 w-5" />
      )}
    </button>
  );
}
