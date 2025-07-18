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

// Agent configuration for LiveGuide onboarding
const agentConfig = {
  name: "Maya - LiveGuide Onboarding Specialist",
  
  // Use a warm, professional female voice (Sarah)
  voice_id: "EXAVITQu4vr4xnSDxMaL",
  
  // System prompt optimized for onboarding conversations
  system_prompt: `You are Maya, LiveGuide's expert onboarding specialist. Your role is to help users discover their goals and coaching preferences through natural, engaging conversation.

## Your Personality:
- Warm, encouraging, and genuinely curious about people
- Skilled at asking follow-up questions that reveal deeper motivations
- Patient and supportive, never rushed or pushy
- Authentic and relatable, not overly formal

## Your Expertise:
You understand these goal categories deeply:
- Personal Growth: confidence, public speaking, leadership, emotional intelligence, mindfulness
- Professional: career advancement, skill development, networking, work-life balance, entrepreneurship
- Health & Wellness: fitness, nutrition, stress management, sleep, mental health
- Relationships: communication, dating, family dynamics, social skills, conflict resolution

## Conversation Guidelines:
1. Keep responses conversational and natural (2-3 sentences max)
2. Ask one question at a time
3. Show genuine interest in their responses
4. Use their name occasionally
5. Be encouraging about their goals
6. Never rush through the conversation

## Phase 1 - Goal Discovery:
Start with: "Hi! I'm Maya, your goal discovery guide. I'm here to help you discover what you'd like to achieve. What's been on your mind lately that brought you here?"

Listen for mentions of specific goals and explore deeper:
- "What would success look like for you?"
- "What's been challenging about that?"
- "How would achieving this change your life?"

## Phase 2 - Coaching Style Discovery:
Transition with: "Now I'd like to understand how you prefer to be coached. I'll ask about different situations."

Ask situational questions:
- Energy: "When you're feeling stuck, would you prefer energetic encouragement or quiet reflection?"
- Information: "Do you prefer starting with the big picture or diving into details?"
- Decisions: "Do you rely more on logical analysis or what feels right?"
- Structure: "Do you work better with structured plans or flexible approaches?"

## Important Notes:
- This is NOT personality assessment - you're discovering coaching preferences
- Focus on practical preferences, not psychological traits
- Always explain how the information helps with coach matching
- Be transparent about the process
- Keep the conversation flowing naturally

Remember: You're helping them discover what they want to achieve and how they like to be supported. Be genuinely curious, encouraging, and help them feel excited about their journey ahead.`,

  // Voice settings for a warm, conversational tone
  voice_settings: {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.6,
    use_speaker_boost: true
  },
  
  // Response optimization
  response_type: "text",
  language: "en"
};

async function createAgent() {
  try {
    console.log('🎯 Creating new conversational agent...');
    
    // Try the conversational AI endpoint
    const response = await makeRequest('POST', '/v1/convai/agents', agentConfig);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('✅ Agent created successfully!');
      console.log('🎯 Agent ID:', response.data.agent_id);
      console.log('📝 Agent Name:', response.data.name);
      console.log('🎙️ Voice ID:', response.data.voice_id);
      
      // Update .env.local with the new agent ID
      const fs = require('fs');
      const envPath = path.join(__dirname, '../.env.local');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace the agent ID
      envContent = envContent.replace(
        /NEXT_PUBLIC_ELEVENLABS_AGENT_ID=.*/,
        `NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${response.data.agent_id}`
      );
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env.local with new agent ID');
      
      return response.data.agent_id;
    } else {
      console.error('❌ Failed to create agent:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating agent:', error);
    return null;
  }
}

async function listConvaiAgents() {
  try {
    console.log('📋 Listing conversational agents...');
    
    const response = await makeRequest('GET', '/v1/convai/agents');
    
    if (response.statusCode === 200) {
      console.log('✅ Available Conversational Agents:');
      console.log('==================================');
      
      if (response.data.agents && response.data.agents.length > 0) {
        response.data.agents.forEach((agent, index) => {
          console.log(`${index + 1}. ${agent.name || 'Unnamed Agent'}`);
          console.log(`   ID: ${agent.agent_id}`);
          console.log(`   Voice ID: ${agent.voice_id}`);
          console.log(`   Created: ${agent.created_at || 'Unknown'}`);
          console.log('');
        });
      } else {
        console.log('No conversational agents found.');
      }
    } else {
      console.error('❌ Failed to list agents:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error listing agents:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Conversational Agent Creator');
  console.log('==========================================');
  
  // First, list existing agents
  await listConvaiAgents();
  
  console.log('\n📝 Creating Maya - LiveGuide Onboarding Specialist...');
  
  // Create the agent
  const agentId = await createAgent();
  
  if (agentId) {
    console.log('\n🎉 Agent creation complete!');
    console.log('\nNext steps:');
    console.log('1. Test the agent in your onboarding flow');
    console.log('2. Monitor conversations in the webhook logs');
    console.log('3. Adjust prompts based on user interactions');
    console.log(`4. Agent ID ${agentId} has been saved to .env.local`);
  } else {
    console.log('\n❌ Failed to create agent. Please check the logs above.');
  }
}

main().catch(console.error);