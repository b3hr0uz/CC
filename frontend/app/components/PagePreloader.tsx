'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePageLoading } from '../contexts/PageLoadingContext';

const PagePreloader: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { updateDashboardLoading, updateAssistantLoading, updateTrainingLoading, addBackgroundProcess, removeBackgroundProcess } = usePageLoading();

  useEffect(() => {
    // Only preload when user is authenticated
    if (status !== 'authenticated' || !session) return;

    const preloadPages = async () => {
      console.log('🚀 Starting background page preloading...');

      // Add preloading processes to all pages
      addBackgroundProcess('dashboard', 'Page Preloading');
      addBackgroundProcess('assistant', 'Page Preloading');
      addBackgroundProcess('training', 'Page Preloading');

      const preloadTasks = [
        {
          name: 'Dashboard',
          path: '/dashboard',
          updateFn: updateDashboardLoading,
          steps: [
            { progress: 20, status: 'Preloading Dashboard assets...' },
            { progress: 50, status: 'Warming up email API...' },
            { progress: 80, status: 'Caching models...' },
            { progress: 100, status: 'Dashboard Ready' }
          ]
        },
        {
          name: 'Assistant',
          path: '/assistant',
          updateFn: updateAssistantLoading,
          steps: [
            { progress: 25, status: 'Preloading Assistant assets...' },
            { progress: 45, status: 'Initializing AI models...' },
            { progress: 70, status: 'Preparing RAG system...' },
            { progress: 100, status: 'Assistant Ready' }
          ]
        },
        {
          name: 'Training',
          path: '/training',
          updateFn: updateTrainingLoading,
          steps: [
            { progress: 30, status: 'Preloading Training assets...' },
            { progress: 60, status: 'Loading ML models...' },
            { progress: 90, status: 'Preparing training interface...' },
            { progress: 100, status: 'Training Ready' }
          ]
        }
      ];

      // Preload pages sequentially with staggered delays
      for (let i = 0; i < preloadTasks.length; i++) {
        const task = preloadTasks[i];
        
        setTimeout(async () => {
          console.log(`🔄 Preloading ${task.name}...`);
          
          // Prefetch the route
          try {
            router.prefetch(task.path);
          } catch (error) {
            console.warn(`⚠️ Could not prefetch ${task.path}:`, error);
          }

          // Simulate loading steps for visual feedback
          for (const step of task.steps) {
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            task.updateFn({
              progress: step.progress,
              status: step.status,
              isLoading: step.progress < 100
            });
          }

          // Remove preloading process when complete
          setTimeout(() => {
            removeBackgroundProcess(task.name.toLowerCase() as 'dashboard' | 'assistant' | 'training', 'Page Preloading');
            console.log(`✅ ${task.name} preloading complete`);
          }, 500);
          
        }, i * 1000); // Stagger by 1 second
      }
    };

    // Start preloading after a brief delay to let the main page load first
    const preloadTimer = setTimeout(preloadPages, 2000);

    return () => {
      clearTimeout(preloadTimer);
    };
  }, [session, status, router]); // Removed memoized functions from dependencies as they're now stable

  // This component doesn't render anything visible
  return null;
};

export default PagePreloader;