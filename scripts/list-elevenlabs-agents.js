#!/usr/bin/env node

const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
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

async function listAgents() {
  try {
    console.log('📋 Listing available agents...');
    
    const response = await makeRequest('GET', '/v1/agents');
    
    if (response.statusCode === 200) {
      console.log('✅ Available Agents:');
      console.log('===================');
      
      if (response.data.agents && response.data.agents.length > 0) {
        response.data.agents.forEach((agent, index) => {
          console.log(`${index + 1}. ${agent.name || 'Unnamed Agent'}`);
          console.log(`   ID: ${agent.agent_id}`);
          console.log(`   Description: ${agent.description || 'No description'}`);
          console.log(`   Created: ${agent.created_at || 'Unknown'}`);
          console.log('');
        });
      } else {
        console.log('No agents found. You may need to create one.');
      }
    } else {
      console.error('❌ Failed to list agents:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error listing agents:', error);
  }
}

async function getVoices() {
  try {
    console.log('🎙️ Getting available voices...');
    
    const response = await makeRequest('GET', '/v1/voices');
    
    if (response.statusCode === 200) {
      console.log('✅ Available Voices:');
      console.log('===================');
      
      if (response.data.voices && response.data.voices.length > 0) {
        response.data.voices.slice(0, 10).forEach((voice, index) => {
          console.log(`${index + 1}. ${voice.name}`);
          console.log(`   ID: ${voice.voice_id}`);
          console.log(`   Category: ${voice.category || 'Unknown'}`);
          console.log(`   Description: ${voice.description || 'No description'}`);
          console.log('');
        });
        
        if (response.data.voices.length > 10) {
          console.log(`... and ${response.data.voices.length - 10} more voices available`);
        }
      } else {
        console.log('No voices found.');
      }
    } else {
      console.error('❌ Failed to get voices:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error getting voices:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Explorer');
  console.log('============================');
  
  await listAgents();
  console.log('\n');
  await getVoices();
}

main().catch(console.error);