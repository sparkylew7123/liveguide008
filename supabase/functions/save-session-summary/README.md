# Save Session Summary Edge Function

This Edge Function processes coaching session transcripts, generates AI-powered summaries and action items, and creates graph model nodes to track user progress.

## Features

- Accepts coaching session transcript and optionally a summary
- Uses OpenAI to generate summary and extract action items if not provided
- Creates Session nodes in the graph database
- Creates Accomplishment nodes for each action item
- Links Session to Goal with WORKS_ON edge
- Links Accomplishments to Session with DERIVED_FROM edge
- Updates elevenlabs_conversations table if session_id is provided

## Required Environment Variables

```bash
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Request Format

```typescript
{
  user_id: string;           // Required: User UUID
  goal_id: string;           // Required: Goal UUID to link session to
  transcript: string;        // Required: Full conversation transcript
  summary?: string;          // Optional: Pre-generated summary
  session_id?: string;       // Optional: ElevenLabs session ID
  agent_id?: string;         // Optional: Agent identifier
  duration_minutes?: number; // Optional: Session duration
  metadata?: object;         // Optional: Additional metadata
}
```

## Response Format

```typescript
{
  success: true,
  message: "Session summary saved successfully",
  data: {
    session_node_id: string,      // UUID of created session node
    summary: string,              // Generated or provided summary
    accomplishments: string[],    // List of action items
    accomplishment_ids: string[]  // UUIDs of created accomplishment nodes
  }
}
```

## Deployment

1. Ensure the database migration for the updated `create_session_node` function is applied:
   ```bash
   supabase migration up
   ```

2. Set the required environment variables:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-api-key
   ```

3. Deploy the function:
   ```bash
   supabase functions deploy save-session-summary
   ```

## Error Handling

- Returns 400 for missing required fields
- Returns 500 for internal errors with details
- Falls back to basic summary if OpenAI fails
- Continues processing even if individual accomplishment creation fails

## Example Usage

```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/save-session-summary`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      user_id: 'user-uuid',
      goal_id: 'goal-uuid',
      transcript: 'Full conversation transcript...',
      duration_minutes: 30
    })
  }
);

const result = await response.json();
```