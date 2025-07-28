'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Brain, Target, TrendingUp, Database, Settings, 
  AlertCircle, CheckCircle, Mail, Play, BarChart3, 
  Zap, Award
} from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface ModelMetrics {
  name?: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  description?: string;
}

interface Statistics {
  total_samples: number;
  spam_percentage: number;
  feature_count: number;
  class_distribution: {
    not_spam: number;
    spam: number;
  };
  top_correlated_features: Array<{
    feature_index: number;
    correlation: number;
  }>;
}

interface ModelInfo {
  name: string;
  description: string;
  scaling_required: string;
  trained: boolean;
}

interface ComparisonResults {
  results: Record<string, ModelMetrics>;
  best_model: {
    key: string;
    name: string;
    metrics: ModelMetrics;
  };
  ranking: Array<[string, number, string]>;
}

interface CrossValidationResult {
  model_name: string;
  cv_scores: number[];
  mean_score: number;
  std_score: number;
  k_folds: number;
}

const ContextCleanseTraining = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [modelResults, setModelResults] = useState<ComparisonResults | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, ModelInfo>>({});
  const [selectedModel, setSelectedModel] = useState<string>('gradient_boosting');
  const [selectedModelsForTraining, setSelectedModelsForTraining] = useState<string[]>([]);
  const [kFolds, setKFolds] = useState<number>(5);
  const [modelsTraining, setModelsTraining] = useState(false);
  const [crossValidating, setCrossValidating] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{
    is_spam: boolean;
    confidence: number;
    model_display_name: string;
    model_used: string;
  } | null>(null);
  const [cvResults, setCvResults] = useState<Record<string, CrossValidationResult>>({});

  // Load initial data
  useEffect(() => {
    fetchStatistics();
    fetchAvailableModels();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/models/available`);
      setAvailableModels(response.data.available_models);
      // Set default selected models (all available)
      setSelectedModelsForTraining(Object.keys(response.data.available_models));
    } catch (error) {
      console.error('Error fetching available models:', error);
    }
  };

  const trainModels = async () => {
    try {
      setModelsTraining(true);
      const response = await axios.post(`${API_BASE_URL}/models/train`, {
        model_names: selectedModelsForTraining,
        k_folds: kFolds
      });
      
      console.log('Training completed:', response.data);
      
      // Store cross-validation results if available
      if (response.data.cross_validation) {
        setCvResults(response.data.cross_validation);
      }
      
      // After training, get comparison results
      await compareModels();
      await fetchAvailableModels(); // Refresh to show trained status
      
    } catch (error) {
      console.error('Error training models:', error);
    } finally {
      setModelsTraining(false);
    }
  };

  const compareModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/compare`);
      setModelResults(response.data);
    } catch (error) {
      console.error('Error comparing models:', error);
    }
  };

  const performCrossValidation = async (modelName: string) => {
    try {
      setCrossValidating(true);
      const response = await axios.post(`${API_BASE_URL}/models/cross-validate`, {
        model_name: modelName,
        k_folds: kFolds
      });
      
      setCvResults(prev => ({
        ...prev,
        [modelName]: response.data
      }));
      
    } catch (error) {
      console.error('Error performing cross validation:', error);
    } finally {
      setCrossValidating(false);
    }
  };

  const predictSpam = async () => {
    try {
      // Generate sample features for demo
      const sampleFeatures = Array(57).fill(0).map(() => Math.random() * 5);
      
      const response = await axios.post(`${API_BASE_URL}/predict`, {
        features: sampleFeatures,
        model_name: selectedModel
      });
      setPredictionResult(response.data);
    } catch (error) {
      console.error('Error making prediction:', error);
    }
  };

  const handleModelSelectionChange = (modelKey: string, selected: boolean) => {
    if (selected) {
      setSelectedModelsForTraining(prev => [...prev, modelKey]);
    } else {
      setSelectedModelsForTraining(prev => prev.filter(m => m !== modelKey));
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Training</h1>
              <p className="text-sm text-gray-600">Advanced Model Selection & K-Fold Cross Validation</p>
            </div>
            
            <div className="text-right text-sm text-gray-500">
              <p>Selected Model:</p>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(availableModels).map(([key, model]) => (
                  <option key={key} value={key} disabled={!model.trained}>
                    {model.name} {!model.trained ? '(Not Trained)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">

          {/* Model Training Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Settings className="mr-2" />
              Training Configuration
            </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Selection */}
            <div>
              <h4 className="font-semibold mb-3">Select Models to Train:</h4>
              <div className="space-y-2">
                {Object.entries(availableModels).map(([key, model]) => (
                  <label key={key} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedModelsForTraining.includes(key)}
                      onChange={(e) => handleModelSelectionChange(key, e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{model.name}</span>
                        {model.trained && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <p className="text-sm text-gray-600">{model.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Training Controls */}
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  K-Fold Cross Validation:
                </label>
                <select 
                  value={kFolds} 
                  onChange={(e) => setKFolds(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3-Fold</option>
                  <option value={5}>5-Fold</option>
                  <option value={10}>10-Fold</option>
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={trainModels}
                  disabled={modelsTraining || selectedModelsForTraining.length === 0}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <Brain className="mr-2 w-5 h-5" />
                  {modelsTraining ? 'Training Models...' : `Train Selected Models (${selectedModelsForTraining.length})`}
                </button>

                <button
                  onClick={compareModels}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <BarChart3 className="mr-2 w-5 h-5" />
                  Compare Models
                </button>
              </div>
            </div>
          </div>
          </div>
          
          {/* Statistics Overview */}
          {statistics && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-6">Statistics Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_samples.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Samples</p>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-3">
                    <Mail className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.spam_percentage.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Spam Percentage</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.feature_count}</p>
                  <p className="text-sm text-gray-600">Features</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{kFolds}-Fold</p>
                  <p className="text-sm text-gray-600">K-Fold CV</p>
                </div>
              </div>
            </div>
          )}

          {/* Cross Validation Results */}
          {Object.keys(cvResults).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <Award className="mr-2 text-yellow-500" />
                  Cross Validation Results ({kFolds}-Fold)
                </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CV Scores Chart */}
              <div>
                <h4 className="font-semibold mb-4">Cross Validation F1-Scores</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(cvResults).map(([key, result]) => ({
                    name: result.model_name ? result.model_name.split(' ').slice(0, 2).join(' ') : key,
                    mean_score: result.mean_score,
                    std_score: result.std_score
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0.8, 1]} />
                    <Tooltip formatter={(value: number) => [value.toFixed(4), 'F1-Score']} />
                    <Bar dataKey="mean_score" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* CV Details Table */}
              <div>
                <h4 className="font-semibold mb-4">Detailed CV Statistics</h4>
                <div className="space-y-4">
                  {Object.entries(cvResults).map(([key, result]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium">{result.model_name}</h5>
                        <span className="text-sm text-gray-500">{result.k_folds}-Fold</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Mean F1-Score:</p>
                          <p className="font-semibold text-blue-600">{result.mean_score.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Std Deviation:</p>
                          <p className="font-semibold text-purple-600">±{result.std_score.toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          Individual Scores: {result.cv_scores.map(s => s.toFixed(3)).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Model Comparison Results */}
          {modelResults && (
            <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6">Enhanced Model Performance Comparison</h3>
            
            {/* Best Model Highlight */}
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="text-green-400 w-5 h-5 mr-2" />
                <div>
                  <h4 className="font-semibold text-green-800">
                    🏆 Best Model: {modelResults.best_model.name}
                  </h4>
                  <p className="text-green-700">
                    F1-Score: {modelResults.best_model.metrics.f1_score.toFixed(4)} | 
                    Accuracy: {modelResults.best_model.metrics.accuracy.toFixed(4)} |
                    Key: {modelResults.best_model.key}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-semibold mb-4">Performance Radar Chart</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={Object.entries(modelResults.results).map(([key, metrics]) => ({
                    model: metrics.name ? metrics.name.split(' ').slice(0, 2).join(' ') : key,
                    accuracy: metrics.accuracy,
                    precision: metrics.precision,
                    recall: metrics.recall,
                    f1_score: metrics.f1_score
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="model" />
                    <PolarRadiusAxis domain={[0.85, 1]} />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
                    <Radar name="Precision" dataKey="precision" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                    <Radar name="Recall" dataKey="recall" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                    <Radar name="F1-Score" dataKey="f1_score" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Model Ranking</h4>
                <div className="space-y-3">
                  {modelResults.ranking.map(([key, f1Score, name], index) => (
                    <div key={key} className={`flex items-center p-3 rounded-lg ${index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{name || key}</p>
                        <p className="text-sm text-gray-600">F1-Score: {f1Score.toFixed(4)}</p>
                      </div>
                      {index === 0 && <Award className="w-5 h-5 text-yellow-500" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Metrics Table */}
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Comprehensive Performance Metrics</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precision</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recall</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F1-Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CV Mean (±Std)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(modelResults.results).map(([modelKey, metrics]) => {
                      const isBest = modelKey === modelResults.best_model.key;
                      const cvResult = cvResults[modelKey];
                      
                      return (
                        <tr key={modelKey} className={isBest ? 'bg-green-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {metrics.name || modelKey}
                            {isBest && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                🏆 Best
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metrics.accuracy.toFixed(4)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metrics.precision.toFixed(4)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metrics.recall.toFixed(4)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metrics.f1_score.toFixed(4)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cvResult ? (
                              <span>
                                {cvResult.mean_score.toFixed(4)} 
                                <span className="text-gray-500"> (±{cvResult.std_score.toFixed(4)})</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => performCrossValidation(modelKey)}
                                disabled={crossValidating}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                {crossValidating ? 'Running...' : 'Run CV'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          {/* Enhanced Spam Prediction Demo */}
          <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="mr-2 text-purple-600" />
            Interactive Spam Prediction
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Model for Prediction:
                </label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(availableModels).map(([key, model]) => (
                    <option key={key} value={key} disabled={!model.trained}>
                      {model.name} {!model.trained ? '(Not Trained)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={predictSpam}
                disabled={!availableModels[selectedModel]?.trained}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Play className="mr-2 w-4 h-4" />
                Test Random Email Features
              </button>
            </div>

            {predictionResult && (
              <div className={`p-4 rounded-lg ${predictionResult.is_spam ? 'bg-red-100 border border-red-200' : 'bg-green-100 border border-green-200'}`}>
                <div className="flex items-center mb-2">
                  {predictionResult.is_spam ? (
                    <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                  )}
                  <span className={`text-lg font-bold ${predictionResult.is_spam ? 'text-red-800' : 'text-green-800'}`}>
                    {predictionResult.is_spam ? '🚨 SPAM DETECTED' : '✅ NOT SPAM'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Confidence:</strong> {(predictionResult.confidence * 100).toFixed(1)}%</p>
                  <p><strong>Model Used:</strong> {predictionResult.model_display_name}</p>
                  <p><strong>Model Key:</strong> {predictionResult.model_used}</p>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Feature Distribution Chart */}
          {statistics && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-6">Data Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Class Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Not Spam', value: statistics.class_distribution.not_spam, color: '#10B981' },
                      { name: 'Spam', value: statistics.class_distribution.spam, color: '#EF4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

                <div>
                  <h4 className="text-lg font-semibold mb-4">Top Correlated Features</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.top_correlated_features.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature_index" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="correlation" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
              </div>
            </div>
          )}

          {/* Enhanced Assignment Summary */}
          <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Enhanced Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">✅ Statistical Analysis</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Central Tendency, Dispersion, Skewness
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Correlation Analysis & Class Imbalance
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Interactive Data Visualization
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">🚀 Enhanced Features</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Model Selection & Configuration  
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      K-Fold Cross Validation (3, 5, 10-fold)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Interactive Model Testing & Comparison
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Real-time Performance Monitoring
                    </li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContextCleanseTraining;