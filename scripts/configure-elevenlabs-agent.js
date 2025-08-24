#!/usr/bin/env node

/**
 * Configure ElevenLabs Agent for LiveGuide Voice Onboarding
 * 
 * This script configures an ElevenLabs agent with:
 * 1. Webhook URLs for pre/post conversation data
 * 2. Analysis tab settings for structured goal extraction
 * 3. MCP server integration for real-time tools
 * 
 * Usage: node scripts/configure-elevenlabs-agent.js [AGENT_ID]
 */

require('dotenv').config();

const AGENT_ID = process.argv[2] || process.env.ELEVENLABS_AGENT_ID;
const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '');

if (!AGENT_ID || !API_KEY || !BASE_URL) {
  console.error('❌ Missing required environment variables:');
  console.error('- ELEVENLABS_API_KEY');
  console.error('- ELEVENLABS_AGENT_ID (or pass as argument)');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const webhookConfig = {
  // Pre-conversation webhook to inject user context
  initiation_webhook: `${BASE_URL}/functions/v1/elevenlabs-init-webhook`,
  
  // Post-conversation webhook for analysis and goal extraction
  completion_webhook: `${BASE_URL}/functions/v1/elevenlabs-webhook`,
  
  // MCP server for real-time tools during conversation
  mcp_server: `${BASE_URL}/functions/v1/mcp-server`
};

async function configureAgent() {
  console.log('🤖 Configuring ElevenLabs agent:', AGENT_ID);
  console.log('📡 Webhook URLs:', webhookConfig);
  
  try {
    // Test webhook endpoints first
    console.log('🧪 Testing webhook endpoints...');
    await testWebhookEndpoints();
    
    console.log('\n✅ Configuration ready!');
    console.log('\n📋 Manual configuration steps for ElevenLabs Dashboard:');
    console.log('\n1. Go to your agent settings in ElevenLabs Dashboard');
    console.log('2. In the Widget tab, add these webhook URLs:');
    console.log(`   - Initiation: ${webhookConfig.initiation_webhook}`);
    console.log(`   - Completion: ${webhookConfig.completion_webhook}`);
    console.log('\n3. In the Analysis tab, add these data collection fields:');
    console.log(`
{
  "User_Goals": {
    "type": "array",
    "description": "Extract specific goals mentioned by the user during onboarding",
    "items": {
      "type": "object",
      "properties": {
        "original_text": {
          "type": "string",
          "description": "Exact phrase the user said about their goal"
        },
        "goal_category": {
          "type": "string",
          "description": "Category of the goal",
          "enum": ["career", "health", "personal", "financial", "relationships", "learning", "creativity"]
        },
        "timeline": {
          "type": "string", 
          "description": "When they want to achieve it",
          "enum": ["short_term", "medium_term", "long_term"]
        },
        "confidence_level": {
          "type": "number",
          "description": "How confident they sound about this goal (0-1)",
          "minimum": 0,
          "maximum": 1
        }
      }
    }
  },
  "User_Name": {
    "type": "string",
    "description": "The user's preferred name"
  },
  "Learning_Style": {
    "type": "string",
    "description": "How they prefer to learn",
    "enum": ["visual", "auditory", "kinesthetic", "reading", "mixed"]
  },
  "Time_Commitment": {
    "type": "string",
    "description": "How much time they can dedicate",
    "enum": ["minimal", "moderate", "intensive"]
  }
}
`);
    
    console.log('\n4. Add this to your agent\'s system prompt:');
    console.log(`
GOAL EXTRACTION INSTRUCTIONS:
- Listen carefully for any goals, aspirations, or things the user wants to improve
- Extract the EXACT words they use - don't paraphrase
- Categorize goals appropriately (career, health, personal, financial, relationships, learning, creativity)
- Note their timeline preferences (short_term/medium_term/long_term)  
- Assess their confidence level when mentioning goals (0-1 scale)
- Always capture at least 1-3 specific goals during onboarding

IMPORTANT: When the conversation ends, ensure all mentioned goals are captured with original_text, goal_category, timeline, and confidence_level in the User_Goals field.
`);

    console.log('\n5. In the Integrations tab, add MCP Server:');
    console.log(`   - Server URL: ${webhookConfig.mcp_server}`);
    console.log('   - Enable tools for real-time knowledge graph access');
    
    console.log('\n6. Deploy webhook functions:');
    console.log('   supabase functions deploy elevenlabs-init-webhook');
    console.log('   supabase functions deploy elevenlabs-webhook');
    
  } catch (error) {
    console.error('❌ Failed to test configuration:', error.message);
    process.exit(1);
  }
}

async function testWebhookEndpoints() {
  const endpoints = [
    { name: 'Init Webhook', url: webhookConfig.initiation_webhook },
    { name: 'Completion Webhook', url: webhookConfig.completion_webhook },
    { name: 'MCP Server', url: webhookConfig.mcp_server }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`  Testing ${endpoint.name}...`);
      const response = await fetch(endpoint.url, {
        method: 'GET',
      });
      
      if (response.ok || response.status === 405) {
        console.log(`    ✅ ${endpoint.name} is accessible`);
      } else {
        console.log(`    ⚠️ ${endpoint.name} returned ${response.status}`);
      }
    } catch (error) {
      console.log(`    ❌ ${endpoint.name} is not accessible: ${error.message}`);
    }
  }
}

if (require.main === module) {
  configureAgent();
}

module.exports = { configureAgent, webhookConfig };