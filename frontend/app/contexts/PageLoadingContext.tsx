'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface PageLoadingState {
  isLoading: boolean;
  progress: number; // 0-100 percentage
  status: string; // Loading status message
  backgroundProcesses: string[]; // Array of active background processes
  lastUpdated: Date;
}

export interface PageLoadingContextType {
  // Page loading states
  dashboard: PageLoadingState;
  assistant: PageLoadingState;
  training: PageLoadingState;
  
  // Actions to update loading states
  updateDashboardLoading: (updates: Partial<PageLoadingState>) => void;
  updateAssistantLoading: (updates: Partial<PageLoadingState>) => void;
  updateTrainingLoading: (updates: Partial<PageLoadingState>) => void;
  
  // Background process tracking
  addBackgroundProcess: (page: 'dashboard' | 'assistant' | 'training', process: string) => void;
  removeBackgroundProcess: (page: 'dashboard' | 'assistant' | 'training', process: string) => void;
  
  // Global loading state
  isAnyPageLoading: () => boolean;
  getTotalActiveProcesses: () => number;
}

const defaultPageState: PageLoadingState = {
  isLoading: false,
  progress: 100,
  status: 'Ready',
  backgroundProcesses: [],
  lastUpdated: new Date()
};

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export const usePageLoading = () => {
  const context = useContext(PageLoadingContext);
  if (!context) {
    throw new Error('usePageLoading must be used within PageLoadingProvider');
  }
  return context;
};

interface PageLoadingProviderProps {
  children: ReactNode;
}

export const PageLoadingProvider: React.FC<PageLoadingProviderProps> = ({ children }) => {
  // Individual page states
  const [dashboard, setDashboard] = useState<PageLoadingState>({ ...defaultPageState, status: 'Dashboard Ready' });
  const [assistant, setAssistant] = useState<PageLoadingState>({ ...defaultPageState, status: 'Assistant Ready' });
  const [training, setTraining] = useState<PageLoadingState>({ ...defaultPageState, status: 'Training Ready' });

  // Update functions for each page - memoized to prevent infinite loops
  const updateDashboardLoading = useCallback((updates: Partial<PageLoadingState>) => {
    setDashboard(prev => ({ ...prev, ...updates, lastUpdated: new Date() }));
  }, []);

  const updateAssistantLoading = useCallback((updates: Partial<PageLoadingState>) => {
    setAssistant(prev => ({ ...prev, ...updates, lastUpdated: new Date() }));
  }, []);

  const updateTrainingLoading = useCallback((updates: Partial<PageLoadingState>) => {
    setTraining(prev => ({ ...prev, ...updates, lastUpdated: new Date() }));
  }, []);

  // Background process management - memoized to prevent infinite loops
  const addBackgroundProcess = useCallback((page: 'dashboard' | 'assistant' | 'training', process: string) => {
    const updateFn = page === 'dashboard' ? setDashboard : page === 'assistant' ? setAssistant : setTraining;
    updateFn(prev => ({
      ...prev,
      backgroundProcesses: [...prev.backgroundProcesses, process],
      isLoading: true,
      lastUpdated: new Date()
    }));
  }, []);

  const removeBackgroundProcess = useCallback((page: 'dashboard' | 'assistant' | 'training', process: string) => {
    const updateFn = page === 'dashboard' ? setDashboard : page === 'assistant' ? setAssistant : setTraining;
    updateFn(prev => {
      const newProcesses = prev.backgroundProcesses.filter(p => p !== process);
      return {
        ...prev,
        backgroundProcesses: newProcesses,
        isLoading: newProcesses.length > 0,
        lastUpdated: new Date()
      };
    });
  }, []);

  // Global state queries - memoized for performance
  const isAnyPageLoading = useCallback(() => {
    return dashboard.isLoading || assistant.isLoading || training.isLoading;
  }, [dashboard.isLoading, assistant.isLoading, training.isLoading]);

  const getTotalActiveProcesses = useCallback(() => {
    return dashboard.backgroundProcesses.length + assistant.backgroundProcesses.length + training.backgroundProcesses.length;
  }, [dashboard.backgroundProcesses.length, assistant.backgroundProcesses.length, training.backgroundProcesses.length]);

  // Auto-update progress based on background processes
  useEffect(() => {
    const updateProgress = (pageState: PageLoadingState, setPageState: React.Dispatch<React.SetStateAction<PageLoadingState>>) => {
      if (pageState.backgroundProcesses.length === 0 && pageState.isLoading) {
        setPageState(prev => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: prev.status.replace('Loading...', 'Ready'),
          lastUpdated: new Date()
        }));
      }
    };

    updateProgress(dashboard, setDashboard);
    updateProgress(assistant, setAssistant);
    updateProgress(training, setTraining);
  }, [dashboard.backgroundProcesses, assistant.backgroundProcesses, training.backgroundProcesses]);

  const contextValue: PageLoadingContextType = {
    dashboard,
    assistant,
    training,
    updateDashboardLoading,
    updateAssistantLoading,
    updateTrainingLoading,
    addBackgroundProcess,
    removeBackgroundProcess,
    isAnyPageLoading,
    getTotalActiveProcesses
  };

  return (
    <PageLoadingContext.Provider value={contextValue}>
      {children}
    </PageLoadingContext.Provider>
  );
};

// Hook for simulating page loading with progress
export const usePageLoadingSimulation = (page: 'dashboard' | 'assistant' | 'training', processes: string[] = []) => {
  const { updateDashboardLoading, updateAssistantLoading, updateTrainingLoading, addBackgroundProcess, removeBackgroundProcess } = usePageLoading();
  
  const updateFunction = page === 'dashboard' ? updateDashboardLoading : 
                        page === 'assistant' ? updateAssistantLoading : updateTrainingLoading;

  const simulateLoading = async (totalSteps: number = 5, stepDelays: number[] = [500, 800, 1000, 600, 400]) => {
    updateFunction({ isLoading: true, progress: 0, status: `Loading ${page.charAt(0).toUpperCase() + page.slice(1)}...` });

    for (let step = 0; step < totalSteps; step++) {
      const progress = Math.round(((step + 1) / totalSteps) * 100);
      const delay = stepDelays[step] || 500;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      updateFunction({ 
        progress, 
        status: `Loading ${page.charAt(0).toUpperCase() + page.slice(1)}... ${progress}%` 
      });
    }

    updateFunction({ 
      isLoading: false, 
      progress: 100, 
      status: `${page.charAt(0).toUpperCase() + page.slice(1)} Ready` 
    });
  };

  const addProcess = (processName: string) => {
    addBackgroundProcess(page, processName);
  };

  const removeProcess = (processName: string) => {
    removeBackgroundProcess(page, processName);
  };

  return { simulateLoading, addProcess, removeProcess };
};

export default PageLoadingContext;
