import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Types for RAG requests and responses
interface RAGRequest {
  userId: string;
  query: string;
  agentId?: string;
  conversationId?: string;
  maxTokens?: number;
  includeKnowledgeBase?: boolean;
  includeSimilarPatterns?: boolean;
}

interface RAGResponse {
  context: string;
  userSummary: string;
  relevantGoals: any[];
  relevantInsights: any[];
  knowledgeChunks: any[];
  similarPatterns?: any;
  tokenCount: number;
  truncated: boolean;
}

interface UserContextSummary {
  user_id: string;
  goals: any[];
  insights: any[];
  recent_sessions: any[];
  emotional_states: any[];
  summary_generated_at: string;
}

interface InsightResult {
  id: string;
  label: string;
  description: string;
  similarity: number;
  created_at: string;
  properties: any;
}

interface KnowledgeChunk {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
  document_title: string;
}

interface SimilarPattern {
  pattern_summary: string;
  similar_goals_count: number;
  avg_completion_rate: number;
  common_strategies: any;
  timeframe_patterns: any;
}

// Utility function to estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Utility function to truncate text to fit within token limit
function truncateToTokenLimit(text: string, maxTokens: number): { text: string; truncated: boolean } {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return { text, truncated: false };
  }
  
  const maxChars = Math.floor(maxTokens * 4 * 0.9); // Leave some buffer
  const truncatedText = text.substring(0, maxChars) + "...[truncated]";
  return { text: truncatedText, truncated: true };
}

// Generate embedding for query using OpenAI
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: query,
      model: 'text-embedding-3-small',
      dimensions: 1536
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request
    const requestData: RAGRequest = await req.json();
    const { 
      userId, 
      query, 
      agentId, 
      conversationId, 
      maxTokens = 12000, // Conservative limit for 50k characters
      includeKnowledgeBase = true,
      includeSimilarPatterns = true 
    } = requestData;

    if (!userId || !query) {
      return new Response(
        JSON.stringify({ error: 'userId and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`RAG request for user ${userId}: ${query.substring(0, 100)}...`);

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Step 1: Get user context summary
    const { data: contextData, error: contextError } = await supabase
      .rpc('get_user_context_summary', {
        p_user_id: userId
      }) as { data: UserContextSummary | null; error: any };

    if (contextError) {
      console.error('Error fetching user context:', contextError);
      throw new Error('Failed to fetch user context');
    }

    const userContext = contextData || {
      user_id: userId,
      goals: [],
      insights: [],
      recent_sessions: [],
      emotional_states: [],
      summary_generated_at: new Date().toISOString()
    };

    // Step 2: Semantic search for relevant insights
    const { data: insightData, error: insightError } = await supabase
      .rpc('search_insights_semantic', {
        p_user_id: userId,
        query_embedding: `[${queryEmbedding.join(',')}]`,
        similarity_threshold: 0.6,
        max_results: 15
      }) as { data: InsightResult[] | null; error: any };

    if (insightError) {
      console.error('Error searching insights:', insightError);
    }

    const relevantInsights = insightData || [];

    // Step 3: Search knowledge chunks if enabled
    let knowledgeChunks: KnowledgeChunk[] = [];
    if (includeKnowledgeBase) {
      const { data: chunkData, error: chunkError } = await supabase
        .rpc('match_knowledge_chunks', {
          query_embedding: `[${queryEmbedding.join(',')}]`,
          match_threshold: 0.5,
          match_count: 8
        }) as { data: any[] | null; error: any };

      if (!chunkError && chunkData) {
        knowledgeChunks = chunkData.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: chunk.similarity,
          document_title: chunk.document_title
        }));
      } else if (chunkError) {
        console.error('Error searching knowledge chunks:', chunkError);
      }
    }

    // Step 4: Find similar patterns if enabled
    let similarPatterns: SimilarPattern | null = null;
    if (includeSimilarPatterns && userContext.goals.length > 0) {
      const { data: patternData, error: patternError } = await supabase
        .rpc('find_similar_goal_patterns', {
          target_embedding: `[${queryEmbedding.join(',')}]`,
          user_id_to_exclude: userId,
          similarity_threshold: 0.6,
          max_results: 5
        }) as { data: SimilarPattern[] | null; error: any };

      if (!patternError && patternData?.[0]) {
        similarPatterns = patternData[0];
      }
    }

    // Step 5: Format context for ElevenLabs
    let contextSections: string[] = [];
    
    // User summary
    const contextSummary = userContext.goals.length > 0 || userContext.insights.length > 0 
      ? `User has ${userContext.goals.length} goals and ${userContext.insights.length} insights recorded.`
      : 'No recent activity found.';
    contextSections.push(`USER CONTEXT:\n${contextSummary}\n`);

    // Active goals
    if (userContext.goals && userContext.goals.length > 0) {
      contextSections.push('ACTIVE GOALS:');
      userContext.goals.slice(0, 8).forEach((goal: any, idx: number) => {
        contextSections.push(
          `${idx + 1}. ${goal.label}${goal.description ? ': ' + goal.description.substring(0, 200) : ''}`
        );
      });
      contextSections.push('');
    }

    // Relevant insights
    if (relevantInsights.length > 0) {
      contextSections.push('RELEVANT INSIGHTS:');
      relevantInsights.slice(0, 10).forEach((insight, idx) => {
        contextSections.push(
          `${idx + 1}. [${insight.label}] ${insight.description?.substring(0, 150) || ''} (${Math.round(insight.similarity * 100)}% relevant)`
        );
      });
      contextSections.push('');
    }

    // Knowledge base content
    if (knowledgeChunks.length > 0) {
      contextSections.push('KNOWLEDGE BASE:');
      knowledgeChunks.forEach((chunk, idx) => {
        contextSections.push(
          `${idx + 1}. From "${chunk.document_title}": ${chunk.content.substring(0, 300)}`
        );
      });
      contextSections.push('');
    }

    // Similar patterns
    if (similarPatterns) {
      contextSections.push('SIMILAR USER PATTERNS:');
      contextSections.push(
        `Found ${similarPatterns.similar_goals_count} similar goals with ${Math.round(similarPatterns.avg_completion_rate * 100)}% average completion rate.`
      );
      if (similarPatterns.common_strategies) {
        contextSections.push(`Common strategies: ${JSON.stringify(similarPatterns.common_strategies)}`);
      }
      contextSections.push('');
    }

    // Combine all sections
    const fullContext = contextSections.join('\n');
    const { text: finalContext, truncated } = truncateToTokenLimit(fullContext, maxTokens);
    const finalTokenCount = estimateTokens(finalContext);

    const response: RAGResponse = {
      context: finalContext,
      userSummary: contextSummary,
      relevantGoals: userContext.goals || [],
      relevantInsights: relevantInsights,
      knowledgeChunks: knowledgeChunks,
      similarPatterns: similarPatterns,
      tokenCount: finalTokenCount,
      truncated
    };

    console.log(`RAG response: ${finalTokenCount} tokens, truncated: ${truncated}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RAG function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});