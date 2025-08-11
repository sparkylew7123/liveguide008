#!/usr/bin/env node

// N8N Webhook URL for LiveGuide integration
const N8N_WEBHOOK_URL = 'https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a';
const TEST_USER_ID = '907f679d-b36a-42a8-8b60-ce0d9cc11726';

console.log('🔍 Debugging N8N Webhook Response');
console.log('=================================');
console.log('🔗 N8N Webhook URL:', N8N_WEBHOOK_URL);

async function debugWebhook() {
  try {
    console.log('\n📝 Testing simple payload...');
    
    const testPayload = {
      mode: 'direct',
      conversationId: 'debug-test-' + Date.now(),
      userId: TEST_USER_ID,
      transcript: 'Simple test message',
      analysis: {
        goals: [{ text: 'Test goal', timescale: '1 week' }]
      }
    };
    
    console.log('📊 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug': 'true'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('\n📡 Response Details:');
    console.log('==================');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    console.log('- Headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response as text first to see what we're getting
    const responseText = await response.text();
    console.log('\n📄 Raw Response Text:');
    console.log('====================');
    console.log('Length:', responseText.length);
    console.log('Content:', responseText);
    console.log('First 200 chars:', responseText.substring(0, 200));
    
    // Try to parse as JSON
    if (responseText.trim()) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('\n✅ Successfully parsed as JSON:');
        console.log(JSON.stringify(jsonResponse, null, 2));
      } catch (jsonError) {
        console.log('\n❌ Failed to parse as JSON:', jsonError.message);
        console.log('🔍 Response might be HTML, text, or malformed JSON');
      }
    } else {
      console.log('\n⚠️ Empty response body');
    }
    
  } catch (error) {
    console.log('\n💥 Request Error:');
    console.log('================');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function testWithDifferentMethods() {
  console.log('\n🧪 Testing different HTTP methods...');
  
  const methods = ['GET', 'POST', 'PUT'];
  
  for (const method of methods) {
    try {
      console.log(`\n📡 Testing ${method} method...`);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: method !== 'GET' ? JSON.stringify({ test: true }) : undefined
      });
      
      console.log(`- Status: ${response.status}`);
      console.log(`- Status Text: ${response.statusText}`);
      
      const text = await response.text();
      console.log(`- Response length: ${text.length}`);
      console.log(`- First 100 chars: ${text.substring(0, 100)}`);
      
    } catch (error) {
      console.log(`- Error with ${method}: ${error.message}`);
    }
  }
}

async function main() {
  await debugWebhook();
  await testWithDifferentMethods();
}

main().catch(console.error);