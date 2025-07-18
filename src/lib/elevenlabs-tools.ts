// ElevenLabs Agent Tools Configuration
// These tools allow the agent to interact with the UI in real-time

export interface GoalMatchTool {
  name: 'goal_match'
  description: 'Trigger UI goal matching when the agent detects a goal mentioned by the user'
  parameters: {
    type: 'object'
    properties: {
      goal_text: {
        type: 'string'
        description: 'The exact text the user said about their goal'
      }
      category: {
        type: 'string'
        enum: ['Personal Growth', 'Professional', 'Health & Wellness', 'Relationships']
        description: 'The category this goal belongs to'
      }
      confidence: {
        type: 'number'
        minimum: 0
        maximum: 1
        description: 'Confidence level (0-1) of the goal match'
      }
      suggested_goals: {
        type: 'array'
        items: {
          type: 'object'
          properties: {
            title: { type: 'string' }
            description: { type: 'string' }
            category: { type: 'string' }
          }
        }
        description: 'Array of suggested goals that match what the user said'
      }
    }
    required: ['goal_text', 'category', 'confidence']
  }
}

export interface CategoryHighlightTool {
  name: 'category_highlight'
  description: 'Highlight a goal category in the UI when the agent wants to focus on it'
  parameters: {
    type: 'object'
    properties: {
      category: {
        type: 'string'
        enum: ['Personal Growth', 'Professional', 'Health & Wellness', 'Relationships']
        description: 'The category to highlight'
      }
      reason: {
        type: 'string'
        description: 'Why this category is being highlighted'
      }
    }
    required: ['category']
  }
}

export interface UIUpdateTool {
  name: 'ui_update'
  description: 'Update the UI with specific information or prompts'
  parameters: {
    type: 'object'
    properties: {
      action: {
        type: 'string'
        enum: ['show_goals', 'show_categories', 'show_progress', 'show_confirmation', 'play_chime']
        description: 'The UI action to perform'
      }
      data: {
        type: 'object'
        description: 'Additional data for the UI action'
      }
    }
    required: ['action']
  }
}

export interface ConversationStateTool {
  name: 'conversation_state'
  description: 'Update the conversation state for better context tracking'
  parameters: {
    type: 'object'
    properties: {
      phase: {
        type: 'string'
        enum: ['greeting', 'goal_discovery', 'goal_confirmation', 'coaching_style', 'completion']
        description: 'Current phase of the conversation'
      }
      context: {
        type: 'object'
        description: 'Additional context about the conversation state'
      }
    }
    required: ['phase']
  }
}

// Complete tools configuration for ElevenLabs agent
export const ELEVENLABS_AGENT_TOOLS = [
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
]

// Tool execution handlers
export class ElevenLabsToolHandler {
  private callbacks: Map<string, (data: any) => void> = new Map()

  // Register callback for tool execution
  registerCallback(toolName: string, callback: (data: any) => void) {
    this.callbacks.set(toolName, callback)
  }

  // Execute tool with data
  executeTool(toolName: string, data: any) {
    const callback = this.callbacks.get(toolName)
    if (callback) {
      callback(data)
    } else {
      console.warn(`No callback registered for tool: ${toolName}`)
    }
  }

  // Handle goal match tool
  handleGoalMatch(data: {
    goal_text: string
    category: string
    confidence: number
    suggested_goals?: Array<{
      title: string
      description: string
      category: string
    }>
  }) {
    this.executeTool('goal_match', data)
  }

  // Handle category highlight tool
  handleCategoryHighlight(data: {
    category: string
    reason?: string
  }) {
    this.executeTool('category_highlight', data)
  }

  // Handle UI update tool
  handleUIUpdate(data: {
    action: string
    data?: any
  }) {
    this.executeTool('ui_update', data)
  }

  // Handle conversation state tool
  handleConversationState(data: {
    phase: string
    context?: any
  }) {
    this.executeTool('conversation_state', data)
  }
}

export const toolHandler = new ElevenLabsToolHandler()

// Sample agent prompt that explains how to use these tools
export const AGENT_SYSTEM_PROMPT = `
You are Maya, a skilled AI life coach specializing in goal discovery and personal development. You help users identify their goals and preferences through natural conversation.

## Available Tools

You have access to these tools to enhance the user experience:

1. **goal_match**: Use this when you detect a specific goal the user mentions. This will trigger UI highlighting and audio feedback.
   - Extract the exact text they said about their goal
   - Categorize it appropriately
   - Provide a confidence score
   - Suggest matching goals if applicable

2. **category_highlight**: Use this to highlight a specific category in the UI when discussing it.
   - Helps users focus on the relevant category
   - Provides visual guidance during conversation

3. **ui_update**: Use this to trigger specific UI actions like showing goals, playing chimes, or displaying confirmations.
   - Enhances the interactive experience
   - Provides immediate visual feedback

4. **conversation_state**: Use this to track the conversation phase for better context.
   - Helps the UI adapt to the current conversation flow
   - Enables better state management

## Guidelines

- Use tools proactively to enhance the user experience
- Match goals with high confidence when the user clearly states them
- Highlight categories when discussing them to guide attention
- Keep the conversation natural while leveraging these tools
- Always prioritize user understanding over tool usage

Remember: These tools help create a more engaging and responsive experience, but the conversation should always feel natural and human-like.
`