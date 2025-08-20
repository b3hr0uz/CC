'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { useAppNavigation } from '../contexts/AppNavigationContext';

// Import all page components
import DashboardPage from '../dashboard/page';
import AssistantPage from '../assistant/page';
import TrainingPage from '../training/page';
import SettingsPage from '../settings/page';

export default function MainPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { activePage, isPageActive } = useAppNavigation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-gray-800 items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <AppLayout showNotificationSidebar={true}>
      <div className="h-full overflow-hidden">
        {/* Dashboard Component - Always mounted, visibility controlled */}
        <div 
          className={`h-full w-full ${isPageActive('dashboard') ? 'block' : 'hidden'}`}
          data-page="dashboard"
        >
          <DashboardPageWrapper />
        </div>

        {/* Assistant Component - Always mounted, visibility controlled */}
        <div 
          className={`h-full w-full ${isPageActive('assistant') ? 'block' : 'hidden'}`}
          data-page="assistant"
        >
          <AssistantPageWrapper />
        </div>

        {/* Training Component - Always mounted, visibility controlled */}
        <div 
          className={`h-full w-full ${isPageActive('training') ? 'block' : 'hidden'}`}
          data-page="training"
        >
          <TrainingPageWrapper />
        </div>

        {/* Settings Component - Always mounted, visibility controlled */}
        <div 
          className={`h-full w-full ${isPageActive('settings') ? 'block' : 'hidden'}`}
          data-page="settings"
        >
          <SettingsPageWrapper />
        </div>
      </div>
    </AppLayout>
  );
}

// Wrapper components to remove AppLayout from individual pages since we're handling it at the main level
function DashboardPageWrapper() {
  return <DashboardPage />;
}

function AssistantPageWrapper() {
  return <AssistantPage />;
}

function TrainingPageWrapper() {
  return <TrainingPage />;
}

function SettingsPageWrapper() {
  return <SettingsPage />;
}
