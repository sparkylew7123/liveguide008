import { createClient } from '@/utils/supabase/client'

interface KnowledgeSearchResult {
  id: string
  title: string
  content: string
  metadata: any
  score: number
}

interface KnowledgeContext {
  query: string
  results: KnowledgeSearchResult[]
  formattedContext: string
}

/**
 * Search the knowledge base for relevant information
 */
export async function searchKnowledgeBase(
  query: string,
  agentId: string,
  limit: number = 5
): Promise<KnowledgeContext> {
  const supabase = createClient()

  try {
    const response = await fetch('/api/knowledge/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        agentId,
        limit,
        searchType: 'hybrid',
        semanticWeight: 0.7
      })
    })

    if (!response.ok) {
      console.error('Knowledge search failed:', await response.text())
      return {
        query,
        results: [],
        formattedContext: ''
      }
    }

    const data = await response.json()
    const results = data.results || []

    // Format results for LLM context
    const formattedContext = formatKnowledgeForContext(results)

    return {
      query,
      results,
      formattedContext
    }
  } catch (error) {
    console.error('Knowledge search error:', error)
    return {
      query,
      results: [],
      formattedContext: ''
    }
  }
}

/**
 * Format knowledge search results for LLM context
 */
function formatKnowledgeForContext(results: KnowledgeSearchResult[]): string {
  if (results.length === 0) return ''

  const contextParts = results.map((result, index) => {
    return `[Knowledge ${index + 1}] ${result.title}
${result.content}
---`
  })

  return `Based on the following knowledge from the coaching database:

${contextParts.join('\n\n')}

Use this information to provide accurate and helpful coaching guidance.`
}

/**
 * Enhance agent metadata with knowledge context
 */
export async function enhanceAgentMetadata(
  metadata: Record<string, any>,
  conversationContext: string
): Promise<Record<string, any>> {
  // Extract potential queries from conversation context
  const queries = extractQueriesFromContext(conversationContext)
  
  if (queries.length === 0) {
    return metadata
  }

  // Search knowledge base for each query
  const knowledgeResults = await Promise.all(
    queries.map(query => 
      searchKnowledgeBase(query, metadata.agentId || 'SuIlXQ4S6dyjrNViOrQ8', 3)
    )
  )

  // Combine all knowledge contexts
  const combinedContext = knowledgeResults
    .map(result => result.formattedContext)
    .filter(context => context.length > 0)
    .join('\n\n')

  return {
    ...metadata,
    knowledgeContext: combinedContext,
    knowledgeQueries: queries
  }
}

/**
 * Extract potential search queries from conversation context
 */
function extractQueriesFromContext(context: string): string[] {
  const queries: string[] = []

  // Look for question patterns
  const questionPatterns = [
    /how (?:do|can|should) (?:I|you|we) (.+?)[?.]?$/gmi,
    /what (?:is|are|should) (.+?)[?.]?$/gmi,
    /tell me about (.+?)[?.]?$/gmi,
    /I (?:want|need|would like) (?:to|help with) (.+?)[?.]?$/gmi
  ]

  for (const pattern of questionPatterns) {
    const matches = context.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        queries.push(match[1].trim())
      }
    }
  }

  // Look for topic keywords
  const topicKeywords = [
    'career', 'goals', 'wellness', 'health', 'personal growth',
    'motivation', 'productivity', 'relationships', 'stress',
    'work-life balance', 'leadership', 'communication'
  ]

  for (const keyword of topicKeywords) {
    if (context.toLowerCase().includes(keyword)) {
      queries.push(keyword)
    }
  }

  // Deduplicate and limit
  return [...new Set(queries)].slice(0, 3)
}

/**
 * Store conversation context for future retrieval
 */
export async function storeConversationContext(
  conversationId: string,
  agentId: string,
  userId: string | null,
  retrievedDocuments: string[],
  queryEmbedding?: number[]
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from('conversation_contexts')
      .insert({
        conversation_id: conversationId,
        agent_id: agentId,
        user_id: userId,
        retrieved_documents: retrievedDocuments,
        query_embedding: queryEmbedding,
        retrieval_metadata: {
          timestamp: new Date().toISOString(),
          document_count: retrievedDocuments.length
        }
      })
  } catch (error) {
    console.error('Failed to store conversation context:', error)
  }
}

/**
 * Get conversation history with knowledge context
 */
export async function getConversationWithContext(
  conversationId: string
): Promise<any> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversation_contexts')
    .select(`
      *,
      knowledge_documents!inner(
        id,
        title,
        content
      )
    `)
    .eq('conversation_id', conversationId)
    .single()

  if (error) {
    console.error('Failed to get conversation context:', error)
    return null
  }

  return data
}