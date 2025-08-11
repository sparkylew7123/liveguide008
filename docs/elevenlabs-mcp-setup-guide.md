# ElevenLabs Agent MCP Setup Guide

## 🚀 Quick Setup Steps

### 1. Create New Agent
1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Click "Create Agent"
3. Name it: "LiveGuide Coach - MCP Test"

### 2. Configure Basic Settings

#### General Tab:
- **First Message**: 
  ```
  Hello! I'm your LiveGuide coach. I can help you track your goals, capture insights, and explore your growth journey. What's on your mind today?
  ```
- **System Prompt**: (Copy from `elevenlabs-agent-config.json`)
- **Model**: Gemini 2.0 Flash or GPT-4
- **Voice**: Sarah or similar warm voice
- **Temperature**: 0.7

### 3. Add MCP Integration

#### Integrations Tab:
1. Click "Add Integration"
2. Select "Model Context Protocol (MCP)"
3. Configure:
   - **Server URL**: `https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server`
   - **Transport**: HTTP
   - **Authentication**: Bearer Token
   - **Token**: `test-token` (or generate a secure one)

### 4. Enable MCP Tools

In the MCP configuration, enable these tools:
- ✅ getUserGraph
- ✅ getActiveGoals  
- ✅ searchNodes
- ✅ createNode
- ✅ createEdge
- ✅ updateGoalStatus
- ✅ getRecentInsights
- ✅ getTemporalContext
- ✅ findRelatedInsights
- ✅ extractKeyTopics

### 5. Configure Webhooks (Optional)

#### Widget Tab:
- **Pre-conversation webhook**: 
  ```
  https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-webhook?event=pre
  ```
- **Post-conversation webhook**:
  ```
  https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/elevenlabs-webhook?event=post
  ```

### 6. Set Up Analysis (Optional)

#### Analysis Tab:
Add evaluation criteria:
1. **User_Goals** (List) - Extract goals mentioned
2. **Key_Insights** (List) - Capture realizations
3. **Emotional_State** (Text) - Identify emotions
4. **Action_Items** (List) - Next steps

## 🧪 Testing the Integration

### Test 1: Basic Connection
Say: "Hello, can you see my knowledge graph?"

**Expected**: Agent should call `getUserGraph` and report node/edge counts

### Test 2: Goal Creation
Say: "I want to launch my product by the end of next month"

**Expected**: 
1. `searchNodes` - Check for existing goals
2. `createNode` - Create new goal node
3. `getActiveGoals` - Show updated list

### Test 3: Emotional Tracking
Say: "I'm feeling overwhelmed with all these tasks"

**Expected**:
1. `createNode` - Create emotion node
2. `getTemporalContext` - Find patterns
3. `findRelatedInsights` - Offer relevant advice

### Test 4: Progress Update
Say: "I completed the MVP prototype!"

**Expected**:
1. `searchNodes` - Find MVP-related goals
2. `updateGoalStatus` - Mark as completed
3. `createNode` - Create accomplishment node

## 🔍 Debugging

### Check MCP Server Logs:
```bash
supabase functions logs mcp-server --project-ref hlwxmfwrksflvcacjafg
```

### Test MCP Server Directly:
```bash
curl -X POST https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Common Issues:

1. **"Invalid API key"**: Check bearer token in MCP config
2. **"Tool not found"**: Ensure tool is enabled in agent settings
3. **"User not found"**: Need to pass userId in tool parameters
4. **No graph data**: Create test data first using the app

## 📝 Notes

- The MCP server currently has JWT verification disabled for testing
- For production, implement proper authentication
- Each conversation enriches the knowledge graph
- The agent maintains context across sessions through the graph

## 🎯 Success Indicators

✅ Agent acknowledges your graph data
✅ Creates nodes when you mention goals/insights
✅ References past conversations
✅ Updates goal progress
✅ Identifies emotional patterns
✅ Makes connections between concepts

---

Ready to test? The MCP server is live at:
`https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server`