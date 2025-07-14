import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface UserGoalsRequest {
  user_id: string;
  include_preferences?: boolean;
  include_recent_sessions?: boolean;
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    let requestData: UserGoalsRequest;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const user_id = url.searchParams.get('user_id');
      
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      requestData = {
        user_id,
        include_preferences: url.searchParams.get('include_preferences') === 'true',
        include_recent_sessions: url.searchParams.get('include_recent_sessions') === 'true'
      };
    } else if (req.method === 'POST') {
      requestData = await req.json();
    } else {
      return new Response('Method not allowed', { status: 405 });
    }

    const { user_id, include_preferences = true, include_recent_sessions = false } = requestData;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching user goals for user:', user_id);

    // Fetch user goals
    const { data: goals, error: goalsError } = await supabase
      .from('user_goals')
      .select(`
        id,
        goal_title,
        goal_description,
        goal_status,
        target_date,
        milestones,
        metadata,
        created_at,
        updated_at,
        category_id,
        goal_categories (
          title,
          display_color,
          icon_name
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user goals' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result: any = {
      user_id,
      goals: goals || [],
      goals_count: goals?.length || 0
    };

    // Include user preferences if requested
    if (include_preferences) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferences, full_name, avatar_url')
        .eq('id', user_id)
        .single();

      if (profileError) {
        console.warn('Could not fetch user profile:', profileError);
        result.preferences = null;
      } else {
        result.preferences = profile?.preferences || {};
        result.user_info = {
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url
        };
      }
    }

    // Include recent coaching sessions if requested
    if (include_recent_sessions) {
      const { data: recentSessions, error: sessionsError } = await supabase
        .from('elevenlabs_conversations')
        .select(`
          id,
          agent_id,
          status,
          call_type,
          duration_minutes,
          created_at,
          metadata
        `)
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (sessionsError) {
        console.warn('Could not fetch recent sessions:', sessionsError);
        result.recent_sessions = [];
      } else {
        result.recent_sessions = recentSessions || [];
      }
    }

    // Generate coaching context summary
    const activeGoals = goals?.filter(goal => 
      goal.goal_status === 'active' || goal.goal_status === 'in_progress'
    ) || [];

    const coachingContext = {
      active_goals_count: activeGoals.length,
      primary_focus_areas: activeGoals.map(goal => ({
        title: goal.goal_title,
        category: goal.goal_categories?.title || 'General',
        status: goal.goal_status,
        description: goal.goal_description
      })),
      coaching_summary: generateCoachingSummary(activeGoals, result.preferences)
    };

    result.coaching_context = coachingContext;

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // Cache for 5 minutes
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-user-goals function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateCoachingSummary(goals: any[], preferences: any): string {
  if (!goals || goals.length === 0) {
    return "New coaching client with no active goals set. Focus on goal discovery and initial assessment.";
  }

  const goalCategories = goals.map(g => g.goal_categories?.title).filter(Boolean);
  const uniqueCategories = [...new Set(goalCategories)];
  
  const preferenceText = preferences?.communication_style 
    ? ` Preferred communication style: ${preferences.communication_style}.`
    : '';

  return `Client has ${goals.length} active goal(s) focusing on: ${uniqueCategories.join(', ') || 'general development'}.${preferenceText} Tailor coaching approach to support these specific objectives.`;
}