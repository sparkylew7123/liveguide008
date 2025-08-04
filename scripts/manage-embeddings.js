#!/usr/bin/env node

/**
 * Embedding Management CLI Tool
 * 
 * This script provides utilities to manage embeddings for graph nodes:
 * - Check embedding queue status
 * - Generate embeddings for specific nodes or users
 * - Process the embedding queue
 * - Validate existing embeddings
 * 
 * Usage:
 *   node scripts/manage-embeddings.js status [userId]
 *   node scripts/manage-embeddings.js generate [userId] [--nodes=id1,id2,id3] [--force]
 *   node scripts/manage-embeddings.js process-queue [--max-nodes=100] [--batch-size=20] [--dry-run]
 *   node scripts/manage-embeddings.js validate [userId]
 *   node scripts/manage-embeddings.js clear-errors [userId] [--nodes=id1,id2,id3]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const userId = args[1] && !args[1].startsWith('--') ? args[1] : null;

// Parse flags
const flags = args
  .filter(arg => arg.startsWith('--'))
  .reduce((acc, flag) => {
    const [key, value] = flag.slice(2).split('=');
    acc[key] = value === undefined ? true : value;
    return acc;
  }, {});

async function main() {
  try {
    switch (command) {
      case 'status':
        await showEmbeddingStatus(userId);
        break;
        
      case 'generate':
        await generateEmbeddings(userId, flags);
        break;
        
      case 'process-queue':
        await processEmbeddingQueue(flags);
        break;
        
      case 'validate':
        await validateEmbeddings(userId);
        break;
        
      case 'clear-errors':
        await clearEmbeddingErrors(userId, flags);
        break;
        
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function showEmbeddingStatus(userId = null) {
  console.log('📊 Embedding Queue Status\n');
  
  const { data, error } = await supabase
    .rpc('get_embedding_queue_stats', { p_user_id: userId });
    
  if (error) {
    throw new Error(`Failed to get status: ${error.message}`);
  }
  
  const stats = data[0];
  
  console.log(`Total nodes: ${stats.total_nodes}`);
  console.log(`With embeddings: ${stats.nodes_with_embeddings} (${((stats.nodes_with_embeddings / stats.total_nodes) * 100).toFixed(1)}%)`);
  console.log(`Without embeddings: ${stats.nodes_without_embeddings}`);
  console.log(`With errors: ${stats.nodes_with_errors}`);
  
  if (stats.oldest_pending_node) {
    const daysOld = Math.floor((new Date() - new Date(stats.oldest_pending_node)) / (1000 * 60 * 60 * 24));
    console.log(`Oldest pending: ${daysOld} days ago`);
  }
  
  console.log('\nBy node type:');
  Object.entries(stats.by_node_type || {}).forEach(([type, typeStats]) => {
    const completionRate = ((typeStats.with_embeddings / typeStats.total) * 100).toFixed(1);
    console.log(`  ${type}: ${typeStats.with_embeddings}/${typeStats.total} (${completionRate}%)`);
  });
}

async function generateEmbeddings(userId, flags) {
  console.log('🚀 Generating Embeddings\n');
  
  const payload = {
    batchSize: parseInt(flags['batch-size']) || 10,
    forceRegenerate: flags.force || false
  };
  
  if (flags.nodes) {
    payload.nodeIds = flags.nodes.split(',').map(id => id.trim());
    console.log(`Generating embeddings for ${payload.nodeIds.length} specific nodes`);
  } else if (userId) {
    console.log(`Generating embeddings for user: ${userId}`);
  } else {
    console.log('Generating embeddings for all pending nodes');
  }
  
  if (payload.forceRegenerate) {
    console.log('⚠️  Force regenerate enabled - will overwrite existing embeddings');
  }
  
  const { data, error } = await supabase.functions.invoke('generate-embeddings', {
    body: payload,
    headers: userId ? { 'user-id': userId } : {}
  });
  
  if (error) {
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
  
  console.log(`✅ ${data.message}`);
  if (data.errors && data.errors.length > 0) {
    console.log(`❌ Errors encountered:`);
    data.errors.forEach(error => {
      console.log(`  ${error.nodeId}: ${error.error}`);
    });
  }
}

async function processEmbeddingQueue(flags) {
  console.log('🔄 Processing Embedding Queue\n');
  
  const payload = {
    maxNodes: parseInt(flags['max-nodes']) || 100,
    batchSize: parseInt(flags['batch-size']) || 20,
    dryRun: flags['dry-run'] || false
  };
  
  console.log(`Configuration:`);
  console.log(`  Max nodes: ${payload.maxNodes}`);
  console.log(`  Batch size: ${payload.batchSize}`);
  console.log(`  Dry run: ${payload.dryRun ? 'Yes' : 'No'}`);
  console.log();
  
  const { data, error } = await supabase.functions.invoke('process-embedding-queue', {
    body: payload
  });
  
  if (error) {
    throw new Error(`Failed to process queue: ${error.message}`);
  }
  
  console.log(`✅ ${data.message}`);
  
  if (data.stats) {
    console.log('\nProcessing Statistics:');
    console.log(`  Processed: ${data.stats.totalProcessed}`);
    console.log(`  Errors: ${data.stats.totalErrors}`);
    console.log(`  Users affected: ${data.stats.usersProcessed}`);
    console.log(`  Tokens used: ${data.stats.tokensUsed}`);
    console.log(`  Processing time: ${(data.stats.processingTimeMs / 1000).toFixed(2)}s`);
  }
}

async function validateEmbeddings(userId = null) {
  console.log('✅ Validating Embeddings\n');
  
  const { data, error } = await supabase
    .rpc('validate_node_embeddings', { 
      p_user_id: userId,
      p_check_dimensions: true 
    });
    
  if (error) {
    throw new Error(`Failed to validate embeddings: ${error.message}`);
  }
  
  const validation = data[0];
  
  console.log(`Total checked: ${validation.total_checked}`);
  console.log(`Valid embeddings: ${validation.valid_embeddings}`);
  console.log(`Invalid embeddings: ${validation.invalid_embeddings}`);
  
  if (validation.issues && validation.issues.length > 0) {
    console.log('\nIssues found:');
    validation.issues.forEach(issue => {
      console.log(`  ${issue.issue}: ${issue.description} (${issue.count} nodes)`);
    });
  }
  
  if (validation.invalid_embeddings === 0) {
    console.log('🎉 All embeddings are valid!');
  }
}

async function clearEmbeddingErrors(userId, flags) {
  console.log('🧹 Clearing Embedding Errors\n');
  
  let nodeIds = null;
  if (flags.nodes) {
    nodeIds = flags.nodes.split(',').map(id => id.trim());
    console.log(`Clearing errors for ${nodeIds.length} specific nodes`);
  } else if (userId) {
    console.log(`Clearing errors for user: ${userId}`);
  } else {
    console.log('Clearing errors for all nodes');
  }
  
  const { data, error } = await supabase
    .rpc('clear_embedding_errors', {
      p_user_id: userId,
      p_node_ids: nodeIds
    });
    
  if (error) {
    throw new Error(`Failed to clear errors: ${error.message}`);
  }
  
  console.log(`✅ Cleared errors from ${data} nodes`);
}

function showHelp() {
  console.log(`
Embedding Management CLI Tool

Commands:
  status [userId]                     Show embedding queue status
  generate [userId] [options]         Generate embeddings for nodes
  process-queue [options]             Process the embedding queue
  validate [userId]                   Validate existing embeddings
  clear-errors [userId] [options]     Clear embedding error flags

Options:
  --nodes=id1,id2,id3                Specify specific node IDs
  --force                            Force regenerate existing embeddings
  --max-nodes=100                    Maximum nodes to process (queue only)
  --batch-size=20                    Batch size for processing
  --dry-run                          Show what would be processed without doing it

Examples:
  node scripts/manage-embeddings.js status
  node scripts/manage-embeddings.js generate --nodes=uuid1,uuid2 --force
  node scripts/manage-embeddings.js process-queue --max-nodes=50 --dry-run
  node scripts/manage-embeddings.js validate
  node scripts/manage-embeddings.js clear-errors --nodes=uuid1,uuid2
`);
}

// Run the CLI
main();