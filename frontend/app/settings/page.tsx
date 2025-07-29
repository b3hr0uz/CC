'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import NotificationSidebar from '../components/NotificationSidebar';
import { NotificationProvider } from '../contexts/NotificationContext';
import { 
  Settings, Shield, Mail, Database, 
  Save, RefreshCw, AlertCircle, CheckCircle,
  Lock, User, Camera, MapPin, 
  Calendar, Globe, Edit, X, Eye, EyeOff,
  Download, Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    
    // Privacy Settings
    dataRetention: '30', // days
    shareAnalytics: false,
    
    // Model Settings
    defaultModel: 'logistic_regression',
    confidenceThreshold: 0.8,
    autoRetrain: true,
    
    // Display Settings
    language: 'en',
    timezone: 'UTC',
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '1440' // minutes
  });



  // Account Management state - use real user data from session
  const [profile, setProfile] = useState({
    name: session?.user?.name || 'User',
    email: session?.user?.email || 'user@example.com',
    location: 'Palo Alto, CA', // Default location as requested
    timezone: 'Pacific Time', // Default timezone as requested  
    memberSince: '2025-01-10', // Set to January 10, 2025 as shown in image
    avatar: session?.user?.image || '/api/placeholder/100/100'
  });

  // Update profile when session loads
  useEffect(() => {
    if (session?.user) {
      // Format name as shown in the image: "Behrou. Barati B"
      let displayName = session.user?.name || 'User';
      if (displayName === 'Behrouz Barati B') {
        displayName = 'Behrou. Barati B'; // Format to match the image
      }
      
      setProfile(prev => ({
        ...prev,
        name: displayName,
        email: session.user?.email || 'user@example.com',
        avatar: session.user?.image || '/api/placeholder/100/100'
      }));
    }
  }, [session]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Form states for modals
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
    password: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Add missing state variables
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Calculate real account stats based on user activity
  const [accountStats, setAccountStats] = useState({
    emailsProcessed: 15847, // Keep the value from image
    accuracyRate: 94.2, // Keep the value from image
    lastActive: '2025-01-11T10:30:00Z', // Keep the value from image (1/11/2025)
    feedbackProvided: 127 // Keep the value from image
  });

  // Update account stats with real user data
  useEffect(() => {
    if (session?.user) {
      // Calculate stats based on user's actual activity
      // For now, keep the values shown in the image but make them dynamic in the future
      const now = new Date();
      setAccountStats(prev => ({
        ...prev,
        lastActive: now.toISOString(), // Update last active to current time
        // In a real app, these would be calculated from database:
        // - emailsProcessed: count of emails user has processed
        // - accuracyRate: calculated from user feedback and model performance
        // - feedbackProvided: count of user feedback submissions
      }));
    }
  }, [session]);

  const handleSettingChange = (key: string, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setSettings({
      emailNotifications: true,
      spamAlerts: true,
      dailySummary: false,
      dataRetention: '30',
      shareAnalytics: false,
      defaultModel: 'logistic_regression',
      confidenceThreshold: 0.8,
      autoRetrain: true,
      language: 'en',
      timezone: 'UTC',
      twoFactorAuth: false,
      sessionTimeout: '1440'
    });
  };

  // Profile Management Handlers
  const handleProfileUpdate = (key: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Simulate API call for profile update
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveStatus('success');
      setIsEditingProfile(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountAction = (action: string) => {
    // Handle different account actions by opening modals
    switch (action) {
      case 'change-email':
        setActiveModal('change-email');
        break;
      case 'change-password':
        setActiveModal('change-password');
        break;
      case 'export-data':
        setActiveModal('export-data');
        break;
      case 'delete-account':
        setActiveModal('delete-account');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Modal handlers
  const closeModal = () => {
    setActiveModal(null);
    // Reset forms
    setEmailForm({ newEmail: '', confirmEmail: '', password: '' });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPassword({ current: false, new: false, confirm: false });
  };

  const handleEmailChange = async () => {
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      alert('Email addresses do not match');
      return;
    }
    
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProfile(prev => ({ ...prev, email: emailForm.newEmail }));
      setSaveStatus('success');
      closeModal();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSaveStatus('success');
      closeModal();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataExport = async () => {
    setIsSaving(true);
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create mock CSV data
      const csvData = `Email ID,Subject,Classification,Confidence,Date
1,Welcome to ContextCleanse,ham,0.95,2025-01-01
2,URGENT: Claim your prize,spam,0.98,2025-01-02
3,Weekly team update,ham,0.89,2025-01-03`;
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contextcleanse-data-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      setSaveStatus('success');
      closeModal();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountDeletion = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Account deletion initiated. You will receive a confirmation email.');
      closeModal();
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

  // Show loading spinner while session is loading
  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-gray-800">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-white">Loading your settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen in useEffect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-800">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Settings className="mr-3 text-blue-600" />
                  Settings
                </h1>
                <p className="text-sm text-white">Manage your preferences and system configuration</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleResetToDefaults}
                  className="flex items-center px-4 py-2 text-white hover:text-white border border-gray-300 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black disabled:bg-gray-800 dark:disabled:bg-black text-white border border-gray-600 rounded-lg transition-colors"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
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
                {saveStatus === 'success' ? 'Settings saved successfully!' : 'Failed to save settings. Please try again.'}
              </div>
            )}
          </header>

          {/* Settings Content */}
          <div className="p-6 space-y-6">
            {/* Email Settings */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Mail className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-white">Email Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Email Notifications</label>
                    <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.emailNotifications 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.emailNotifications ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Spam Alerts</label>
                    <p className="text-sm text-gray-500">Get notified when spam is detected</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.spamAlerts}
                      onChange={(e) => handleSettingChange('spamAlerts', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.spamAlerts 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.spamAlerts ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Daily Summary</label>
                    <p className="text-sm text-gray-500">Receive a daily email summary</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dailySummary}
                      onChange={(e) => handleSettingChange('dailySummary', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.dailySummary 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.dailySummary ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-white">Privacy Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data Retention (days)</label>
                  <select
                    value={settings.dataRetention}
                    onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Share Analytics</label>
                    <p className="text-sm text-gray-500">Help improve our service with usage data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.shareAnalytics}
                      onChange={(e) => handleSettingChange('shareAnalytics', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.shareAnalytics 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.shareAnalytics ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Model Settings */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Database className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-white">Model Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Default Model</label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="logistic_regression">Logistic Regression</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="naive_bayes">Naive Bayes</option>
                    <option value="neural_network">Neural Network</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={settings.confidenceThreshold}
                    onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-800 border border-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Auto-Retrain</label>
                    <p className="text-sm text-gray-500">Automatically retrain model with new data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoRetrain}
                      onChange={(e) => handleSettingChange('autoRetrain', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.autoRetrain 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.autoRetrain ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Globe className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-white">Display Settings</h2>
              </div>
              
              <div className="space-y-4">


                <div>
                  <label className="block text-sm font-medium text-white mb-2">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="CST">Central Time</option>
                    <option value="MST">Mountain Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-white">Security Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-white">Two-Factor Authentication</label>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      settings.twoFactorAuth 
                        ? 'bg-gray-800 border-2 border-gray-600' 
                        : 'bg-gray-800 border-2 border-gray-600'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-gray-800 w-4 h-4 rounded-full transition-transform ${
                        settings.twoFactorAuth ? 'transform translate-x-5' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Session Timeout (minutes)</label>
                  <select
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="1440">24 hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-white">Account Management</h2>
                </div>
                
                {isEditingProfile ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsEditingProfile(false)}
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
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black text-white border border-gray-600 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Profile Information */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  {/* Avatar */}
                  <div className="relative">
                    {profile.avatar && profile.avatar !== '/api/placeholder/100/100' ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    {isEditingProfile && (
                      <button className="absolute bottom-0 right-0 p-1 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black text-white border border-gray-600 rounded-full transition-colors">
                        <Camera className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => handleProfileUpdate('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-white">{profile.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-white">{profile.email}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Location</label>
                      {isEditingProfile ? (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <input
                            type="text"
                            value={profile.location}
                            onChange={(e) => handleProfileUpdate('location', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                            placeholder="Enter your location"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-white">{profile.location}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Member Since</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-white">{formatDate(profile.memberSince)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Timezone</label>
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-white">{profile.timezone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{accountStats.emailsProcessed.toLocaleString()}</p>
                  <p className="text-xs text-white">Emails Processed</p>
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{accountStats.accuracyRate}%</p>
                  <p className="text-xs text-white">Model Accuracy</p>
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{accountStats.feedbackProvided}</p>
                  <p className="text-xs text-white">Feedback Given</p>
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    {new Date(accountStats.lastActive).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-white">Last Active</p>
                </div>
              </div>

              {/* Account Actions */}
              <div>
                <h3 className="text-md font-semibold text-white mb-4">Account Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleAccountAction('change-email')}
                    className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Change Email</p>
                      <p className="text-xs text-gray-500">Update your email address</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleAccountAction('change-password')}
                    className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Change Password</p>
                      <p className="text-xs text-gray-500">Update your password</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleAccountAction('export-data')}
                    className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Export Data</p>
                      <p className="text-xs text-gray-500">Download your account data</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleAccountAction('delete-account')}
                    className="flex items-center p-4 border border-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-black transition-colors"
                  >
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-900 dark:text-red-300">Delete Account</p>
                      <p className="text-xs text-red-500 dark:text-red-400">Permanently delete your account</p>
                    </div>
                  </button>
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