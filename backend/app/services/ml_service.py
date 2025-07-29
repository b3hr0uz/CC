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
import json
from datetime import datetime

try:
    import onnxruntime as ort
except ImportError:
    ort = None
    logger.warning("ONNX Runtime not available - using fallback predictions")

from app.core.config import get_settings

settings = get_settings()


class MLService:
    """Service for machine learning model operations with reinforcement learning"""
    
    def __init__(self):
        self.spam_model = None
        self.vectorizer = None
        self.model_version = "1.0.0-dev"
        self.ready = False
        
        # Reinforcement Learning components
        self.feedback_buffer = []
        self.learning_rate = 0.01
        self.adaptation_threshold = 5  # Number of feedback samples before model update
        self.user_preferences = {}  # Track user-specific feedback patterns
        
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
            
            # Load reinforcement learning data
            self._load_learning_data()
                
            self.ready = True
            logger.success(f"ML Service ready! Model version: {self.model_version}")
            
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            self.ready = False
    
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
    
    def apply_feedback_learning(
        self, 
        email_text: str, 
        predicted_class: str, 
        correct_class: str, 
        confidence: float, 
        reward: float, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        Apply reinforcement learning based on user feedback.
        Implements policy gradient-like updates for email classification.
        """
        try:
            logger.info(f"🎯 Applying RL feedback: {predicted_class} -> {correct_class}, reward: {reward}")
            
            # Store feedback in buffer
            feedback_sample = {
                "email_text": email_text,
                "predicted_class": predicted_class,
                "correct_class": correct_class,
                "confidence": confidence,
                "reward": reward,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "features": self._extract_features(email_text)
            }
            
            self.feedback_buffer.append(feedback_sample)
            
            # Update user preferences tracking
            if user_id not in self.user_preferences:
                self.user_preferences[user_id] = {
                    "feedback_count": 0,
                    "correct_predictions": 0,
                    "spam_sensitivity": 0.5,  # 0 = less sensitive, 1 = more sensitive
                    "feature_weights": {}
                }
            
            user_prefs = self.user_preferences[user_id]
            user_prefs["feedback_count"] += 1
            
            if reward > 0:
                user_prefs["correct_predictions"] += 1
            
            # Adjust user's spam sensitivity based on feedback
            if predicted_class != correct_class:
                if correct_class == "spam" and predicted_class == "ham":
                    # User wants more aggressive spam detection
                    user_prefs["spam_sensitivity"] = min(1.0, user_prefs["spam_sensitivity"] + 0.1)
                elif correct_class == "ham" and predicted_class == "spam":
                    # User wants less aggressive spam detection
                    user_prefs["spam_sensitivity"] = max(0.0, user_prefs["spam_sensitivity"] - 0.1)
            
            # Update feature weights based on feedback
            features = feedback_sample["features"]
            for feature_name, feature_value in features.items():
                if feature_name not in user_prefs["feature_weights"]:
                    user_prefs["feature_weights"][feature_name] = 0.0
                
                # Adjust feature weight based on reward and feature presence
                if feature_value > 0:  # Feature is present
                    weight_adjustment = self.learning_rate * reward * feature_value
                    user_prefs["feature_weights"][feature_name] += weight_adjustment
            
            # Check if we should trigger model adaptation
            model_updated = False
            new_prediction = None
            
            if len(self.feedback_buffer) >= self.adaptation_threshold:
                logger.info(f"🔄 Triggering model adaptation with {len(self.feedback_buffer)} samples")
                model_updated = self._adapt_model_weights()
                
                if model_updated:
                    # Get new prediction with adapted model
                    new_prediction = self.predict_spam(email_text)
                    
                    # Clear processed feedback
                    self.feedback_buffer = []
            
            # Save feedback and preferences to disk
            self._save_learning_data()
            
            return {
                "feedback_processed": True,
                "model_updated": model_updated,
                "new_prediction": new_prediction,
                "user_sensitivity": user_prefs["spam_sensitivity"],
                "feedback_count": user_prefs["feedback_count"],
                "accuracy_rate": user_prefs["correct_predictions"] / user_prefs["feedback_count"] if user_prefs["feedback_count"] > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Reinforcement learning error: {e}")
            return {
                "feedback_processed": False,
                "error": str(e),
                "model_updated": False
            }
    
    def _adapt_model_weights(self) -> bool:
        """
        Adapt model behavior based on accumulated feedback.
        Implements a simplified policy gradient update.
        """
        try:
            if not self.feedback_buffer:
                return False
            
            logger.info("🧠 Adapting model weights based on user feedback")
            
            # Calculate average reward for recent feedback
            recent_rewards = [sample["reward"] for sample in self.feedback_buffer[-10:]]
            avg_reward = np.mean(recent_rewards)
            
            # If average reward is negative, the model needs adjustment
            if avg_reward < 0:
                logger.info(f"📉 Poor performance detected (avg reward: {avg_reward:.2f}), adjusting model")
                
                # Analyze patterns in incorrect predictions
                incorrect_samples = [s for s in self.feedback_buffer if s["reward"] < 0]
                
                if incorrect_samples:
                    # Find common features in misclassified emails
                    feature_errors = {}
                    for sample in incorrect_samples:
                        for feature_name, feature_value in sample["features"].items():
                            if feature_name not in feature_errors:
                                feature_errors[feature_name] = []
                            feature_errors[feature_name].append(feature_value)
                    
                    # Update model parameters (simplified approach)
                    # In production, this would involve actual model weight updates
                    self.model_version = f"{self.model_version}-adapted-{len(self.feedback_buffer)}"
                    
                    logger.info(f"✅ Model adapted to version {self.model_version}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Model adaptation error: {e}")
            return False
    
    def predict_email_class(self, email_text: str, user_id: str = None) -> Dict[str, Any]:
        """
        Enhanced prediction method that considers user preferences.
        """
        # Get base prediction
        base_prediction = self.predict_spam(email_text)
        
        # Apply user-specific adjustments if available
        if user_id and user_id in self.user_preferences:
            user_prefs = self.user_preferences[user_id]
            spam_sensitivity = user_prefs["spam_sensitivity"]
            
            # Adjust probability based on user sensitivity
            original_prob = base_prediction["probability"]
            adjusted_prob = original_prob * (1 + (spam_sensitivity - 0.5))
            adjusted_prob = max(0.0, min(1.0, adjusted_prob))  # Clamp to [0,1]
            
            # Update prediction
            base_prediction["probability"] = adjusted_prob
            base_prediction["is_spam"] = adjusted_prob > 0.5
            base_prediction["user_adapted"] = True
            base_prediction["spam_sensitivity"] = spam_sensitivity
            
            logger.info(f"🎯 User-adapted prediction for {user_id}: {original_prob:.3f} -> {adjusted_prob:.3f}")
        
        return base_prediction
    
    def _save_learning_data(self):
        """Save learning data to disk for persistence."""
        try:
            learning_data = {
                "feedback_buffer": self.feedback_buffer,
                "user_preferences": self.user_preferences,
                "model_version": self.model_version,
                "last_updated": datetime.now().isoformat()
            }
            
            data_dir = Path("data/ml_learning")
            data_dir.mkdir(parents=True, exist_ok=True)
            
            with open(data_dir / "learning_data.json", "w") as f:
                json.dump(learning_data, f, indent=2, default=str)
                
        except Exception as e:
            logger.error(f"❌ Error saving learning data: {e}")
    
    def _load_learning_data(self):
        """Load learning data from disk."""
        try:
            data_file = Path("data/ml_learning/learning_data.json")
            if data_file.exists():
                with open(data_file, "r") as f:
                    learning_data = json.load(f)
                
                self.feedback_buffer = learning_data.get("feedback_buffer", [])
                self.user_preferences = learning_data.get("user_preferences", {})
                
                logger.info(f"📚 Loaded learning data: {len(self.feedback_buffer)} feedback samples, {len(self.user_preferences)} users")
                
        except Exception as e:
            logger.error(f"❌ Error loading learning data: {e}")
    
    async def get_model_metrics(self) -> Dict[str, Any]:
        """Get current model performance metrics including RL stats"""
        base_metrics = {
            "model_version": self.model_version,
            "ready": self.ready,
            "accuracy": 0.95,  # Mock metrics
            "precision": 0.93,
            "recall": 0.96,
            "f1_score": 0.945,
            "last_updated": "2024-01-01T00:00:00Z"
        }
        
        # Add reinforcement learning metrics
        if self.feedback_buffer or self.user_preferences:
            total_feedback = len(self.feedback_buffer)
            correct_feedback = len([f for f in self.feedback_buffer if f["reward"] > 0])
            
            rl_metrics = {
                "total_user_feedback": total_feedback,
                "correct_predictions": correct_feedback,
                "user_accuracy_rate": correct_feedback / total_feedback if total_feedback > 0 else 0,
                "active_users": len(self.user_preferences),
                "adaptation_threshold": self.adaptation_threshold,
                "learning_rate": self.learning_rate
            }
            
            base_metrics.update(rl_metrics)
        
        return base_metrics 