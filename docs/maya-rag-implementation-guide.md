# Maya RAG Implementation Guide

## Quick Start: Connecting LiveGuide's Knowledge Graph to ElevenLabs

### Step 1: Create the RAG API Endpoint

Create a new edge function that Maya can query for dynamic context:

```typescript
// supabase/functions/agent-rag/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const { userId, query, agentId, conversationId } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // 1. Get user's recent context
  const userContext = await getUserContext(supabase, userId)
  
  // 2. Semantic search for relevant knowledge
  const relevantKnowledge = await searchKnowledge(supabase, query, userId)
  
  // 3. Find similar user patterns (anonymized)
  const patterns = await findSimilarPatterns(supabase, userContext.goals)
  
  // 4. Format for ElevenLabs (max 50k chars)
  const formattedContext = formatForElevenLabs({
    userContext,
    relevantKnowledge,
    patterns,
    maxChars: 50000
  })
  
  return new Response(JSON.stringify({
    context: formattedContext,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      contextSize: formattedContext.length
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

async function getUserContext(supabase, userId) {
  // Fetch user's goals, insights, and recent interactions
  const { data: goals } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('node_type', 'goal')
    .order('created_at', { ascending: false })
    .limit(5)
  
  const { data: insights } = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('node_type', 'insight')
    .order('created_at', { ascending: false })
    .limit(10)
  
  return { goals, insights }
}

async function searchKnowledge(supabase, query, userId) {
  // Generate embedding for the query
  const embedding = await generateEmbedding(query)
  
  // Search using pgvector
  const { data } = await supabase.rpc('search_knowledge_chunks', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  })
  
  return data
}

async function findSimilarPatterns(supabase, userGoals) {
  // Find anonymized patterns from users with similar goals
  const patterns = []
  
  for (const goal of userGoals) {
    const { data } = await supabase.rpc('find_similar_goal_patterns', {
      goal_embedding: goal.embedding,
      exclude_user_id: goal.user_id,
      limit: 3
    })
    
    patterns.push(...data.map(d => ({
      ...d,
      // Anonymize the data
      user_id: undefined,
      user_name: undefined
    })))
  }
  
  return patterns
}

function formatForElevenLabs(data, maxChars = 50000) {
  let context = ''
  
  // Priority 1: User's current goals
  if (data.userContext.goals?.length > 0) {
    context += '## Your Current Goals\n'
    data.userContext.goals.forEach(g => {
      context += `- ${g.label}: ${g.description}\n`
    })
    context += '\n'
  }
  
  // Priority 2: Recent insights
  if (data.userContext.insights?.length > 0) {
    context += '## Your Recent Insights\n'
    data.userContext.insights.slice(0, 5).forEach(i => {
      context += `- ${i.label}\n`
    })
    context += '\n'
  }
  
  // Priority 3: Relevant knowledge
  if (data.relevantKnowledge?.length > 0) {
    context += '## Relevant Information\n'
    data.relevantKnowledge.forEach(k => {
      context += `${k.content}\n\n`
    })
  }
  
  // Priority 4: Similar patterns (if space allows)
  if (context.length < maxChars * 0.7 && data.patterns?.length > 0) {
    context += '## Common Patterns\n'
    context += 'Other users with similar goals often:\n'
    data.patterns.forEach(p => {
      context += `- ${p.pattern_description}\n`
    })
  }
  
  // Truncate if needed
  if (context.length > maxChars) {
    context = context.substring(0, maxChars - 100) + '\n[Content truncated]'
  }
  
  return context
}
```

### Step 2: Configure ElevenLabs Agent Settings

In the ElevenLabs dashboard, update Maya's configuration:

#### A. System Prompt Enhancement
Add this to Maya's system prompt:
```
KNOWLEDGE ACCESS:
You have access to a dynamic knowledge base that includes:
- The user's complete goal and insight history
- Relevant information from LiveGuide's knowledge graph  
- Anonymized patterns from similar user journeys
- Real-time updates as the conversation progresses

Use this information to:
- Reference the user's specific goals when relevant
- Provide personalized guidance based on their history
- Suggest strategies that have worked for similar users
- Build on previous insights they've discovered
```

#### B. Custom Variables Setup
In the agent's Platform Settings, configure:
```json
{
  "customVariables": {
    "userId": "{{user_id}}",
    "userName": "{{user_name}}",
    "userState": "{{user_state}}",
    "currentGoals": "{{current_goals}}",
    "knowledgeContext": "{{knowledge_context}}"
  }
}
```

#### C. Webhook Configuration

**Initiation Webhook URL**: 
`https://your-domain.com/api/elevenlabs-init-rag`

```typescript
// api/elevenlabs-init-rag/route.ts
export async function POST(request: Request) {
  const { userId, conversationId } = await request.json()
  
  // Fetch initial RAG context
  const ragResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/agent-rag`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      query: 'initial context',
      agentId: 'maya',
      conversationId
    })
  })
  
  const ragData = await ragResponse.json()
  
  return Response.json({
    success: true,
    customVariables: {
      userId,
      knowledgeContext: ragData.context // This gets injected into Maya's context
    }
  })
}
```

### Step 3: Enable Real-Time Updates via MCP

Create an MCP server that Maya can query during conversations:

```typescript
// supabase/functions/mcp-rag-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'

const server = new Server({
  name: 'liveguide-rag',
  version: '1.0.0'
})

