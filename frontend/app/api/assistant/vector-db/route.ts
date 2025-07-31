import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface EmailDocument {
  id: string;
  subject: string;
  from: string;
  content: string;
  timestamp: string;
  classification?: 'spam' | 'ham';
  embedding?: number[]; // Optional embedding for existing documents
}

interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    subject: string;
    from: string;
    timestamp: string;
    classification?: 'spam' | 'ham';
    type: 'email';
  };
  embedding: number[];
}

// In-memory vector storage (in production, use a proper vector database)
class InMemoryVectorDB {
  private documents: Map<string, VectorDocument> = new Map();
  private index: VectorDocument[] = [];

  add(document: VectorDocument): void {
    this.documents.set(document.id, document);
    this.index.push(document);
  }

  addBatch(documents: VectorDocument[]): void {
    documents.forEach(doc => this.add(doc));
  }

  get(id: string): VectorDocument | undefined {
    return this.documents.get(id);
  }

  delete(id: string): boolean {
    const document = this.documents.get(id);
    if (document) {
      this.documents.delete(id);
      this.index = this.index.filter(doc => doc.id !== id);
      return true;
    }
    return false;
  }

  search(queryEmbedding: number[], topK: number = 5, threshold: number = 0.1): Array<{document: VectorDocument, similarity: number}> {
    const similarities = this.index.map(doc => ({
      document: doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return similarities
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getStats() {
    return {
      total_documents: this.documents.size,
      indexed_documents: this.index.length,
      memory_usage: process.memoryUsage(),
      last_updated: new Date().toISOString()
    };
  }

  clear(): void {
    this.documents.clear();
    this.index = [];
  }
}

// Global vector database instance (in production, use proper database connection)
let vectorDB: InMemoryVectorDB | null = null;

function getVectorDB(): InMemoryVectorDB {
  if (!vectorDB) {
    vectorDB = new InMemoryVectorDB();
  }
  return vectorDB;
}

// Add documents to vector database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documents, clear_existing = false } = body;

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: 'Documents array is required' },
        { status: 400 }
      );
    }

    const db = getVectorDB();

    if (clear_existing) {
      db.clear();
      console.log('🗑️ Cleared existing vector database');
    }

    // Transform and add documents
    const vectorDocs: VectorDocument[] = documents.map((doc: EmailDocument) => ({
      id: doc.id,
      content: `${doc.subject} ${doc.content}`,
      metadata: {
        subject: doc.subject,
        from: doc.from,
        timestamp: doc.timestamp,
        classification: doc.classification,
        type: 'email'
      },
      embedding: doc.embedding || [] // Provide empty array if no embedding
    }));

    db.addBatch(vectorDocs);

    console.log(`📚 Added ${vectorDocs.length} documents to vector database`);

    return NextResponse.json({
      success: true,
      added_documents: vectorDocs.length,
      stats: db.getStats(),
      message: `Successfully indexed ${vectorDocs.length} email documents`
    });

  } catch (error) {
    console.error('Vector DB add error:', error);
    return NextResponse.json(
      { error: 'Failed to add documents to vector database' },
      { status: 500 }
    );
  }
}

// Search vector database
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query_embedding, top_k = 5, threshold = 0.1, filters } = body;

    if (!query_embedding || !Array.isArray(query_embedding)) {
      return NextResponse.json(
        { error: 'Query embedding is required' },
        { status: 400 }
      );
    }

    const db = getVectorDB();
    const results = db.search(query_embedding, top_k, threshold);

    // Apply filters if provided
    let filteredResults = results;
    if (filters) {
      filteredResults = results.filter(result => {
        const metadata = result.document.metadata;
        
        // Filter by classification
        if (filters.classification && metadata.classification !== filters.classification) {
          return false;
        }
        
        // Filter by sender domain
        if (filters.sender_domain) {
          const domain = metadata.from.split('@')[1]?.toLowerCase();
          if (!domain?.includes(filters.sender_domain.toLowerCase())) {
            return false;
          }
        }
        
        // Filter by date range
        if (filters.date_from || filters.date_to) {
          const docDate = new Date(metadata.timestamp);
          if (filters.date_from && docDate < new Date(filters.date_from)) {
            return false;
          }
          if (filters.date_to && docDate > new Date(filters.date_to)) {
            return false;
          }
        }
        
        return true;
      });
    }

    console.log(`🔍 Vector search found ${filteredResults.length} relevant documents`);

    return NextResponse.json({
      success: true,
      results: filteredResults.map(result => ({
        document: {
          id: result.document.id,
          content: result.document.content,
          metadata: result.document.metadata
        },
        similarity: result.similarity
      })),
      stats: {
        total_searched: db.getStats().total_documents,
        results_found: filteredResults.length,
        max_similarity: filteredResults.length > 0 ? Math.max(...filteredResults.map(r => r.similarity)) : 0,
        min_similarity: filteredResults.length > 0 ? Math.min(...filteredResults.map(r => r.similarity)) : 0,
        threshold_used: threshold
      }
    });

  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Vector search failed' },
      { status: 500 }
    );
  }
}

// Get vector database statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getVectorDB();
    const stats = db.getStats();

    return NextResponse.json({
      success: true,
      database_stats: stats,
      capabilities: {
        vector_search: true,
        similarity_threshold: true,
        metadata_filtering: true,
        batch_operations: true,
        real_time_indexing: true
      },
      configuration: {
        vector_dimensions: 384,
        similarity_metric: 'cosine',
        storage_type: 'in-memory',
        persistence: false
      },
      recommendations: {
        production_ready: false,
        suggestions: [
          'Implement persistent storage (Redis, PostgreSQL with pgvector, or dedicated vector DB)',
          'Add vector quantization for memory efficiency',
          'Implement hybrid search (vector + keyword)',
          'Add batch processing for large datasets',
          'Consider approximate nearest neighbor algorithms (HNSW, IVF)'
        ]
      }
    });

  } catch (error) {
    console.error('Vector DB stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get database statistics' },
      { status: 500 }
    );
  }
}

// Delete documents from vector database
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const clearAll = searchParams.get('clear_all') === 'true';

    const db = getVectorDB();

    if (clearAll) {
      db.clear();
      console.log('🗑️ Cleared entire vector database');
      
      return NextResponse.json({
        success: true,
        message: 'Vector database cleared',
        stats: db.getStats()
      });
    } else if (documentId) {
      const deleted = db.delete(documentId);
      
      if (deleted) {
        console.log(`🗑️ Deleted document ${documentId} from vector database`);
        return NextResponse.json({
          success: true,
          message: `Document ${documentId} deleted`,
          stats: db.getStats()
        });
      } else {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Document ID or clear_all parameter required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Vector DB delete error:', error);
    return NextResponse.json(
      { error: 'Delete operation failed' },
      { status: 500 }
    );
  }
}