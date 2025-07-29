'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  User, Mail, Calendar, MapPin, Shield, 
  Edit, Save, AlertCircle, CheckCircle, Camera, Globe
} from 'lucide-react';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    location: 'San Francisco, CA',
    timezone: 'PST (UTC-8)',
    memberSince: '2025-07-27',
    avatar: '/api/placeholder/100/100'
  });


  const handleProfileUpdate = (key: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveStatus('success');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex h-screen bg-gray-800">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <User className="mr-3 text-blue-600 dark:text-blue-400" />
                Profile
              </h1>
              <p className="text-sm text-white">Manage your account and view usage statistics</p>
            </div>
            
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-white hover:text-white dark:hover:text-gray-100 border border-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black disabled:bg-gray-800 dark:disabled:bg-black text-white border border-gray-600 rounded-lg transition-colors"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black text-white border border-gray-600 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
          
          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <div className={`mt-4 p-3 rounded-lg flex items-center ${
              saveStatus === 'success' ? 'bg-gray-800 text-white border border-gray-600' : 'bg-gray-800 text-white border border-gray-600'
            }`}>
              {saveStatus === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {saveStatus === 'success' ? 'Profile updated successfully!' : 'Failed to update profile. Please try again.'}
            </div>
          )}
        </header>

        <div className="p-6 space-y-6">
          {/* Profile Information */}
          <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-6">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-1 bg-gray-800 text-white border border-gray-600 rounded-full hover:bg-gray-800 dark:hover:bg-black transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Profile Details */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleProfileUpdate('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    ) : (
                      <p className="text-white font-medium">{profile.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-white">{profile.email}</p>
                      <span className="ml-2 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded-full">Verified</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Location</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => handleProfileUpdate('location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    ) : (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-white">{profile.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Timezone</label>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-white">{profile.timezone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Member Since</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-white">{formatDate(profile.memberSince)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Account Actions */}
          <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-6">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Account Management</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors">
                <Mail className="h-5 w-5 text-white mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Change Email</p>
                  <p className="text-xs text-white">Update your email address</p>
                </div>
              </button>
              
              <button className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors">
                <Shield className="h-5 w-5 text-white mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Change Password</p>
                  <p className="text-xs text-white">Update your password</p>
                </div>
              </button>
              
              <button className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors">
                <Globe className="h-5 w-5 text-white mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Export Data</p>
                  <p className="text-xs text-white">Download your data</p>
                </div>
              </button>
              
              <button className="flex items-center p-4 border border-gray-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors">
                <AlertCircle className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs">Permanently delete your account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 