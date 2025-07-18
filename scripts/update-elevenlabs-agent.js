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

async function getAgentInfo() {
  try {
    console.log('📋 Getting current agent information...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Current Agent Information:');
      console.log('- Name:', response.data.name || 'Not set');
      console.log('- Voice ID:', response.data.voice_id || 'Not set');
      console.log('- Language:', response.data.language || 'Not set');
      console.log('- System Prompt Length:', response.data.system_prompt?.length || 0, 'characters');
      console.log('- Voice Settings:', JSON.stringify(response.data.voice_settings || {}, null, 2));
      return response.data;
    } else {
      console.error('❌ Failed to get agent info:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting agent info:', error);
    return null;
  }
}

async function updateAgent() {
  try {
    console.log('🔄 Updating agent configuration...');
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, agentConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent updated successfully!');
      console.log('🎯 Agent Name:', agentConfig.name);
      console.log('🎙️ Voice ID:', agentConfig.voice_id);
      console.log('📝 System Prompt Length:', agentConfig.system_prompt.length, 'characters');
      console.log('⚙️ Voice Settings:', JSON.stringify(agentConfig.voice_settings, null, 2));
      return true;
    } else {
      console.error('❌ Failed to update agent:', response.statusCode);
      console.error('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating agent:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Configuration Tool');
  console.log('=====================================');
  console.log('🎯 Configuring Agent:', AGENT_ID);
  
  // Get current agent info
  const currentInfo = await getAgentInfo();
  
  if (currentInfo) {
    console.log('\n📝 Updating agent for LiveGuide onboarding...');
    
    // Update the agent
    const success = await updateAgent();
    
    if (success) {
      console.log('\n🎉 Agent configuration complete!');
      console.log('\nNext steps:');
      console.log('1. Test the agent in your onboarding flow');
      console.log('2. Monitor conversations in the webhook logs');
      console.log('3. Adjust prompts based on user interactions');
      console.log('4. The agent is now configured as "Maya - LiveGuide Onboarding Specialist"');
    } else {
      console.log('\n❌ Failed to update agent configuration.');
    }
  } else {
    console.log('\n❌ Could not retrieve current agent information.');
  }
}

main().catch(console.error);