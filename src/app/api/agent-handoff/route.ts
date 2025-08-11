import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AgentHandoffService, HandoffType } from '@/services/agent-handoff.service';

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
      action,
      from_agent_id,
      to_agent_id,
      handoff_type,
      conversation_context = {},
      session_data = {},
      immediate = false,
      notify_user = true,
      transfer_full_history = true,
      handoff_id,
      success,
      failure_reason
    } = body;

    const handoffService = new AgentHandoffService(supabase, user.id);

    // Handle different actions
    if (action === 'initiate') {
      // Validate required fields
      if (!to_agent_id || !handoff_type) {
        return NextResponse.json(
          { 
            error: 'Missing required fields',
            required: ['to_agent_id', 'handoff_type']
          },
          { status: 400 }
        );
      }

      // Validate handoff type
      const validHandoffTypes: HandoffType[] = ['user_requested', 'system_recommended', 'agent_suggested'];
      if (!validHandoffTypes.includes(handoff_type)) {
        return NextResponse.json(
          { 
            error: 'Invalid handoff type',
            valid_types: validHandoffTypes
          },
          { status: 400 }
        );
      }

      // Initiate the handoff
      const result = await handoffService.initiateHandoff(
        from_agent_id,
        to_agent_id,
        {
          handoff_type,
          conversation_context,
          session_data,
          immediate,
          notify_user,
          transfer_full_history
        }
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Handoff initiated successfully'
      });
    }

    if (action === 'complete') {
      if (!handoff_id) {
        return NextResponse.json(
          { error: 'handoff_id is required for completion' },
          { status: 400 }
        );
      }

      const completed = await handoffService.completeHandoff(
        handoff_id,
        success !== false, // Default to true unless explicitly false
        failure_reason
      );

      return NextResponse.json({
        success: true,
        data: {
          completed,
          handoff_id
        },
        message: completed ? 'Handoff completed successfully' : 'Failed to complete handoff'
      });
    }

    if (action === 'cancel') {
      if (!handoff_id) {
        return NextResponse.json(
          { error: 'handoff_id is required for cancellation' },
          { status: 400 }
        );
      }

      const cancelled = await handoffService.cancelHandoff(handoff_id, failure_reason);

      return NextResponse.json({
        success: true,
        data: {
          cancelled,
          handoff_id
        },
        message: cancelled ? 'Handoff cancelled successfully' : 'Failed to cancel handoff'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: initiate, complete, or cancel' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Agent handoff API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process handoff request',
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
    const handoffId = searchParams.get('handoff_id');

    const handoffService = new AgentHandoffService(supabase, user.id);

    if (action === 'active') {
      const activeHandoffs = await handoffService.getActiveHandoffs();
      
      return NextResponse.json({
        success: true,
        data: {
          active_handoffs: activeHandoffs,
          count: activeHandoffs.length
        }
      });
    }

    if (action === 'history') {
      const limit = parseInt(searchParams.get('limit') || '20');
      const history = await handoffService.getHandoffHistory(limit);
      
      return NextResponse.json({
        success: true,
        data: {
          history,
          total: history.length
        }
      });
    }

    if (action === 'context' && handoffId) {
      const context = await handoffService.getHandoffContext(handoffId);
      
      if (!context) {
        return NextResponse.json(
          { error: 'Handoff not found or context not available' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: context
      });
    }

    if (action === 'status' && handoffId) {
      // Get specific handoff status
      const { data: handoff, error } = await supabase
        .from('agent_handoffs')
        .select('id, status, created_at, completed_at, handoff_type, from_agent_id, to_agent_id')
        .eq('id', handoffId)
        .eq('user_id', user.id)
        .single();

      if (error || !handoff) {
        return NextResponse.json(
          { error: 'Handoff not found' },
          { status: 404 }
        );
      }

      // Get agent names for display
      const agentIds = [handoff.from_agent_id, handoff.to_agent_id].filter(Boolean);
      const { data: agents } = await supabase
        .from('agent_personae')
        .select('uuid, "Name"')
        .in('uuid', agentIds);

      const agentNames: Record<string, string> = {};
      agents?.forEach(agent => {
        agentNames[agent.uuid] = agent.Name;
      });

      return NextResponse.json({
        success: true,
        data: {
          ...handoff,
          from_agent_name: handoff.from_agent_id ? agentNames[handoff.from_agent_id] : null,
          to_agent_name: agentNames[handoff.to_agent_id],
          duration_seconds: handoff.completed_at 
            ? Math.floor((new Date(handoff.completed_at).getTime() - new Date(handoff.created_at).getTime()) / 1000)
            : null
        }
      });
    }

    // Default: return handoff configuration and options
    return NextResponse.json({
      success: true,
      data: {
        handoff_types: [
          {
            type: 'user_requested',
            description: 'User explicitly requested to switch agents'
          },
          {
            type: 'system_recommended',
            description: 'System recommended handoff based on context'
          },
          {
            type: 'agent_suggested',
            description: 'Current agent suggested handoff to specialist'
          }
        ],
        default_options: {
          immediate: false,
          notify_user: true,
          transfer_full_history: true
        },
        available_actions: [
          'initiate',
          'complete',
          'cancel'
        ],
        query_actions: [
          'active',
          'history',
          'context',
          'status'
        ]
      }
    });

  } catch (error) {
    console.error('Agent handoff GET API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve handoff data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
      handoff_id,
      status,
      context_updates,
      session_updates
    } = body;

    if (!handoff_id) {
      return NextResponse.json(
        { error: 'handoff_id is required' },
        { status: 400 }
      );
    }

    // Update handoff record
    const updates: any = {};
    
    if (status) {
      const validStatuses = ['initiated', 'in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status', valid_statuses: validStatuses },
          { status: 400 }
        );
      }
      updates.status = status;
      
      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (context_updates) {
      // Merge context updates
      const { data: currentHandoff } = await supabase
        .from('agent_handoffs')
        .select('conversation_context')
        .eq('id', handoff_id)
        .eq('user_id', user.id)
        .single();

      if (currentHandoff) {
        updates.conversation_context = {
          ...currentHandoff.conversation_context,
          ...context_updates
        };
      }
    }

    if (session_updates) {
      // Merge session updates
      const { data: currentHandoff } = await supabase
        .from('agent_handoffs')
        .select('session_transfer_data')
        .eq('id', handoff_id)
        .eq('user_id', user.id)
        .single();

      if (currentHandoff) {
        updates.session_transfer_data = {
          ...currentHandoff.session_transfer_data,
          ...session_updates
        };
      }
    }

    const { data: updatedHandoff, error } = await supabase
      .from('agent_handoffs')
      .update(updates)
      .eq('id', handoff_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update handoff: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedHandoff,
      message: 'Handoff updated successfully'
    });

  } catch (error) {
    console.error('Agent handoff PUT API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update handoff',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}