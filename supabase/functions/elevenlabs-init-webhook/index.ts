import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface InitWebhookRequest {
  conversation_id: string;
  agent_id: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Elevenlabs init webhook called');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: InitWebhookRequest = await req.json();
    const { conversation_id, agent_id, user_id, metadata } = body;

    console.log('Init webhook payload:', { conversation_id, agent_id, user_id });

    // Get user context for the conversation
    let userContext = {};
    
    if (user_id) {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user_id)
          .single();

        // Get recent goals
        const { data: recentGoals } = await supabase
          .from('graph_nodes')
          .select('label, description, properties')
          .eq('user_id', user_id)
          .eq('node_type', 'goal')
          .order('created_at', { ascending: false })
          .limit(3);

        // Get onboarding state
        const { data: questionnaire } = await supabase
          .from('user_questionnaire')
          .select('*')
          .eq('user_id', user_id)
          .single();

        userContext = {
          user_name: profile?.full_name || profile?.preferred_name || 'there',
          has_existing_goals: recentGoals && recentGoals.length > 0,
          recent_goals: recentGoals?.map(g => g.label) || [],
          onboarding_completed: !!questionnaire?.onboarding_completed_at,
          preferred_categories: questionnaire?.preferred_categories || [],
          learning_style: questionnaire?.learning_prefs || 'mixed',
          time_horizon: questionnaire?.time_horizon || 'medium',
        };
      } catch (error) {
        console.error('Error fetching user context:', error);
        // Continue with empty context rather than failing
      }
    }

    // Prepare context for the agent
    const agentContext = {
      conversation_id,
      user_context: userContext,
      session_type: metadata?.sessionType || 'voice_onboarding',
      timestamp: new Date().toISOString(),
      
      // Instructions for the agent based on user context
      instructions: generateContextualInstructions(userContext),
      
      // Override first message if we have user context
      first_message_override: generatePersonalizedGreeting(userContext),
    };

    console.log('Returning agent context:', agentContext);

    // Store conversation start event
    await supabase
      .from('elevenlabs_conversations')
      .upsert({
        conversation_id,
        agent_id,
        user_id: user_id || null,
        started_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          init_context: userContext,
        },
        status: 'active'
      });

    return new Response(
      JSON.stringify(agentContext),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Init webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to initialize conversation context',
        message: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateContextualInstructions(userContext: any): string {
  if (userContext.onboarding_completed) {
    return `User has completed onboarding previously. Focus on their existing goals: ${userContext.recent_goals?.join(', ')}. Help them progress or refine these goals.`;
  }
  
  if (userContext.has_existing_goals) {
    return `User has some existing goals but hasn't completed full onboarding. Their recent goals are: ${userContext.recent_goals?.join(', ')}. Build on these while completing their profile.`;
  }
  
  return 'New user starting fresh onboarding. Guide them through discovering their goals and preferences step by step.';
}

function generatePersonalizedGreeting(userContext: any): string {
  const name = userContext.user_name || 'there';
  
  if (userContext.onboarding_completed) {
    return `Hi ${name}! Welcome back. I see you have some goals we've been working on. Let's check in on your progress and see how I can help you today.`;
  }
  
  if (userContext.has_existing_goals) {
    return `Hi ${name}! I see you've mentioned some goals before: ${userContext.recent_goals?.slice(0, 2).join(' and ')}. Let's continue building your coaching profile and dive deeper into what you want to achieve.`;
  }
  
  return `Hello ${name}! I'm excited to help you discover and achieve your goals. Let's start by getting to know what you'd like to work on. What brings you here today?`;
}