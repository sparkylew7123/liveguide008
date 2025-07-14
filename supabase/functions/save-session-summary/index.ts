import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface SessionSummaryRequest {
  session_id: string;
  user_id: string;
  agent_id: string;
  transcript: string;
  summary: string;
  duration_minutes?: number;
  metadata?: Record<string, any>;
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
    const { session_id, user_id, agent_id, transcript, summary } = requestData;
    if (!session_id || !user_id || !agent_id || !transcript || !summary) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: session_id, user_id, agent_id, transcript, summary' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving session summary for session:', session_id);

    // Update the conversation record with summary and transcript
    const { data: updateData, error: updateError } = await supabase
      .from('elevenlabs_conversations')
      .update({
        status: 'completed',
        duration_minutes: requestData.duration_minutes || null,
        metadata: {
          ...requestData.metadata,
          transcript: transcript,
          summary: summary,
          completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('agent_id', agent_id)
      .eq('metadata->session_id', session_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      
      // If no existing record found, create a new one
      if (updateError.code === 'PGRST116') {
        const { data: insertData, error: insertError } = await supabase
          .from('elevenlabs_conversations')
          .insert({
            user_id: user_id,
            agent_id: agent_id,
            status: 'completed',
            call_type: 'coaching_session',
            duration_minutes: requestData.duration_minutes || null,
            metadata: {
              session_id: session_id,
              transcript: transcript,
              summary: summary,
              completed_at: new Date().toISOString(),
              ...requestData.metadata
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting conversation:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to save session summary' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Session summary saved (new record created)',
            conversation_id: insertData.id
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to update session summary' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Extract key insights and goals from the conversation (optional enhancement)
    try {
      if (transcript && summary) {
        // Here you could add AI-powered analysis to extract:
        // - User goals mentioned in the conversation
        // - Action items or commitments
        // - Emotional insights
        // - Progress indicators
        
        // For now, we'll just log that this feature could be implemented
        console.log('Future enhancement: Extract insights from conversation');
      }
    } catch (insightError) {
      console.error('Error extracting insights (non-blocking):', insightError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session summary saved successfully',
        conversation_id: updateData.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-session-summary function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});