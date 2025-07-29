import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

interface SessionSummaryRequest {
  session_id?: string;
  user_id: string;
  agent_id?: string;
  goal_id: string;
  transcript: string;
  summary?: string;
  duration_minutes?: number;
  metadata?: Record<string, any>;
}

interface OpenAIResponse {
  summary: string;
  action_items: string[];
}

async function generateSummaryAndActionItems(transcript: string): Promise<OpenAIResponse> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze this coaching conversation transcript and provide:
1. A concise summary (2-3 sentences) of what was discussed and accomplished
2. A list of specific action items or accomplishments from the session

Transcript:
${transcript}

Respond in JSON format:
{
  "summary": "Brief summary here",
  "action_items": ["Action item 1", "Action item 2", ...]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing coaching conversations and extracting key insights and action items. Focus on concrete accomplishments and next steps.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const requestData: SessionSummaryRequest = await req.json();

    // Validate required fields
    const { user_id, goal_id, transcript } = requestData;
    if (!user_id || !goal_id || !transcript) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: user_id, goal_id, transcript' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let { summary } = requestData;
    let actionItems: string[] = [];

    // Generate summary and action items if not provided
    if (!summary) {
      console.log('Generating summary and action items with OpenAI');
      try {
        const aiResponse = await generateSummaryAndActionItems(transcript);
        summary = aiResponse.summary;
        actionItems = aiResponse.action_items;
      } catch (error) {
        console.error('Error generating summary:', error);
        // Fallback to a basic summary
        summary = 'Session completed successfully';
        actionItems = [];
      }
    }

    console.log('Creating graph nodes for session');

    // Create session node using the updated function
    const { data: sessionNode, error: sessionError } = await supabase.rpc(
      'create_session_node',
      {
        p_user_id: user_id,
        p_goal_id: goal_id,
        p_duration: requestData.duration_minutes || 30,
        p_summary: summary,
        p_properties: {
          agent_id: requestData.agent_id || 'default',
          session_id: requestData.session_id,
          transcript_stored: true
        }
      }
    );

    if (sessionError) {
      console.error('Error creating session node:', sessionError);
      throw new Error('Failed to create session node');
    }

    const sessionNodeId = sessionNode;
    console.log('Created session node:', sessionNodeId);

    // Create accomplishment nodes for each action item
    const accomplishmentIds: string[] = [];
    for (const actionItem of actionItems) {
      const { data: accomplishmentNode, error: accomplishmentError } = await supabase
        .from('graph_nodes')
        .insert({
          user_id: user_id,
          node_type: 'accomplishment',
          label: actionItem,
          description: `Action item from coaching session`,
          properties: {
            completed: false,
            from_session: sessionNodeId,
            created_from_ai: true
          }
        })
        .select('id')
        .single();

      if (accomplishmentError) {
        console.error('Error creating accomplishment node:', accomplishmentError);
        continue;
      }

      accomplishmentIds.push(accomplishmentNode.id);

      // Create edge from accomplishment to session
      const { error: edgeError } = await supabase
        .from('graph_edges')
        .insert({
          user_id: user_id,
          edge_type: 'derived_from',
          source_node_id: accomplishmentNode.id,
          target_node_id: sessionNodeId,
          properties: {
            created_at: new Date().toISOString()
          }
        });

      if (edgeError) {
        console.error('Error creating edge:', edgeError);
      }
    }

    // Update session node properties with summary and accomplishments
    const { error: updateSessionError } = await supabase
      .from('graph_nodes')
      .update({
        properties: {
          agent_id: requestData.agent_id || 'default',
          duration_minutes: requestData.duration_minutes || 30,
          completed: true,
          summary: summary,
          transcript_stored: true,
          accomplishment_count: accomplishmentIds.length,
          accomplishment_ids: accomplishmentIds
        }
      })
      .eq('id', sessionNodeId);

    if (updateSessionError) {
      console.error('Error updating session node:', updateSessionError);
    }

    // Save to elevenlabs_conversations table if session_id is provided
    if (requestData.session_id && requestData.agent_id) {
      const { error: conversationError } = await supabase
        .from('elevenlabs_conversations')
        .upsert({
          user_id: user_id,
          agent_id: requestData.agent_id,
          status: 'completed',
          call_type: 'coaching_session',
          duration_minutes: requestData.duration_minutes || null,
          metadata: {
            session_id: requestData.session_id,
            transcript: transcript,
            summary: summary,
            goal_id: goal_id,
            session_node_id: sessionNodeId,
            accomplishment_ids: accomplishmentIds,
            completed_at: new Date().toISOString(),
            ...requestData.metadata
          },
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,agent_id,metadata->session_id'
        });

      if (conversationError) {
        console.error('Error saving to conversations table:', conversationError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session summary saved successfully',
        data: {
          session_node_id: sessionNodeId,
          summary: summary,
          accomplishments: actionItems,
          accomplishment_ids: accomplishmentIds
        }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Error in save-session-summary function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});