'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '../components/AppLayout';
import { useNotifications } from '../contexts/NotificationContext';
import { usePageLoading } from '../contexts/PageLoadingContext';
import { useBackgroundInitialization } from '../contexts/BackgroundInitializationContext';
import { 
  Settings, Shield, Mail, Database, 
  Save, RefreshCw, AlertCircle, CheckCircle,
  Lock, User, Camera, MapPin, 
  Calendar, Globe, Edit,
  Download, Trash2, Bell, Monitor
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addNotification } = useNotifications();
  const { updateDashboardLoading } = usePageLoading();
  const { initializationStatus } = useBackgroundInitialization();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
  }, [status, router]);

  const [settings, setSettings] = useState({
    // Email Settings
    emailNotifications: true,
    spamAlerts: true,
    dailySummary: false,
    realTimeUpdates: true,
    
    // Privacy Settings
    dataRetention: '30', // days
    shareAnalytics: false,
    cookieConsent: true,
    
    // Model Settings
    defaultModel: 'xgboost_rl',
    confidenceThreshold: 0.8,
    autoRetrain: true,
    trainingInterval: 45,
    
    // Display Settings
    language: 'en',
    timezone: 'UTC',
    theme: 'dark',
    compactMode: false,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginAlerts: true,
    
    // Advanced Settings
    debugMode: false,
    betaFeatures: false,
    telemetryEnabled: false,
  });

  const [profile, setProfile] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    location: '',
    timezone: 'UTC',
    profilePicture: session?.user?.image || null,
    joinedDate: session ? new Date(session.expires).toISOString().split('T')[0] : '',
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add success notification
      addNotification({
        id: `settings-save-${Date.now()}`,
        type: 'backend_info',
        model_name: 'Settings',
        message: '✅ Settings saved successfully - All preferences updated',
        timestamp: new Date(),
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      
      addNotification({
        id: `settings-error-${Date.now()}`,
        type: 'backend_info',
        model_name: 'Settings',
        message: '❌ Failed to save settings - Please try again',
        timestamp: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEditingProfile(false);
      
      addNotification({
        id: `profile-save-${Date.now()}`,
        type: 'backend_info',
        model_name: 'Profile',
        message: '✅ Profile updated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      addNotification({
        id: `profile-error-${Date.now()}`,
        type: 'backend_info',
        model_name: 'Profile',
        message: '❌ Failed to update profile - Please try again',
        timestamp: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountAction = async (action: string) => {
    addNotification({
      id: `account-${action}-${Date.now()}`,
      type: 'backend_info',
      model_name: 'Account',
      message: `🔧 ${action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} functionality will be available in the next update`,
      timestamp: new Date(),
    });
  };

  if (status === 'loading') {
    return (
      <AppLayout showNotificationSidebar={true}>
        <div className="flex-1 flex items-center justify-center" style={{backgroundColor: '#212121'}}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect via useEffect
  }

  return (
    <AppLayout showNotificationSidebar={true}>
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{backgroundColor: '#212121'}}>
        {/* Header */}
        <header className="border-b border-gray-600 px-6 py-4 flex-shrink-0" style={{backgroundColor: '#212121'}}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Settings className="h-6 w-6 mr-2 text-blue-400" />
                Settings
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage your account and application preferences
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <div className={`mt-4 p-3 rounded-lg flex items-center ${
              saveStatus === 'success' ? 'border border-green-600' : 'border border-red-600'
            }`} style={{backgroundColor: '#1a1a1a'}}>
              {saveStatus === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-green-300">Settings saved successfully!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-300">Failed to save settings. Please try again.</span>
                </>
              )}
            </div>
          )}
        </header>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8" style={{backgroundColor: '#212121'}}>
          {/* Email & Notification Settings */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center mb-6">
              <Bell className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Email & Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-gray-400 text-sm">Receive updates about your emails and classifications</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.emailNotifications ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Spam Alerts</p>
                  <p className="text-gray-400 text-sm">Get notified when suspicious emails are detected</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.spamAlerts}
                    onChange={(e) => handleSettingChange('spamAlerts', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.spamAlerts ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('spamAlerts', !settings.spamAlerts)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.spamAlerts ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Real-time Updates</p>
                  <p className="text-gray-400 text-sm">Live updates in the Events sidebar</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.realTimeUpdates}
                    onChange={(e) => handleSettingChange('realTimeUpdates', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.realTimeUpdates ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('realTimeUpdates', !settings.realTimeUpdates)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.realTimeUpdates ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Privacy & Data</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Data Retention Period</label>
                <select
                  value={settings.dataRetention}
                  onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Share Usage Analytics</p>
                  <p className="text-gray-400 text-sm">Help improve the service by sharing anonymous usage data</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.shareAnalytics}
                    onChange={(e) => handleSettingChange('shareAnalytics', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.shareAnalytics ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('shareAnalytics', !settings.shareAnalytics)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.shareAnalytics ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center mb-6">
              <Database className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">ML Model Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Default Model</label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="naive_bayes">Naive Bayes</option>
                  <option value="neural_network">Neural Network</option>
                  <option value="random_forest">Random Forest</option>
                  <option value="svm">Support Vector Machine</option>
                  <option value="xgboost">XGBoost</option>
                  <option value="xgboost_rl">XGBoost + RL (Recommended)</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{backgroundColor: '#212121'}}
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Training Interval (minutes)</label>
                <select
                  value={settings.trainingInterval}
                  onChange={(e) => handleSettingChange('trainingInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes (Default)</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto Retrain Models</p>
                  <p className="text-gray-400 text-sm">Automatically retrain models with new data</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoRetrain}
                    onChange={(e) => handleSettingChange('autoRetrain', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.autoRetrain ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('autoRetrain', !settings.autoRetrain)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.autoRetrain ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center mb-6">
              <Monitor className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Display & Interface</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Compact Mode</p>
                  <p className="text-gray-400 text-sm">Reduce spacing and padding for more content</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(e) => handleSettingChange('compactMode', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.compactMode ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('compactMode', !settings.compactMode)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.compactMode ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center mb-6">
              <Lock className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Security</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  onClick={() => handleSettingChange('twoFactorAuth', !settings.twoFactorAuth)}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.twoFactorAuth ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Session Timeout</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                  style={{backgroundColor: '#212121'}}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="480">8 hours</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>

          {/* Account Management */}
          <div className="rounded-lg shadow p-6 border border-gray-700" style={{backgroundColor: '#1a1a1a'}}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Account Information</h2>
              </div>
              <div className="flex items-center space-x-2">
                {isEditingProfile ? (
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Picture & Basic Info */}
              <div className="space-y-4">
                <div className="relative">
                  {profile.profilePicture ? (
                    <Image
                      src={profile.profilePicture}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="rounded-full border border-gray-600"
                    />
                  ) : (
                    <div className="w-20 h-20 border border-gray-600 rounded-full flex items-center justify-center" style={{backgroundColor: '#212121'}}>
                      <User className="h-10 w-10 text-blue-400" />
                    </div>
                  )}
                  {isEditingProfile && (
                    <button className="absolute bottom-0 right-0 p-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors">
                      <Camera className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Full Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                      style={{backgroundColor: '#212121'}}
                    />
                  ) : (
                    <p className="text-gray-300">{profile.name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Email</label>
                  <p className="text-gray-300">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Location</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                      style={{backgroundColor: '#212121'}}
                    />
                  ) : (
                    <p className="text-gray-300">{profile.location || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-md font-semibold text-white mb-4">Account Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">127</p>
                  <p className="text-xs text-gray-400">Emails Processed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">23</p>
                  <p className="text-xs text-gray-400">Spam Detected</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">92%</p>
                  <p className="text-xs text-gray-400">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">14</p>
                  <p className="text-xs text-gray-400">Days Active</p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-md font-semibold text-white mb-4">Account Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAccountAction('change-email')}
                  className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Mail className="h-5 w-5 text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Change Email</p>
                    <p className="text-xs text-gray-400">Update your email address</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('change-password')}
                  className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Lock className="h-5 w-5 text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Change Password</p>
                    <p className="text-xs text-gray-400">Update your password</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('export-data')}
                  className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-5 w-5 text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Export Data</p>
                    <p className="text-xs text-gray-400">Download your account data</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('delete-account')}
                  className="flex items-center p-4 border border-red-600 rounded-lg hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-5 w-5 text-red-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-300">Delete Account</p>
                    <p className="text-xs text-red-400">Permanently delete your account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}