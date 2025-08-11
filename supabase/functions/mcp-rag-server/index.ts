import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// MCP Protocol types
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Available MCP tools for RAG operations
const MCP_TOOLS: MCPTool[] = [
  {
    name: "searchUserGoals",
    description: "Search user's goals using text or semantic matching",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID to search goals for" },
        query: { type: "string", description: "Search query for goals" },
        searchType: { 
          type: "string", 
          enum: ["text", "semantic"], 
          description: "Type of search to perform",
          default: "semantic"
        },
        limit: { type: "number", description: "Maximum results to return", default: 10 },
        includeCompleted: { type: "boolean", description: "Include completed goals", default: false }
      },
      required: ["userId", "query"]
    }
  },
  {
    name: "getSimilarJourneys",
    description: "Find patterns from users with similar goals (anonymized)",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID requesting similar patterns" },
        goalQuery: { type: "string", description: "Goal description to find similar patterns for" },
        minSimilarity: { type: "number", description: "Minimum similarity threshold", default: 0.7 },
        maxResults: { type: "number", description: "Maximum patterns to return", default: 5 }
      },
      required: ["userId", "goalQuery"]
    }
  },
  {
    name: "getRelevantInsights",
    description: "Retrieve insights based on topic embedding similarity",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID to search insights for" },
        topic: { type: "string", description: "Topic to find insights about" },
        insightTypes: { 
          type: "array", 
          items: { type: "string", enum: ["skill", "accomplishment", "emotion"] },
          description: "Types of insights to include",
          default: ["skill", "accomplishment", "emotion"]
        },
        limit: { type: "number", description: "Maximum results to return", default: 15 },
        minSimilarity: { type: "number", description: "Minimum similarity threshold", default: 0.6 }
      },
      required: ["userId", "topic"]
    }
  },
  {
    name: "getUserContextSummary",
    description: "Get comprehensive user context summary for conversation",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID to get context for" },
        daysBack: { type: "number", description: "Days of history to include", default: 30 }
      },
      required: ["userId"]
    }
  },
  {
    name: "searchKnowledgeBase",
    description: "Search knowledge base chunks semantically",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for knowledge base" },
        limit: { type: "number", description: "Maximum chunks to return", default: 8 },
        minSimilarity: { type: "number", description: "Minimum similarity threshold", default: 0.5 }
      },
      required: ["query"]
    }
  }
];

