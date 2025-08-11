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

console.log('🔗 Configuring Post-Call Webhook for N8N Integration');
console.log('===================================================');
console.log('🎯 Agent ID:', AGENT_ID);
console.log('🔗 N8N Webhook URL:', N8N_WEBHOOK_URL);

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
      const agent = response.data;
      const postCallWebhookId = agent.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id;
      
      console.log('✅ Agent configuration retrieved');
      console.log('- Current post-call webhook ID:', postCallWebhookId || 'Not configured');
      
      return { agent, postCallWebhookId };
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

async function getWebhookDetails(webhookId) {
  try {
    console.log('\n🔍 Getting webhook details for ID:', webhookId);
    
    const response = await makeRequest('GET', `/v1/webhooks/${webhookId}`);
    
    if (response.statusCode === 200) {
      const webhook = response.data;
      console.log('✅ Webhook details retrieved:');
      console.log('- Name:', webhook.name || 'Unnamed');
      console.log('- URL:', webhook.url || 'Not set');
      console.log('- Events:', webhook.events?.join(', ') || 'None');
      console.log('- Created:', webhook.created_at || 'Unknown');
      
      return webhook;
    } else {
      console.error('❌ Failed to get webhook details:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting webhook details:', error);
    return null;
  }
}

async function updateExistingWebhook(webhookId) {
  try {
    console.log('\n🔄 Updating existing webhook to point to N8N...');
    console.log('🆔 Webhook ID:', webhookId);
    
    const webhookUpdate = {
      name: 'LiveGuide N8N Post-Call Integration',
      url: N8N_WEBHOOK_URL,
      events: ['conversation_ended'],
      description: 'Post-call webhook to send conversation data to N8N workflow for LiveGuide integration'
    };
    
    const response = await makeRequest('PATCH', `/v1/webhooks/${webhookId}`, webhookUpdate);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook updated successfully!');
      console.log('================================');
      console.log('📝 Updated Webhook:');
      console.log('- ID:', response.data.webhook_id);
      console.log('- Name:', response.data.name);
      console.log('- URL:', response.data.url);
      console.log('- Events:', response.data.events?.join(', ') || 'None');
      
      return response.data;
    } else {
      console.error('❌ Failed to update webhook:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating webhook:', error);
    return null;
  }
}

async function createNewPostCallWebhook() {
  try {
    console.log('\n🔄 Creating new post-call webhook...');
    
    const webhookConfig = {
      name: 'LiveGuide N8N Post-Call Integration',
      url: N8N_WEBHOOK_URL,
      events: ['conversation_ended'],
      description: 'Post-call webhook to send conversation data to N8N workflow for LiveGuide integration'
    };
    
    const response = await makeRequest('POST', '/v1/webhooks', webhookConfig);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ New webhook created successfully!');
      console.log('==================================');
      console.log('📝 New Webhook:');
      console.log('- ID:', response.data.webhook_id);
      console.log('- Name:', response.data.name);
      console.log('- URL:', response.data.url);
      console.log('- Events:', response.data.events?.join(', ') || 'None');
      
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

async function updateAgentWithWebhook(webhookId) {
  try {
    console.log('\n🔄 Updating agent with new post-call webhook...');
    console.log('🆔 Webhook ID:', webhookId);
    
    // Get current platform settings
    const agentResponse = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (agentResponse.statusCode !== 200) {
      throw new Error('Failed to get current agent configuration');
    }
    
    const currentAgent = agentResponse.data;
    const currentPlatformSettings = currentAgent.platform_settings || {};
    const currentWorkspaceOverrides = currentPlatformSettings.workspace_overrides || {};
    
    // Update only the post-call webhook ID
    const updatedPlatformSettings = {
      ...currentPlatformSettings,
      workspace_overrides: {
        ...currentWorkspaceOverrides,
        webhooks: {
          ...currentWorkspaceOverrides.webhooks,
          post_call_webhook_id: webhookId,
          send_audio: false
        }
      }
    };
    
    const updateConfig = {
      platform_settings: updatedPlatformSettings
    };
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, updateConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent updated with new post-call webhook!');
      console.log('==========================================');
      console.log('📝 Updated Configuration:');
      console.log('- Post-call webhook ID:', webhookId);
      console.log('- Send audio:', false);
      
      return response.data;
    } else {
      console.error('❌ Failed to update agent:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating agent:', error);
    return null;
  }
}

async function verifyFullConfiguration() {
  try {
    console.log('\n🔍 Verifying complete webhook configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      const conversationWebhookUrl = agent.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook?.url;
      const postCallWebhookId = agent.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id;
      const sendAudio = agent.platform_settings?.workspace_overrides?.webhooks?.send_audio;
      
      console.log('✅ Complete configuration verification:');
      console.log('====================================');
      console.log('- Agent Name:', agent.name);
      console.log('- Conversation Initiation Webhook:', conversationWebhookUrl || 'Not configured');
      console.log('- Post-call Webhook ID:', postCallWebhookId || 'Not configured');
      console.log('- Send Audio:', sendAudio !== undefined ? sendAudio : 'Not set');
      
      // Check if post-call webhook points to N8N
      if (postCallWebhookId) {
        console.log('\n🔍 Checking post-call webhook details...');
        const webhookDetails = await getWebhookDetails(postCallWebhookId);
        
        if (webhookDetails) {
          const isN8NWebhook = webhookDetails.url === N8N_WEBHOOK_URL;
          console.log('- Post-call webhook URL:', webhookDetails.url);
          console.log('- Points to N8N:', isN8NWebhook ? '✅ Yes' : '❌ No');
          
          if (isN8NWebhook) {
            console.log('\n🎉 Complete webhook configuration successful!');
            console.log('===========================================');
            console.log('Both conversation and post-call webhooks are configured for N8N integration:');
            console.log('- Conversation initiation → N8N (for user context)');
            console.log('- Post-call → N8N (for transcript and extracted data)');
            return true;
          }
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

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Post-Call Webhook Configuration Tool');
  console.log('==================================================');
  
  // Step 1: Get current agent and webhook info
  const agentInfo = await getCurrentAgent();
  if (!agentInfo) {
    console.log('❌ Failed to get current agent. Exiting.');
    process.exit(1);
  }
  
  const { agent, postCallWebhookId } = agentInfo;
  
  // Step 2: Check current post-call webhook
  let webhook = null;
  if (postCallWebhookId) {
    webhook = await getWebhookDetails(postCallWebhookId);
    
    if (webhook && webhook.url === N8N_WEBHOOK_URL) {
      console.log('✅ Post-call webhook already points to N8N endpoint!');
    } else if (webhook) {
      console.log('🔄 Post-call webhook exists but points to different URL. Updating...');
      webhook = await updateExistingWebhook(postCallWebhookId);
    }
  } else {
    console.log('📝 No post-call webhook configured. Creating new one...');
    webhook = await createNewPostCallWebhook();
    
    if (webhook) {
      // Update agent to use the new webhook
      const updateResult = await updateAgentWithWebhook(webhook.webhook_id);
      if (!updateResult) {
        console.log('❌ Failed to update agent with new webhook. Exiting.');
        process.exit(1);
      }
    }
  }
  
  if (!webhook) {
    console.log('❌ Failed to configure post-call webhook. Exiting.');
    process.exit(1);
  }
  
  // Step 3: Verify complete configuration
  const isFullyConfigured = await verifyFullConfiguration();
  
  if (isFullyConfigured) {
    console.log('\n🎉 Post-Call Webhook Configuration Complete!');
    console.log('==========================================');
    console.log('\nWebhook Flow Summary:');
    console.log('1. 🚀 Conversation starts → N8N receives initiation data');
    console.log('2. 🎙️ User conversation with agent');
    console.log('3. 📊 Agent extracts goals, timescales, concerns');
    console.log('4. 🏁 Conversation ends → N8N receives full transcript');
    console.log('5. 🌐 N8N processes → Creates LiveGuide graph nodes');
    console.log('\nData Extraction Fields:');
    console.log('- User_Goals: Goals mentioned by user');
    console.log('- timescales: Time-related information for goals');
    console.log('- concerns: Health, privacy, or other concerns');
    console.log('\nReady for end-to-end testing!');
  } else {
    console.log('\n⚠️ Configuration incomplete. Please check the errors above.');
  }
}

main().catch(console.error);