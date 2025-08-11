# N8N Workflow Configuration Fix

## Node Connections Required:

1. **ElevenLabs Webhook** → **Parse & Prepare Tools**
2. **ElevenLabs Webhook** → **LiveGuide AI Agent** (for prompt data)
3. **MCP Tool Wrapper** → **LiveGuide AI Agent** (ai_tool input)
4. **OpenAI Model** → **LiveGuide AI Agent** (ai_languageModel input)

## LiveGuide AI Agent Configuration:

### Prompt Field:
```javascript
{{ $json.transcript || "Analyze conversation: " + JSON.stringify($json) }}
```

### System Message:
```
You are a LiveGuide assistant that processes conversation data and manages the knowledge graph.

When you receive conversation data, you should:
1. Use search_nodes to check for existing similar content
2. Use create_node to add new goals, insights, or emotions
3. Use create_edge to connect related concepts
4. Use update_goal_progress if the user mentions progress on existing goals

Available tools:
- get_user_graph: Retrieve complete user graph
- search_nodes: Search for existing nodes
- create_node: Create new nodes (types: goal, skill, emotion, session, accomplishment)
- create_edge: Create relationships
- update_node: Update existing nodes
- get_recent_nodes: Get recent activity
- update_goal_progress: Update goal status
- get_temporal_context: Get time-based data

Always provide the userId: "907f679d-b36a-42a8-8b60-ce0d9cc11726" in tool calls.
```

## MCP Tool Wrapper Configuration:

### URL:
```
https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server
```

### Method:
```
POST
```

### Headers:
- Name: `Content-Type` Value: `application/json`

### Body (JSON):
```json
{
  "jsonrpc": "2.0",
  "id": {{ Date.now() }},
  "method": "tools/call",
  "params": {
    "name": "{{ $json.tool }}",
    "arguments": {{ JSON.stringify($json.arguments) }}
  }
}
```

### Placeholder Definitions:

1. **tool** (string)
   - Description: "Tool name (e.g., create_node, search_nodes)"
   - Required: Yes

2. **arguments** (object)
   - Description: "Tool arguments including instructions"
   - Required: Yes

## Testing the Fixed Workflow:

1. Save all changes
2. Activate the workflow (toggle in top-right)
3. Test with webhook:

```bash
curl -X POST https://n8n-hatchdev.fly.dev/webhook/elevenlabs-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I want to learn guitar and get better at cooking",
    "userId": "907f679d-b36a-42a8-8b60-ce0d9cc11726"
  }'
```

## Alternative: Simple Direct Processing

If the AI Agent is too complex, you can bypass it and directly process the webhook data:

1. **ElevenLabs Webhook** → **Parse & Prepare Tools** → **Call MCP Tool** (in a loop)

This simpler approach just extracts goals/insights and creates nodes without AI interpretation.