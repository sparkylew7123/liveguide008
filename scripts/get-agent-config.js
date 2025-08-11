#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

if (!API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
  process.exit(1);
}

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

async function getAgentFullConfig() {
  try {
    console.log('📋 Getting full agent configuration...');
    console.log('🎯 Agent ID:', AGENT_ID);
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      console.log('\n✅ Agent configuration retrieved successfully!');
      console.log('==============================================');
      console.log('\n📝 Full Configuration JSON:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Also show key fields
      const agent = response.data;
      console.log('\n📊 Key Configuration Fields:');
      console.log('============================');
      console.log('- Name:', agent.name);
      console.log('- Agent ID:', agent.agent_id);
      console.log('- Language:', agent.language || 'Not set');
      console.log('- Voice ID:', agent.conversation_config?.tts?.voice_id || 'Not set');
      console.log('- System Prompt Length:', agent.conversation_config?.agent?.prompt?.prompt?.length || 0, 'characters');
      console.log('- First Message:', agent.conversation_config?.agent?.prompt?.first_message ? 'Configured' : 'Not set');
      console.log('- Tools Count:', agent.conversation_config?.agent?.prompt?.tools?.length || 0);
      console.log('- Webhook URL:', agent.webhook?.url || agent.conversation_config?.webhook?.url || 'Not configured');
      console.log('- Webhook Events:', agent.webhook?.events || agent.conversation_config?.webhook?.events || 'Not configured');
      
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

// Main execution
async function main() {
  console.log('🔍 ElevenLabs Agent Configuration Inspector');
  console.log('==========================================');
  
  const config = await getAgentFullConfig();
  
  if (config) {
    console.log('\n✅ Configuration inspection complete!');
  } else {
    console.log('\n❌ Failed to inspect agent configuration.');
  }
}

main().catch(console.error);