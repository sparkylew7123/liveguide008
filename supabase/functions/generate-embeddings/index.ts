import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GenerateEmbeddingsRequest {
  nodeIds?: string[];
  batchSize?: number;
  forceRegenerate?: boolean;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
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
    // Verify OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let requestData: GenerateEmbeddingsRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // Use defaults if no valid JSON provided
      }
    }

    const { nodeIds, batchSize = 10, forceRegenerate = false } = requestData;

    console.log(`Processing embedding generation for user ${user.id}`, {
      nodeIds: nodeIds?.length || 'all pending',
      batchSize,
      forceRegenerate
    });

    // Get nodes that need embeddings
    const nodesToProcess = await getNodesToProcess(user.id, nodeIds, forceRegenerate);
    
    if (nodesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No nodes need embedding updates',
          processed: 0,
          errors: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${nodesToProcess.length} nodes to process`);

    // Process nodes in batches
    const results = await processNodesInBatches(nodesToProcess, batchSize, openaiApiKey);

    console.log('Embedding generation completed', {
      totalNodes: nodesToProcess.length,
      processed: results.processed,
      errors: results.errors.length
    });

    return new Response(
      JSON.stringify({
        message: `Successfully processed ${results.processed} of ${nodesToProcess.length} nodes`,
        processed: results.processed,
        total: nodesToProcess.length,
        errors: results.errors
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-embeddings:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getNodesToProcess(
  userId: string, 
  nodeIds?: string[], 
  forceRegenerate: boolean = false
): Promise<Array<{ id: string; label: string; description: string; node_type: string; properties: any }>> {
  let query = supabase
    .from('graph_nodes')
    .select('id, label, description, node_type, properties')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (nodeIds && nodeIds.length > 0) {
    // Process specific nodes
    query = query.in('id', nodeIds);
    if (!forceRegenerate) {
      query = query.is('embedding', null);
    }
  } else {
    // Process nodes without embeddings
    query = query.is('embedding', null);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching nodes to process:', error);
    throw new Error('Failed to fetch nodes for processing');
  }

  return data || [];
}

async function processNodesInBatches(
  nodes: Array<{ id: string; label: string; description: string; node_type: string; properties: any }>,
  batchSize: number,
  openaiApiKey: string
): Promise<{ processed: number; errors: Array<{ nodeId: string; error: string }> }> {
  let processed = 0;
  const errors: Array<{ nodeId: string; error: string }> = [];

  // Process nodes in batches to respect rate limits
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(nodes.length / batchSize)}`);

    try {
      // Generate embeddings for the batch
      const embeddings = await generateEmbeddingsBatch(batch, openaiApiKey);
      
      // Update database with embeddings
      const updateResults = await updateNodeEmbeddings(batch, embeddings);
      
      processed += updateResults.successful;
      errors.push(...updateResults.errors);

    } catch (error) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      // Add all nodes in this batch to errors
      batch.forEach(node => {
        errors.push({
          nodeId: node.id,
          error: `Batch processing failed: ${error.message}`
        });
      });
    }

    // Rate limiting: small delay between batches
    if (i + batchSize < nodes.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { processed, errors };
}

async function generateEmbeddingsBatch(
  nodes: Array<{ id: string; label: string; description: string; node_type: string; properties: any }>,
  openaiApiKey: string
): Promise<Array<{ nodeId: string; embedding: number[] }>> {
  // Prepare text for each node
  const texts = nodes.map(node => prepareNodeText(node));
  
  console.log(`Generating embeddings for ${texts.length} nodes`);

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data: OpenAIEmbeddingResponse = await response.json();
    
    console.log(`Generated ${data.data.length} embeddings, used ${data.usage.total_tokens} tokens`);

    // Map embeddings back to node IDs
    return nodes.map((node, index) => ({
      nodeId: node.id,
      embedding: data.data[index].embedding
    }));

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

function prepareNodeText(node: { label: string; description: string; node_type: string; properties: any }): string {
  let text = `${node.node_type}: ${node.label}`;
  
  if (node.description) {
    text += `\nDescription: ${node.description}`;
  }
  
  // Add relevant properties based on node type
  if (node.properties) {
    switch (node.node_type) {
      case 'goal':
        if (node.properties.category) text += `\nCategory: ${node.properties.category}`;
        if (node.properties.priority) text += `\nPriority: ${node.properties.priority}`;
        if (node.properties.target_date) text += `\nTarget Date: ${node.properties.target_date}`;
        break;
      
      case 'skill':
        if (node.properties.level) text += `\nLevel: ${node.properties.level}`;
        if (node.properties.transferable_from && Array.isArray(node.properties.transferable_from)) {
          text += `\nTransferable from: ${node.properties.transferable_from.join(', ')}`;
        }
        break;
      
      case 'emotion':
        if (node.properties.emotion_type) text += `\nEmotion: ${node.properties.emotion_type}`;
        if (node.properties.intensity) text += `\nIntensity: ${node.properties.intensity}`;
        break;
      
      case 'session':
        if (node.properties.duration_minutes) text += `\nDuration: ${node.properties.duration_minutes} minutes`;
        if (node.properties.topics && Array.isArray(node.properties.topics)) {
          text += `\nTopics: ${node.properties.topics.join(', ')}`;
        }
        break;
      
      case 'accomplishment':
        if (node.properties.impact) text += `\nImpact: ${node.properties.impact}`;
        if (node.properties.evidence) text += `\nEvidence: ${node.properties.evidence}`;
        break;
    }
  }
  
  return text;
}

async function updateNodeEmbeddings(
  nodes: Array<{ id: string }>,
  embeddings: Array<{ nodeId: string; embedding: number[] }>
): Promise<{ successful: number; errors: Array<{ nodeId: string; error: string }> }> {
  let successful = 0;
  const errors: Array<{ nodeId: string; error: string }> = [];

  // Create a map for quick lookup
  const embeddingMap = new Map(embeddings.map(e => [e.nodeId, e.embedding]));

  // Update nodes individually to handle partial failures
  for (const node of nodes) {
    const embedding = embeddingMap.get(node.id);
    
    if (!embedding) {
      errors.push({
        nodeId: node.id,
        error: 'No embedding generated for this node'
      });
      continue;
    }

    try {
      const { error } = await supabase
        .from('graph_nodes')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', node.id);

      if (error) {
        console.error(`Error updating embedding for node ${node.id}:`, error);
        errors.push({
          nodeId: node.id,
          error: error.message
        });
      } else {
        successful++;
        console.log(`Successfully updated embedding for node ${node.id}`);
      }
    } catch (error) {
      console.error(`Exception updating embedding for node ${node.id}:`, error);
      errors.push({
        nodeId: node.id,
        error: error.message
      });
    }
  }

  return { successful, errors };
}