import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// This webhook is called by ElevenLabs before starting a conversation
// It provides user context and RAG data to personalize Maya's responses

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if provided
    const webhookSecret = request.headers.get('X-Webhook-Secret');
    const expectedSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { userId, conversationId, agentId } = body;

    console.log('ElevenLabs Init Webhook:', {
      userId,
      conversationId,
      agentId,
      timestamp: new Date().toISOString()
    });

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Default response for unauthenticated users
    let userContext = {
      userId: userId || 'anonymous',
      userName: 'Guest User',
      userState: 'first_time' as 'first_time' | 'returning' | 'active',
      goals: [],
      insights: [],
      knowledgeContext: ''
    };

    // If we have a userId, fetch their context
    if (userId && userId !== 'anonymous') {
      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          userContext.userName = profile.full_name || profile.email?.split('@')[0] || 'User';
          
          // Determine user state based on profile age and activity
          const accountAge = Date.now() - new Date(profile.created_at).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          
          if (accountAge < oneDayMs) {
            userContext.userState = 'first_time';
          } else if (profile.updated_at && 
                     Date.now() - new Date(profile.updated_at).getTime() < 7 * oneDayMs) {
            userContext.userState = 'active';
          } else {
            userContext.userState = 'returning';
          }
        }

        // Fetch user's recent goals
        const { data: goals } = await supabase
          .from('graph_nodes')
          .select('id, label, description, created_at')
          .eq('user_id', userId)
          .eq('node_type', 'goal')
          .order('created_at', { ascending: false })
          .limit(5);

        if (goals) {
          userContext.goals = goals;
        }

        // Fetch user's recent insights
        const { data: insights } = await supabase
          .from('graph_nodes')
          .select('id, label, description, created_at')
          .eq('user_id', userId)
          .eq('node_type', 'insight')
          .order('created_at', { ascending: false })
          .limit(10);

        if (insights) {
          userContext.insights = insights;
        }

        // Call the agent-rag edge function for full RAG context
        const ragResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-rag`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              query: 'initial conversation context',
              agentId: agentId || 'maya',
              conversationId
            })
          }
        );

        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          userContext.knowledgeContext = ragData.context || '';
        }
      } catch (error) {
        console.error('Error fetching user context:', error);
        // Continue with default context if there's an error
      }
    }

    // Format the response for ElevenLabs
    const response = {
      success: true,
      customVariables: {
        userId: userContext.userId,
        userName: userContext.userName,
        userState: userContext.userState,
        currentGoals: userContext.goals.slice(0, 3).map(g => g.label).join(', '),
        hasGoals: userContext.goals.length > 0 ? 'true' : 'false',
        goalCount: userContext.goals.length.toString(),
        insightCount: userContext.insights.length.toString(),
        knowledgeContext: userContext.knowledgeContext.substring(0, 50000) // Ensure 50k char limit
      },
      metadata: {
        timestamp: new Date().toISOString(),
        conversationId,
        agentId
      }
    };

    console.log('Sending context to ElevenLabs:', {
      userId: response.customVariables.userId,
      userName: response.customVariables.userName,
      userState: response.customVariables.userState,
      goalCount: response.customVariables.goalCount,
      contextLength: response.customVariables.knowledgeContext.length
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Return a valid response even on error to not break the conversation
    return NextResponse.json({
      success: false,
      customVariables: {
        userId: 'anonymous',
        userName: 'Guest User',
        userState: 'first_time',
        currentGoals: '',
        hasGoals: 'false',
        goalCount: '0',
        insightCount: '0',
        knowledgeContext: ''
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    },
  });
}