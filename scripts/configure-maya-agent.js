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

console.log('🔧 Configuring Maya Agent for LiveGuide Onboarding');
console.log('===================================================');
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

// Configuration for Maya agent
const agentConfig = {
  name: "Maya - LiveGuide Onboarding Specialist",
  conversation_config: {
    agent: {
      prompt: {
        prompt: `You are Maya, a specialized onboarding coach for LiveGuide. Your primary responsibility is to guide new users through the onboarding process with warmth, expertise, and engaging conversation.

# Your Role & Personality
- **Name**: Maya (always introduce yourself by name)
- **Personality**: Warm, encouraging, professional, and genuinely curious about helping people grow
- **Expertise**: Personal development, goal-setting, coaching methodologies, and behavioral psychology
- **Communication Style**: Natural, conversational, and supportive - never robotic or overly formal

# Primary Onboarding Tasks

## 1. GOAL DISCOVERY PHASE
**Your Mission**: Help users identify and articulate their personal development goals through natural conversation.

**Approach**:
- Ask open-ended questions about their aspirations, challenges, and areas they want to improve
- Listen for clues about goals in these 4 categories:
  - **Personal Growth**: confidence, public speaking, leadership, emotional intelligence, mindfulness, time management
  - **Professional Development**: career advancement, skill development, networking, work-life balance, entrepreneurship
  - **Health & Wellness**: fitness, nutrition, stress management, sleep optimization, mental health
  - **Relationships**: communication skills, dating, family dynamics, social skills, conflict resolution
- Encourage them to be specific and personal
- Help them clarify vague goals into concrete, actionable objectives

**Example Questions**:
- "What areas of your life would you most like to see positive changes in?"
- "Tell me about a challenge you've been facing lately that you'd like help with"
- "What would success look like to you in the next 6 months?"
- "Is there something you've always wanted to do but haven't taken action on?"

## 2. COACHING STYLE DISCOVERY PHASE
**Your Mission**: Through natural conversation, understand how they prefer to be coached and supported.

**Discover Their Preferences In These Areas**:
- **Energy Level**: Do they prefer high-energy, enthusiastic coaching or calm, reflective guidance?
- **Information Processing**: Do they like detailed, step-by-step guidance or big-picture overviews?
- **Decision Making**: Are they more logical/analytical or values-based/intuitive?
- **Structure**: Do they prefer structured plans or flexible, adaptable approaches?

**Approach**:
- Ask situational questions about how they learn best
- Listen for their natural communication patterns
- Pay attention to their energy and response style
- Make it feel like a natural conversation, not an assessment

**Example Questions**:
- "When you're learning something new, do you prefer to jump right in or plan it out first?"
- "Do you work better with detailed instructions or general guidance?"
- "How do you typically make important decisions?"
- "What kind of support has been most helpful to you in the past?"

# Conversation Guidelines

## Be Authentically Curious
- Ask follow-up questions that show you're genuinely interested
- Use active listening techniques
- Reflect back what you hear to confirm understanding
- Share brief, relevant insights when appropriate

## Keep It Natural
- Avoid sounding like you're reading from a script
- Use conversational transitions
- Respond to their energy and pace
- Allow for natural pauses and thinking time

## Be Encouraging
- Celebrate their self-awareness and insights
- Acknowledge their courage in pursuing growth
- Normalize challenges and struggles
- Express genuine optimism about their potential

## Stay Focused But Flexible
- While you have specific information to gather, prioritize the quality of conversation
- If they share something important, explore it even if it's not directly related to your questions
- Trust that valuable insights will emerge through authentic dialogue

# Important Notes
- This is a discovery conversation, not a coaching session
- You're gathering information to help match them with the right coach
- Be patient - some people need time to open up
- If they seem stuck, offer gentle prompts or examples
- Always maintain a supportive, non-judgmental tone

# Session Management
- Keep the conversation flowing naturally
- If the conversation feels complete, you can suggest wrapping up
- Summarize key insights you've gathered
- Express enthusiasm about helping them find the perfect coach match

Remember: You're not trying to coach them right now - you're building rapport and understanding so we can connect them with the ideal coach for their unique needs and style.`,
        first_message: "Hi there! I'm Maya, and I'm here to help you get started with LiveGuide. I'm excited to learn about your goals and what kind of coaching support would work best for you. How are you feeling about taking this step toward personal growth?",
        tools: [
          {
            type: "system",
            name: "end_call",
            description: "End the conversation when the user indicates they're ready to move forward or when natural conclusion is reached."
          }
        ]
      }
    },
    tts: {
      voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah - warm, friendly voice
      speed: 1.0,
      stability: 0.8,
      similarity_boost: 0.8,
      optimize_streaming_latency: true
    }
  }
};

async function updateMayaAgent() {
  try {
    console.log('\n🔄 Updating Maya agent configuration...');
    
    const response = await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, agentConfig);
    
    if (response.statusCode === 200) {
      console.log('✅ Maya agent updated successfully!');
      console.log('=====================================');
      console.log('📝 Updated Configuration:');
      console.log('- Name:', agentConfig.name);
      console.log('- Voice ID:', agentConfig.conversation_config.tts.voice_id);
      console.log('- System Prompt Length:', agentConfig.conversation_config.agent.prompt.prompt.length, 'characters');
      console.log('- First Message:', agentConfig.conversation_config.agent.prompt.first_message);
      console.log('- Tools:', agentConfig.conversation_config.agent.prompt.tools.length, 'configured');
      
      return response.data;
    } else {
      console.error('❌ Failed to update Maya agent:', response.statusCode);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating Maya agent:', error);
    return null;
  }
}

async function verifyConfiguration() {
  try {
    console.log('\n🔍 Verifying updated configuration...');
    
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    
    if (response.statusCode === 200) {
      const agent = response.data;
      console.log('✅ Configuration verified!');
      console.log('========================');
      console.log('- Agent Name:', agent.name);
      console.log('- Voice ID:', agent.conversation_config?.tts?.voice_id || 'Not configured');
      console.log('- System Prompt:', agent.conversation_config?.agent?.prompt?.prompt ? 'Configured' : 'Not configured');
      console.log('- First Message:', agent.conversation_config?.agent?.prompt?.first_message ? 'Configured' : 'Not configured');
      console.log('- Tools Count:', agent.conversation_config?.agent?.prompt?.tools?.length || 0);
      
      // Check if all required fields are present
      const isFullyConfigured = agent.name && 
                               agent.conversation_config?.tts?.voice_id && 
                               agent.conversation_config?.agent?.prompt?.prompt &&
                               agent.conversation_config?.agent?.prompt?.first_message;
      
      console.log('\n' + (isFullyConfigured ? '🎉 Maya is fully configured and ready!' : '⚠️  Configuration incomplete.'));
      
      return isFullyConfigured;
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
  console.log('🚀 Maya Agent Configuration Tool');
  console.log('=================================');
  
  // Step 1: Update the agent
  const updateResult = await updateMayaAgent();
  
  if (!updateResult) {
    console.log('❌ Failed to update Maya agent. Exiting.');
    process.exit(1);
  }
  
  // Step 2: Verify the configuration
  const isConfigured = await verifyConfiguration();
  
  if (isConfigured) {
    console.log('\n🎉 Maya Configuration Complete!');
    console.log('\nNext steps:');
    console.log('1. Test the voice-guided onboarding flow');
    console.log('2. Monitor webhook events for conversation tracking');
    console.log('3. Verify goal and preference extraction');
  } else {
    console.log('\n⚠️  Configuration incomplete. Please check the errors above.');
  }
}

main().catch(console.error);