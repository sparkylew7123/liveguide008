import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// This webhook is called by ElevenLabs after a conversation ends
// It processes the conversation data and updates the knowledge graph

interface Goal {
  text: string;
  timeframe?: string;
  title?: string;
  confidence?: string;
}

interface Insight {
  text: string;
  category?: string;
  title?: string;
}

interface ConversationAnalysis {
  summary?: string;
  goals?: Goal[];
  insights?: Insight[];
  obstacles?: string[];
  emotional_state?: string;
  next_steps?: string[];
  session_quality?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
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
    const {
      conversationId,
      userId,
      agentId,
      transcript,
      analysis,
      duration,
      startTime,
      endTime
    } = body;

    console.log('ElevenLabs Post Webhook:', {
      conversationId,
      userId,
      agentId,
      duration,
      timestamp: new Date().toISOString()
    });

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Skip processing for anonymous users
    if (!userId || userId === 'anonymous') {
      console.log('Skipping graph update for anonymous user');
      return NextResponse.json({
        success: true,
        message: 'Anonymous conversation - no data saved'
      });
    }

    // Process the conversation analysis
    const conversationAnalysis = analysis as ConversationAnalysis;
    
    // Create a session node for this conversation
    const sessionLabel = `Conversation with Maya - ${new Date().toLocaleString()}`;
    const { data: sessionNode, error: sessionError } = await supabase
      .from('graph_nodes')
      .insert({
        user_id: userId,
        node_type: 'session_start',
        label: sessionLabel,
        description: conversationAnalysis.summary || 'Goal-setting conversation with Maya',
        metadata: {
          conversationId,
          agentId,
          duration,
          startTime,
          endTime
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session node:', sessionError);
    }

    const sessionNodeId = sessionNode?.id;
    const createdNodes: any[] = [];
    const createdEdges: any[] = [];

    // Process goals from the analysis
    if (conversationAnalysis.goals && conversationAnalysis.goals.length > 0) {
      for (const goal of conversationAnalysis.goals) {
        // Create goal node
        const { data: goalNode, error: goalError } = await supabase
          .from('graph_nodes')
          .insert({
            user_id: userId,
            node_type: 'goal',
            label: goal.title || goal.text.substring(0, 100),
            description: goal.text,
            metadata: {
              timeframe: goal.timeframe,
              confidence: goal.confidence,
              source: 'maya_conversation',
              conversationId
            }
          })
          .select()
          .single();

        if (goalNode) {
          createdNodes.push(goalNode);
          
          // Create edge from session to goal
          if (sessionNodeId) {
            const { data: edge } = await supabase
              .from('graph_edges')
              .insert({
                user_id: userId,
                source_id: sessionNodeId,
                target_id: goalNode.id,
                edge_type: 'identified',
                weight: 1.0
              })
              .select()
              .single();
            
            if (edge) createdEdges.push(edge);
          }
        }
      }
    }

    // Process insights from the analysis
    if (conversationAnalysis.insights && conversationAnalysis.insights.length > 0) {
      for (const insight of conversationAnalysis.insights) {
        // Create insight node
        const { data: insightNode, error: insightError } = await supabase
          .from('graph_nodes')
          .insert({
            user_id: userId,
            node_type: 'insight',
            label: insight.title || insight.text.substring(0, 100),
            description: insight.text,
            metadata: {
              category: insight.category,
              source: 'maya_conversation',
              conversationId
            }
          })
          .select()
          .single();

        if (insightNode) {
          createdNodes.push(insightNode);
          
          // Create edge from session to insight
          if (sessionNodeId) {
            const { data: edge } = await supabase
              .from('graph_edges')
              .insert({
                user_id: userId,
                source_id: sessionNodeId,
                target_id: insightNode.id,
                edge_type: 'discovered',
                weight: 0.8
              })
              .select()
              .single();
            
            if (edge) createdEdges.push(edge);
          }
        }
      }
    }

    // Process obstacles if any
    if (conversationAnalysis.obstacles && conversationAnalysis.obstacles.length > 0) {
      for (const obstacle of conversationAnalysis.obstacles) {
        // Create obstacle node
        const { data: obstacleNode } = await supabase
          .from('graph_nodes')
          .insert({
            user_id: userId,
            node_type: 'obstacle',
            label: obstacle.substring(0, 100),
            description: obstacle,
            metadata: {
              source: 'maya_conversation',
              conversationId
            }
          })
          .select()
          .single();

        if (obstacleNode) {
          createdNodes.push(obstacleNode);
          
          // Create edge from session to obstacle
          if (sessionNodeId) {
            const { data: edge } = await supabase
              .from('graph_edges')
              .insert({
                user_id: userId,
                source_id: sessionNodeId,
                target_id: obstacleNode.id,
                edge_type: 'identified',
                weight: 0.6
              })
              .select()
              .single();
            
            if (edge) createdEdges.push(edge);
          }
        }
      }
    }

    // Record emotional state if present
    if (conversationAnalysis.emotional_state) {
      const { data: emotionNode } = await supabase
        .from('graph_nodes')
        .insert({
          user_id: userId,
          node_type: 'emotion',
          label: conversationAnalysis.emotional_state,
          description: `Emotional state during conversation: ${conversationAnalysis.emotional_state}`,
          metadata: {
            source: 'maya_conversation',
            conversationId
          }
        })
        .select()
        .single();

      if (emotionNode) {
        createdNodes.push(emotionNode);
        
        if (sessionNodeId) {
          const { data: edge } = await supabase
            .from('graph_edges')
            .insert({
              user_id: userId,
              source_id: sessionNodeId,
              target_id: emotionNode.id,
              edge_type: 'experienced',
              weight: 0.7
            })
            .select()
            .single();
          
          if (edge) createdEdges.push(edge);
        }
      }
    }

    // Queue nodes for embedding generation
    if (createdNodes.length > 0) {
      const nodeIds = createdNodes.map(n => n.id);
      
      // Call the embedding generation edge function
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nodeIds })
      }).catch(error => {
        console.error('Error queuing embeddings:', error);
      });
    }

    // Log the results
    console.log('Graph update complete:', {
      conversationId,
      userId,
      nodesCreated: createdNodes.length,
      edgesCreated: createdEdges.length,
      sessionNodeId
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation processed successfully',
      data: {
        sessionNodeId,
        nodesCreated: createdNodes.length,
        edgesCreated: createdEdges.length,
        goals: conversationAnalysis.goals?.length || 0,
        insights: conversationAnalysis.insights?.length || 0,
        obstacles: conversationAnalysis.obstacles?.length || 0
      }
    });

  } catch (error) {
    console.error('Post webhook error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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