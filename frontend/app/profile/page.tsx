'use client';

import React from 'react';
import Sidebar from '../components/Sidebar';
import NotificationSidebar from '../components/NotificationSidebar';
import { NotificationProvider } from '../contexts/NotificationContext';
import { 
  User, Mail
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();





  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-800">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
              <p className="text-gray-400">Manage your account information</p>
            </div>
            
            <div className="mt-8 bg-gray-800 rounded-lg border border-gray-600 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">{session?.user?.name || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{session?.user?.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Events Sidebar */}
        <NotificationSidebar 
          title="Events"
        />
      </div>
    </NotificationProvider>
  );
} 