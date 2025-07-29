'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Settings, Shield, Mail, Database, 
  Save, RefreshCw, AlertCircle, CheckCircle,
  Lock, Sun, Moon
} from 'lucide-react';

export default function SettingsPage() {
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="mr-3 text-blue-600" />
                Settings
              </h1>
              <p className="text-sm text-gray-600">Manage your preferences and system configuration</p>
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
          {/* Email Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Enable Email Notifications</label>
                  <p className="text-sm text-gray-600">Receive notifications about important events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Spam Alerts</label>
                  <p className="text-sm text-gray-600">Get notified when spam is detected</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.spamAlerts}
                    onChange={(e) => handleSettingChange('spamAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Daily Summary</label>
                  <p className="text-sm text-gray-600">Receive a daily email summary</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dailySummary}
                    onChange={(e) => handleSettingChange('dailySummary', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Database className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Model Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Default Model</label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="gradient_boosting">Gradient Boosting</option>
                  <option value="naive_bayes">Naive Bayes</option>
                  <option value="neural_network">Neural Network</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Auto-Retrain Models</label>
                  <p className="text-sm text-gray-600">Automatically retrain models with new data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRetrain}
                    onChange={(e) => handleSettingChange('autoRetrain', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Privacy & Data</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Data Retention Period</label>
                <select
                  value={settings.dataRetention}
                  onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Share Anonymous Analytics</label>
                  <p className="text-sm text-gray-600">Help improve ContextCleanse by sharing usage data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shareAnalytics}
                    onChange={(e) => handleSettingChange('shareAnalytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Sun className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Display Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
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
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Lock className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Two-Factor Authentication</label>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Session Timeout</label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="480">8 hours</option>
                  <option value="1440">24 hours</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 