import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbeddings() {
  console.log('🚀 Generating embeddings for all nodes...\n');

  try {
    // Get current stats
    const { data: beforeStats, error: beforeError } = await supabase
      .from('graph_nodes')
      .select('id, embedding')
      .is('embedding', null);

    if (beforeError) {
      console.error('Error getting stats:', beforeError);
      return;
    }

    console.log(`📊 Found ${beforeStats.length} nodes without embeddings`);

    // Call the edge function to process all nodes
    console.log('\n🔄 Processing embeddings...');
    const response = await fetch(`${supabaseUrl}/functions/v1/process-embedding-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxNodes: 100,
        batchSize: 10
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge function error:', error);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Processing complete!');
    console.log(`Processed: ${result.processed} nodes`);
    console.log(`Successful: ${result.successful} nodes`);
    console.log(`Failed: ${result.failed} nodes`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => console.log(`- ${err}`));
    }

    // Get updated stats
    const { data: afterStats, error: afterError } = await supabase
      .from('graph_nodes')
      .select('id')
      .is('embedding', null);

    if (!afterError) {
      console.log(`\n📊 Remaining nodes without embeddings: ${afterStats.length}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

generateEmbeddings();