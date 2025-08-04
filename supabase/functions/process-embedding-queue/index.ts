import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ProcessQueueRequest {
  maxNodes?: number;
  batchSize?: number;
  dryRun?: boolean;
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

interface ProcessingStats {
  totalProcessed: number;
  totalErrors: number;
  usersProcessed: number;
  tokensUsed: number;
  processingTimeMs: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  const startTime = Date.now();

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

    // This function can be called via scheduled tasks or manually
    // For scheduled tasks, no auth required. For manual calls, verify auth.
    let isScheduled = false;
    const authHeader = req.headers.get('Authorization');
    const scheduledSecret = req.headers.get('X-Scheduled-Secret');
    
    if (scheduledSecret && scheduledSecret === Deno.env.get('SUPABASE_SCHEDULED_SECRET')) {
      isScheduled = true;
      console.log('Processing embedding queue via scheduled task');
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Processing embedding queue via manual request from user ${user.id}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'No authorization provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let requestData: ProcessQueueRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // Use defaults if no valid JSON provided
      }
    }

    const { maxNodes = 100, batchSize = 20, dryRun = false } = requestData;

    console.log('Starting embedding queue processing', {
      maxNodes,
      batchSize,
      dryRun,
      isScheduled
    });

    // Get nodes that need embeddings (across all users)
    const pendingNodes = await getPendingNodes(maxNodes);
    
    if (pendingNodes.length === 0) {
      const processingTime = Date.now() - startTime;
      console.log('No nodes found that need embeddings');
      
      return new Response(
        JSON.stringify({
          message: 'No nodes need embedding updates',
          stats: {
            totalProcessed: 0,
            totalErrors: 0,
            usersProcessed: 0,
            tokensUsed: 0,
            processingTimeMs: processingTime
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${pendingNodes.length} nodes across ${getUniqueUserCount(pendingNodes)} users that need embeddings`);

    if (dryRun) {
      const processingTime = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          message: 'Dry run completed - no embeddings generated',
          stats: {
            totalProcessed: 0,
            totalErrors: 0,
            usersProcessed: getUniqueUserCount(pendingNodes),
            tokensUsed: 0,
            processingTimeMs: processingTime
          },
          pendingNodes: pendingNodes.length
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process all pending nodes
    const stats = await processAllPendingNodes(pendingNodes, batchSize, openaiApiKey);
    stats.processingTimeMs = Date.now() - startTime;
    stats.usersProcessed = getUniqueUserCount(pendingNodes);

    console.log('Embedding queue processing completed', stats);

    // Mark successful completion
    await logProcessingSession(stats, isScheduled);

    return new Response(
      JSON.stringify({
        message: `Queue processing completed. Processed ${stats.totalProcessed} nodes with ${stats.totalErrors} errors.`,
        stats
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error in process-embedding-queue:', error);
    
    // Log the error
    await logProcessingSession({
      totalProcessed: 0,
      totalErrors: 1,
      usersProcessed: 0,
      tokensUsed: 0,
      processingTimeMs: processingTime
    }, false, error.message);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getPendingNodes(maxNodes: number): Promise<Array<{
  id: string;
  user_id: string;
  label: string;
  description: string;
  node_type: string;
  properties: any;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from('graph_nodes')
    .select('id, user_id, label, description, node_type, properties, created_at')
    .is('deleted_at', null)
    .is('embedding', null)
    .order('created_at', { ascending: true })
    .limit(maxNodes);

  if (error) {
    console.error('Error fetching pending nodes:', error);
    throw new Error('Failed to fetch pending nodes');
  }

  return data || [];
}

function getUniqueUserCount(nodes: Array<{ user_id: string }>): number {
  const uniqueUsers = new Set(nodes.map(node => node.user_id));
  return uniqueUsers.size;
}

async function processAllPendingNodes(
  nodes: Array<{
    id: string;
    user_id: string;
    label: string;
    description: string;
    node_type: string;
    properties: any;
  }>,
  batchSize: number,
  openaiApiKey: string
): Promise<ProcessingStats> {
  let totalProcessed = 0;
  let totalErrors = 0;
  let tokensUsed = 0;

  // Process nodes in batches to respect OpenAI rate limits
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(nodes.length / batchSize);
    
    console.log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.length} nodes)`);

    try {
      // Generate embeddings for the batch
      const { embeddings, tokensUsedInBatch } = await generateEmbeddingsBatch(batch, openaiApiKey);
      tokensUsed += tokensUsedInBatch;
      
      // Update database with embeddings
      const updateResults = await updateNodeEmbeddings(batch, embeddings);
      
      totalProcessed += updateResults.successful;
      totalErrors += updateResults.errors.length;

      if (updateResults.errors.length > 0) {
        console.warn(`Batch ${batchNumber} had ${updateResults.errors.length} errors:`,
          updateResults.errors.map(e => `${e.nodeId}: ${e.error}`));
      }

    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      totalErrors += batch.length;
      
      // Mark all nodes in this batch as having processing errors
      await markNodesWithProcessingErrors(batch.map(n => n.id), error.message);
    }

    // Rate limiting: delay between batches (more aggressive for queue processing)
    if (i + batchSize < nodes.length) {
      const delayMs = Math.min(2000, Math.max(500, tokensUsedInBatch / 10));
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return {
    totalProcessed,
    totalErrors,
    usersProcessed: 0, // Will be set by caller
    tokensUsed,
    processingTimeMs: 0 // Will be set by caller
  };
}

async function generateEmbeddingsBatch(
  nodes: Array<{
    id: string;
    label: string;
    description: string;
    node_type: string;
    properties: any;
  }>,
  openaiApiKey: string
): Promise<{ embeddings: Array<{ nodeId: string; embedding: number[] }>; tokensUsedInBatch: number }> {
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
    const embeddings = nodes.map((node, index) => ({
      nodeId: node.id,
      embedding: data.data[index].embedding
    }));

    return {
      embeddings,
      tokensUsedInBatch: data.usage.total_tokens
    };

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

function prepareNodeText(node: {
  label: string;
  description: string;
  node_type: string;
  properties: any;
}): string {
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
        .update({ 
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString()
        })
        .eq('id', node.id);

      if (error) {
        console.error(`Error updating embedding for node ${node.id}:`, error);
        errors.push({
          nodeId: node.id,
          error: error.message
        });
      } else {
        successful++;
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

async function markNodesWithProcessingErrors(nodeIds: string[], errorMessage: string): Promise<void> {
  try {
    // Add error information to node properties
    const { error } = await supabase
      .from('graph_nodes')
      .update({
        properties: supabase.raw(`
          COALESCE(properties, '{}'::jsonb) || 
          jsonb_build_object('embedding_error', ?, 'embedding_error_at', ?)
        `, [errorMessage, new Date().toISOString()]),
        updated_at: new Date().toISOString()
      })
      .in('id', nodeIds);

    if (error) {
      console.error('Error marking nodes with processing errors:', error);
    } else {
      console.log(`Marked ${nodeIds.length} nodes with processing errors`);
    }
  } catch (error) {
    console.error('Exception marking nodes with processing errors:', error);
  }
}

async function logProcessingSession(
  stats: ProcessingStats,
  isScheduled: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    // Create a simple log entry (you could extend this to a dedicated logging table)
    console.log('Processing session completed:', {
      timestamp: new Date().toISOString(),
      isScheduled,
      stats,
      error: errorMessage
    });

    // You could also insert into a dedicated processing_logs table if needed
    // For now, we'll just use console logging with structured data
  } catch (error) {
    console.error('Error logging processing session:', error);
  }
}