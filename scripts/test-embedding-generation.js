import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmbeddingGeneration() {
  console.log('🔍 Testing embedding generation...\n');

  try {
    // First, check current embedding status
    const { data: stats, error: statsError } = await supabase
      .rpc('validate_node_embeddings');

    if (statsError) {
      console.error('Error getting stats:', statsError);
      return;
    }

    console.log('📊 Current Status:');
    console.log(`Total nodes: ${stats.total_nodes}`);
    console.log(`Nodes with embeddings: ${stats.nodes_with_embeddings}`);
    console.log(`Nodes without embeddings: ${stats.nodes_without_embeddings}`);
    console.log(`Coverage: ${stats.embedding_coverage_percent}%`);
    console.log(`Status breakdown:`, stats.nodes_by_status);

    // Mark nodes for embedding update
    console.log('\n🎯 Marking nodes for embedding update...');
    const { data: markedNodes, error: markError } = await supabase
      .rpc('mark_nodes_for_embedding_update');

    if (markError) {
      console.error('Error marking nodes:', markError);
      return;
    }

    console.log(`Marked ${markedNodes.length} nodes for processing`);

    // Call the edge function to process first batch
    console.log('\n🚀 Calling edge function to generate embeddings...');
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchSize: 5 // Start with small batch for testing
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge function error:', error);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Edge function response:', result);

    // Check updated stats
    const { data: newStats, error: newStatsError } = await supabase
      .rpc('validate_node_embeddings');

    if (!newStatsError) {
      console.log('\n📊 Updated Status:');
      console.log(`Nodes with embeddings: ${newStats.nodes_with_embeddings} (+${newStats.nodes_with_embeddings - stats.nodes_with_embeddings})`);
      console.log(`Coverage: ${newStats.embedding_coverage_percent}%`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testEmbeddingGeneration();