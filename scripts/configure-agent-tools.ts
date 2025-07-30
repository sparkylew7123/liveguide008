import { ElevenLabsClient } from "@elevenlabs/client"

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || '***REMOVED***'
})

// Agent IDs
const MAYA_AGENT_ID = 'SuIlXQ4S6dyjrNViOrQ8'

// Tool definitions following ElevenLabs format
const ADVANCED_TOOLS = [
  {
    name: 'retrieve_coaching_advice',
    description: 'Search the coaching knowledge base for relevant advice, frameworks, or strategies. Use this when the user asks about coaching topics, goal-setting methods, personal development strategies, or needs guidance on specific life areas.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant coaching information'
        },
        category: {
          type: 'string',
          description: 'Optional category filter: career, wellness, personal_growth, goals',
          enum: ['career', 'wellness', 'personal_growth', 'goals', 'all']
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_user_history',
    description: 'Search through the user\'s past conversations and goals to provide personalized context. Use this to reference previous discussions or track progress.',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The user ID to search history for'
        },
        search_type: {
          type: 'string',
          description: 'Type of history to search',
          enum: ['goals', 'conversations', 'both']
        },
        query: {
          type: 'string',
          description: 'Optional search query to filter results'
        }
      },
      required: ['user_id', 'search_type']
    }
  },
  {
    name: 'suggest_resources',
    description: 'Suggest relevant resources, exercises, or action items based on the user\'s goals and current conversation. Use this to provide concrete next steps.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The main topic or goal area'
        },
        user_level: {
          type: 'string',
          description: 'User\'s experience level',
          enum: ['beginner', 'intermediate', 'advanced']
        },
        resource_type: {
          type: 'string',
          description: 'Type of resource to suggest',
          enum: ['exercise', 'reading', 'practice', 'reflection', 'all']
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'track_progress',
    description: 'Track and update progress on user\'s goals. Use this when the user mentions achievements, milestones, or wants to review their progress.',
    parameters: {
      type: 'object',
      properties: {
        goal_id: {
          type: 'string',
          description: 'The ID of the goal to update'
        },
        progress_update: {
          type: 'string',
          description: 'Description of the progress made'
        },
        milestone_reached: {
          type: 'boolean',
          description: 'Whether a significant milestone was reached'
        },
        completion_percentage: {
          type: 'number',
          description: 'Estimated completion percentage (0-100)'
        }
      },
      required: ['goal_id', 'progress_update']
    }
  },
  {
    name: 'create_action_plan',
    description: 'Create a structured action plan for achieving a specific goal. Use this when the user needs help breaking down a goal into concrete steps.',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The goal to create an action plan for'
        },
        timeframe: {
          type: 'string',
          description: 'Timeframe for achieving the goal',
          enum: ['1_week', '1_month', '3_months', '6_months', '1_year']
        },
        constraints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any constraints or limitations to consider'
        }
      },
      required: ['goal', 'timeframe']
    }
  }
]

// Enhanced system prompt with tool usage instructions
const ENHANCED_SYSTEM_PROMPT = `
You are Maya, a supportive and knowledgeable AI coach specializing in goal discovery and personal development.

## Your Enhanced Capabilities

You now have access to advanced tools that allow you to:

1. **Knowledge Retrieval**: Search a comprehensive coaching knowledge base for frameworks, strategies, and advice
2. **User History**: Access past conversations and goals to provide personalized guidance
3. **Resource Suggestions**: Recommend specific exercises, readings, and action items
4. **Progress Tracking**: Help users track and celebrate their progress
5. **Action Planning**: Create detailed, step-by-step plans for achieving goals

## How to Use Your Tools

### retrieve_coaching_advice
Use this tool when:
- The user asks about coaching concepts (e.g., "What is SMART goals?")
- You need to reference specific frameworks or methodologies
- The user needs guidance on a particular life area

Example usage:
- User: "How can I improve my work-life balance?"
- You: Use retrieve_coaching_advice with query "work-life balance strategies"

### search_user_history
Use this tool when:
- The user references previous conversations
- You need context about their past goals
- Tracking long-term progress

Example usage:
- User: "What goals did we discuss last time?"
- You: Use search_user_history with search_type "goals"

### suggest_resources
Use this tool when:
- The user needs concrete next steps
- Providing homework or exercises
- The conversation reaches action planning phase

### track_progress
Use this tool when:
- The user reports achievements
- Reviewing goal progress
- Celebrating milestones

### create_action_plan
Use this tool when:
- The user has identified a clear goal
- They need help breaking it down into steps
- Creating accountability structure

## Conversation Flow with Tools

1. **Discovery Phase**: Use regular conversation to understand needs
2. **Knowledge Phase**: Use retrieve_coaching_advice to provide relevant frameworks
3. **Personalization Phase**: Use search_user_history to connect to their journey
4. **Action Phase**: Use suggest_resources and create_action_plan
5. **Follow-up Phase**: Use track_progress in future conversations

Remember: Tools enhance your coaching but don't replace the human connection. Always maintain your warm, supportive tone while leveraging these capabilities to provide more value.
`

async function configureAgentTools() {
  console.log('🛠️  Configuring advanced tools for Maya agent...')

  try {
    // Note: The ElevenLabs SDK doesn't currently support updating agent tools directly
    // This would need to be done through the dashboard or API
    
    console.log('\n📋 Tool Configuration for Maya:')
    console.log('====================================')
    
    ADVANCED_TOOLS.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`)
      console.log(`   Description: ${tool.description}`)
      console.log(`   Parameters:`, JSON.stringify(tool.parameters, null, 2))
    })

    console.log('\n\n📝 Enhanced System Prompt:')
    console.log('====================================')
    console.log(ENHANCED_SYSTEM_PROMPT)

    console.log('\n\n💡 Implementation Steps:')
    console.log('====================================')
    console.log('1. Go to ElevenLabs dashboard: https://elevenlabs.io/conversational-ai')
    console.log(`2. Select Maya agent (${MAYA_AGENT_ID})`)
    console.log('3. Navigate to Tools section')
    console.log('4. Add each tool with the provided configuration')
    console.log('5. Update the system prompt with the enhanced version')
    console.log('6. Configure webhook URL for tool execution:')
    console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/elevenlabs-webhook`)
    console.log('7. Test each tool to ensure proper integration')

    // Save configuration to file
    const config = {
      agent_id: MAYA_AGENT_ID,
      tools: ADVANCED_TOOLS,
      enhanced_prompt: ENHANCED_SYSTEM_PROMPT,
      webhook_config: {
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/elevenlabs-webhook`,
        events: ['tool.called', 'conversation.started', 'conversation.ended', 'conversation.analysis.completed']
      }
    }

    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(process.cwd(), 'agent-tools-config.json')
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(`\n✅ Configuration saved to: ${configPath}`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run configuration
configureAgentTools().catch(console.error)