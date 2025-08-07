// Re-export all modules for better import resolution
export { authOptions } from './auth';
export { GmailService } from './gmail';
export type { EmailData } from './gmail';

// Model configuration exports
export { 
  AVAILABLE_MODELS,
  MODEL_DISPLAY_ORDER,
  TRAINABLE_MODELS,
  RL_MODELS,
  getModelInfo,
  getSimplifiedModelList,
  getTrainingConfigModels,
  getAllModelKeys,
  requiresUserFeedback,
  getModelDisplayName,
  getModelF1Score
} from './models';
export type { ModelDetails, ModelMetrics } from './models';