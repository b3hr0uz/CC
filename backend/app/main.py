"""
FastAPI Backend for Spam Email Detection System
Assignment 2 - COMP442 Group Project

Enhanced version with model selection and k-fold cross validation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import json
import joblib
import os
from pathlib import Path

# ML imports
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

# Initialize FastAPI app
app = FastAPI(
    title="ContextCleanse API with Model Selection",
    description="Advanced email classification with multiple ML models and k-fold cross validation",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models and data
models = {}
scalers = {}
data_loaded = False
X_train, X_test, y_train, y_test = None, None, None, None
X_train_scaled, X_test_scaled = None, None
X_train_nb, X_test_nb = None, None
X_full, y_full = None, None  # For cross-validation

# Available models configuration
AVAILABLE_MODELS = {
    "logistic_regression": {
        "name": "Logistic Regression",
        "class": LogisticRegression,
        "params": {"random_state": 42, "max_iter": 1000},
        "scaling": "standard",
        "description": "Linear classifier with logistic function"
    },
    "gradient_boosting": {
        "name": "Gradient Boosting",
        "class": GradientBoostingClassifier,
        "params": {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 3, "random_state": 42},
        "scaling": "none",
        "description": "Ensemble method with sequential weak learners"
    },
    "naive_bayes": {
        "name": "Naive Bayes",
        "class": MultinomialNB,
        "params": {"alpha": 1.0},
        "scaling": "minmax",
        "description": "Probabilistic classifier based on Bayes theorem"
    },
    "neural_network": {
        "name": "Neural Network",
        "class": MLPClassifier,
        "params": {
            "hidden_layer_sizes": (128, 64, 32),
            "activation": "relu",
            "solver": "adam",
            "alpha": 0.001,
            "learning_rate": "adaptive",
            "max_iter": 500,
            "random_state": 42
        },
        "scaling": "standard",
        "description": "Multi-layer perceptron with 3 hidden layers"
    }
}

# Data models
class PredictionRequest(BaseModel):
    features: List[float]
    model_name: Optional[str] = "gradient_boosting"
    
    class Config:
        protected_namespaces = ()
    
class ModelTrainRequest(BaseModel):
    model_names: Optional[List[str]] = None  # Train specific models or all if None
    k_folds: Optional[int] = 5  # K-fold cross validation
    
    class Config:
        protected_namespaces = ()

class CrossValidationRequest(BaseModel):
    model_name: str
    k_folds: Optional[int] = 5
    
    class Config:
        protected_namespaces = ()

class SpamDetectionResponse(BaseModel):
    is_spam: bool
    confidence: float
    model_used: str
    model_display_name: str
    
    class Config:
        protected_namespaces = ()

class StatisticsResponse(BaseModel):
    total_samples: int
    spam_percentage: float
    feature_count: int
    class_distribution: Dict[str, int]
    top_correlated_features: List[Dict[str, float]]

class CrossValidationResponse(BaseModel):
    model_name: str
    cv_scores: List[float]
    mean_score: float
    std_score: float
    k_folds: int

@app.on_event("startup")
async def startup_event():
    """Load and preprocess data on startup"""
    global data_loaded, X_train, X_test, y_train, y_test
    global X_train_scaled, X_test_scaled, X_train_nb, X_test_nb
    global X_full, y_full, scalers
    
    try:
        print("🚀 Starting data loading...")
        
        # Try multiple possible paths for the spambase dataset
        possible_paths = [
            Path("data/spambase/spambase.data"),
            Path("../data/spambase/spambase.data"),
            Path("../../data/spambase/spambase.data"),
            Path("C:/Users/b3h/Documents/Repositories/CC/data/spambase/spambase.data")
        ]
        
        data_path = None
        for path in possible_paths:
            if path.exists():
                data_path = path
                break
        
        if data_path is None:
            print("⚠️ Dataset not found in any expected location. Data loading will be performed on first API request.")
            data_loaded = False
            return
            
        print(f"📁 Loading dataset from: {data_path}")
        df = pd.read_csv(data_path, header=None)
        X_full = df.iloc[:, :-1]
        y_full = df.iloc[:, -1]
        
        print(f"📊 Dataset loaded: {X_full.shape[0]} samples, {X_full.shape[1]} features")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_full, y_full, test_size=0.3, random_state=42, stratify=y_full
        )
        
        # Preprocessing
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        scalers['standard'] = scaler
        
        nb_scaler = MinMaxScaler()
        X_train_nb = nb_scaler.fit_transform(X_train)
        X_test_nb = nb_scaler.transform(X_test)
        scalers['minmax'] = nb_scaler
        
        data_loaded = True
        print("✅ Data loaded and preprocessed successfully!")
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        print("⚠️ Continuing without preloaded data. Data will be loaded on first API request.")
        data_loaded = False

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "ContextCleanse API with Model Selection",
        "version": "2.0.0",
        "features": [
            "Multiple ML models with selection",
            "K-fold cross validation",
            "Model comparison and statistics",
            "Real-time spam prediction"
        ],
        "endpoints": {
            "/statistics": "Get dataset statistics",
            "/models/available": "Get available models",
            "/models/train": "Train selected models",
            "/models/cross-validate": "Perform k-fold cross validation",
            "/predict": "Predict spam with model selection",
            "/compare": "Compare all model performances"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "data_loaded": data_loaded,
        "models_trained": len(models) > 0,
        "available_models": list(AVAILABLE_MODELS.keys())
    }

@app.get("/statistics", response_model=StatisticsResponse)
async def get_statistics():
    """Get comprehensive dataset statistics as per Assignment 2"""
    if not data_loaded:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Calculate statistics
    total_samples = len(y_full)
    spam_count = int(y_full.sum())
    spam_percentage = (spam_count / total_samples) * 100
    
    # Feature correlations with target
    correlations = X_full.corrwith(y_full).abs().sort_values(ascending=False)
    
    top_correlations = [
        {"feature_index": int(idx), "correlation": float(corr)}
        for idx, corr in correlations.head(10).items()
    ]
    
    return StatisticsResponse(
        total_samples=total_samples,
        spam_percentage=round(spam_percentage, 2),
        feature_count=57,
        class_distribution={
            "not_spam": total_samples - spam_count,
            "spam": spam_count
        },
        top_correlated_features=top_correlations
    )

@app.get("/models/available")
async def get_available_models():
    """Get list of available models with descriptions"""
    return {
        "available_models": {
            key: {
                "name": config["name"],
                "description": config["description"],
                "scaling_required": config["scaling"],
                "trained": key in models
            }
            for key, config in AVAILABLE_MODELS.items()
        },
        "total_models": len(AVAILABLE_MODELS),
        "trained_models": list(models.keys())
    }

@app.post("/models/train")
async def train_models(request: ModelTrainRequest):
    """Train selected ML models with optional k-fold cross validation"""
    if not data_loaded:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    global models
    
    # Determine which models to train
    models_to_train = request.model_names if request.model_names else list(AVAILABLE_MODELS.keys())
    
    # Validate model names
    invalid_models = [m for m in models_to_train if m not in AVAILABLE_MODELS]
    if invalid_models:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid model names: {invalid_models}. Available: {list(AVAILABLE_MODELS.keys())}"
        )
    
    results = {}
    cv_results = {}
    
    try:
        print(f"🚀 Starting training for models: {models_to_train}")
        
        for model_key in models_to_train:
            model_config = AVAILABLE_MODELS[model_key]
            print(f"Training {model_config['name']}...")
            
            # Initialize model
            model_class = model_config["class"]
            model = model_class(**model_config["params"])
            
            # Get appropriate data based on scaling requirement
            if model_config["scaling"] == "standard":
                X_train_data = X_train_scaled
                X_test_data = X_test_scaled
            elif model_config["scaling"] == "minmax":
                X_train_data = X_train_nb
                X_test_data = X_test_nb
            else:  # no scaling
                X_train_data = X_train.values
                X_test_data = X_test.values
            
            # Train model
            model.fit(X_train_data, y_train)
            models[model_key] = model
            
            # Evaluate on test set
            predictions = model.predict(X_test_data)
            
            results[model_key] = {
                'name': model_config['name'],
                'accuracy': float(accuracy_score(y_test, predictions)),
                'precision': float(precision_score(y_test, predictions)),
                'recall': float(recall_score(y_test, predictions)),
                'f1_score': float(f1_score(y_test, predictions))
            }
            
            # Perform k-fold cross validation if requested
            if request.k_folds and request.k_folds > 1:
                # Prepare data for CV
                if model_config["scaling"] == "standard":
                    X_cv_data = scalers['standard'].fit_transform(X_full)
                elif model_config["scaling"] == "minmax":
                    X_cv_data = scalers['minmax'].fit_transform(X_full)
                else:
                    X_cv_data = X_full.values
                
                # Perform cross validation
                cv_scores = cross_val_score(
                    model, X_cv_data, y_full, 
                    cv=StratifiedKFold(n_splits=request.k_folds, shuffle=True, random_state=42),
                    scoring='f1'
                )
                
                cv_results[model_key] = {
                    'cv_scores': cv_scores.tolist(),
                    'mean_score': float(cv_scores.mean()),
                    'std_score': float(cv_scores.std()),
                    'k_folds': request.k_folds
                }
        
        # Find best model
        best_model = max(results.items(), key=lambda x: x[1]['f1_score'])
        
        print("✅ All selected models trained successfully!")
        return {
            "status": "success",
            "message": f"Successfully trained {len(models_to_train)} models",
            "results": results,
            "cross_validation": cv_results if cv_results else None,
            "best_model": {
                "key": best_model[0],
                "name": best_model[1]['name'],
                "f1_score": best_model[1]['f1_score']
            },
            "k_folds_used": request.k_folds
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/models/cross-validate", response_model=CrossValidationResponse)
async def cross_validate_model(request: CrossValidationRequest):
    """Perform k-fold cross validation for a specific model"""
    if not data_loaded:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if request.model_name not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=404, 
            detail=f"Model {request.model_name} not found. Available: {list(AVAILABLE_MODELS.keys())}"
        )
    
    try:
        model_config = AVAILABLE_MODELS[request.model_name]
        model_class = model_config["class"]
        model = model_class(**model_config["params"])
        
        # Prepare data for CV
        if model_config["scaling"] == "standard":
            X_cv_data = scalers['standard'].fit_transform(X_full)
        elif model_config["scaling"] == "minmax":
            X_cv_data = scalers['minmax'].fit_transform(X_full)
        else:
            X_cv_data = X_full.values
        
        # Perform cross validation
        cv_scores = cross_val_score(
            model, X_cv_data, y_full, 
            cv=StratifiedKFold(n_splits=request.k_folds, shuffle=True, random_state=42),
            scoring='f1'
        )
        
        return CrossValidationResponse(
            model_name=model_config['name'],
            cv_scores=cv_scores.tolist(),
            mean_score=float(cv_scores.mean()),
            std_score=float(cv_scores.std()),
            k_folds=request.k_folds
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cross validation failed: {str(e)}")

@app.post("/predict", response_model=SpamDetectionResponse)
async def predict_spam(request: PredictionRequest):
    """Predict if email is spam using selected model"""
    if not data_loaded:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if not models:
        raise HTTPException(status_code=404, detail="No models trained. Please train models first.")
    
    if request.model_name not in models:
        available_models = list(models.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"Model {request.model_name} not trained. Available trained models: {available_models}"
        )
    
    try:
        features = np.array(request.features).reshape(1, -1)
        
        if len(request.features) != 57:
            raise HTTPException(status_code=400, detail="Features must contain exactly 57 values")
        
        model = models[request.model_name]
        model_config = AVAILABLE_MODELS[request.model_name]
        
        # Apply appropriate preprocessing
        if model_config["scaling"] == "standard":
            features = scalers['standard'].transform(features)
        elif model_config["scaling"] == "minmax":
            features = scalers['minmax'].transform(features)
        # No transformation needed for "none" scaling
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Get probability/confidence if available
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features)[0]
            confidence = float(max(probabilities))
        else:
            confidence = 0.8  # Default confidence for models without probability
        
        return SpamDetectionResponse(
            is_spam=bool(prediction),
            confidence=confidence,
            model_used=request.model_name,
            model_display_name=model_config["name"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/compare")
async def compare_models():
    """Compare performance of all trained models"""
    if not models:
        raise HTTPException(status_code=404, detail="No models trained")
    
    if not data_loaded:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    results = {}
    
    for model_name, model in models.items():
        try:
            model_config = AVAILABLE_MODELS[model_name]
            
            # Apply appropriate preprocessing
            if model_config["scaling"] == "standard":
                predictions = model.predict(X_test_scaled)
            elif model_config["scaling"] == "minmax":
                predictions = model.predict(X_test_nb)
            else:  # no scaling
                predictions = model.predict(X_test.values)
            
            results[model_name] = {
                'name': model_config['name'],
                'accuracy': float(accuracy_score(y_test, predictions)),
                'precision': float(precision_score(y_test, predictions)),
                'recall': float(recall_score(y_test, predictions)),
                'f1_score': float(f1_score(y_test, predictions)),
                'description': model_config['description']
            }
        except Exception as e:
            results[model_name] = {"error": str(e)}
    
    # Find best model by F1-score
    valid_results = {name: metrics for name, metrics in results.items() if 'error' not in metrics}
    if valid_results:
        best_model = max(valid_results.items(), key=lambda x: x[1]['f1_score'])
    else:
        best_model = None
    
    return {
        "results": results,
        "best_model": {
            "key": best_model[0],
            "name": best_model[1]['name'],
            "metrics": best_model[1]
        } if best_model else None,
        "ranking": sorted(
            [(name, metrics['f1_score'], metrics['name']) for name, metrics in valid_results.items()],
            key=lambda x: x[1],
            reverse=True
        )
    }

@app.get("/models/{model_name}/details")
async def get_model_details(model_name: str):
    """Get detailed information about a specific model"""
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    
    config = AVAILABLE_MODELS[model_name]
    is_trained = model_name in models
    
    details = {
        "key": model_name,
        "name": config["name"],
        "description": config["description"],
        "parameters": config["params"],
        "scaling_method": config["scaling"],
        "is_trained": is_trained,
        "class_name": config["class"].__name__
    }
    
    if is_trained:
        # Add training information if available
        model = models[model_name]
        details["model_type"] = type(model).__name__
        if hasattr(model, 'feature_importances_'):
            details["has_feature_importance"] = True
        if hasattr(model, 'predict_proba'):
            details["supports_probability"] = True
    
    return details

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)