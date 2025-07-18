# ElevenLabs WebSocket API Implementation

## Overview

This document outlines how we properly implement the ElevenLabs WebSocket API for conversational AI, following the official specification at: https://elevenlabs.io/docs/conversational-ai/api-reference/conversational-ai/websocket

## WebSocket Connection Format

According to the ElevenLabs documentation, the WebSocket connection should be made to:
```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id=<AGENT_ID>&user_id=<USER_ID>&custom_call_id=<CALL_ID>&metadata=<METADATA>
```

## Query Parameters

### Required Parameters
- `agent_id`: The ID of the conversational AI agent

### Optional Parameters
- `user_id`: Unique identifier for the user (used for webhook association)
- `custom_call_id`: Custom identifier for tracking the conversation
- `metadata`: URL-encoded JSON object containing additional context

## Implementation Details

### 1. Custom Call ID Generation

We generate unique call IDs for tracking conversations:

```typescript
function generateCallId(userId: string, sessionType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${sessionType}_${userId}_${timestamp}_${random}`;
}
```

### 2. Metadata Formatting

Metadata is passed as URL-encoded JSON containing:

```typescript
{
  user_id: string,           // User identifier
  user_name: string,         // User's display name
  session_type: string,      // 'goal_discovery' | 'coaching_style_discovery'
  onboarding_phase: string,  // Current onboarding phase
  selected_goals?: string,   // Comma-separated goals (coaching phase)
  webhook_enabled: 'true',   // Indicates webhook is active
  timestamp: string          // ISO timestamp
}
```

### 3. Session Configuration

Our components now properly configure sessions:

```typescript
const sessionConfig = {
  agentId: ELEVENLABS_AGENT_ID,
  options: {
    conversationId: customCallId,
    metadata: {
      user_id: user.id,
      user_name: userName,
      session_type: 'goal_discovery',
      onboarding_phase: 'goal_discovery',
      webhook_enabled: 'true',
      timestamp: new Date().toISOString()
    }
  }
};
```

### 4. Webhook Integration

The webhook receives enhanced event data including:

```typescript
interface ElevenLabsWebhookEvent {
  event_type: string;
  conversation_id: string;
  agent_id: string;
  user_id?: string;        // Passed from WebSocket URL
  custom_call_id?: string; // Passed from WebSocket URL
  timestamp: string;
  data: {
    metadata?: any;        // Contains our custom metadata
    // ... other fields
  }
}
```

## Current Implementation Status

### ✅ Completed
- Updated GoalDiscoveryFlow to use proper WebSocket API
- Updated CoachingStyleDiscovery to use proper WebSocket API
- Enhanced webhook to handle user_id and custom_call_id
- Added custom call ID generation and tracking
- Proper metadata formatting and passing

### 🔄 In Progress
- Testing WebSocket connection with actual ElevenLabs API
- Verifying metadata is properly received in webhook

### 📋 Next Steps
1. Test the complete flow with actual conversations
2. Verify webhook receives proper user_id and custom_call_id
3. Ensure metadata is correctly parsed and stored
4. Monitor conversation tracking in database

## Benefits of Proper Implementation

1. **Better Tracking**: Custom call IDs allow precise conversation tracking
2. **User Association**: User ID properly associates conversations with users
3. **Rich Context**: Metadata provides context for goal/preference extraction
4. **Webhook Integration**: Proper data flow between WebSocket and webhook
5. **Debugging**: Clear conversation identifiers for troubleshooting

## Testing

To test the implementation:

1. Start a conversation in the onboarding flow
2. Check browser network tab for WebSocket connection URL
3. Verify webhook receives events with proper user_id and custom_call_id
4. Check database for conversation records with all metadata

## Agent Configuration

Current agent (Maya) is configured with:
- **Agent ID**: `sAy4k9iMrBKKO6UyqYwV` (as configured in environment)
- **Name**: Maya - LiveGuide Onboarding Specialist
- **Voice**: Sarah (warm, professional)
- **Specialized prompts**: Goal discovery and coaching style assessment

The implementation now properly follows the ElevenLabs WebSocket API specification for optimal conversation tracking and webhook integration.