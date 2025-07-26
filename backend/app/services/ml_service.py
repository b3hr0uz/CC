"""
ML Service for email classification and model management
"""

import os
import pickle
import numpy as np
from typing import Dict, Any, List, Optional
from pathlib import Path
import asyncio
from loguru import logger

try:
    import onnxruntime as ort
except ImportError:
    ort = None
    logger.warning("ONNX Runtime not available - using fallback predictions")

from app.core.config import get_settings

settings = get_settings()


class MLService:
    """Service for machine learning model operations"""
    
    def __init__(self):
        self.spam_model = None
        self.vectorizer = None
        self.model_version = "1.0.0-dev"
        self.ready = False
        
    async def load_models(self):
        """Load ML models from disk"""
        try:
            logger.info("Loading ML models...")
            
            models_path = Path(settings.ML_MODELS_PATH)
            models_path.mkdir(parents=True, exist_ok=True)
            
            # Check if ONNX model exists
            onnx_path = models_path / settings.SPAM_MODEL_NAME
            vectorizer_path = models_path / settings.VECTORIZER_NAME
            
            if onnx_path.exists() and vectorizer_path.exists():
                await self._load_production_models(onnx_path, vectorizer_path)
            else:
                logger.info("Production models not found, using mock models for development")
                await self._create_mock_models()
                
            self.ready = True
            logger.info(f"✅ ML models loaded (version: {self.model_version})")
            
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            await self._create_mock_models()
            self.ready = True
    
    async def _load_production_models(self, onnx_path: Path, vectorizer_path: Path):
        """Load production ONNX model and vectorizer"""
        try:
            if ort:
                self.spam_model = ort.InferenceSession(str(onnx_path))
                logger.info("✅ ONNX spam model loaded")
            else:
                logger.warning("ONNX Runtime not available, using mock model")
                await self._create_mock_models()
                return
            
            # Load vectorizer
            with open(vectorizer_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
                logger.info("✅ TF-IDF vectorizer loaded")
                
        except Exception as e:
            logger.error(f"Failed to load production models: {e}")
            await self._create_mock_models()
    
    async def _create_mock_models(self):
        """Create mock models for development"""
        logger.info("Creating mock models for development...")
        
        class MockModel:
            def run(self, output_names, input_dict):
                # Mock spam prediction - return random but realistic probabilities
                import random
                prob = random.uniform(0.1, 0.9)
                return [np.array([[1-prob, prob]])]
        
        class MockVectorizer:
            def transform(self, texts):
                # Return mock features (1000 features)
                return np.random.rand(len(texts), 1000)
        
        self.spam_model = MockModel()
        self.vectorizer = MockVectorizer()
        self.model_version = "1.0.0-mock"
        logger.info("✅ Mock models created")
    
    async def predict_spam(
        self,
        content: str,
        sender: Optional[str] = None,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict if email content is spam
        
        Returns:
            Dict with prediction results
        """
        if not self.ready:
            await self.load_models()
        
        try:
            # Combine email parts
            text_parts = [content]
            if subject:
                text_parts.insert(0, subject)
            if sender:
                text_parts.append(f"From: {sender}")
            
            full_text = " ".join(text_parts)
            
            # Limit text length
            if len(full_text) > settings.MAX_EMAIL_LENGTH:
                full_text = full_text[:settings.MAX_EMAIL_LENGTH]
            
            # Vectorize text
            features = self.vectorizer.transform([full_text])
            
            # Predict with model
            if ort and hasattr(self.spam_model, 'run'):
                # ONNX model prediction
                input_name = self.spam_model.get_inputs()[0].name
                outputs = self.spam_model.run(None, {input_name: features.astype(np.float32)})
                probabilities = outputs[0][0]
            else:
                # Mock model prediction
                outputs = self.spam_model.run(None, {'input': features})
                probabilities = outputs[0][0]
            
            spam_probability = float(probabilities[1])  # Probability of spam
            is_spam = spam_probability > settings.SPAM_THRESHOLD
            confidence = max(spam_probability, 1 - spam_probability)
            
            # Extract features for analysis
            feature_importance = self._extract_features(full_text)
            
            return {
                "is_spam": is_spam,
                "probability": spam_probability,
                "confidence": confidence,
                "model_version": self.model_version,
                "features": feature_importance,
                "text_length": len(full_text)
            }
            
        except Exception as e:
            logger.error(f"Spam prediction failed: {e}")
            # Return safe fallback
            return {
                "is_spam": False,
                "probability": 0.5,
                "confidence": 0.5,
                "model_version": self.model_version,
                "features": {},
                "error": str(e)
            }
    
    def _extract_features(self, text: str) -> Dict[str, Any]:
        """Extract interpretable features from text"""
        import re
        
        features = {
            "length": len(text),
            "word_count": len(text.split()),
            "uppercase_ratio": sum(c.isupper() for c in text) / max(len(text), 1),
            "exclamation_count": text.count('!'),
            "question_count": text.count('?'),
            "url_count": len(re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)),
            "email_count": len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)),
            "has_money_words": any(word in text.lower() for word in ['money', 'free', 'win', 'prize', 'offer']),
            "has_urgent_words": any(word in text.lower() for word in ['urgent', 'immediate', 'act now', 'limited time'])
        }
        
        return features
    
    def is_ready(self) -> bool:
        """Check if ML service is ready"""
        return self.ready
    
    async def retrain_model(self, feedback_data: List[Dict[str, Any]]):
        """Retrain model with user feedback (placeholder)"""
        logger.info(f"Retraining requested with {len(feedback_data)} feedback samples")
        # This would implement actual model retraining
        return {"status": "retrain_queued", "samples": len(feedback_data)}
    
    async def get_model_metrics(self) -> Dict[str, Any]:
        """Get current model performance metrics"""
        return {
            "model_version": self.model_version,
            "ready": self.ready,
            "accuracy": 0.95,  # Mock metrics
            "precision": 0.93,
            "recall": 0.96,
            "f1_score": 0.945,
            "last_updated": "2024-01-01T00:00:00Z"
        } 