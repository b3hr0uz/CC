'use client';

import React, { useState, useEffect } from 'react';
import { Download, Trash2, HardDrive, Cpu, MemoryStick, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface SystemInfo {
  platform: string;
  availableMemoryGB: number;
  recommendedMaxModelSizeGB: number;
  cpuCores: string;
}

interface InstalledModel {
  name: string;
  size: string;
  modified: string;
  digest: string;
}

interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  recommended: boolean;
}

interface ModelManagerProps {
  onModelChange?: (modelName: string) => void;
  onClose?: () => void;
}

export default function OllamaModelManager({ onModelChange, onClose }: ModelManagerProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [installedModels, setInstalledModels] = useState<InstalledModel[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [removingModels, setRemovingModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadModelInfo();
  }, []);

  const loadModelInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assistant/models');
      const data = await response.json();
      
      if (data.success) {
        setSystemInfo(data.system);
        setInstalledModels(data.ollama.installedModels || []);
        setRecommendedModels(data.recommendations || []);
        setError(null);
      } else {
        setError(data.error?.message || 'Failed to load model information');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading models');
    } finally {
      setLoading(false);
    }
  };

  const downloadModel = async (modelName: string) => {
    try {
      setDownloadingModels(prev => new Set(prev).add(modelName));
      
      const response = await fetch('/api/assistant/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pull',
          modelName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the model list
        setTimeout(() => {
          loadModelInfo();
        }, 2000);
      } else {
        alert(`Failed to download ${modelName}: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error downloading ${modelName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  const removeModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to remove ${modelName}? This will free up disk space but you'll need to download it again to use it.`)) {
      return;
    }

    try {
      setRemovingModels(prev => new Set(prev).add(modelName));
      
      const response = await fetch('/api/assistant/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          modelName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the model list
        loadModelInfo();
      } else {
        alert(`Failed to remove ${modelName}: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error removing ${modelName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRemovingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  const selectModel = (modelName: string) => {
    if (onModelChange) {
      onModelChange(modelName);
    }
    if (onClose) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mr-3" />
          <span className="text-white">Loading Ollama models...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-red-600 rounded-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-400 mr-3" />
          <h3 className="text-lg font-semibold text-white">Ollama Not Available</h3>
        </div>
        <p className="text-gray-300 mb-4">{error}</p>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-200 mb-2">Quick Setup for {systemInfo?.platform || 'your system'}:</h4>
          <div className="text-sm text-gray-400 space-y-1">
            {systemInfo?.platform === 'windows' && (
              <>
                <p>1. Download from: https://ollama.com/download/windows</p>
                <p>2. Open PowerShell: <code className="bg-gray-800 px-2 py-1 rounded">ollama serve</code></p>
                <p>3. Download model: <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llama3:8b</code></p>
              </>
            )}
            {systemInfo?.platform === 'macos' && (
              <>
                <p>1. Install: <code className="bg-gray-800 px-2 py-1 rounded">brew install ollama</code></p>
                <p>2. Start: <code className="bg-gray-800 px-2 py-1 rounded">ollama serve</code></p>
                <p>3. Download model: <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llama3:8b</code></p>
              </>
            )}
            {systemInfo?.platform === 'linux' && (
              <>
                <p>1. Install: <code className="bg-gray-800 px-2 py-1 rounded">curl -fsSL https://ollama.com/install.sh | sh</code></p>
                <p>2. Start: <code className="bg-gray-800 px-2 py-1 rounded">systemctl start ollama</code></p>
                <p>3. Download model: <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llama3:8b</code></p>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={loadModelInfo} 
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <HardDrive className="h-6 w-6 text-blue-400 mr-3" />
          <h2 className="text-xl font-bold text-white">Ollama Model Manager</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>

      {/* System Information */}
      {systemInfo && (
        <div className="bg-gray-900 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
            <Cpu className="h-5 w-5 text-green-400 mr-2" />
            System Resources
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Platform:</span>
              <span className="text-white ml-2 capitalize">{systemInfo.platform}</span>
            </div>
            <div className="flex items-center">
              <MemoryStick className="h-4 w-4 text-blue-400 mr-1" />
              <span className="text-gray-400">Memory:</span>
              <span className="text-white ml-2">{systemInfo.availableMemoryGB}GB</span>
            </div>
            <div>
              <span className="text-gray-400">Max Model:</span>
              <span className="text-white ml-2">{systemInfo.recommendedMaxModelSizeGB}GB</span>
            </div>
            <div>
              <span className="text-gray-400">CPU Cores:</span>
              <span className="text-white ml-2">{systemInfo.cpuCores}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Installed Models */}
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            Installed Models ({installedModels.length})
          </h3>
          
          {installedModels.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No models installed yet</p>
              <p className="text-sm">Select a recommended model to get started</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {installedModels.map((model) => (
                <div key={model.name} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{model.name}</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => selectModel(model.name)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => removeModel(model.name)}
                        disabled={removingModels.has(model.name)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        {removingModels.has(model.name) ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Size: {model.size}</div>
                    <div>Modified: {new Date(model.modified).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Models */}
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <Download className="h-5 w-5 text-blue-400 mr-2" />
            Recommended Models
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {recommendedModels.map((model) => {
              const isInstalled = installedModels.some(installed => installed.name === model.name);
              const isDownloading = downloadingModels.has(model.name);
              
              return (
                <div key={model.name} className={`bg-gray-900 p-4 rounded-lg border ${model.recommended ? 'border-blue-600' : 'border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <h4 className="font-semibold text-white">{model.name}</h4>
                      {model.recommended && (
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    {isInstalled ? (
                      <button
                        onClick={() => selectModel(model.name)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
                      >
                        Use
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadModel(model.name)}
                        disabled={isDownloading}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center"
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                            Downloading
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Size: {model.size}</div>
                    <div>{model.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700 text-center">
        <button
          onClick={loadModelInfo}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Models
        </button>
      </div>
    </div>
  );
}
