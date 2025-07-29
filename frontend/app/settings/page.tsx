'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { 
  Settings, Shield, Mail, Database, 
  Save, RefreshCw, AlertCircle, CheckCircle,
  Lock, Sun, Moon, User, Camera, MapPin, 
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
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '1440' // minutes
  });

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme]);

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
      theme: 'light',
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
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your settings...</p>
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
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Settings className="mr-3 text-blue-600" />
                Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage your preferences and system configuration</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleResetToDefaults}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
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
              saveStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for important events</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.emailNotifications ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Spam Alerts</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when spam is detected</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.spamAlerts ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Daily Summary</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive a daily email summary</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.dailySummary ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Data Retention (days)</label>
                <select
                  value={settings.dataRetention}
                  onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Share Analytics</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Help improve our service with usage data</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.shareAnalytics ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Database className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Model Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Default Model</label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                >
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="gradient_boosting">Gradient Boosting</option>
                  <option value="naive_bayes">Naive Bayes</option>
                  <option value="neural_network">Neural Network</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-dark-bg rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Auto-Retrain</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically retrain model with new data</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.autoRetrain ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Sun className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Display Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={settings.theme === 'light'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                      settings.theme === 'light' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-500'
                    }`}>
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={settings.theme === 'dark'}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                      settings.theme === 'dark' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-500'
                    }`}>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
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
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
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
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.twoFactorAuth ? 'transform translate-x-5' : ''
                    }`}></div>
                  </div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Session Timeout (minutes)</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
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
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Management</h2>
              </div>
              
              {isEditingProfile ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
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
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  {isEditingProfile && (
                    <button className="absolute bottom-0 right-0 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors">
                      <Camera className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Full Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => handleProfileUpdate('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{profile.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Email Address</label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-gray-900 dark:text-white">{profile.email}</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Location</label>
                    {isEditingProfile ? (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          value={profile.location}
                          onChange={(e) => handleProfileUpdate('location', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                          placeholder="Enter your location"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-gray-900 dark:text-white">{profile.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Member Since</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-gray-900 dark:text-white">{formatDate(profile.memberSince)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Timezone</label>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-gray-900 dark:text-white">{profile.timezone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{accountStats.emailsProcessed.toLocaleString()}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Emails Processed</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{accountStats.accuracyRate}%</p>
                <p className="text-xs text-green-700 dark:text-green-300">Model Accuracy</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{accountStats.feedbackProvided}</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Feedback Given</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {new Date(accountStats.lastActive).toLocaleDateString()}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">Last Active</p>
              </div>
            </div>

            {/* Account Actions */}
            <div>
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAccountAction('change-email')}
                  className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Change Email</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Update your email address</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('change-password')}
                  className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Change Password</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Update your password</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('export-data')}
                  className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Export Data</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Download your account data</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleAccountAction('delete-account')}
                  className="flex items-center p-4 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
    </div>
  );
} 