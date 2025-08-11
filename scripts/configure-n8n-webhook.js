#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

// N8N Webhook URL for LiveGuide integration
const N8N_WEBHOOK_URL = 'https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a';

if (!API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
  process.exit(1);
}

console.log('🔗 Configuring N8N Webhook for ElevenLabs Agent');
console.log('===============================================');
console.log('🎯 Agent ID:', AGENT_ID);
console.log('🔗 N8N Webhook URL:', N8N_WEBHOOK_URL);
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

async function getCurrentAgent() {
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

async function createWebhook() {
  try {
    console.log('\n🔄 Creating webhook for N8N integration...');
    
    const webhookConfig = {
      name: 'LiveGuide N8N Integration',
      url: N8N_WEBHOOK_URL,
      events: ['conversation_ended', 'conversation_started'],
      description: 'Webhook to send conversation data to N8N workflow for LiveGuide integration'
    };
    
    const response = await makeRequest('POST', '/v1/webhooks', webhookConfig);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ Webhook created successfully!');
      console.log('=====================================');
      console.log('📝 Webhook Details:');
      console.log('- ID:', response.data.webhook_id);
      console.log('- Name:', response.data.name);
      console.log('- URL:', response.data.url);
      console.log('- Events:', response.data.events);
      
      return response.data;
    } else {
      console.error('❌ Failed to create webhook:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating webhook:', error);
    return null;
  }
}

async function listWebhooks() {
  try {
    console.log('\n📋 Listing existing webhooks...');
    
    const response = await makeRequest('GET', '/v1/webhooks');
    
    if (response.statusCode === 200) {
      console.log('✅ Webhooks retrieved successfully!');
      console.log('=================================');
      
      if (response.data.webhooks && response.data.webhooks.length > 0) {
        response.data.webhooks.forEach((webhook, index) => {
          console.log(`${index + 1}. ${webhook.name || 'Unnamed Webhook'}`);
          console.log(`   ID: ${webhook.webhook_id}`);
          console.log(`   URL: ${webhook.url || 'Not set'}`);
          console.log(`   Events: ${webhook.events?.join(', ') || 'None'}`);
          console.log(`   Created: ${webhook.created_at || 'Unknown'}`);
          
          // Check if this is our N8N webhook
          if (webhook.url === N8N_WEBHOOK_URL) {
            console.log('   🎯 THIS IS THE N8N WEBHOOK');
          }
          console.log('');
        });
        
        // Return the N8N webhook if found
        const n8nWebhook = response.data.webhooks.find(w => w.url === N8N_WEBHOOK_URL);
        if (n8nWebhook) {
          console.log('✅ Found existing N8N webhook:', n8nWebhook.webhook_id);
          return n8nWebhook;
        }
      } else {
        console.log('No webhooks found.');
      }
      
      return null;
    } else {
      console.error('❌ Failed to list webhooks:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error listing webhooks:', error);
    return null;
  }
}

async function updateAgentWithWebhook(webhookId) {
  try {
    console.log('\n🔄 Updating agent to use the N8N webhook...');
    console.log('🆔 Webhook ID:', webhookId);
    
    // Update the agent's platform settings to use our webhook
    const updateConfig = {
      platform_settings: {
        workspace_overrides: {
          webhooks: {
            post_call_webhook_id: webhookId,
            send_audio: false
          }
        }
      }
    };
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, updateConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent updated with webhook successfully!');
      console.log('========================================');
      console.log('📝 Updated Configuration:');
      console.log('- Post-call webhook ID:', webhookId);
      console.log('- Send audio:', false);
      
      return response.data;
    } else {
      console.error('❌ Failed to update agent with webhook:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating agent with webhook:', error);
    return null;
  }
}

async function verifyConfiguration() {
  try {
    console.log('\n🔍 Verifying webhook configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      const webhookId = agent.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id;
      
      console.log('✅ Configuration verification:');
      console.log('========================');
      console.log('- Agent Name:', agent.name);
      console.log('- Post-call Webhook ID:', webhookId || 'Not configured');
      console.log('- Send Audio:', agent.platform_settings?.workspace_overrides?.webhooks?.send_audio || 'Not set');
      
      if (webhookId) {
        console.log('\n🔍 Verifying webhook details...');
        
        // Get webhook details
        const webhookResponse = await makeRequest('GET', `/v1/webhooks/${webhookId}`);
        
        if (webhookResponse.statusCode === 200) {
          const webhook = webhookResponse.data;
          console.log('✅ Webhook details:');
          console.log('- Name:', webhook.name);
          console.log('- URL:', webhook.url);
          console.log('- Events:', webhook.events?.join(', ') || 'None');
          
          const isConfigured = webhook.url === N8N_WEBHOOK_URL;
          console.log('\n' + (isConfigured ? '🎉 N8N webhook is properly configured!' : '⚠️ Webhook URL mismatch.'));
          return isConfigured;
        }
      }
      
      return false;
    } else {
      console.error('❌ Failed to verify configuration:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying configuration:', error);
    return false;
  }
}

async function testN8NWebhook() {
  try {
    console.log('\n🧪 Testing N8N webhook connectivity...');
    
    const testPayload = {
      mode: 'direct',
      conversationId: 'test-n8n-config-' + Date.now(),
      userId: '907f679d-b36a-42a8-8b60-ce0d9cc11726',
      transcript: 'Test N8N webhook configuration from ElevenLabs agent setup',
      analysis: {
        summary: 'Test webhook integration to verify connectivity',
        goals: [{
          text: 'Verify N8N webhook is receiving data correctly',
          timescale: 'immediate'
        }],
        insights: [{
          text: 'N8N webhook configuration is working'
        }]
      }
    };
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ N8N webhook test successful!');
      console.log('- Response status:', response.status);
      console.log('- Mode:', result.mode || 'unknown');
      console.log('- Tools executed:', result.toolsExecuted || 0);
      console.log('- Conversation ID:', result.conversationId);
      
      if (result.toolsExecuted > 0) {
        console.log('- Created nodes:', result.results?.length || 0);
      }
      
      return true;
    } else {
      console.error('❌ N8N webhook test failed:', response.status);
      const errorText = await response.text();
      console.error('- Error:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing N8N webhook:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs N8N Webhook Configuration Tool');
  console.log('============================================');
  
  // Step 1: Get current agent
  const agent = await getCurrentAgent();
  if (!agent) {
    console.log('❌ Failed to get current agent. Exiting.');
    process.exit(1);
  }
  
  // Step 2: List existing webhooks
  let webhook = await listWebhooks();
  
  // Step 3: Create webhook if it doesn't exist
  if (!webhook) {
    webhook = await createWebhook();
    
    if (!webhook) {
      console.log('❌ Failed to create webhook. Exiting.');
      process.exit(1);
    }
  } else {
    console.log('✅ Using existing N8N webhook');
  }
  
  // Step 4: Update agent to use the webhook
  const updateResult = await updateAgentWithWebhook(webhook.webhook_id);
  
  if (!updateResult) {
    console.log('❌ Failed to update agent with webhook. Exiting.');
    process.exit(1);
  }
  
  // Step 5: Verify configuration
  const isConfigured = await verifyConfiguration();
  
  // Step 6: Test N8N webhook
  const webhookWorks = await testN8NWebhook();
  
  if (isConfigured && webhookWorks) {
    console.log('\n🎉 N8N Webhook Configuration Complete!');
    console.log('=====================================');
    console.log('\nConfiguration Summary:');
    console.log('- ✅ Agent configured with webhook');
    console.log('- ✅ Webhook points to N8N endpoint');
    console.log('- ✅ N8N webhook is responsive');
    console.log('- ✅ Test data successfully processed');
    console.log('\nThe agent will now send conversation data to:');
    console.log('🔗', N8N_WEBHOOK_URL);
    console.log('\nEvents sent:');
    console.log('- conversation_started: User context and session info');
    console.log('- conversation_ended: Full transcript and extracted data');
    console.log('\nNext steps:');
    console.log('1. 🎙️ Test a conversation with the agent');
    console.log('2. 📊 Monitor N8N workflow execution logs');
    console.log('3. 🌐 Verify nodes appear in LiveGuide graph');
    console.log('4. 🔍 Check data extraction quality');
  } else {
    console.log('\n⚠️ Configuration incomplete or webhook not working properly.');
    console.log('\nTroubleshooting:');
    console.log('- Check N8N workflow is active');
    console.log('- Verify webhook URL is correct');
    console.log('- Test webhook manually with curl');
    console.log('- Check ElevenLabs agent settings');
  }
}

main().catch(console.error);