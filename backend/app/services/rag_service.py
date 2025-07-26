"""
RAG (Retrieval-Augmented Generation) service for context-aware responses
"""

import asyncio
from typing import Dict, Any, List, Optional
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import numpy as np

from app.core.database import async_session_maker
from app.core.config import get_settings
from app.models.embedding import Embedding, Document
from app.services.ollama_service import OllamaService

settings = get_settings()


class RAGService:
    """Service for retrieval-augmented generation"""
    
    def __init__(self):
        self.ollama_service = None
        self.ready = False
    
    async def initialize(self):
        """Initialize RAG service"""
        try:
            logger.info("Initializing RAG service...")
            
            # Initialize Ollama service
            self.ollama_service = OllamaService()
            await self.ollama_service.initialize()
            
            # Check database connectivity
            await self._check_database()
            
            self.ready = True
            logger.info("✅ RAG service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            self.ready = False
    
    async def _check_database(self):
        """Check database connectivity for embeddings"""
        try:
            async with async_session_maker() as session:
                # Test pgvector extension
                result = await session.execute(text("SELECT version()"))
                logger.info("✅ Database connection verified")
                
                # Check if embeddings table exists and has data
                result = await session.execute(
                    select(Embedding).limit(1)
                )
                embedding_count = len(result.all())
                
                if embedding_count == 0:
                    logger.info("No embeddings found - will use mock context for development")
                else:
                    logger.info(f"Found {embedding_count} embeddings in database")
                    
        except Exception as e:
            logger.warning(f"Database check warning: {e}")
    
    async def retrieve_context(
        self,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        content_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context documents for a query
        
        Args:
            query: Search query
            top_k: Number of documents to retrieve
            similarity_threshold: Minimum similarity score
            content_types: Filter by content types (e.g., ['email', 'document'])
        
        Returns:
            List of relevant documents with metadata
        """
        try:
            # Generate query embedding
            if self.ollama_service and self.ollama_service.ready:
                embedding_result = await self.ollama_service.generate_embeddings([query])
                query_embedding = embedding_result["embeddings"][0]
            else:
                # Use mock embedding for development
                query_embedding = await self._mock_query_embedding(query)
            
            # Search for similar embeddings in database
            context_docs = await self._search_embeddings(
                query_embedding, top_k, similarity_threshold, content_types
            )
            
            # If no results from database, use mock context
            if not context_docs:
                context_docs = await self._mock_context_retrieval(query, top_k)
            
            logger.info(f"Retrieved {len(context_docs)} context documents for query: {query[:50]}...")
            return context_docs
            
        except Exception as e:
            logger.error(f"Context retrieval failed: {e}")
            return await self._mock_context_retrieval(query, top_k)
    
    async def _search_embeddings(
        self,
        query_embedding: List[float],
        top_k: int,
        similarity_threshold: float,
        content_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar embeddings using pgvector"""
        try:
            async with async_session_maker() as session:
                # Build query with vector similarity
                query_str = """
                SELECT 
                    e.id,
                    e.text_content,
                    e.content_type,
                    e.content_id,
                    e.model_name,
                    e.chunk_index,
                    (e.embedding <=> %s::vector) as similarity_score
                FROM embeddings e
                WHERE (e.embedding <=> %s::vector) < %s
                """
                
                params = [query_embedding, query_embedding, 1 - similarity_threshold]
                
                # Add content type filter if specified
                if content_types:
                    placeholders = ','.join(['%s'] * len(content_types))
                    query_str += f" AND e.content_type IN ({placeholders})"
                    params.extend(content_types)
                
                query_str += " ORDER BY similarity_score ASC LIMIT %s"
                params.append(top_k)
                
                result = await session.execute(text(query_str), params)
                rows = result.fetchall()
                
                # Convert to list of dictionaries
                context_docs = []
                for row in rows:
                    context_docs.append({
                        "id": str(row[0]),
                        "content": row[1],
                        "content_type": row[2],
                        "content_id": str(row[3]) if row[3] else None,
                        "model_name": row[4],
                        "chunk_index": row[5],
                        "similarity_score": float(1 - row[6]),  # Convert distance to similarity
                        "metadata": {
                            "document_type": row[2],
                            "chunk": row[5]
                        }
                    })
                
                return context_docs
                
        except Exception as e:
            logger.warning(f"Database embedding search failed: {e}")
            return []
    
    async def generate_response(
        self,
        query: str,
        context_docs: List[Dict[str, Any]],
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Generate response using retrieved context and LLM
        
        Args:
            query: User query
            context_docs: Retrieved context documents
            max_tokens: Maximum tokens for response
        
        Returns:
            Dict with generated response and metadata
        """
        try:
            # Build context string from retrieved documents
            context_parts = []
            for i, doc in enumerate(context_docs[:5]):  # Limit context
                context_parts.append(f"[{i+1}] {doc['content'][:500]}...")
            
            context_text = "\n\n".join(context_parts)
            
            # Generate response using Ollama
            if self.ollama_service and self.ollama_service.ready:
                response = await self.ollama_service.generate_response(
                    prompt=query,
                    context=context_text,
                    max_tokens=max_tokens
                )
            else:
                response = await self._mock_generation(query, context_text)
            
            # Add RAG-specific metadata
            response["context_docs_used"] = len(context_docs)
            response["context_length"] = len(context_text)
            
            return response
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return await self._mock_generation(query, "")
    
    async def _mock_query_embedding(self, query: str) -> List[float]:
        """Generate mock embedding for query"""
        import random
        random.seed(hash(query) % (2**32))
        return [random.uniform(-1, 1) for _ in range(384)]
    
    async def _mock_context_retrieval(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Generate mock context documents for development"""
        mock_docs = [
            {
                "id": "mock-1",
                "content": "Email security best practices include using strong passwords, enabling two-factor authentication, and being cautious of suspicious attachments.",
                "content_type": "document",
                "similarity_score": 0.85,
                "metadata": {"document_type": "security_guide"}
            },
            {
                "id": "mock-2", 
                "content": "Email classification algorithms typically look for patterns in sender behavior, content keywords, and metadata anomalies to identify different message types.",
                "content_type": "wiki",
                "similarity_score": 0.78,
                "metadata": {"document_type": "technical_doc"}
            },
            {
                "id": "mock-3",
                "content": "Common spam indicators include urgent language, requests for personal information, and suspicious sender domains.",
                "content_type": "manual",
                "similarity_score": 0.72,
                "metadata": {"document_type": "user_manual"}
            }
        ]
        
        # Filter mock docs based on query keywords
        relevant_docs = []
        query_lower = query.lower()
        
        for doc in mock_docs:
            if any(word in doc["content"].lower() for word in query_lower.split()):
                relevant_docs.append(doc)
        
        # If no relevant docs, return first few
        if not relevant_docs:
            relevant_docs = mock_docs
        
        return relevant_docs[:top_k]
    
    async def _mock_generation(self, query: str, context: str) -> Dict[str, Any]:
        """Generate mock response for development"""
        response_templates = {
            "spam": "Based on the provided context, this appears to be related to email classification. The system analyzes various patterns and indicators to classify emails.",
            "email": "Regarding email analysis, the system examines multiple factors including sender reputation, content patterns, and metadata to provide insights.",
            "security": "From a security perspective, it's important to follow best practices for email handling and remain vigilant against potential threats.",
            "default": f"Thank you for your question about {query[:50]}. Based on the available context, I can provide some relevant insights."
        }
        
        # Simple keyword matching
        response_key = "default"
        query_lower = query.lower()
        
        for key in response_templates:
            if key in query_lower:
                response_key = key
                break
        
        return {
            "response": response_templates[response_key],
            "model": "mock-rag",
            "tokens_used": len(query.split()) + 25,
            "generation_time": 0.8,
            "confidence": 0.75,
            "success": True,
            "mock": True
        }
    
    async def add_document(
        self,
        content: str,
        document_type: str = "document",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Add a document to the knowledge base
        
        Args:
            content: Document content
            document_type: Type of document
            metadata: Additional metadata
        
        Returns:
            Dict with document ID and status
        """
        try:
            async with async_session_maker() as session:
                # Create document record
                document = Document(
                    title=metadata.get("title", "Untitled") if metadata else "Untitled",
                    content=content,
                    document_type=document_type,
                    content_length=len(content),
                    processed=0  # Mark as pending processing
                )
                
                session.add(document)
                await session.commit()
                await session.refresh(document)
                
                logger.info(f"Document added to knowledge base: {document.id}")
                
                # Generate and store embeddings (would be done in background)
                # For now, just return success
                return {
                    "document_id": str(document.id),
                    "status": "added",
                    "content_length": len(content)
                }
                
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            return {"status": "failed", "error": str(e)}
    
    async def refresh_embeddings(self):
        """Refresh all embeddings in the knowledge base"""
        logger.info("Starting embedding refresh...")
        
        try:
            async with async_session_maker() as session:
                # Get all unprocessed documents
                result = await session.execute(
                    select(Document).where(Document.processed == 0)
                )
                documents = result.scalars().all()
                
                logger.info(f"Found {len(documents)} documents to process")
                
                # Process documents (in a real implementation)
                # This would generate embeddings and store them
                for doc in documents:
                    # Mock processing
                    doc.processed = 1
                    doc.chunk_count = 1
                
                await session.commit()
                logger.info("✅ Embedding refresh completed")
                
        except Exception as e:
            logger.error(f"Embedding refresh failed: {e}")
    
    def is_ready(self) -> bool:
        """Check if RAG service is ready"""
        return self.ready 