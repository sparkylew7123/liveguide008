import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Tool invocation cache for rate limiting
const toolInvocationCache = new Map<string, { count: number; lastInvocation: number; cooldownUntil?: number }>();
const TOOL_RATE_LIMITS = {
  check_recommendation_eligibility: { maxPerHour: 20, cooldownMinutes: 1 },
  recommend_specialist_agent: { maxPerHour: 10, cooldownMinutes: 30 },
  prepare_handoff_context: { maxPerHour: 5, cooldownMinutes: 0 },
  update_user_interface: { maxPerHour: 100, cooldownMinutes: 0 },
  log_tool_invocation: { maxPerHour: 200, cooldownMinutes: 0 }
};

interface ToolInvocation {
  tool_name: string;
  parameters: any;
  user_id: string;
  session_id: string;
  conversation_id: string;
  timestamp: string;
}

interface RecommendationContext {
  primary_goals: string[];
  current_phase: string;
  last_recommendation_timestamp?: string;
  conversation_depth: number;
}

interface HandoffContext {
  conversation_summary: string;
  key_insights: string[];
  goals_status: Record<string, any>;
  emotional_journey: any[];
  next_steps: string[];
  conversation_metadata: {
    duration_minutes: number;
    topics_covered: string[];
    breakthrough_moments: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const toolInvocation: ToolInvocation = await request.json();
    
    // Validate tool invocation structure
    if (!toolInvocation.tool_name || !toolInvocation.user_id) {
      return new NextResponse('Invalid tool invocation', { status: 400 });
    }

    // Check rate limits
    const rateLimitResult = checkRateLimit(toolInvocation.tool_name, toolInvocation.user_id);
    if (!rateLimitResult.allowed) {
      return streamResponse({
        type: 'error',
        error: 'Rate limit exceeded',
        retry_after: rateLimitResult.retryAfter
      });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await processToolInvocation(toolInvocation, supabase);
          
          // Stream the result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
          
          // Log successful invocation
          await logToolInvocation(toolInvocation, 'success', supabase);
          
        } catch (error) {
          console.error('Tool invocation error:', error);
          
          const errorResult = {
            type: 'error',
            tool_name: toolInvocation.tool_name,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`));
          
          // Log failed invocation
          await logToolInvocation(toolInvocation, 'error', supabase);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Client tools stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function checkRateLimit(toolName: string, userId: string): { allowed: boolean; retryAfter?: number } {
  const key = `${toolName}:${userId}`;
  const now = Date.now();
  const limits = TOOL_RATE_LIMITS[toolName as keyof typeof TOOL_RATE_LIMITS];
  
  if (!limits) {
    return { allowed: true };
  }

  const cached = toolInvocationCache.get(key);
  
  // Check cooldown
  if (cached?.cooldownUntil && now < cached.cooldownUntil) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((cached.cooldownUntil - now) / 1000) 
    };
  }
  
  // Reset hourly counter
  if (!cached || (now - cached.lastInvocation) > 3600000) {
    toolInvocationCache.set(key, { 
      count: 1, 
      lastInvocation: now,
      cooldownUntil: limits.cooldownMinutes > 0 ? now + (limits.cooldownMinutes * 60000) : undefined
    });
    return { allowed: true };
  }
  
  // Check hourly limit
  if (cached.count >= limits.maxPerHour) {
    return { allowed: false, retryAfter: 3600 };
  }
  
  // Update counter
  toolInvocationCache.set(key, { 
    ...cached,
    count: cached.count + 1,
    lastInvocation: now,
    cooldownUntil: limits.cooldownMinutes > 0 ? now + (limits.cooldownMinutes * 60000) : undefined
  });
  
  return { allowed: true };
}

async function processToolInvocation(invocation: ToolInvocation, supabase: any) {
  const { tool_name, parameters } = invocation;
  
  switch (tool_name) {
    case 'check_recommendation_eligibility':
      return await checkRecommendationEligibility(parameters, supabase);
      
    case 'recommend_specialist_agent':
      return await recommendSpecialistAgent(parameters, supabase);
      
    case 'prepare_handoff_context':
      return await prepareHandoffContext(parameters, supabase);
      
    case 'update_user_interface':
      return await updateUserInterface(parameters, supabase);
      
    case 'log_tool_invocation':
      return await logToolInvocation(invocation, 'success', supabase);
      
    default:
      throw new Error(`Unknown tool: ${tool_name}`);
  }
}

async function checkRecommendationEligibility(
  params: { trigger_event: string; user_id: string; current_context: RecommendationContext },
  supabase: any
) {
  const { trigger_event, user_id, current_context } = params;
  
  // Check if trigger event is allowed
  const allowedTriggers = ['onboarding_complete', 'new_goal_created', 'goal_status_changed', 'context_shift_detected'];
  if (!allowedTriggers.includes(trigger_event)) {
    return {
      type: 'eligibility_check',
      eligible: false,
      reason: 'Invalid trigger event',
      timestamp: new Date().toISOString()
    };
  }
  
  // Check cooldown period
  if (current_context.last_recommendation_timestamp) {
    const lastRecommendation = new Date(current_context.last_recommendation_timestamp);
    const cooldownPeriod = 30 * 60 * 1000; // 30 minutes
    if (Date.now() - lastRecommendation.getTime() < cooldownPeriod) {
      return {
        type: 'eligibility_check',
        eligible: false,
        reason: 'Cooldown period active',
        retry_after: new Date(lastRecommendation.getTime() + cooldownPeriod).toISOString()
      };
    }
  }
  
  // Check conversation depth
  if (current_context.conversation_depth < 10) {
    return {
      type: 'eligibility_check',
      eligible: false,
      reason: 'Insufficient conversation depth',
      required_depth: 10,
      current_depth: current_context.conversation_depth
    };
  }
  
  // Check daily recommendation limit
  const { data: todayRecommendations } = await supabase
    .from('agent_recommendations')
    .select('id')
    .eq('user_id', user_id)
    .gte('created_at', new Date().toISOString().split('T')[0]);
    
  if (todayRecommendations && todayRecommendations.length >= 5) {
    return {
      type: 'eligibility_check',
      eligible: false,
      reason: 'Daily recommendation limit reached',
      limit: 5,
      current: todayRecommendations.length
    };
  }
  
  return {
    type: 'eligibility_check',
    eligible: true,
    trigger_event,
    context: current_context,
    timestamp: new Date().toISOString()
  };
}

async function recommendSpecialistAgent(
  params: { recommendation_context: any; eligibility_validated: boolean },
  supabase: any
) {
  if (!params.eligibility_validated) {
    throw new Error('Eligibility must be validated before recommending agent');
  }
  
  const { user_goals, conversation_insights, complexity_level } = params.recommendation_context;
  
  // Simple agent matching logic based on goals
  const agentMap: Record<string, string> = {
    'career': 'career_coach_agent_id',
    'health': 'wellness_coach_agent_id', 
    'relationship': 'relationship_coach_agent_id',
    'finance': 'financial_advisor_agent_id',
    'productivity': 'productivity_coach_agent_id'
  };
  
  let recommendedAgent = 'general_coach_agent_id';
  for (const goal of user_goals) {
    for (const [domain, agentId] of Object.entries(agentMap)) {
      if (goal.toLowerCase().includes(domain)) {
        recommendedAgent = agentId;
        break;
      }
    }
  }
  
  return {
    type: 'agent_recommendation',
    recommended_agent_id: recommendedAgent,
    recommendation_context: params.recommendation_context,
    confidence_score: 0.8,
    reasoning: `Based on your goals: ${user_goals.join(', ')}`,
    timestamp: new Date().toISOString()
  };
}

async function prepareHandoffContext(
  params: { target_agent_id: string; handoff_reason: string; context_package: HandoffContext },
  supabase: any
) {
  const { target_agent_id, handoff_reason, context_package } = params;
  
  // Validate required context fields
  if (!context_package.conversation_summary || !context_package.goals_status) {
    throw new Error('Required context fields missing');
  }
  
  // Create handoff record
  const { data: handoffRecord, error } = await supabase
    .from('agent_handoffs')
    .insert({
      target_agent_id,
      handoff_reason,
      context_package,
      status: 'prepared',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create handoff record: ${error.message}`);
  }
  
  return {
    type: 'handoff_prepared',
    handoff_id: handoffRecord.id,
    target_agent_id,
    context_package,
    estimated_handoff_time: '2-3 seconds',
    timestamp: new Date().toISOString()
  };
}

async function updateUserInterface(
  params: { update_type: string; data: any; session_id: string },
  supabase: any
) {
  const { update_type, data, session_id } = params;
  
  // Validate update type
  const validUpdateTypes = ['goal_progress', 'insight_created', 'recommendation_available', 'handoff_ready'];
  if (!validUpdateTypes.includes(update_type)) {
    throw new Error(`Invalid update type: ${update_type}`);
  }
  
  return {
    type: 'ui_update',
    update_type,
    data,
    session_id,
    timestamp: new Date().toISOString()
  };
}

async function logToolInvocation(invocation: ToolInvocation, status: string, supabase: any) {
  const logEntry = {
    tool_name: invocation.tool_name,
    user_id: invocation.user_id,
    session_id: invocation.session_id,
    conversation_id: invocation.conversation_id,
    parameters_hash: hashObject(invocation.parameters),
    status,
    timestamp: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('client_tool_logs')
    .insert(logEntry);
    
  if (error) {
    console.error('Failed to log tool invocation:', error);
  }
  
  return {
    type: 'log_entry',
    logged: !error,
    timestamp: new Date().toISOString()
  };
}

function hashObject(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 32);
}

function streamResponse(data: any) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}