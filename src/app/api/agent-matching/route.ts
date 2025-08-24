import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AgentMatchingService, TriggerType } from '@/services/agent-matching.service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      trigger,
      include_context = true,
      max_agents = 3,
      min_score = 0.5
    } = body;

    // Validate trigger type
    const validTriggers: TriggerType[] = [
      'onboarding',
      'goal_change',
      'user_request',
      'milestone_achieved',
      'dormant_return'
    ];

    if (!trigger || !validTriggers.includes(trigger)) {
      return NextResponse.json(
        { 
          error: 'Invalid trigger type',
          valid_triggers: validTriggers
        },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    if (max_agents < 1 || max_agents > 10) {
      return NextResponse.json(
        { error: 'max_agents must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (min_score < 0 || min_score > 1) {
      return NextResponse.json(
        { error: 'min_score must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Create matching service and find agents using sophisticated algorithm
    const matchingService = new AgentMatchingService(supabase, user.id);
    const result = await matchingService.findMatchingAgents({
      trigger,
      includeContext: include_context,
      maxAgents: max_agents,
      minScore: min_score
    });

    // Also provide the simple interface format in the response
    const simpleResult = await matchingService.getMatchingAgents({
      trigger,
      maxAgents: max_agents
    });

    return NextResponse.json({
      success: true,
      data: result,
      simple_format: simpleResult, // Include the requested simple format
      metadata: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
        algorithm: 'sophisticated_goal_learning_context_scoring'
      }
    });

  } catch (error) {
    console.error('Agent matching API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to match agents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const matchingService = new AgentMatchingService(supabase, user.id);

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '20');
      const history = await matchingService.getMatchingHistory(limit);
      
      return NextResponse.json({
        success: true,
        data: {
          history,
          total: history.length
        }
      });
    }

    if (action === 'analytics') {
      const daysBack = parseInt(searchParams.get('days_back') || '30');
      const analytics = await matchingService.getAnalytics(daysBack);
      
      return NextResponse.json({
        success: true,
        data: analytics
      });
    }

    // Default: return available triggers and configuration
    return NextResponse.json({
      success: true,
      data: {
        available_triggers: [
          {
            type: 'onboarding',
            description: 'When user is new or completing onboarding',
            cooldown_hours: 0
          },
          {
            type: 'goal_change',
            description: 'When user adds, updates, or completes goals',
            cooldown_hours: 24
          },
          {
            type: 'user_request',
            description: 'When user explicitly requests agent matching',
            cooldown_hours: 0
          },
          {
            type: 'milestone_achieved',
            description: 'When user completes significant milestones',
            cooldown_hours: 12
          },
          {
            type: 'dormant_return',
            description: 'When inactive user returns to platform',
            cooldown_hours: 72
          }
        ],
        default_settings: {
          max_agents: 3,
          min_score: 0.5,
          include_context: true
        }
      }
    });

  } catch (error) {
    console.error('Agent matching GET API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve agent matching data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}