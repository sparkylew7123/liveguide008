import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create authenticated client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function callEdgeFunction() {
  console.log('🚀 Calling edge function with proper auth...\n');

  try {
    // First, check how many nodes need embeddings
    const { data: nodesNeedingEmbeddings, error: countError } = await supabase
      .from('graph_nodes')
      .select('id, label, node_type, embedding_status')
      .is('embedding', null)
      .limit(10);

    if (countError) {
      console.error('Error checking nodes:', countError);
      return;
    }

    console.log(`📊 Found ${nodesNeedingEmbeddings.length} nodes without embeddings (showing first 10):`);
    nodesNeedingEmbeddings.forEach(node => {
      console.log(`  - ${node.label} (${node.node_type}) - status: ${node.embedding_status || 'not set'}`);
    });

    // Call edge function with anon key (as it would be called from frontend)
    console.log('\n📡 Calling generate-embeddings edge function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        batchSize: 5
      })
    });

    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();
    console.log('\nResponse:', responseText);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ Success! Result:', JSON.stringify(result, null, 2));
        
        // Check updated status
        const { data: updatedNodes, error: updateError } = await supabase
          .from('graph_nodes')
          .select('id, label, embedding_status')
          .not('embedding', 'is', null)
          .limit(5);

        if (!updateError && updatedNodes.length > 0) {
          console.log('\n📊 Nodes with embeddings:');
          updatedNodes.forEach(node => {
            console.log(`  - ${node.label} - status: ${node.embedding_status}`);
          });
        }
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

callEdgeFunction();