// Generate embedding for queries
async function generateEmbedding(text: string): Promise<number[]> {
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
      input: text,
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

// Tool implementations
async function searchUserGoals(supabase: any, params: any) {
  const { userId, query, searchType = "semantic", limit = 10, includeCompleted = false } = params;
  
  if (searchType === "semantic") {
    const embedding = await generateEmbedding(query);
    
    const { data, error } = await supabase
      .rpc('search_user_goals_semantic', {
        p_user_id: userId,
        query_embedding: `[${embedding.join(',')}]`,
        include_completed: includeCompleted,
        similarity_threshold: 0.6,
        max_results: limit
      });
    
    if (error) throw error;
    return data || [];
  } else {
    // Text search
    let dbQuery = supabase
      .from('graph_nodes')
      .select('id, label, description, properties, created_at, updated_at')
      .eq('user_id', userId)
      .eq('node_type', 'goal')
      .is('deleted_at', null)
      .or(`label.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);
    
    if (!includeCompleted) {
      dbQuery = dbQuery.neq('properties->status', 'completed');
    }
    
    const { data, error } = await dbQuery;
    if (error) throw error;
    return data || [];
  }
}

async function getSimilarJourneys(supabase: any, params: any) {
  const { userId, goalQuery, minSimilarity = 0.7, maxResults = 5 } = params;
  
  const embedding = await generateEmbedding(goalQuery);
  
  const { data, error } = await supabase
    .rpc('find_similar_goal_patterns', {
      target_embedding: `[${embedding.join(',')}]`,
      user_id_to_exclude: userId,
      similarity_threshold: minSimilarity,
      max_results: maxResults
    });
  
  if (error) throw error;
  return data || [];
}

async function getRelevantInsights(supabase: any, params: any) {
  const { 
    userId, 
    topic, 
    insightTypes = ["skill", "accomplishment", "emotion"], 
    limit = 15, 
    minSimilarity = 0.6 
  } = params;
  
  const embedding = await generateEmbedding(topic);
  
  const { data, error } = await supabase
    .rpc('search_insights_semantic', {
      p_user_id: userId,
      query_embedding: `[${embedding.join(',')}]`,
      similarity_threshold: minSimilarity,
      max_results: limit
    });
  
  if (error) throw error;
  
  // Filter by insight types
  const filteredData = (data || []).filter((insight: any) => 
    insightTypes.includes(insight.node_type || insight.type)
  );
  
  return filteredData;
}

async function getUserContextSummary(supabase: any, params: any) {
  const { userId, daysBack = 30 } = params;
  
  const { data, error } = await supabase
    .rpc('get_user_context_summary', {
      p_user_id: userId,
      days_back: daysBack
    });
  
  if (error) throw error;
  return data?.[0] || {
    active_goals: [],
    recent_insights: [],
    context_summary: 'No recent activity found.',
    total_nodes: 0
  };
}

async function searchKnowledgeBase(supabase: any, params: any) {
  const { query, limit = 8, minSimilarity = 0.5 } = params;
  
  const embedding = await generateEmbedding(query);
  
  const { data, error } = await supabase
    .rpc('match_knowledge_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: minSimilarity,
      match_count: limit
    });
  
  if (error) throw error;
  
  return (data || []).map((chunk: any) => ({
    id: chunk.id,
    content: chunk.content,
    metadata: chunk.metadata,
    document_title: chunk.document_title,
    document_type: chunk.document_type,
    similarity: chunk.similarity
  }));
}

// Handle MCP requests
async function handleMCPRequest(supabase: any, request: MCPRequest): Promise<MCPResponse> {
  try {
    switch (request.method) {
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: MCP_TOOLS }
        };

      case "tools/call":
        const { name, arguments: args } = request.params;
        let result;

        switch (name) {
          case "searchUserGoals":
            result = await searchUserGoals(supabase, args);
            break;
          case "getSimilarJourneys":
            result = await getSimilarJourneys(supabase, args);
            break;
          case "getRelevantInsights":
            result = await getRelevantInsights(supabase, args);
            break;
          case "getUserContextSummary":
            result = await getUserContextSummary(supabase, args);
            break;
          case "searchKnowledgeBase":
            result = await searchKnowledgeBase(supabase, args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
        };

      case "initialize":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "maya-rag-server",
              version: "1.0.0"
            }
          }
        };

      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
  } catch (error) {
    console.error('MCP request error:', error);
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message
      }
    };
  }
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

    // Handle different request types
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle Server-Sent Events for MCP streaming
    if (req.headers.get('accept') === 'text/event-stream') {
      const stream = new ReadableStream({
        start(controller) {
          // Send initial connection event
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({
              type: 'connection',
              status: 'connected',
              serverInfo: {
                name: 'maya-rag-server',
                version: '1.0.0'
              }
            })}\n\n`)
          );
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Handle JSON-RPC requests
    if (req.method === 'POST') {
      const mcpRequest: MCPRequest = await req.json();
      console.log('MCP Request:', JSON.stringify(mcpRequest, null, 2));
      
      const response = await handleMCPRequest(supabase, mcpRequest);
      console.log('MCP Response:', JSON.stringify(response, null, 2));
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle GET requests - return server info
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        name: "Maya RAG Server",
        version: "1.0.0",
        description: "MCP server for Maya's RAG operations in LiveGuide",
        tools: MCP_TOOLS.map(tool => ({ name: tool.name, description: tool.description }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('MCP RAG server error:', error);
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