import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GraphOperation {
  operation: 'create_node' | 'update_node' | 'delete_node' | 'create_edge' | 'update_edge' | 'delete_edge' | 'update_status';
  data: any;
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

    const { operation, data }: GraphOperation = await req.json();

    let result;
    
    switch (operation) {
      case 'create_node':
        result = await createNode(user.id, data);
        break;
        
      case 'update_node':
        result = await updateNode(user.id, data);
        break;
        
      case 'delete_node':
        result = await deleteNode(user.id, data.nodeId);
        break;
        
      case 'create_edge':
        result = await createEdge(user.id, data);
        break;
        
      case 'update_edge':
        result = await updateEdge(user.id, data);
        break;
        
      case 'delete_edge':
        result = await deleteEdge(user.id, data.edgeId);
        break;
        
      case 'update_status':
        result = await updateNodeStatus(user.id, data);
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

async function createNode(userId: string, data: any) {
  const { node_type, label, description, properties = {}, status = 'draft_verbal' } = data;
  
  if (!node_type || !label) {
    return { error: 'Missing required fields: node_type and label' };
  }

  const { data: node, error } = await supabase
    .from('graph_nodes')
    .insert({
      user_id: userId,
      node_type,
      label,
      description,
      properties,
      status
    })
    .select()
    .single();

  return { data: node, error };
}

async function updateNode(userId: string, data: any) {
  const { nodeId, updates } = data;
  
  if (!nodeId) {
    return { error: 'Missing nodeId' };
  }

  // Verify ownership
  const { data: existingNode, error: verifyError } = await supabase
    .from('graph_nodes')
    .select('user_id')
    .eq('id', nodeId)
    .single();

  if (verifyError || existingNode?.user_id !== userId) {
    return { error: 'Node not found or unauthorized' };
  }

  const { data: node, error } = await supabase
    .from('graph_nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  return { data: node, error };
}

async function deleteNode(userId: string, nodeId: string) {
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

async function createEdge(userId: string, data: any) {
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
      properties
    })
    .select()
    .single();

  return { data: edge, error };
}

async function updateEdge(userId: string, data: any) {
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
    .update(updates)
    .eq('id', edgeId)
    .select()
    .single();

  return { data: edge, error };
}

async function deleteEdge(userId: string, edgeId: string) {
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

async function updateNodeStatus(userId: string, data: any) {
  const { nodeId, status } = data;
  
  if (!nodeId || !status) {
    return { error: 'Missing nodeId or status' };
  }

  if (!['draft_verbal', 'curated'].includes(status)) {
    return { error: 'Invalid status. Must be "draft_verbal" or "curated"' };
  }

  const { data: result, error } = await supabase
    .rpc('update_node_status', {
      p_node_id: nodeId,
      p_user_id: userId,
      p_new_status: status
    });

  return { data: { success: result }, error };
}