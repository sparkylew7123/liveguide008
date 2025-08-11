#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
const N8N_WEBHOOK_URL = 'https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a';

console.log('📋 ElevenLabs Agent → N8N → LiveGuide Integration Summary');
console.log('========================================================');
console.log(`🎯 Agent ID: ${AGENT_ID}`);
console.log(`🔗 N8N Webhook: ${N8N_WEBHOOK_URL}`);
console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : 'Not configured'}`);

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

async function getAgentConfiguration() {
  try {
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      return response.data;
    } else {
      console.error('❌ Failed to get agent configuration:', response.statusCode);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting agent configuration:', error.message);
    return null;
  }
}

async function testWebhookFunctionality() {
  try {
    const testPayload = {
      mode: 'direct',
      conversationId: 'integration-summary-test-' + Date.now(),
      userId: '907f679d-b36a-42a8-8b60-ce0d9cc11726',
      transcript: 'Integration summary test - I want to improve my networking skills within 3 months',
      analysis: {
        summary: 'User wants to improve networking skills',
        goals: [{
          text: 'improve my networking skills',
          timescale: '3 months'
        }]
      }
    };
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'Integration-Summary-Test'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        toolsExecuted: result.toolsExecuted || 0,
        nodesCreated: result.results?.filter(r => r.success)?.length || 0,
        errors: result.results?.filter(r => !r.success)?.length || 0
      };
    } else {
      return {
        success: false,
        status: response.status,
        error: await response.text()
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateSummary() {
  console.log('\n🔍 Analyzing Current Configuration...');
  console.log('====================================');
  
  // Get agent configuration
  const agent = await getAgentConfiguration();
  
  if (!agent) {
    console.log('❌ Could not retrieve agent configuration');
    return;
  }
  
  // Test webhook functionality
  console.log('\n🧪 Testing Webhook Functionality...');
  const webhookTest = await testWebhookFunctionality();
  
  // Generate summary
  console.log('\n📊 Configuration Summary');
  console.log('========================');
  
  console.log('\n🎭 Agent Configuration:');
  console.log(`- Name: ${agent.name || 'Not set'}`);
  console.log(`- Voice ID: ${agent.conversation_config?.tts?.voice_id || 'Not set'}`);
  console.log(`- Language: ${agent.conversation_config?.agent?.language || 'Not set'}`);
  console.log(`- System Prompt: ${agent.conversation_config?.agent?.prompt?.prompt ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- First Message: ${agent.conversation_config?.agent?.first_message ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- Tools Count: ${agent.conversation_config?.agent?.prompt?.tools?.length || 0}`);
  
  console.log('\n🔗 Webhook Configuration:');
  const conversationWebhook = agent.platform_settings?.workspace_overrides?.conversation_initiation_client_data_webhook?.url;
  const postCallWebhookId = agent.platform_settings?.workspace_overrides?.webhooks?.post_call_webhook_id;
  
  console.log(`- Conversation Webhook: ${conversationWebhook === N8N_WEBHOOK_URL ? '✅ N8N Configured' : '❌ Not configured for N8N'}`);
  console.log(`- Post-call Webhook ID: ${postCallWebhookId ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`- Send Audio: ${agent.platform_settings?.workspace_overrides?.webhooks?.send_audio === false ? '✅ Disabled' : '⚠️ Not explicitly disabled'}`);
  
  console.log('\n📊 Data Extraction Fields:');
  const dataCollection = agent.platform_settings?.data_collection || {};
  console.log(`- User_Goals: ${dataCollection.User_Goals ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- timescales: ${dataCollection.timescales ? '✅ Configured' : '❌ Missing'}`);
  console.log(`- concerns: ${dataCollection.concerns ? '✅ Configured' : '❌ Missing'}`);
  
  console.log('\n🧪 Webhook Test Results:');
  if (webhookTest.success) {
    console.log(`- Status: ✅ Working`);
    console.log(`- Tools Executed: ${webhookTest.toolsExecuted}`);
    console.log(`- Nodes Created: ${webhookTest.nodesCreated}`);
    console.log(`- Errors: ${webhookTest.errors}`);
  } else {
    console.log(`- Status: ❌ Failed`);
    console.log(`- Error: ${webhookTest.error || `HTTP ${webhookTest.status}`}`);
  }
  
  console.log('\n🔄 Data Flow Pipeline:');
  console.log('=====================');
  console.log('1. 🎙️ User starts conversation → ElevenLabs Agent (Maya)');
  console.log('2. 📨 Agent sends initiation data → N8N Webhook');
  console.log('3. 💬 User conversation with agent (goals, timescales, concerns extracted)');
  console.log('4. 📋 Agent processes conversation using system prompt & tools');
  console.log('5. 🏁 Conversation ends → Agent sends data to N8N Webhook');
  console.log('6. ⚙️ N8N processes data → Calls MCP Server');
  console.log('7. 🌐 MCP Server creates nodes → LiveGuide Graph Database');
  console.log('8. 🔄 Real-time updates → LiveGuide Frontend');
  
  console.log('\n🎯 Integration Status:');
  console.log('=====================');
  
  const isAgentConfigured = agent.name && agent.conversation_config?.agent?.prompt?.prompt;
  const isWebhookConfigured = conversationWebhook === N8N_WEBHOOK_URL;
  const isDataExtractionConfigured = dataCollection.User_Goals && dataCollection.timescales;
  const isWebhookWorking = webhookTest.success;
  
  const overallScore = [isAgentConfigured, isWebhookConfigured, isDataExtractionConfigured, isWebhookWorking].filter(Boolean).length;
  
  console.log(`📊 Overall Status: ${overallScore}/4 components configured`);
  console.log(`- Agent Configuration: ${isAgentConfigured ? '✅' : '❌'}`);
  console.log(`- Webhook Integration: ${isWebhookConfigured ? '✅' : '❌'}`);
  console.log(`- Data Extraction: ${isDataExtractionConfigured ? '✅' : '❌'}`);
  console.log(`- End-to-End Testing: ${isWebhookWorking ? '✅' : '❌'}`);
  
  if (overallScore === 4) {
    console.log('\n🎉 INTEGRATION COMPLETE!');
    console.log('========================');
    console.log('The ElevenLabs Agent → N8N → LiveGuide integration is fully configured and working!');
    console.log('\n📱 Next Steps:');
    console.log('1. Test the agent with real voice conversations');
    console.log('2. Monitor the LiveGuide graph for new nodes');
    console.log('3. Fine-tune data extraction based on conversation quality');
    console.log('4. Set up monitoring and logging for production use');
    console.log('\n🔗 Agent Widget URL:');
    console.log(`   https://elevenlabs.io/conversational-ai/embed/${AGENT_ID}/widget`);
  } else {
    console.log('\n⚠️ INTEGRATION INCOMPLETE');
    console.log('========================');
    console.log('Some components need attention before the integration is fully functional.');
    console.log('\n🛠️ Action Items:');
    if (!isAgentConfigured) console.log('- Complete agent configuration (system prompt, voice, etc.)');
    if (!isWebhookConfigured) console.log('- Configure conversation webhook to point to N8N');
    if (!isDataExtractionConfigured) console.log('- Set up data extraction fields');
    if (!isWebhookWorking) console.log('- Debug webhook connectivity issues');
  }
  
  console.log('\n📋 Configuration Scripts Available:');
  console.log('==================================');
  console.log('- configure-maya-agent.js - Update agent system prompt and voice');
  console.log('- update-agent-platform-settings.js - Configure webhook URLs');
  console.log('- debug-webhook.js - Test webhook connectivity');
  console.log('- test-end-to-end-integration.js - Full integration testing');
  console.log('- integration-summary.js - This summary report');
}

generateSummary().catch(console.error);