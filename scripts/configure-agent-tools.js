require('dotenv').config({ path: '.env.local' });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

// Tools configuration for the agent
const AGENT_TOOLS = [
  {
    name: 'goal_match',
    description: 'Trigger UI goal matching when the agent detects a goal mentioned by the user',
    parameters: {
      type: 'object',
      properties: {
        goal_text: {
          type: 'string',
          description: 'The exact text the user said about their goal'
        },
        category: {
          type: 'string',
          enum: ['Personal Growth', 'Professional', 'Health & Wellness', 'Relationships'],
          description: 'The category this goal belongs to'
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence level (0-1) of the goal match'
        },
        suggested_goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' }
            }
          },
          description: 'Array of suggested goals that match what the user said'
        }
      },
      required: ['goal_text', 'category', 'confidence']
    }
  },
  {
    name: 'category_highlight',
    description: 'Highlight a goal category in the UI when the agent wants to focus on it',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['Personal Growth', 'Professional', 'Health & Wellness', 'Relationships'],
          description: 'The category to highlight'
        },
        reason: {
          type: 'string',
          description: 'Why this category is being highlighted'
        }
      },
      required: ['category']
    }
  },
  {
    name: 'ui_update',
    description: 'Update the UI with specific information or prompts',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['show_goals', 'show_categories', 'show_progress', 'show_confirmation', 'play_chime'],
          description: 'The UI action to perform'
        },
        data: {
          type: 'object',
          description: 'Additional data for the UI action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'conversation_state',
    description: 'Update the conversation state for better context tracking',
    parameters: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: ['greeting', 'goal_discovery', 'goal_confirmation', 'coaching_style', 'completion'],
          description: 'Current phase of the conversation'
        },
        context: {
          type: 'object',
          description: 'Additional context about the conversation state'
        }
      },
      required: ['phase']
    }
  }
];

// Enhanced system prompt that explains how to use the tools
const ENHANCED_SYSTEM_PROMPT = `
You are Maya, a skilled AI life coach specializing in goal discovery and personal development. You help users identify their goals and preferences through natural conversation.

## Your Role
- Help users discover and articulate their personal goals
- Guide them through different goal categories (Personal Growth, Professional, Health & Wellness, Relationships)
- Use the available tools to create an interactive and engaging experience
- Provide supportive, encouraging, and insightful guidance

## Available Tools

You have access to these tools to enhance the user experience:

1. **goal_match**: Use this when you detect a specific goal the user mentions. This will trigger UI highlighting and audio feedback.
   - Extract the exact text they said about their goal
   - Categorize it appropriately (Personal Growth, Professional, Health & Wellness, or Relationships)
   - Provide a confidence score (0-1)
   - Suggest matching goals if applicable

2. **category_highlight**: Use this to highlight a specific category in the UI when discussing it.
   - Helps users focus on the relevant category
   - Provides visual guidance during conversation

3. **ui_update**: Use this to trigger specific UI actions:
   - 'show_goals': Display available goals
   - 'show_categories': Show goal categories
   - 'show_progress': Display progress
   - 'show_confirmation': Show confirmation dialog
   - 'play_chime': Play audio feedback

4. **conversation_state**: Use this to track the conversation phase:
   - 'greeting': Initial welcome
   - 'goal_discovery': Exploring goals
   - 'goal_confirmation': Confirming selected goals
   - 'coaching_style': Discussing preferences
   - 'completion': Wrapping up

## Guidelines

- **Be proactive with tools**: Use them to enhance the user experience
- **Match goals with high confidence**: When users clearly state a goal, use goal_match
- **Highlight relevant categories**: Use category_highlight when discussing specific areas
- **Provide immediate feedback**: Use ui_update to give visual/audio responses
- **Track conversation flow**: Use conversation_state to maintain context
- **Keep it natural**: Tools should enhance, not disrupt the conversation flow

## Example Usage

When a user says "I want to get better at public speaking":
1. Use goal_match with goal_text="I want to get better at public speaking", category="Personal Growth", confidence=0.9
2. Use category_highlight to focus on "Personal Growth"
3. Use ui_update with action="play_chime" for positive feedback

Remember: Your goal is to help users discover their aspirations while creating an engaging, interactive experience through these tools.
`;

async function configureAgentTools() {
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    process.exit(1);
  }

  if (!AGENT_ID) {
    console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
    process.exit(1);
  }

  try {
    console.log('🔧 Configuring ElevenLabs agent with tools...');
    
    // Update agent configuration
    const updatePayload = {
      tools: AGENT_TOOLS,
      system_prompt: ENHANCED_SYSTEM_PROMPT
    };
    
    console.log('🔧 Update payload:', JSON.stringify(updatePayload, null, 2));
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update agent: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Agent successfully configured with tools');
    console.log('📋 Configured tools:', AGENT_TOOLS.map(t => t.name).join(', '));
    
    // Verify the configuration
    const verifyResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (verifyResponse.ok) {
      const agent = await verifyResponse.json();
      console.log('🔍 Agent verification:');
      console.log('  - Name:', agent.name);
      console.log('  - Tools count:', agent.tools?.length || 0);
      console.log('  - System prompt updated:', agent.system_prompt?.includes('Available Tools') ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error('❌ Error configuring agent:', error.message);
    process.exit(1);
  }
}

// Run the configuration
configureAgentTools();