// Tool: Search user's goals
server.setRequestHandler('searchUserGoals', async (params) => {
  const { userId, query } = params
  
  const results = await supabase
    .from('graph_nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('node_type', 'goal')
    .textSearch('fts', query)
    .limit(5)
  
  return {
    results: results.data,
    formatted: formatGoalsForAgent(results.data)
  }
})

// Tool: Get similar user journeys
server.setRequestHandler('getSimilarJourneys', async (params) => {
  const { goalType, userId } = params
  
  const patterns = await supabase.rpc('find_journey_patterns', {
    goal_type: goalType,
    exclude_user: userId,
    limit: 3
  })
  
  return {
    patterns: patterns.data,
    suggestions: extractSuggestions(patterns.data)
  }
})

// Tool: Retrieve relevant insights
server.setRequestHandler('getRelevantInsights', async (params) => {
  const { topic, userId } = params
  
  const embedding = await generateEmbedding(topic)
  
  const insights = await supabase.rpc('search_insights_semantic', {
    query_embedding: embedding,
    user_id: userId,
    threshold: 0.75,
    limit: 5
  })
  
  return {
    insights: insights.data,
    summary: summarizeInsights(insights.data)
  }
})
```

### Step 4: Database Functions for RAG Support

Add these PostgreSQL functions to support RAG queries:

```sql
-- Function to find similar goal patterns (anonymized)
CREATE OR REPLACE FUNCTION find_similar_goal_patterns(
  goal_embedding vector(1536),
  exclude_user_id uuid,
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  pattern_description text,
  success_rate float,
  common_obstacles text[],
  effective_strategies text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH similar_goals AS (
    SELECT 
      gn.id,
      gn.label,
      gn.description,
      1 - (gn.embedding <=> goal_embedding) as similarity
    FROM graph_nodes gn
    WHERE 
      gn.node_type = 'goal'
      AND gn.user_id != exclude_user_id
      AND gn.embedding IS NOT NULL
      AND 1 - (gn.embedding <=> goal_embedding) > 0.8
    ORDER BY similarity DESC
    LIMIT 20
  ),
  goal_patterns AS (
    SELECT 
      sg.label,
      COUNT(DISTINCT ge.source_id) as achievement_count,
      ARRAY_AGG(DISTINCT obstacle.label) FILTER (WHERE obstacle.label IS NOT NULL) as obstacles,
      ARRAY_AGG(DISTINCT strategy.label) FILTER (WHERE strategy.label IS NOT NULL) as strategies
    FROM similar_goals sg
    LEFT JOIN graph_edges ge ON ge.target_id = sg.id AND ge.edge_type = 'achieved'
    LEFT JOIN graph_nodes obstacle ON obstacle.id = ge.source_id AND obstacle.node_type = 'obstacle'
    LEFT JOIN graph_nodes strategy ON strategy.id = ge.source_id AND strategy.node_type = 'strategy'
    GROUP BY sg.label
  )
  SELECT 
    gp.label as pattern_description,
    (gp.achievement_count::float / 20) as success_rate,
    gp.obstacles[1:3] as common_obstacles,
    gp.strategies[1:3] as effective_strategies
  FROM goal_patterns gp
  ORDER BY gp.achievement_count DESC
  LIMIT limit_count;
END;
$$;

-- Function for semantic insight search
CREATE OR REPLACE FUNCTION search_insights_semantic(
  query_embedding vector(1536),
  user_id uuid,
  threshold float DEFAULT 0.75,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  insight_id uuid,
  content text,
  relevance float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id as insight_id,
    gn.description as content,
    1 - (gn.embedding <=> query_embedding) as relevance,
    gn.created_at
  FROM graph_nodes gn
  WHERE 
    gn.user_id = user_id
    AND gn.node_type = 'insight'
    AND gn.embedding IS NOT NULL
    AND 1 - (gn.embedding <=> query_embedding) > threshold
  ORDER BY relevance DESC, gn.created_at DESC
  LIMIT limit_count;
END;
$$;
```

### Step 5: Testing the Integration

Create a test script to verify the RAG system:

```javascript
// scripts/test-maya-rag.js
async function testMayaRAG() {
  const userId = 'test-user-id'
  
  // 1. Test RAG endpoint
  console.log('Testing RAG endpoint...')
  const ragResponse = await fetch('http://localhost:54321/functions/v1/agent-rag', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      query: 'I want to improve my public speaking',
      agentId: 'maya',
      conversationId: 'test-conv-123'
    })
  })
  
  const ragData = await ragResponse.json()
  console.log('RAG Context Length:', ragData.context.length)
  console.log('First 500 chars:', ragData.context.substring(0, 500))
  
  // 2. Test webhook integration
  console.log('\nTesting webhook integration...')
  const webhookResponse = await fetch('http://localhost:3000/api/elevenlabs-init-rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      conversationId: 'test-conv-123'
    })
  })
  
  const webhookData = await webhookResponse.json()
  console.log('Webhook response:', webhookData)
  
  // 3. Verify knowledge search
  console.log('\nTesting knowledge search...')
  const searchResponse = await fetch('http://localhost:3000/api/knowledge/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'public speaking anxiety',
      agentId: 'maya',
      limit: 3
    })
  })
  
  const searchData = await searchResponse.json()
  console.log('Found', searchData.results.length, 'relevant knowledge chunks')
}

testMayaRAG().catch(console.error)
```

## Next Steps

1. **Deploy the RAG edge function** to Supabase
2. **Configure Maya** in ElevenLabs with the webhook URLs
3. **Test the integration** with sample conversations
4. **Monitor and optimize** based on conversation quality
5. **Expand to other agents** using the same infrastructure

## Key Benefits

- **Dynamic Context**: Maya always has the latest user information
- **Semantic Understanding**: Finds relevant information even with different wording
- **Pattern Recognition**: Learns from successful user journeys
- **Privacy Preserved**: Other users' data is anonymized
- **Scalable Architecture**: Same system works for all agents