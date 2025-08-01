// Centralized model configuration for consistency across the application

export interface ModelDetails {
  name: string;
  description: string;
  f1_score: number;
  scaling_required: string;
  trained: boolean;
  training_progress: number;
  // Technical details
  algorithm_type: string;
  implementation_function: string;
  library_used: string;
  hyperparameters?: string;
  use_case: string;
  strengths: string[];
  weaknesses: string[];
  requires_user_feedback?: boolean; // For models that need RL feedback
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_time?: number;
  cross_validation_score?: number;
}

// Centralized model definitions - ALL 7 MODELS
// Note: F1 scores and training status will be updated after actual model training
export const AVAILABLE_MODELS: Record<string, ModelDetails> = {
  'logistic_regression': {
    name: 'Logistic Regression',
    description: 'Linear model for binary classification with regularization',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'StandardScaler',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Linear Classification',
    implementation_function: 'LogisticRegression.fit()',
    library_used: 'scikit-learn',
    hyperparameters: 'C=1.0, solver=liblinear, max_iter=1000',
    use_case: 'Baseline linear classifier with interpretable coefficients',
    strengths: ['Fast training', 'Interpretable', 'Good for linearly separable data'],
    weaknesses: ['Assumes linear relationships', 'Sensitive to outliers']
  },
  'xgboost': {
    name: 'XGBoost',
    description: 'Gradient boosting ensemble with advanced regularization',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'None',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Gradient Boosting',
    implementation_function: 'XGBClassifier.fit()',
    library_used: 'xgboost',
    hyperparameters: 'n_estimators=100, max_depth=6, learning_rate=0.1',
    use_case: 'High-performance ensemble method for structured data',
    strengths: ['Excellent performance', 'Handles missing values', 'Feature importance'],
    weaknesses: ['Can overfit', 'Requires tuning', 'Less interpretable']
  },
  'xgboost_rl': {
    name: 'XGBoost + RL',
    description: 'XGBoost enhanced with Deep Q-Learning reinforcement optimization',
    f1_score: 0.0, // Will be updated after training and RL optimization
    scaling_required: 'None',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Ensemble + Reinforcement Learning',
    implementation_function: 'XGBClassifier.fit() + DQNAgent.optimize()',
    library_used: 'xgboost + tensorflow/pytorch',
    hyperparameters: 'XGB params + RL: epsilon=0.1, learning_rate=0.001, discount=0.95',
    use_case: 'Adaptive model that learns from user feedback via RL',
    strengths: ['Self-improving', 'Adapts to user preferences', 'Potential for highest accuracy'],
    weaknesses: ['Requires user feedback', 'More complex', 'Longer training time'],
    requires_user_feedback: true
  },
  'naive_bayes': {
    name: 'Naive Bayes',
    description: 'Probabilistic classifier based on Bayes theorem with independence assumption',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'None',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Probabilistic Classification',
    implementation_function: 'MultinomialNB.fit()',
    library_used: 'scikit-learn',
    hyperparameters: 'alpha=1.0 (Laplace smoothing)',
    use_case: 'Fast probabilistic classifier ideal for text classification',
    strengths: ['Very fast', 'Good with small datasets', 'Handles multiple classes well'],
    weaknesses: ['Strong independence assumption', 'Can be outperformed by modern methods']
  },
  'neural_network': {
    name: 'Neural Network (MLP)',
    description: 'Multi-layer perceptron with backpropagation learning',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'StandardScaler',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Deep Learning',
    implementation_function: 'MLPClassifier.fit()',
    library_used: 'scikit-learn',
    hyperparameters: 'hidden_layers=(100,50), activation=relu, solver=adam',
    use_case: 'Non-linear pattern recognition with multiple hidden layers',
    strengths: ['Captures non-linear relationships', 'Flexible architecture', 'Good generalization'],
    weaknesses: ['Requires more data', 'Prone to overfitting', 'Needs feature scaling']
  },
  'svm': {
    name: 'Support Vector Machine',
    description: 'Kernel-based classification with maximum margin optimization',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'StandardScaler',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Kernel-based Classification',
    implementation_function: 'SVC.fit()',
    library_used: 'scikit-learn',
    hyperparameters: 'kernel=rbf, C=1.0, gamma=scale',
    use_case: 'Robust classifier with kernel trick for non-linear decision boundaries',
    strengths: ['Works well with high dimensions', 'Memory efficient', 'Versatile kernels'],
    weaknesses: ['Slow on large datasets', 'Sensitive to feature scaling', 'No probability estimates']
  },
  'random_forest': {
    name: 'Random Forest',
    description: 'Ensemble method combining multiple decision trees with bagging',
    f1_score: 0.0, // Will be updated after training
    scaling_required: 'None',
    trained: false,
    training_progress: 0,
    algorithm_type: 'Ensemble (Bagging)',
    implementation_function: 'RandomForestClassifier.fit()',
    library_used: 'scikit-learn',
    hyperparameters: 'n_estimators=100, max_depth=None, min_samples_split=2',
    use_case: 'Robust ensemble method with built-in feature selection',
    strengths: ['Handles overfitting well', 'Feature importance', 'Works with missing values'],
    weaknesses: ['Can overfit with very noisy data', 'Less interpretable than single trees']
  }
};

// Model order for consistent display (alphabetical order until training provides actual performance data)
export const MODEL_DISPLAY_ORDER = [
  'logistic_regression',
  'naive_bayes',
  'neural_network',
  'random_forest',
  'svm',
  'xgboost',
  'xgboost_rl'
];

// Models that can be trained without user feedback (6 models)
export const TRAINABLE_MODELS = MODEL_DISPLAY_ORDER.filter(
  modelKey => !AVAILABLE_MODELS[modelKey].requires_user_feedback
);

// Models that require user feedback for RL optimization
export const RL_MODELS = MODEL_DISPLAY_ORDER.filter(
  modelKey => AVAILABLE_MODELS[modelKey].requires_user_feedback
);

// Get model info for display
export const getModelInfo = (modelKey: string): ModelDetails | null => {
  return AVAILABLE_MODELS[modelKey] || null;
};

// Get simplified model list for dropdowns (name + f1_score)
export const getSimplifiedModelList = (): Record<string, { name: string; f1_score: number }> => {
  const simplified: Record<string, { name: string; f1_score: number }> = {};
  
  MODEL_DISPLAY_ORDER.forEach(modelKey => {
    const model = AVAILABLE_MODELS[modelKey];
    simplified[modelKey] = {
      name: model.name,
      f1_score: model.f1_score
    };
  });
  
  return simplified;
};

// Get models for training configuration (now includes all 7 models by default)
export const getTrainingConfigModels = (): string[] => {
  return MODEL_DISPLAY_ORDER; // Return all 7 models as requested
};

// Get all model keys in display order
export const getAllModelKeys = (): string[] => {
  return MODEL_DISPLAY_ORDER;
};

// Check if model requires user feedback
export const requiresUserFeedback = (modelKey: string): boolean => {
  return AVAILABLE_MODELS[modelKey]?.requires_user_feedback || false;
};

// Get model display name
export const getModelDisplayName = (modelKey: string): string => {
  return AVAILABLE_MODELS[modelKey]?.name || modelKey;
};

// Get model F1 score
export const getModelF1Score = (modelKey: string): number => {
  return AVAILABLE_MODELS[modelKey]?.f1_score || 0;
};