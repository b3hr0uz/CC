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
  type: 'training_start' | 'training_complete' | 'training_error' | 'auto_training_init' | 'model_training_start' | 'model_training_complete' | 'model_classification_start' | 'model_classification_complete' | 'backend_info';
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
  type: 'rl_optimization_start' | 'rl_optimization_complete' | 'rl_error' | 'email_fetch_start' | 'email_fetch_complete' | 'email_fetch_error' | 'model_classification_start' | 'model_classification_complete';
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
  clearOldTrainingNotifications: () => void; // ✅ NEW: Manual cleanup function
  clearBackgroundSystemSpam: () => void; // ✅ NEW: Clear background system spam
  notificationCounter: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'contextcleanse_notifications';
const MAX_NOTIFICATIONS = 100;

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
        
        // 🧹 AGGRESSIVE CLEANUP: Remove ALL old training notifications from before the race condition fix
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const RACE_CONDITION_FIX_TIME = Date.now() - (6 * 60 * 60 * 1000); // 6 hours ago (before the fix)
        
        const cleanedNotifications = notificationsWithDates.filter((notification: NotificationItem) => {
          const age = now - notification.timestamp.getTime();
          const notificationTime = notification.timestamp.getTime();
          
          // Remove ALL training-related notifications from before the fix
          if (notificationTime < RACE_CONDITION_FIX_TIME && 
              (notification.type.includes('training') || 
               notification.type.includes('auto_training') || 
               notification.message.includes('Training') ||
               notification.message.includes('Backend service error'))) {
            console.log(`🧹 Removed old pre-fix notification: ${notification.type} for ${notification.model_name}`);
            return false;
          }
          
          // Remove old training errors and backend service errors (older than 1 hour)
          if ((notification.type === 'training_error' || notification.message.includes('Backend service error')) && age > ONE_HOUR) {
            console.log(`🧹 Removed stale error notification: ${notification.type} for ${notification.model_name} (${Math.round(age / 1000 / 60)} minutes old)`);
            return false;
          }
          
          // Keep all recent notifications and non-error notifications
          return true;
        });
        
        // Log cleanup summary
        const removedCount = notificationsWithDates.length - cleanedNotifications.length;
        if (removedCount > 0) {
          console.log(`🧹 Cleaned up ${removedCount} stale error notifications`);
        }
        
        setNotifications(cleanedNotifications);
        
        // Set counter to highest existing ID + 1
        const maxId = Math.max(...cleanedNotifications.map((n: NotificationItem) => {
          const match = n.id.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        }), 0);
        setNotificationCounter(maxId + 1);
        
        console.log(`✅ Successfully loaded ${cleanedNotifications.length} persistent notifications (${removedCount} stale errors removed)`);
        console.log(`🔢 Notification counter set to: ${maxId + 1}`);
        
        // ✅ AUTO-CLEANUP: Remove background system spam on app startup
        setTimeout(() => {
          const bgSpamCount = cleanedNotifications.filter(n => 
            n.model_name === 'Background System' || 
            (n.model_name.includes('Background') && 
             (n.model_name.includes('Dashboard') || n.model_name.includes('Assistant') || n.model_name.includes('Training')))
          ).length;
          
          if (bgSpamCount > 5) {
            console.log(`🧹 Auto-cleaning ${bgSpamCount} background system spam notifications on startup`);
            setNotifications(prev => prev.filter(n => 
              !(n.model_name === 'Background System' || 
                (n.model_name.includes('Background') && 
                 (n.model_name.includes('Dashboard') || n.model_name.includes('Assistant') || n.model_name.includes('Training'))))
            ));
          }
        }, 3000); // Clean up after 3 seconds
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

  // 🧹 Periodic cleanup of stale error notifications (every 30 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setNotifications(prev => {
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        
        const cleaned = prev.filter((notification: NotificationItem) => {
          const age = now - notification.timestamp.getTime();
          
          // Remove old training errors and backend service errors
          if ((notification.type === 'training_error' || notification.message.includes('Backend service error')) && age > ONE_HOUR) {
            console.log(`🧹 Periodic cleanup: Removed stale error notification: ${notification.type} for ${notification.model_name} (${Math.round(age / 1000 / 60)} minutes old)`);
            return false;
          }
          
          return true;
        });
        
        if (cleaned.length !== prev.length) {
          const removedCount = prev.length - cleaned.length;
          console.log(`🧹 Periodic cleanup: Removed ${removedCount} stale error notifications`);
        }
        
        return cleaned;
      });
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  const addNotification = (notification: NotificationItem) => {
    console.log(`➕ Adding notification: ${notification.type} for ${notification.model_name}`);
    
    setNotifications(prev => {
      const now = Date.now();
      
      // Enhanced duplicate detection for different notification patterns
      const recentDuplicate = prev.find(existing => {
        const timeDiff = now - existing.timestamp.getTime();
        
        // CRITICAL: Background System notifications - prevent duplicates within 10 minutes
        if (notification.model_name === 'Background System' && existing.model_name === 'Background System') {
          // For background initialization completion - only allow one per 10 minutes
          if (notification.message.includes('successfully initialized') && 
              existing.message.includes('successfully initialized')) {
            return timeDiff < 10 * 60 * 1000; // 10 minutes
          }
          // For background initialization start - only allow one per 5 minutes
          if (notification.message.includes('Initializing all application components') && 
              existing.message.includes('Initializing all application components')) {
            return timeDiff < 5 * 60 * 1000; // 5 minutes
          }
        }
        
        // Background page-specific notifications - prevent duplicates within 2 minutes
        if ((notification.model_name.includes('Background') || existing.model_name.includes('Background')) &&
            notification.model_name === existing.model_name &&
            notification.type === existing.type) {
          return timeDiff < 2 * 60 * 1000; // 2 minutes
        }
        
        // For email sync notifications - prevent duplicates within 30 seconds
        if (notification.type === 'email_fetch_complete' && existing.type === 'email_fetch_complete') {
          return timeDiff < 30000; // 30 seconds
        }
        
        // For classification notifications - prevent duplicates within 15 seconds
        if (notification.type === 'model_classification_complete' && existing.type === 'model_classification_complete') {
          return timeDiff < 15000; // 15 seconds
        }
        
        // For training notifications - prevent duplicates within 5 seconds for same model
        if (notification.type === existing.type && 
            notification.model_name === existing.model_name &&
            (notification.type.includes('training') || notification.type.includes('optimization'))) {
          return timeDiff < 5000; // 5 seconds
        }
        
        // General duplicate prevention - same type and model within 2 seconds
        return existing.type === notification.type && 
               existing.model_name === notification.model_name &&
               timeDiff < 2000; // 2 seconds
      });
      
      if (recentDuplicate) {
        console.log(`🔄 Preventing duplicate notification: ${notification.type} for ${notification.model_name} (within threshold)`);
        return prev; // Don't add duplicate
      }
      
      // Special consolidation for background training - replace instead of add if it's an update
      if (notification.type === 'model_training_complete' && notification.model_name.includes('Background Training')) {
        const existingBgIndex = prev.findIndex(n => 
          n.type === 'model_training_complete' && 
          n.model_name.includes('Background Training') &&
          (now - n.timestamp.getTime()) < 60000 // Within 1 minute
        );
        
        if (existingBgIndex >= 0) {
          // Replace the existing background training notification
          const updatedNotifications = [...prev];
          updatedNotifications[existingBgIndex] = notification;
          console.log(`🔄 Updated existing background training notification`);
          return [notification, ...prev.slice(0, existingBgIndex), ...prev.slice(existingBgIndex + 1, MAX_NOTIFICATIONS - 1)];
        }
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

  // ✅ NEW: Clear old training notifications manually
  const clearOldTrainingNotifications = () => {
    console.log('🧹 Manually clearing all old training notifications');
    setNotifications(prev => {
      const filtered = prev.filter(notification => 
        !notification.type.includes('training') && 
        !notification.type.includes('auto_training') &&
        !notification.message.includes('Training') &&
        !notification.message.includes('Backend service error')
      );
      console.log(`🧹 Removed ${prev.length - filtered.length} training notifications`);
      return filtered;
    });
  };

  // ✅ NEW: Clear background system notification spam
  const clearBackgroundSystemSpam = () => {
    console.log('🧹 Clearing background system notification spam');
    setNotifications(prev => {
      const now = Date.now();
      const filtered = prev.filter(notification => {
        // Remove all old background system notifications (keep only the most recent one of each type)
        if (notification.model_name === 'Background System') {
          return false; // Remove all background system notifications for now
        }
        
        // Remove duplicate background page notifications
        if (notification.model_name.includes('Background') && 
            (notification.model_name.includes('Dashboard') || 
             notification.model_name.includes('Assistant') || 
             notification.model_name.includes('Training'))) {
          const age = now - notification.timestamp.getTime();
          return age < 60000; // Keep only notifications from last minute
        }
        
        return true;
      });
      
      const removedCount = prev.length - filtered.length;
      console.log(`🧹 Removed ${removedCount} background system spam notifications`);
      return filtered;
    });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    clearOldTrainingNotifications, // ✅ NEW: Manual cleanup function
    clearBackgroundSystemSpam, // ✅ NEW: Clear background system spam
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