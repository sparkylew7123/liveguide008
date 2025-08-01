import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GraphDataRequest {
  nodeId?: string;
  depth?: number;
  includeDeleted?: boolean;
  nodeTypes?: string[];
  edgeTypes?: string[];
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

    const requestData: GraphDataRequest = await req.json();
    const { 
      nodeId, 
      depth = 2, 
      includeDeleted = false,
      nodeTypes = [],
      edgeTypes = []
    } = requestData;

    let graphData;

    if (nodeId) {
      // Get neighborhood of a specific node
      graphData = await getNodeNeighborhood(user.id, nodeId, depth);
    } else {
      // Get all user's graph data with optional filtering
      graphData = await getUserGraphData(user.id, {
        includeDeleted,
        nodeTypes,
        edgeTypes
      });
    }

    // Transform the data for Cytoscape.js format
    const cytoscapeData = transformToCytoscapeFormat(graphData);

    return new Response(
      JSON.stringify({ 
        data: cytoscapeData,
        stats: {
          nodeCount: cytoscapeData.nodes.length,
          edgeCount: cytoscapeData.edges.length
        }
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60' // Cache for 1 minute
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-graph-data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getNodeNeighborhood(userId: string, nodeId: string, depth: number) {
  const { data, error } = await supabase
    .rpc('get_node_neighborhood', {
      p_node_id: nodeId,
      p_depth: depth,
      p_user_id: userId
    });

  if (error) {
    console.error('Error fetching node neighborhood:', error);
    throw error;
  }

  return data || [];
}

async function getUserGraphData(userId: string, filters: any) {
  // Build the base query for nodes
  let nodesQuery = supabase
    .from('graph_nodes')
    .select('*')
    .eq('user_id', userId);

  if (!filters.includeDeleted) {
    nodesQuery = nodesQuery.is('deleted_at', null);
  }

  if (filters.nodeTypes.length > 0) {
    nodesQuery = nodesQuery.in('node_type', filters.nodeTypes);
  }

  const { data: nodes, error: nodesError } = await nodesQuery;

  if (nodesError) {
    console.error('Error fetching nodes:', nodesError);
    throw nodesError;
  }

  // Build the base query for edges
  let edgesQuery = supabase
    .from('graph_edges')
    .select('*')
    .eq('user_id', userId)
    .is('valid_to', null);

  if (filters.edgeTypes.length > 0) {
    edgesQuery = edgesQuery.in('edge_type', filters.edgeTypes);
  }

  const { data: edges, error: edgesError } = await edgesQuery;

  if (edgesError) {
    console.error('Error fetching edges:', edgesError);
    throw edgesError;
  }

  // Combine nodes and edges data
  const nodeIds = new Set((nodes || []).map(n => n.id));
  
  // Filter edges to only include those between existing nodes
  const validEdges = (edges || []).filter(edge => 
    nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id)
  );

  return {
    nodes: nodes || [],
    edges: validEdges
  };
}

function transformToCytoscapeFormat(data: any) {
  const cytoscapeNodes = [];
  const cytoscapeEdges = [];
  const processedNodes = new Set();

  // Handle neighborhood data format (from RPC function)
  if (Array.isArray(data) && data.length > 0 && 'node_id' in data[0]) {
    for (const item of data) {
      // Add node if not already processed
      if (!processedNodes.has(item.node_id)) {
        cytoscapeNodes.push({
          data: {
            id: item.node_id,
            label: item.label,
            type: item.node_type,
            description: item.description,
            properties: item.properties,
            status: item.status,
            depth: item.depth
          }
        });
        processedNodes.add(item.node_id);
      }

      // Add edge if present
      if (item.edge_id) {
        cytoscapeEdges.push({
          data: {
            id: item.edge_id,
            source: item.source_node_id,
            target: item.target_node_id,
            type: item.edge_type,
            label: item.edge_label,
            properties: item.edge_properties
          }
        });
      }
    }
  } 
  // Handle standard format (from direct queries)
  else if (data.nodes && data.edges) {
    // Transform nodes
    for (const node of data.nodes) {
      cytoscapeNodes.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.node_type,
          description: node.description,
          properties: node.properties,
          status: node.status,
          createdAt: node.created_at,
          updatedAt: node.updated_at
        }
      });
    }

    // Transform edges
    for (const edge of data.edges) {
      cytoscapeEdges.push({
        data: {
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          type: edge.edge_type,
          label: edge.label,
          weight: edge.weight,
          properties: edge.properties,
          createdAt: edge.created_at
        }
      });
    }
  }

  return {
    nodes: cytoscapeNodes,
    edges: cytoscapeEdges
  };
}