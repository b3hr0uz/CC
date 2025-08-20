'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ActivePage = 'dashboard' | 'assistant' | 'training' | 'settings';

interface AppNavigationContextType {
  activePage: ActivePage;
  navigateToPage: (page: ActivePage) => void;
  isPageActive: (page: ActivePage) => boolean;
}

const AppNavigationContext = createContext<AppNavigationContextType | undefined>(undefined);

interface AppNavigationProviderProps {
  children: React.ReactNode;
}

export function AppNavigationProvider({ children }: AppNavigationProviderProps) {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  const navigateToPage = useCallback((page: ActivePage) => {
    console.log(`🔄 Navigating to ${page} (preserving state)`);
    setActivePage(page);
    
    // Update URL without full navigation
    if (typeof window !== 'undefined') {
      const newUrl = `/${page}`;
      window.history.pushState({ page }, '', newUrl);
    }
  }, []);

  const isPageActive = useCallback((page: ActivePage) => {
    return activePage === page;
  }, [activePage]);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = event.state?.page || 'dashboard';
      setActivePage(page);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial page based on current URL
    const currentPath = window.location.pathname.slice(1);
    if (['dashboard', 'assistant', 'training', 'settings'].includes(currentPath)) {
      setActivePage(currentPath as ActivePage);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const value = {
    activePage,
    navigateToPage,
    isPageActive,
  };

  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const context = useContext(AppNavigationContext);
  if (context === undefined) {
    throw new Error('useAppNavigation must be used within an AppNavigationProvider');
  }
  return context;
}
