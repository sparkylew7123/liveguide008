# ElevenLabs Webhook Payload Guide for LiveGuide Integration

## Overview

This document describes the required webhook payload format for integrating ElevenLabs conversational agents with the LiveGuide knowledge graph system via N8N workflow automation.

## Webhook Endpoint

```
POST https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a
Content-Type: application/json
```

## Processing Modes

The webhook supports two processing modes, controlled by the `mode` field in the payload:

### 1. Direct Mode (`mode: "direct"`)
- **Purpose**: Fast, deterministic processing of structured data
- **Use Case**: When ElevenLabs has already extracted structured goals, insights, and other data
- **Processing**: Creates nodes directly without AI interpretation
- **Response Time**: ~1-2 seconds
- **Reliability**: High - no external API dependencies

### 2. AI Agent Mode (`mode: "ai_agent"`)
- **Purpose**: Intelligent processing using OpenAI for interpretation
- **Use Case**: When you need AI to analyze and extract insights from unstructured conversation data
- **Processing**: Uses OpenAI GPT to analyze transcript and create appropriate nodes
- **Response Time**: ~5-10 seconds
- **Reliability**: Depends on OpenAI API availability

## Payload Structure

### Required Fields

```json
{
  "mode": "direct",                    // Required: "direct" or "ai_agent"
  "conversationId": "uuid-here",        // Required: Unique conversation identifier
  "userId": "user-uuid",                // Optional: Defaults to test user if not provided
  "transcript": "conversation text",    // Required: The conversation transcript
  "analysis": {                        // Optional but recommended for direct mode
    "summary": "brief summary",        // Optional: Conversation summary
    "goals": [],                       // Optional: Array of goal objects
    "insights": []                     // Optional: Array of insight objects
  }
}
```

### Complete Example Payload

```json
{
  "mode": "direct",
  "conversationId": "conv-2025-01-10-abc123",
  "userId": "907f679d-b36a-42a8-8b60-ce0d9cc11726",
  "transcript": "I want to improve my public speaking skills and launch my startup this year. I've been thinking about taking a course and practicing regularly.",
  "analysis": {
    "summary": "User discussed personal development goals focusing on communication skills and entrepreneurship.",
    "goals": [
      {
        "text": "Improve public speaking abilities",
        "timescale": "3 months",
        "title": "Public Speaking Mastery"  // Optional
      },
      {
        "text": "Launch startup company",
        "timescale": "1 year",
        "title": "Startup Launch"            // Optional
      }
    ],
    "insights": [
      {
        "text": "Confidence is built through practice and preparation",
        "title": "Practice Builds Confidence"  // Optional
      },
      {
        "text": "Breaking down large goals into smaller milestones helps maintain momentum",
        "title": "Milestone Approach"          // Optional
      }
    ],
    "emotions": [  // Optional array for emotional tracking
      {
        "text": "Excited about the startup opportunity",
        "type": "positive"
      }
    ]
  }
}
```

## Node Types Created

Based on the payload data, the following node types are created in the knowledge graph:

| Node Type | Created From | Description |
|-----------|--------------|-------------|
| `session` | Always created | Represents the conversation session |
| `goal` | `analysis.goals[]` | User objectives with timescales |
| `skill` | `analysis.insights[]` | Insights and learnings (labeled as "skill" in DB) |
| `emotion` | `analysis.emotions[]` | Emotional states (if provided) |

## Response Format

### Successful Response (Direct Mode)

```json
{
  "mode": "direct",
  "conversationId": "conv-2025-01-10-abc123",
  "timestamp": "2025-01-10T09:18:59.805Z",
  "toolsExecuted": 5,
  "results": [
    {
      "tool": "create_node",
      "success": true,
      "data": {
        "id": "5ed8bb2a-b8d2-4a9b-a90a-5dc5e2a138f1",
        "node_type": "session",
        "label": "Session 2025-01-10T09:18:58.163Z",
        "description": "I want to improve my public speaking skills...",
        "user_id": "907f679d-b36a-42a8-8b60-ce0d9cc11726",
        "status": "draft_verbal",
        "created_at": "2025-01-10T09:18:58.638054+00:00"
      }
    },
    // ... more nodes
  ]
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-01-10T09:18:59.805Z"
}
```

## Field Specifications

### Goals Array Structure

Each goal object should contain:
- `text` (required): The goal description
- `timescale` (optional): Time frame for the goal (e.g., "3 months", "1 year")
- `title` (optional): Short title for the goal (defaults to first 50 chars of text)

### Insights Array Structure

Each insight object should contain:
- `text` (required): The insight or learning
- `title` (optional): Short title for the insight (defaults to first 50 chars of text)

### Emotions Array Structure (Optional)

Each emotion object should contain:
- `text` (required): Description of the emotional state
- `type` (optional): Classification like "positive", "negative", "neutral"

## Integration Best Practices

### 1. Use Direct Mode When Possible
Direct mode is faster and more reliable. Use it when ElevenLabs has already extracted structured data.

### 2. Provide User ID
Always include the `userId` field to ensure proper data isolation and multi-tenant support.

### 3. Include Timescales for Goals
Adding timescales helps track goal progression and priorities.

### 4. Meaningful Conversation IDs
Use descriptive, unique conversation IDs that can be traced back to the original conversation.

### 5. Error Handling
- Check HTTP status code (200 = success)
- Parse response to verify nodes were created
- Log failed attempts with full payload for debugging

## Testing the Integration

### Test Direct Mode
```bash
curl -X POST https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "direct",
    "conversationId": "test-'$(date +%s)'",
    "userId": "907f679d-b36a-42a8-8b60-ce0d9cc11726",
    "transcript": "Test conversation",
    "analysis": {
      "goals": [{"text": "Test goal", "timescale": "1 month"}]
    }
  }'
```

### Expected Response Validation
- `toolsExecuted` should match the expected number of nodes (1 session + number of goals + number of insights)
- Each result in `results[]` should have `success: true`
- Each created node should have a unique `id`

## Troubleshooting

### No Response or Empty Response
- Verify the webhook URL is correct
- Check that `mode` field is set to either "direct" or "ai_agent"
- Ensure JSON is valid (use a JSON validator)

### Nodes Not Created (toolsExecuted: 0)
- Check that `analysis` object contains `goals` or `insights` arrays
- Verify `userId` is a valid UUID
- Ensure text fields are not empty

### 500 Internal Server Error
- Check N8N workflow status (should be active)
- Verify MCP server is operational
- Check Supabase connection

## Security Considerations

1. **Authentication**: Currently using webhook URL as authentication. Consider adding webhook secret validation.
2. **Rate Limiting**: No built-in rate limiting - implement at ElevenLabs side if needed.
3. **Data Validation**: All text fields are stored as-is. Implement sanitization if needed.
4. **User Isolation**: Data is isolated by `userId` with row-level security in Supabase.

## Future Enhancements

- [ ] Add webhook secret validation
- [ ] Support for batch processing multiple conversations
- [ ] Add support for updating existing nodes
- [ ] Include relationship creation between nodes
- [ ] Add support for custom node properties
- [ ] Implement retry mechanism for failed node creation

## Contact

For issues or questions about the webhook integration, check:
- N8N workflow logs at https://n8n-hatchdev.fly.dev
- MCP server logs via Supabase edge functions
- Database state via Supabase dashboard