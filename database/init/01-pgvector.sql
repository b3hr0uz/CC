-- Initialize pgvector extension and embeddings tables for ContextCleanse
-- This script runs automatically when the PostgreSQL container starts

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create email embeddings table
CREATE TABLE IF NOT EXISTS email_embeddings (
    id SERIAL PRIMARY KEY,
    email_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    subject TEXT,
    embedding vector(384),  -- 384 dimensions for all-MiniLM-L6-v2 model
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_embeddings_email_id 
ON email_embeddings(email_id);

CREATE INDEX IF NOT EXISTS idx_email_embeddings_user_email 
ON email_embeddings(user_email);

CREATE INDEX IF NOT EXISTS idx_email_embeddings_content_hash 
ON email_embeddings(content_hash);

-- Vector similarity index (cosine distance) - requires sufficient data
-- This will be created automatically as data is inserted
CREATE INDEX IF NOT EXISTS idx_email_embeddings_vector_cosine 
ON email_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at field
DROP TRIGGER IF EXISTS update_email_embeddings_modtime ON email_embeddings;
CREATE TRIGGER update_email_embeddings_modtime 
    BEFORE UPDATE ON email_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Grant necessary permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON email_embeddings TO contextcleanse;
-- GRANT USAGE, SELECT ON SEQUENCE email_embeddings_id_seq TO contextcleanse;

-- Insert some logging
DO $$
BEGIN
    RAISE NOTICE 'pgvector extension and email_embeddings table initialized successfully';
END
$$;