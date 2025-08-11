import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GraphOperation {
  operation: 'create_node' | 'update_node' | 'delete_node' | 'create_edge' | 
             'update_edge' | 'delete_edge' | 'update_status' | 'get_timeline' | 
             'get_node_evolution' | 'record_event';
  data: any;
  sessionId?: string; // Optional session context
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, data, sessionId }: GraphOperation = await req.json();

    let result;
    
    switch (operation) {
      case 'create_node':
        result = await createNode(user.id, data, sessionId);
        break;
        
      case 'update_node':
        result = await updateNode(user.id, data, sessionId);
        break;
        
      case 'delete_node':
        result = await deleteNode(user.id, data.nodeId, sessionId);
        break;
        
      case 'create_edge':
        result = await createEdge(user.id, data, sessionId);
        break;
        
      case 'update_edge':
        result = await updateEdge(user.id, data, sessionId);
        break;
        
      case 'delete_edge':
        result = await deleteEdge(user.id, data.edgeId, sessionId);
        break;
        
      case 'update_status':
        result = await updateNodeStatus(user.id, data, sessionId);
        break;
        
      case 'get_timeline':
        result = await getUserTimeline(user.id, data);
        break;
        
      case 'get_node_evolution':
        result = await getNodeEvolution(user.id, data.nodeId);
        break;
        
      case 'record_event':
        result = await recordCustomEvent(user.id, data, sessionId);
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result.data }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );

  } catch (error) {
    console.error('Error in graph-operations:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createNode(userId: string, data: any, sessionId?: string) {
  const { node_type, label, description, properties = {}, status = 'draft_verbal' } = data;
  
  if (!node_type || !label) {
    return { error: 'Missing required fields: node_type and label' };
  }

  // Start a transaction to ensure both node creation and event recording succeed
  const { data: node, error } = await supabase
    .from('graph_nodes')
    .insert({
      user_id: userId,
      node_type,
      label,
      description,
      properties: {
        ...properties,
        created_in_session: sessionId
      },
      status,
      first_mentioned_at: new Date().toISOString(),
      last_discussed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // The trigger will automatically record the event
  // But we can add session context if provided
  if (sessionId && node) {
    await supabase.rpc('record_graph_event', {
      p_user_id: userId,
      p_event_type: 'node_created',
      p_new_state: node,
      p_node_id: node.id,
      p_session_id: sessionId,
      p_metadata: { source: 'edge_function' }
    });
  }

  return { data: node, error: null };
}

async function updateNode(userId: string, data: any, sessionId?: string) {
  const { nodeId, updates } = data;
  
  if (!nodeId) {
    return { error: 'Missing nodeId' };
  }

  // Get existing node for event recording
  const { data: existingNode, error: fetchError } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingNode) {
    return { error: 'Node not found or unauthorized' };
  }

  const { data: node, error } = await supabase
    .from('graph_nodes')
    .update({
      ...updates,
      last_discussed_at: new Date().toISOString()
    })
    .eq('id', nodeId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Record evolution event if in a session
  if (sessionId && node) {
    await supabase.rpc('record_graph_event', {
      p_user_id: userId,
      p_event_type: 'node_updated',
      p_new_state: node,
      p_node_id: node.id,
      p_session_id: sessionId,
      p_previous_state: existingNode,
      p_metadata: { 
        source: 'edge_function',
        changes: Object.keys(updates)
      }
    });
  }

  return { data: node, error: null };
}

async function deleteNode(userId: string, nodeId: string, sessionId?: string) {
  if (!nodeId) {
    return { error: 'Missing nodeId' };
  }

  // Soft delete by setting deleted_at
  const { data, error } = await supabase
    .from('graph_nodes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', nodeId)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
}

async function createEdge(userId: string, data: any, sessionId?: string) {
  const { edge_type, source_node_id, target_node_id, label, weight = 1.0, properties = {} } = data;
  
  if (!edge_type || !source_node_id || !target_node_id) {
    return { error: 'Missing required fields: edge_type, source_node_id, and target_node_id' };
  }

  // Verify both nodes belong to the user
  const { data: nodes, error: verifyError } = await supabase
    .from('graph_nodes')
    .select('id')
    .eq('user_id', userId)
    .in('id', [source_node_id, target_node_id]);

  if (verifyError || nodes?.length !== 2) {
    return { error: 'One or both nodes not found or unauthorized' };
  }

  const { data: edge, error } = await supabase
    .from('graph_edges')
    .insert({
      user_id: userId,
      edge_type,
      source_node_id,
      target_node_id,
      label,
      weight,
      properties: {
        ...properties,
        created_in_session: sessionId
      },
      discovered_at: new Date().toISOString(),
      last_reinforced_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data: edge, error };
}

async function updateEdge(userId: string, data: any, sessionId?: string) {
  const { edgeId, updates } = data;
  
  if (!edgeId) {
    return { error: 'Missing edgeId' };
  }

  // Verify ownership
  const { data: existingEdge, error: verifyError } = await supabase
    .from('graph_edges')
    .select('user_id')
    .eq('id', edgeId)
    .single();

  if (verifyError || existingEdge?.user_id !== userId) {
    return { error: 'Edge not found or unauthorized' };
  }

  const { data: edge, error } = await supabase
    .from('graph_edges')
    .update({
      ...updates,
      last_reinforced_at: new Date().toISOString()
    })
    .eq('id', edgeId)
    .select()
    .single();

  return { data: edge, error };
}

async function deleteEdge(userId: string, edgeId: string, sessionId?: string) {
  if (!edgeId) {
    return { error: 'Missing edgeId' };
  }

  // Mark edge as invalid by setting valid_to
  const { data, error } = await supabase
    .from('graph_edges')
    .update({ valid_to: new Date().toISOString() })
    .eq('id', edgeId)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
}

async function updateNodeStatus(userId: string, data: any, sessionId?: string) {
  const { nodeId, status } = data;
  
  if (!nodeId || !status) {
    return { error: 'Missing nodeId or status' };
  }

  if (!['draft_verbal', 'curated'].includes(status)) {
    return { error: 'Invalid status. Must be "draft_verbal" or "curated"' };
  }

  // Get existing node
  const { data: existingNode, error: fetchError } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingNode) {
    return { error: 'Node not found or unauthorized' };
  }

  const { data: result, error } = await supabase
    .rpc('update_node_status', {
      p_node_id: nodeId,
      p_user_id: userId,
      p_new_status: status
    });

  if (!error && sessionId) {
    // Record status change event
    await supabase.rpc('record_graph_event', {
      p_user_id: userId,
      p_event_type: 'status_changed',
      p_new_state: { ...existingNode, status },
      p_node_id: nodeId,
      p_session_id: sessionId,
      p_previous_state: existingNode,
      p_metadata: { 
        old_status: existingNode.status,
        new_status: status
      }
    });
  }

  return { data: { success: result }, error };
}

// New temporal functions

async function getUserTimeline(userId: string, data: any) {
  const { startDate, endDate, limit = 100 } = data;
  
  const query = supabase
    .from('graph_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (startDate) {
    query.gte('created_at', startDate);
  }
  if (endDate) {
    query.lte('created_at', endDate);
  }

  const { data: events, error } = await query;

  return { data: events, error };
}

async function getNodeEvolution(userId: string, nodeId: string) {
  if (!nodeId) {
    return { error: 'Missing nodeId' };
  }

  // Verify node belongs to user
  const { data: node, error: verifyError } = await supabase
    .from('graph_nodes')
    .select('user_id')
    .eq('id', nodeId)
    .single();

  if (verifyError || node?.user_id !== userId) {
    return { error: 'Node not found or unauthorized' };
  }

  const { data: evolution, error } = await supabase
    .rpc('get_node_evolution', {
      p_node_id: nodeId
    });

  return { data: evolution, error };
}

async function recordCustomEvent(userId: string, data: any, sessionId?: string) {
  const { eventType, nodeId, edgeId, metadata = {} } = data;
  
  if (!eventType) {
    return { error: 'Missing eventType' };
  }

  const validEventTypes = [
    'progress_changed',
    'embedding_generated',
    'status_changed'
  ];

  if (!validEventTypes.includes(eventType)) {
    return { error: 'Invalid eventType' };
  }

  const { data: eventId, error } = await supabase.rpc('record_graph_event', {
    p_user_id: userId,
    p_event_type: eventType,
    p_new_state: metadata.newState || {},
    p_node_id: nodeId || null,
    p_edge_id: edgeId || null,
    p_session_id: sessionId || null,
    p_previous_state: metadata.previousState || null,
    p_metadata: metadata
  });

  return { data: { eventId }, error };
}