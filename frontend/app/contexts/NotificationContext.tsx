'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Base notification interface
export interface BaseNotification {
  id: string;
  type: string;
  model_name: string;
  message: string;
  timestamp: Date;
  duration?: number;
  estimated_duration?: number;
  start_time?: Date;
  end_time?: Date;
  resource_usage?: {
    cpu_percent: number;
    memory_mb: number;
  };
}

// Training metrics interface
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  description?: string;
  training_time?: number;
  cv_score?: number;
  std_score?: number;
}

// Training notification interface
export interface TrainingNotification extends BaseNotification {
  type: 'training_start' | 'training_complete' | 'training_error' | 'auto_training_init' | 'model_training_start' | 'model_training_complete' | 'model_classification_start' | 'model_classification_complete';
  metrics?: ModelMetrics & {
    previous_metrics?: ModelMetrics;
    metric_changes?: {
      accuracy_change?: number;
      precision_change?: number;
      recall_change?: number;
      f1_score_change?: number;
    };
  };
}

// RL notification interface
export interface RLNotification extends BaseNotification {
  type: 'rl_optimization_start' | 'rl_optimization_complete' | 'rl_error' | 'email_fetch_start' | 'email_fetch_complete' | 'model_classification_start' | 'model_classification_complete';
  emailId?: string;
  improvements?: {
    accuracyGain: number;
    precisionGain: number;
    recallGain: number;
    f1ScoreGain: number;
  };
}

export type NotificationItem = TrainingNotification | RLNotification;

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (notification: NotificationItem) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  notificationCounter: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'contextcleanse_notifications';
const MAX_NOTIFICATIONS = 20;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationCounter, setNotificationCounter] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationItem[];
        console.log(`📥 Loading ${parsed.length} notifications from localStorage`);
        
        // Convert timestamp strings back to Date objects
        const notificationsWithDates = parsed.map((notification: NotificationItem) => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
          start_time: notification.start_time ? new Date(notification.start_time) : undefined,
          end_time: notification.end_time ? new Date(notification.end_time) : undefined,
        }));
        setNotifications(notificationsWithDates);
        
        // Set counter to highest existing ID + 1
        const maxId = Math.max(...notificationsWithDates.map((n: NotificationItem) => {
          const match = n.id.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        }), 0);
        setNotificationCounter(maxId + 1);
        
        console.log(`✅ Successfully loaded ${notificationsWithDates.length} persistent notifications`);
        console.log(`🔢 Notification counter set to: ${maxId + 1}`);
      } else {
        console.log('📭 No stored notifications found - starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading notifications from localStorage:', error);
      // Try to recover by clearing corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🧹 Cleared corrupted notification data');
      } catch (clearError) {
        console.error('❌ Could not clear corrupted data:', clearError);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      // Only save if we have notifications to prevent overwriting on initial load
      if (notifications.length > 0 || localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        console.log(`💾 Saved ${notifications.length} notifications to localStorage`);
      }
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
      // If localStorage is full, try to clean old data
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 10))); // Keep only 10 newest
        console.log('🧹 Cleaned localStorage and saved 10 newest notifications');
      } catch (secondError) {
        console.error('Critical: Unable to save notifications to localStorage:', secondError);
      }
    }
  }, [notifications]);

  // Additional persistence safeguard - save on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && notifications.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
          console.log('🔄 Safeguard: Saved notifications on page visibility change');
        } catch (error) {
          console.error('Error in visibility change safeguard:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [notifications]);

  // Save on beforeunload as final safeguard
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (notifications.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        } catch (error) {
          console.error('Error saving on beforeunload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notifications]);

  const addNotification = (notification: NotificationItem) => {
    console.log(`➕ Adding notification: ${notification.type} for ${notification.model_name}`);
    
    setNotifications(prev => {
      // Check for recent duplicates (same type and model within 2 seconds)
      const now = Date.now();
      const recentDuplicate = prev.find(existing => 
        existing.type === notification.type && 
        existing.model_name === notification.model_name &&
        (now - existing.timestamp.getTime()) < 2000 // Within 2 seconds
      );
      
      if (recentDuplicate) {
        console.log(`🔄 Preventing duplicate notification: ${notification.type} for ${notification.model_name}`);
        return prev; // Don't add duplicate
      }
      
      // Add the new notification at the beginning and limit total count
      const newNotifications = [notification, ...prev.slice(0, MAX_NOTIFICATIONS - 1)];
      console.log(`✅ Notification added successfully. Total count: ${newNotifications.length}`);
      
      return newNotifications;
    });
    setNotificationCounter(prev => prev + 1);
  };

  const removeNotification = (id: string) => {
    console.log(`🗑️ Removing notification: ${id}`);
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      console.log(`✅ Notification removed. Remaining count: ${filtered.length}`);
      return filtered;
    });
  };

  const clearAllNotifications = () => {
    console.log('🧹 Clearing all notifications (user action)');
    setNotifications([]);
    console.log('✅ All notifications cleared');
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    notificationCounter,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}