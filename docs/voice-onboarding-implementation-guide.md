# Voice Onboarding Implementation Guide

## Overview

This guide provides a complete implementation for reliable goal extraction from ElevenLabs voice conversations in LiveGuide. The system uses webhooks, structured analysis, and MCP tools for comprehensive data capture.

## Architecture

```
Voice User ↔ ElevenLabs Agent ↔ LiveGuide System
                    ↓
    [Pre-Call Context] → Init Webhook → User Graph Data
                    ↓
    [During Call] → MCP Tools → Real-time Graph Operations
                    ↓
    [Post-Call Analysis] → Completion Webhook → Goal Extraction → Graph Nodes
```

## Implementation Components

### 1. Webhook Endpoints

#### Pre-Conversation Context (`elevenlabs-init-webhook`)
- **Purpose**: Inject user context before conversation starts
- **Input**: `conversation_id`, `agent_id`, `user_id`, `metadata`
- **Output**: Personalized greeting and conversation context
- **Location**: `/supabase/functions/elevenlabs-init-webhook/index.ts`

#### Post-Conversation Processing (`elevenlabs-webhook`)
- **Purpose**: Extract goals and create graph nodes after conversation
- **Input**: Analysis data with `User_Goals`, `User_Name`, etc.
- **Output**: Created goal nodes in knowledge graph
- **Location**: `/supabase/functions/elevenlabs-webhook/index.ts`

### 2. Frontend Integration

#### Enhanced Goal Extraction (`SimpleVoiceOnboarding`)
- **Multiple extraction points**: Analysis events, evaluation events, conversation end
- **Structured data handling**: Processes `User_Goals` array format
- **Real-time feedback**: Shows captured goals during conversation
- **Location**: `/src/components/SimpleVoiceOnboarding.tsx`

#### Improved WebSocket Handling (`useElevenLabsConversation`)
- **Metadata passing**: User context and session information
- **Error recovery**: Better error handling for connection issues
- **State management**: Proper cleanup on component unmount
- **Location**: `/src/hooks/useElevenLabsConversation.ts`

### 3. Agent Configuration

#### Required ElevenLabs Settings

**Analysis Tab Configuration:**
```json
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
```

**Widget Tab Webhooks:**
- Initiation: `https://your-domain.supabase.co/functions/v1/elevenlabs-init-webhook`
- Completion: `https://your-domain.supabase.co/functions/v1/elevenlabs-webhook`

**System Prompt Addition:**
```
GOAL EXTRACTION INSTRUCTIONS:
- Listen carefully for any goals, aspirations, or things the user wants to improve
- Extract the EXACT words they use - don't paraphrase
- Categorize goals appropriately (career, health, personal, financial, relationships, learning, creativity)
- Note their timeline preferences (short_term/medium_term/long_term)  
- Assess their confidence level when mentioning goals (0-1 scale)
- Always capture at least 1-3 specific goals during onboarding

IMPORTANT: When the conversation ends, ensure all mentioned goals are captured with original_text, goal_category, timeline, and confidence_level in the User_Goals field.
```

## Deployment Steps

### 1. Deploy Webhook Functions

```bash
# Deploy the init webhook
supabase functions deploy elevenlabs-init-webhook

# Deploy the completion webhook  
supabase functions deploy elevenlabs-webhook

# Deploy the MCP server (if not already deployed)
supabase functions deploy mcp-server
```

### 2. Configure ElevenLabs Agent

```bash
# Run the configuration script
node scripts/configure-elevenlabs-agent.js

# Or manually configure using the settings above
```

### 3. Test the Integration

```bash
# Test webhook endpoints and goal extraction
node scripts/test-voice-onboarding.js

# Run end-to-end tests
npm run test:e2e -- tests/e2e/voice-onboarding.spec.ts
```

## Testing and Debugging

### 1. Common Issues

#### WebSocket Connection Stuck in "Connecting"
- **Cause**: ElevenLabs agent not properly configured
- **Solution**: Verify agent ID and API key, check webhook URLs
- **Debug**: Monitor browser network tab for WebSocket errors

#### No Goals Extracted
- **Cause**: Analysis tab not configured correctly
- **Solution**: Ensure `User_Goals` field is properly structured
- **Debug**: Check webhook logs for analysis data

#### Goals Not Appearing in Graph
- **Cause**: Webhook or database RPC function issues
- **Solution**: Check edge function logs and database permissions
- **Debug**: Test `create_goal_node` function directly

### 2. Monitoring

#### Edge Function Logs
```bash
# Monitor webhook activity
supabase functions logs elevenlabs-webhook --follow

# Monitor init webhook
supabase functions logs elevenlabs-init-webhook --follow

# Monitor MCP server
supabase functions logs mcp-server --follow
```

#### Database Queries
```sql
-- Check recent conversations
SELECT * FROM elevenlabs_conversations 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check extracted goals
SELECT gn.label, gn.properties->>'confidence', gn.properties->>'source'
FROM graph_nodes gn
WHERE gn.node_type = 'goal' 
  AND gn.created_at > NOW() - INTERVAL '1 hour'
ORDER BY gn.created_at DESC;
```

### 3. Testing Scenarios

#### Manual Testing
1. Start voice conversation with agent
2. Mention 2-3 specific goals with different categories
3. Complete the conversation
4. Verify goals appear in the knowledge graph
5. Check conversation record has analysis data

#### Automated Testing
1. Mock ElevenLabs WebSocket responses
2. Simulate analysis events with structured data
3. Verify goal extraction and node creation
4. Test error scenarios and recovery

## Performance Considerations

### 1. Webhook Response Times
- Keep webhook processing under 5 seconds
- Use background jobs for heavy processing
- Return success immediately, process asynchronously if needed

### 2. Database Operations
- Batch goal node creation when possible
- Use proper indexes on conversation and goal tables
- Monitor RPC function performance

### 3. Error Handling
- Always return success from webhooks to prevent ElevenLabs retries
- Log errors but don't block conversation flow
- Implement fallback goal extraction from transcripts

## Security Considerations

### 1. Webhook Authentication
- Verify ElevenLabs webhook signatures
- Use environment variables for secrets
- Implement rate limiting on webhook endpoints

### 2. Data Privacy
- Encrypt sensitive user data in database
- Implement proper RLS policies
- Log access for audit purposes

### 3. API Security
- Validate all input data
- Sanitize user content before storage
- Use service role keys only in edge functions

## Maintenance

### 1. Regular Tasks
- Monitor webhook success rates
- Review goal extraction accuracy
- Update agent prompts based on usage patterns
- Clean up old conversation data

### 2. Upgrades
- Test agent configuration changes in development
- Monitor ElevenLabs API changes
- Update webhook handlers for new data formats
- Maintain compatibility with frontend components

## Troubleshooting Checklist

- [ ] ElevenLabs agent has correct Analysis tab configuration
- [ ] Webhook URLs are accessible and return proper responses
- [ ] Environment variables are set correctly
- [ ] Database has proper RLS policies for user data
- [ ] Edge functions are deployed and have correct permissions
- [ ] Frontend components handle analysis events properly
- [ ] Goal extraction creates nodes in knowledge graph
- [ ] Conversation records are stored with analysis data

## Resources

- [ElevenLabs Conversational AI Documentation](https://elevenlabs.io/docs/conversational-ai)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [LiveGuide Knowledge Graph Schema](../supabase/migrations/)
- [Voice Testing Guide](../tests/voice-testing-README.md)