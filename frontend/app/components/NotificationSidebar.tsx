'use client';

import React from 'react';
import { 
  Play, CheckCircle, AlertCircle, Zap, Brain, 
  X, Clock, TrendingUp, Target, Award, Bell
} from 'lucide-react';

interface BaseNotification {
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
  timeoutId?: NodeJS.Timeout;
}

// Training metrics interface
interface ModelMetrics {
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
interface TrainingNotification extends BaseNotification {
  type: 'training_start' | 'training_complete' | 'training_error' | 'auto_training_init' | 'model_training_start' | 'model_training_complete';
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
interface RLNotification extends BaseNotification {
  type: 'rl_optimization_start' | 'rl_optimization_complete' | 'rl_error';
  emailId?: string;
  improvements?: {
    accuracyGain: number;
    precisionGain: number;
    recallGain: number;
    f1ScoreGain: number;
  };
}

type NotificationItem = TrainingNotification | RLNotification;

interface NotificationSidebarProps {
  notifications: NotificationItem[];
  onClearNotification?: (id: string) => void;
  onClearAll?: () => void;
  title?: string;
  isVisible?: boolean;
}

export default function NotificationSidebar({ 
  notifications, 
  onClearNotification, 
  onClearAll, 
  title = "System Notifications",
  isVisible = true 
}: NotificationSidebarProps) {
  if (!isVisible) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'training_start':
      case 'model_training_start':
        return <Play className="h-4 w-4" />;
      case 'training_complete':
      case 'model_training_complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'training_error':
      case 'rl_error':
        return <AlertCircle className="h-4 w-4" />;
      case 'auto_training_init':
        return <Zap className="h-4 w-4" />;
      case 'rl_optimization_start':
        return <Brain className="h-4 w-4" />;
      case 'rl_optimization_complete':
        return <Target className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'training_start':
      case 'model_training_start':
      case 'rl_optimization_start':
        return 'bg-blue-600 border-blue-400';
      case 'training_complete':
      case 'model_training_complete':
      case 'rl_optimization_complete':
        return 'bg-green-600 border-green-400';
      case 'training_error':
      case 'rl_error':
        return 'bg-red-600 border-red-400';
      case 'auto_training_init':
        return 'bg-purple-600 border-purple-400';
      default:
        return 'bg-gray-600 border-gray-400';
    }
  };

  return (
    <div className="h-screen w-80 border-l border-gray-700 flex flex-col" style={{backgroundColor: '#212121'}}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {notifications.length > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-gray-400 hover:text-white text-sm underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 text-white shadow-lg ${getNotificationColor(notification.type)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(notification.type)}
                  <span className="font-semibold text-sm">
                    {notification.model_name.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-75">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                  {onClearNotification && (
                    <button
                      onClick={() => onClearNotification(notification.id)}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <p className="text-sm mb-2">{notification.message}</p>

              {/* Training Start Details */}
              {(notification.type === 'model_training_start' || notification.type === 'rl_optimization_start') && (
                <div className="text-xs space-y-1 bg-black/20 rounded p-2">
                  {notification.start_time && (
                    <div className="flex justify-between">
                      <span>🕐 Start:</span>
                      <span className="font-mono">{notification.start_time.toLocaleTimeString()}</span>
                    </div>
                  )}
                  {notification.estimated_duration && (
                    <div className="flex justify-between">
                      <span>⏱️ Est. Duration:</span>
                      <span className="font-mono">{notification.estimated_duration}s</span>
                    </div>
                  )}
                  {notification.resource_usage && (
                    <div className="flex justify-between">
                      <span>💻 Resources:</span>
                      <span className="font-mono">{notification.resource_usage.cpu_percent}% CPU</span>
                    </div>
                  )}
                </div>
              )}

              {/* Training Complete Details with Metrics */}
              {(notification.type === 'model_training_complete' || notification.type === 'rl_optimization_complete') && 
               (notification as TrainingNotification).metrics && (
                <div className="text-xs space-y-2 bg-black/20 rounded p-3">
                  {/* Timing Information */}
                  {(notification.start_time || notification.end_time || notification.duration) && (
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/20">
                      {notification.start_time && (
                        <div className="flex justify-between">
                          <span>🕐 Start:</span>
                          <span className="font-mono">{notification.start_time.toLocaleTimeString()}</span>
                        </div>
                      )}
                      {notification.end_time && (
                        <div className="flex justify-between">
                          <span>🏁 End:</span>
                          <span className="font-mono">{notification.end_time.toLocaleTimeString()}</span>
                        </div>
                      )}
                      {notification.duration && (
                        <div className="flex justify-between col-span-2">
                          <span>⏱️ Duration:</span>
                          <span className="font-mono font-semibold">{notification.duration.toFixed(1)}s</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Metrics with Change Indicators */}
                  {(notification as TrainingNotification).metrics && (
                    <div className="space-y-1">
                      {(notification as TrainingNotification).metrics?.accuracy && (
                        <div className="flex items-center justify-between">
                          <span>🎯 Accuracy:</span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono font-semibold">
                              {((notification as TrainingNotification).metrics!.accuracy * 100).toFixed(1)}%
                            </span>
                            {(notification as TrainingNotification).metrics?.metric_changes?.accuracy_change && (
                              <span className={`text-xs ${
                                (notification as TrainingNotification).metrics!.metric_changes!.accuracy_change! > 0 
                                  ? 'text-green-300' : 'text-red-300'
                              }`}>
                                {(notification as TrainingNotification).metrics!.metric_changes!.accuracy_change! > 0 ? '↗️' : '↘️'}
                                {Math.abs((notification as TrainingNotification).metrics!.metric_changes!.accuracy_change! * 100).toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {(notification as TrainingNotification).metrics?.f1_score && (
                        <div className="flex items-center justify-between">
                          <span>🏆 F1-Score:</span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono font-semibold text-yellow-300">
                              {((notification as TrainingNotification).metrics!.f1_score * 100).toFixed(1)}%
                            </span>
                            {(notification as TrainingNotification).metrics?.metric_changes?.f1_score_change && (
                              <span className={`text-xs ${
                                (notification as TrainingNotification).metrics!.metric_changes!.f1_score_change! > 0 
                                  ? 'text-green-300' : 'text-red-300'
                              }`}>
                                {(notification as TrainingNotification).metrics!.metric_changes!.f1_score_change! > 0 ? '↗️' : '↘️'}
                                {Math.abs((notification as TrainingNotification).metrics!.metric_changes!.f1_score_change! * 100).toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RL Optimization Results */}
                  {notification.type === 'rl_optimization_complete' && (notification as RLNotification).improvements && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>🧠 RL Improvement:</span>
                        <span className="font-mono font-semibold text-green-300">
                          +{((notification as RLNotification).improvements!.f1ScoreGain * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resource Usage for Auto-Training Init */}
              {notification.type === 'auto_training_init' && notification.resource_usage && (
                <div className="text-xs bg-black/20 rounded p-2 mt-2">
                  <div className="flex justify-between">
                    <span>💻 CPU:</span>
                    <span className="font-mono">{notification.resource_usage.cpu_percent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🧠 Memory:</span>
                    <span className="font-mono">{(notification.resource_usage.memory_mb / 1024).toFixed(1)}GB</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}