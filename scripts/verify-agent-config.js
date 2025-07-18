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

console.log('🔍 Verifying Agent Configuration');
console.log('===============================');
console.log('🎯 Agent ID:', AGENT_ID);
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

async function verifyAgentExists() {
  try {
    console.log('\n📋 Checking if agent exists...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent found successfully!');
      console.log('=====================================');
      console.log('📝 Agent Details:');
      console.log('- Name:', response.data.name || 'Not set');
      console.log('- Agent ID:', response.data.agent_id || AGENT_ID);
      console.log('- Voice ID:', response.data.voice_id || 'Not set');
      console.log('- Language:', response.data.language || 'Not set');
      console.log('- Created:', response.data.created_at || 'Unknown');
      console.log('- Updated:', response.data.updated_at || 'Unknown');
      
      if (response.data.system_prompt) {
        console.log('- System Prompt Length:', response.data.system_prompt.length, 'characters');
        console.log('- System Prompt Preview:', response.data.system_prompt.substring(0, 100) + '...');
      } else {
        console.log('- System Prompt: Not configured');
      }
      
      if (response.data.voice_settings) {
        console.log('- Voice Settings:', JSON.stringify(response.data.voice_settings, null, 2));
      } else {
        console.log('- Voice Settings: Not configured');
      }
      
      return response.data;
    } else if (response.statusCode === 404) {
      console.error('❌ Agent not found!');
      console.error('The agent ID', AGENT_ID, 'does not exist in your ElevenLabs account.');
      return null;
    } else {
      console.error('❌ Failed to get agent info:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error verifying agent:', error);
    return null;
  }
}

async function listAllAgents() {
  try {
    console.log('\n📋 Listing all available agents...');
    
    const response = await makeRequest('GET', '/v1/convai/agents');
    
    if (response.statusCode === 200) {
      console.log('✅ Available Agents:');
      console.log('===================');
      
      if (response.data.agents && response.data.agents.length > 0) {
        response.data.agents.forEach((agent, index) => {
          const isCurrentAgent = agent.agent_id === AGENT_ID;
          const marker = isCurrentAgent ? '👉 ' : '   ';
          
          console.log(`${marker}${index + 1}. ${agent.name || 'Unnamed Agent'}`);
          console.log(`   ID: ${agent.agent_id}`);
          console.log(`   Voice ID: ${agent.voice_id || 'Not set'}`);
          console.log(`   Created: ${agent.created_at || 'Unknown'}`);
          
          if (isCurrentAgent) {
            console.log('   ⭐ THIS IS YOUR CONFIGURED AGENT');
          }
          console.log('');
        });
        
        const foundAgent = response.data.agents.find(agent => agent.agent_id === AGENT_ID);
        if (foundAgent) {
          console.log('✅ Your configured agent was found in the list!');
        } else {
          console.log('⚠️  Your configured agent was NOT found in the list.');
        }
      } else {
        console.log('No agents found in your account.');
      }
    } else {
      console.error('❌ Failed to list agents:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error listing agents:', error);
  }
}

async function testAgentConfiguration() {
  try {
    console.log('\n🧪 Testing agent configuration...');
    
    // Check if we can fetch agent-specific data
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      
      console.log('✅ Configuration Test Results:');
      console.log('============================');
      
      // Check essential fields
      const checks = [
        { field: 'Name', value: agent.name, required: true },
        { field: 'Voice ID', value: agent.voice_id, required: true },
        { field: 'System Prompt', value: agent.system_prompt, required: true },
        { field: 'Language', value: agent.language, required: false },
        { field: 'Voice Settings', value: agent.voice_settings, required: false }
      ];
      
      let allGood = true;
      
      checks.forEach(check => {
        const hasValue = check.value && check.value !== '';
        const status = hasValue ? '✅' : (check.required ? '❌' : '⚠️');
        const message = hasValue ? 'Configured' : (check.required ? 'MISSING (Required)' : 'Not set (Optional)');
        
        console.log(`${status} ${check.field}: ${message}`);
        
        if (check.required && !hasValue) {
          allGood = false;
        }
      });
      
      console.log('\n' + (allGood ? '🎉 Agent is fully configured!' : '⚠️  Agent needs configuration updates.'));
      
      // Check if this is our Maya agent
      if (agent.name && agent.name.includes('Maya')) {
        console.log('✅ This appears to be the Maya onboarding agent!');
      } else {
        console.log('⚠️  This doesn\'t appear to be the Maya onboarding agent.');
      }
      
    } else {
      console.log('❌ Cannot test configuration - agent not accessible.');
    }
    
  } catch (error) {
    console.error('❌ Error testing configuration:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Verification Tool');
  console.log('====================================');
  
  // Step 1: Check if the specific agent exists
  const agentData = await verifyAgentExists();
  
  // Step 2: List all agents to see context
  await listAllAgents();
  
  // Step 3: Test agent configuration
  await testAgentConfiguration();
  
  console.log('\n🎉 Verification complete!');
  console.log('\nNext steps:');
  console.log('1. If agent is properly configured, test it in the onboarding flow');
  console.log('2. If agent needs updates, use the update script');
  console.log('3. Monitor webhook logs for conversation events');
}

main().catch(console.error);