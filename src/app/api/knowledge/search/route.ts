import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      query, 
      agentId, 
      limit = 10,
      searchType = 'hybrid', // 'semantic', 'keyword', or 'hybrid'
      semanticWeight = 0.7
    } = await request.json()

    if (!query || !agentId) {
      return NextResponse.json(
        { error: 'Query and agentId are required' },
        { status: 400 }
      )
    }

    // Get knowledge base for agent
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', agentId)
      .single()

    if (kbError || !knowledgeBase) {
      return NextResponse.json(
        { error: 'Knowledge base not found for agent' },
        { status: 404 }
      )
    }

    let results = []

    if (searchType === 'keyword') {
      // Full-text search only
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, content, metadata')
        .eq('kb_id', knowledgeBase.id)
        .textSearch('search_vector', query)
        .limit(limit)

      if (error) {
        console.error('Keyword search error:', error)
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        )
      }
      
      results = data || []
      
    } else if (searchType === 'semantic') {
      // Semantic search only (requires embedding)
      // Generate query embedding first
      const queryEmbedding = await generateQueryEmbedding(query)
      
      // Use RPC function for vector similarity search
      const { data, error } = await supabase
        .rpc('search_documents_by_similarity', {
          query_embedding: queryEmbedding,
          kb_id_filter: knowledgeBase.id,
          match_count: limit
        })

      if (error) {
        console.error('Semantic search error:', error)
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        )
      }
      
      results = data || []
      
    } else {
      // Hybrid search (default)
      const queryEmbedding = await generateQueryEmbedding(query)
      
      // Use the hybrid_search function we created
      const { data, error } = await supabase
        .rpc('hybrid_search', {
          query_embedding: queryEmbedding,
          query_text: query,
          kb_id_filter: knowledgeBase.id,
          match_count: limit,
          semantic_weight: semanticWeight
        })

      if (error) {
        console.error('Hybrid search error:', error)
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        )
      }
      
      results = data || []
    }

    // Update access analytics for retrieved documents
    const documentIds = results.map(r => r.id).filter(Boolean)
    if (documentIds.length > 0) {
      // Fire and forget - don't wait for analytics update
      updateDocumentAccess(supabase, documentIds)
    }

    // Format results for response
    const formattedResults = results.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata,
      score: doc.combined_score || doc.similarity_score || doc.keyword_score || 0,
      excerpt: getExcerpt(doc.content, query)
    }))

    return NextResponse.json({
      success: true,
      query: query,
      results: formattedResults,
      count: formattedResults.length,
      searchType: searchType,
      knowledgeBaseId: knowledgeBase.id
    })

  } catch (error) {
    console.error('Knowledge search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate query embeddings
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Placeholder: generate random 1536-dimensional vector
  // In production: call OpenAI API with the same model used for documents
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1)
}

// Helper function to update document access analytics
async function updateDocumentAccess(supabase: any, documentIds: string[]) {
  try {
    for (const docId of documentIds) {
      await supabase.rpc('update_document_access', { doc_id: docId })
    }
  } catch (error) {
    console.error('Analytics update error:', error)
    // Don't throw - this is non-critical
  }
}

// Helper function to extract relevant excerpt around query terms
function getExcerpt(content: string, query: string, maxLength: number = 200): string {
  const queryTerms = query.toLowerCase().split(' ')
  const contentLower = content.toLowerCase()
  
  // Find the first occurrence of any query term
  let firstIndex = -1
  for (const term of queryTerms) {
    const index = contentLower.indexOf(term)
    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
      firstIndex = index
    }
  }
  
  if (firstIndex === -1) {
    // No query terms found, return beginning of content
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
  }
  
  // Extract excerpt around the found term
  const start = Math.max(0, firstIndex - 50)
  const end = Math.min(content.length, firstIndex + maxLength - 50)
  
  let excerpt = content.slice(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < content.length) excerpt = excerpt + '...'
  
  return excerpt
}

// GET endpoint for retrieving document by ID
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const { data: document, error } = await supabase
      .from('knowledge_documents')
      .select(`
        *,
        agent_knowledge_bases!inner(agent_id, name),
        document_categories(
          knowledge_categories(category, description)
        )
      `)
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update access analytics
    await supabase.rpc('update_document_access', { doc_id: documentId })

    return NextResponse.json({
      success: true,
      document: document
    })

  } catch (error) {
    console.error('Document retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}