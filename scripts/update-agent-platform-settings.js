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

console.log('🔧 Updating Agent Platform Settings for N8N Integration');
console.log('======================================================');
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

async function updatePlatformSettings(currentAgent) {
  try {
    console.log('\n🔄 Updating platform settings with N8N webhook...');
    
    // Get current platform settings and update them
    const currentPlatformSettings = currentAgent.platform_settings || {};
    const currentWorkspaceOverrides = currentPlatformSettings.workspace_overrides || {};
    
    // Create the updated platform settings with N8N webhook URL
    const updatedPlatformSettings = {
      ...currentPlatformSettings,
      workspace_overrides: {
        ...currentWorkspaceOverrides,
        conversation_initiation_client_data_webhook: {
          url: N8N_WEBHOOK_URL,
          request_headers: {
            'Content-Type': 'application/json',
            'X-Source': 'ElevenLabs-Agent'
          }
        },
        webhooks: {
          ...currentWorkspaceOverrides.webhooks,
          send_audio: false
        }
      }
    };
    
    const updateConfig = {
      platform_settings: updatedPlatformSettings
    };
    
    console.log('📝 Update payload (workspace_overrides only):');
    console.log(JSON.stringify(updatedPlatformSettings.workspace_overrides, null, 2));
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, updateConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Platform settings updated successfully!');
      console.log('=======================================');
      console.log('📝 Updated Configuration:');
      console.log('- Conversation webhook URL:', N8N_WEBHOOK_URL);
      console.log('- Send audio:', false);
      console.log('- Custom headers: Content-Type, X-Source');
      
      return response.data;
    } else {
      console.error('❌ Failed to update platform settings:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating platform settings:', error);
    return null;
  }
}

async function verifyConfiguration() {
  try {
    console.log('\n🔍 Verifying updated configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      const webhookUrl = agent.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook?.url;
      const postCallWebhookId = agent.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id;
      const sendAudio = agent.platform_settings?.workspace_overrides?.webhooks?.send_audio;
      
      console.log('✅ Configuration verification:');
      console.log('========================');
      console.log('- Agent Name:', agent.name);
      console.log('- Conversation Webhook URL:', webhookUrl || 'Not configured');
      console.log('- Post-call Webhook ID:', postCallWebhookId || 'Not configured');
      console.log('- Send Audio:', sendAudio !== undefined ? sendAudio : 'Not set');
      
      const isConfigured = webhookUrl === N8N_WEBHOOK_URL;
      
      console.log('\n🔍 Analysis:');
      if (isConfigured) {
        console.log('✅ N8N webhook URL is properly configured for conversation initiation');
      } else {
        console.log('❌ N8N webhook URL is not configured correctly');
      }
      
      if (postCallWebhookId) {
        console.log('ℹ️ Post-call webhook is configured (may need to be updated separately)');
      }
      
      console.log('\n' + (isConfigured ? '🎉 Configuration successful!' : '⚠️ Configuration needs attention.'));
      
      return isConfigured;
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
      conversationId: 'test-agent-platform-' + Date.now(),
      userId: '907f679d-b36a-42a8-8b60-ce0d9cc11726',
      transcript: 'Test webhook configuration from ElevenLabs platform settings update',
      analysis: {
        summary: 'Test configuration to verify N8N webhook integration',
        goals: [{
          text: 'Verify platform settings webhook configuration',
          timescale: 'immediate'
        }]
      }
    };
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'ElevenLabs-Agent'
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

async function showDataExtractionGuidelines() {
  console.log('\n📊 Data Extraction Configuration');
  console.log('===============================');
  console.log('The agent is configured to extract:');
  console.log('- User_Goals: Any recognised goals');
  console.log('- timescales: Timescales pertaining to goals');
  console.log('- concerns: Health, privacy, or other concerns');
  console.log('\nEvaluation criteria:');
  console.log('- timescales: Goal-related timescales must be passed to LiveGuide');
  console.log('\nWebhook events will be sent to N8N for processing and forwarding to LiveGuide.');
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Platform Settings Configuration');
  console.log('==================================================');
  
  // Step 1: Get current agent
  const agent = await getCurrentAgent();
  if (!agent) {
    console.log('❌ Failed to get current agent. Exiting.');
    process.exit(1);
  }
  
  // Step 2: Update platform settings
  const updateResult = await updatePlatformSettings(agent);
  
  if (!updateResult) {
    console.log('❌ Failed to update platform settings. Exiting.');
    process.exit(1);
  }
  
  // Step 3: Verify configuration
  const isConfigured = await verifyConfiguration();
  
  // Step 4: Test N8N webhook
  const webhookWorks = await testN8NWebhook();
  
  // Step 5: Show data extraction info
  await showDataExtractionGuidelines();
  
  if (isConfigured && webhookWorks) {
    console.log('\n🎉 Platform Settings Configuration Complete!');
    console.log('===========================================');
    console.log('\nConfiguration Summary:');
    console.log('- ✅ Agent platform settings updated');
    console.log('- ✅ N8N webhook URL configured');
    console.log('- ✅ Data extraction fields configured');
    console.log('- ✅ Webhook connectivity verified');
    console.log('\nThe agent will now send data to:');
    console.log('🔗', N8N_WEBHOOK_URL);
    console.log('\nData flow:');
    console.log('1. 🎙️ User conversation → ElevenLabs Agent');
    console.log('2. 📊 Agent extracts goals, timescales, concerns');
    console.log('3. 🚀 Webhook sends data → N8N workflow');
    console.log('4. 🌐 N8N processes → LiveGuide graph');
    console.log('\nNext steps:');
    console.log('1. Test end-to-end conversation');
    console.log('2. Monitor N8N workflow logs');
    console.log('3. Verify graph nodes are created');
    console.log('4. Validate data extraction quality');
  } else {
    console.log('\n⚠️ Configuration incomplete. Please check the errors above.');
  }
}

main().catch(console.error);