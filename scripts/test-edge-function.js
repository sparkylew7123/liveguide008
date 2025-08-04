import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function testEdgeFunction() {
  console.log('🔧 Testing edge function directly...\n');

  try {
    // Call the process-embedding-queue function
    console.log('📡 Calling process-embedding-queue edge function...');
    console.log(`URL: ${supabaseUrl}/functions/v1/process-embedding-queue`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-embedding-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxNodes: 10,
        batchSize: 5,
        dryRun: false
      })
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, [...response.headers.entries()]);

    const responseText = await response.text();
    console.log('\nResponse body:');
    console.log(responseText);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ Parsed result:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }

  } catch (error) {
    console.error('Error calling edge function:', error);
  }
}

testEdgeFunction();