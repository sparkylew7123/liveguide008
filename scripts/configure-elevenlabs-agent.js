#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
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

console.log('🎯 Configuring ElevenLabs Agent:', AGENT_ID);

// Agent configuration for LiveGuide onboarding
const agentConfig = {
  name: "Maya - LiveGuide Onboarding Specialist",
  description: "Maya is a nurturing and skilled onboarding specialist who helps users discover their goals and coaching preferences through natural conversation. She's warm, encouraging, and skilled at asking the right questions to understand what users truly want to achieve.",
  
  // System prompt for goal discovery and coaching style assessment
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

## Conversation Flow:

### Goal Discovery Phase:
1. **Warm Opening**: "Hi! I'm Maya, your goal discovery guide. I'm here to help you discover what you'd like to achieve. Let's have a relaxed chat - just tell me what's on your mind lately."

2. **Open Exploration** (2-3 minutes):
   - Ask about what brought them to LiveGuide
   - Explore areas they'd like to improve
   - Understand their typical day and challenges
   - Listen for mentions of specific goals or pain points

3. **Goal Clarification** (2-3 minutes):
   - Dig deeper into mentioned topics
   - Ask "What would success look like for you?"
   - Understand their deeper motivations
   - Identify obstacles they're facing

4. **Goal Confirmation**:
   - Present the goals you've identified
   - Confirm their interest level
   - Help them prioritize if multiple goals emerge

### Coaching Style Discovery Phase:
1. **Transition**: "Now I'd like to understand how you prefer to be coached. I'll ask about different situations - there are no right or wrong answers."

2. **Situational Questions**:
   - Energy: "Imagine you're feeling stuck on a goal. Would you prefer a coach who gives you energetic encouragement or one who helps you reflect quietly?"
   - Information: "When learning something new, do you prefer to start with the big picture or dive into specific details?"
   - Decisions: "When making important decisions, do you rely more on logical analysis or on what feels right to you?"
   - Structure: "Do you work better with a structured plan or do you prefer to keep things flexible?"

3. **Preference Confirmation**:
   - Summarize what you've learned
   - Ask for confirmation
   - Explain how this helps with coach matching

## Key Guidelines:
- Keep responses conversational and natural
- Ask one question at a time
- Show genuine interest in their responses
- Use their name occasionally
- Reflect back what you hear to show understanding
- Be encouraging about their goals
- Never rush through the conversation
- If they seem uncertain, explore their feelings about it
- End with excitement about finding their perfect coach

## Important Notes:
- This is NOT personality assessment - you're discovering coaching preferences
- Focus on practical preferences, not psychological traits
- Always explain how the information helps with coach matching
- Be transparent about the process
- Respect if they want to skip any part

Remember: You're helping them discover what they want to achieve and how they like to be supported. Be genuinely curious, encouraging, and help them feel excited about their journey ahead.`,

  // Voice settings for a warm, approachable tone
  voice_settings: {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.6,
    use_speaker_boost: true
  },

  // Conversation settings
  conversation_config: {
    max_duration: 480, // 8 minutes max
    idle_timeout: 30,
    intro_message: "Hi! I'm Maya, your goal discovery guide. I'm here to help you discover what you'd like to achieve through our conversation. Are you ready to get started?",
    
    // Tools the agent can use
    tools: [
      {
        name: "goal_detection",
        description: "Identify when a user mentions a specific goal or area they want to improve",
        parameters: {
          goal_category: "string",
          goal_description: "string",
          confidence_level: "number"
        }
      },
      {
        name: "preference_detection", 
        description: "Identify coaching style preferences from user responses",
        parameters: {
          dimension: "string", // Energy, Information, Decisions, Structure
          preference: "string",
          confidence_level: "number"
        }
      }
    ]
  }
};

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

async function configureAgent() {
  try {
    console.log('🔄 Updating agent configuration...');
    
    // Update the agent
    const response = await makeRequest('PATCH', `/v1/agents/${AGENT_ID}`, agentConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent configured successfully!');
      console.log('🎯 Agent Name:', agentConfig.name);
      console.log('📝 System Prompt Length:', agentConfig.system_prompt.length, 'characters');
      console.log('🎙️ Voice Settings:', JSON.stringify(agentConfig.voice_settings, null, 2));
      console.log('⚙️ Conversation Config:', JSON.stringify(agentConfig.conversation_config, null, 2));
    } else {
      console.error('❌ Failed to configure agent:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error configuring agent:', error);
  }
}

async function getAgentInfo() {
  try {
    console.log('📋 Getting current agent information...');
    
    const response = await makeRequest('GET', `/v1/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent Information:');
      console.log('- Name:', response.data.name || 'Not set');
      console.log('- Description:', response.data.description || 'Not set');
      console.log('- System Prompt Length:', response.data.system_prompt?.length || 0, 'characters');
      console.log('- Voice Settings:', JSON.stringify(response.data.voice_settings || {}, null, 2));
    } else {
      console.error('❌ Failed to get agent info:', response.statusCode);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error getting agent info:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 ElevenLabs Agent Configuration Tool');
  console.log('=====================================');
  
  // Get current agent info
  await getAgentInfo();
  
  console.log('\n📝 Configuring agent for LiveGuide onboarding...');
  
  // Configure the agent
  await configureAgent();
  
  console.log('\n🎉 Agent configuration complete!');
  console.log('\nNext steps:');
  console.log('1. Test the agent in your onboarding flow');
  console.log('2. Monitor conversations in the webhook logs');
  console.log('3. Adjust prompts based on user interactions');
}

main().catch(console.error);