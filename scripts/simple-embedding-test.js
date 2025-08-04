import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testEmbeddings() {
  console.log('🧪 Simple embedding test...\n');

  try {
    // Call the edge function directly
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchSize: 2,
        userId: null // Process any user's nodes
      })
    });

    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log('Response:', data);

    if (response.ok) {
      const result = JSON.parse(data);
      console.log('\n✅ Success!');
      console.log(`Processed: ${result.processed || 0} nodes`);
      console.log(`Successful: ${result.successful || 0} nodes`);
      console.log(`Failed: ${result.failed || 0} nodes`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEmbeddings();