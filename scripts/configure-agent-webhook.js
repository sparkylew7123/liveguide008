#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

// N8N Webhook URL for LiveGuide integration
const WEBHOOK_URL = 'https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a';

if (!API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
  process.exit(1);
}

console.log('🔗 Configuring Webhook for ElevenLabs Agent');
console.log('==========================================');
console.log('🎯 Agent ID:', AGENT_ID);
console.log('🔗 Webhook URL:', WEBHOOK_URL);
console.log('🔑 API Key:', API_KEY.substring(0, 20) + '...');

// Function to make API request
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode, data: parsedResponse });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function getCurrentAgentConfig() {
  try {
    console.log('\n📋 Getting current agent configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent configuration retrieved');
      return response.data;
    } else {
      console.error('❌ Failed to get agent configuration:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting agent configuration:', error);
    return null;
  }
}

async function updateAgentWebhook() {
  try {
    console.log('\n🔄 Updating agent webhook configuration...');
    
    // Configuration for webhook integration
    const webhookConfig = {
      webhook: {
        url: WEBHOOK_URL,
        events: ['conversation_ended', 'conversation_started']
      }
    };
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, webhookConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent webhook updated successfully!');
      console.log('=====================================');
      console.log('📝 Webhook Configuration:');
      console.log('- URL:', WEBHOOK_URL);
      console.log('- Events: conversation_started, conversation_ended');
      
      return response.data;
    } else {
      console.error('❌ Failed to update agent webhook:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating agent webhook:', error);
    return null;
  }
}

async function verifyWebhookConfiguration() {
  try {
    console.log('\n🔍 Verifying webhook configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      console.log('✅ Configuration verification:');
      console.log('========================');
      console.log('- Agent Name:', agent.name);
      console.log('- Webhook URL:', agent.webhook?.url || 'Not configured');
      console.log('- Webhook Events:', agent.webhook?.events || 'Not configured');
      
      const isWebhookConfigured = agent.webhook?.url === WEBHOOK_URL;
      
      console.log('\n' + (isWebhookConfigured ? '🎉 Webhook is properly configured!' : '⚠️ Webhook configuration issue.'));
      
      return isWebhookConfigured;
    } else {
      console.error('❌ Failed to verify webhook configuration:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying webhook configuration:', error);
    return false;
  }
}

async function testWebhookConnection() {
  try {
    console.log('\n🧪 Testing webhook connectivity...');
    
    // Test if the N8N webhook is accessible
    const testPayload = {
      mode: 'direct',
      conversationId: 'test-webhook-config-' + Date.now(),
      userId: '907f679d-b36a-42a8-8b60-ce0d9cc11726',
      transcript: 'Test webhook configuration',
      analysis: {
        summary: 'Test configuration from agent setup',
        goals: [{
          text: 'Test webhook integration',
          timescale: '1 minute'
        }]
      }
    };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook test successful!');
      console.log('- Response status:', response.status);
      console.log('- Tools executed:', result.toolsExecuted || 0);
      console.log('- Mode:', result.mode || 'unknown');
    } else {
      console.error('❌ Webhook test failed:', response.status);
      const errorText = await response.text();
      console.error('- Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Webhook Configuration Tool');
  console.log('==============================================');
  
  // Step 1: Get current configuration
  const currentConfig = await getCurrentAgentConfig();
  
  if (!currentConfig) {
    console.log('❌ Failed to retrieve current agent configuration. Exiting.');
    process.exit(1);
  }
  
  // Step 2: Update webhook configuration
  const updateResult = await updateAgentWebhook();
  
  if (!updateResult) {
    console.log('❌ Failed to update webhook configuration. Exiting.');
    process.exit(1);
  }
  
  // Step 3: Verify the configuration
  const isConfigured = await verifyWebhookConfiguration();
  
  // Step 4: Test webhook connectivity
  await testWebhookConnection();
  
  if (isConfigured) {
    console.log('\n🎉 Webhook Configuration Complete!');
    console.log('\nAgent is now configured to send conversation data to:');
    console.log('🔗', WEBHOOK_URL);
    console.log('\nThe webhook will receive:');
    console.log('- conversation_started events (with user context)');
    console.log('- conversation_ended events (with transcript and analysis)');
    console.log('\nNext steps:');
    console.log('1. Test a conversation with the agent');
    console.log('2. Monitor N8N workflow execution');
    console.log('3. Verify nodes are created in LiveGuide graph');
  } else {
    console.log('\n⚠️ Webhook configuration incomplete. Please check the errors above.');
  }
}

main().catch(console.error);