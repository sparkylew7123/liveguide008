import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Simple test endpoint for RAG functions
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

    const url = new URL(req.url);
    const testType = url.searchParams.get('test') || 'all';
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let results: any = {};

    // Test user context summary
    if (testType === 'all' || testType === 'context') {
      console.log('Testing get_user_context_summary...');
      const { data: contextData, error: contextError } = await supabase
        .rpc('get_user_context_summary', {
          p_user_id: userId,
          days_back: 30
        });

      results.contextSummary = {
        data: contextData,
        error: contextError,
        success: !contextError
      };
    }

    // Test knowledge chunk search
    if (testType === 'all' || testType === 'knowledge') {
      console.log('Testing match_knowledge_chunks...');
      const testQuery = "learning goals and personal development";
      
      // Generate a simple embedding (mock for testing)
      const mockEmbedding = Array.from({ length: 1536 }, (_, i) => Math.random() - 0.5);
      
      const { data: chunkData, error: chunkError } = await supabase
        .rpc('match_knowledge_chunks', {
          query_embedding: `[${mockEmbedding.join(',')}]`,
          match_threshold: 0.3,
          match_count: 5
        });

      results.knowledgeSearch = {
        data: chunkData,
        error: chunkError,
        success: !chunkError,
        queryUsed: testQuery
      };
    }

    // Test similar goal patterns
    if (testType === 'all' || testType === 'patterns') {
      console.log('Testing find_similar_goal_patterns...');
      const mockEmbedding = Array.from({ length: 1536 }, (_, i) => Math.random() - 0.5);
      
      const { data: patternData, error: patternError } = await supabase
        .rpc('find_similar_goal_patterns', {
          target_embedding: `[${mockEmbedding.join(',')}]`,
          user_id_to_exclude: userId,
          similarity_threshold: 0.5,
          max_results: 3
        });

      results.similarPatterns = {
        data: patternData,
        error: patternError,
        success: !patternError
      };
    }

    // Test user goal search
    if (testType === 'all' || testType === 'goals') {
      console.log('Testing search_user_goals_semantic...');
      const mockEmbedding = Array.from({ length: 1536 }, (_, i) => Math.random() - 0.5);
      
      const { data: goalData, error: goalError } = await supabase
        .rpc('search_user_goals_semantic', {
          p_user_id: userId,
          query_embedding: `[${mockEmbedding.join(',')}]`,
          include_completed: false,
          similarity_threshold: 0.3,
          max_results: 5
        });

      results.goalSearch = {
        data: goalData,
        error: goalError,
        success: !goalError
      };
    }

    // Test insight search
    if (testType === 'all' || testType === 'insights') {
      console.log('Testing search_insights_semantic...');
      const mockEmbedding = Array.from({ length: 1536 }, (_, i) => Math.random() - 0.5);
      
      const { data: insightData, error: insightError } = await supabase
        .rpc('search_insights_semantic', {
          p_user_id: userId,
          query_embedding: `[${mockEmbedding.join(',')}]`,
          similarity_threshold: 0.3,
          max_results: 5
        });

      results.insightSearch = {
        data: insightData,
        error: insightError,
        success: !insightError
      };
    }

    // Test database connection
    if (testType === 'all' || testType === 'db') {
      console.log('Testing database connection...');
      const { data: dbTest, error: dbError } = await supabase
        .from('graph_nodes')
        .select('id, node_type, label')
        .eq('user_id', userId)
        .limit(3);

      results.databaseConnection = {
        data: dbTest,
        error: dbError,
        success: !dbError
      };
    }

    const summary = {
      userId,
      testType,
      timestamp: new Date().toISOString(),
      overallSuccess: Object.values(results).every((test: any) => test.success),
      results
    };

    console.log('Test results:', JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});