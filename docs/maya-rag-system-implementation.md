# Maya RAG System Implementation

This document provides complete implementation details for Maya's Retrieval-Augmented Generation (RAG) system in LiveGuide.

## Overview

Maya's RAG system provides real-time access to user context and knowledge for ElevenLabs conversational agents. The system consists of three main components:

1. **Database Functions** - PostgreSQL functions for semantic search and data aggregation
2. **Agent RAG Function** - REST API for ElevenLabs agent integration
3. **MCP RAG Server** - Model Context Protocol server for real-time conversation tools

## Architecture

```
ElevenLabs Agent ─── Agent RAG Function ─── Database Functions
                │                        │
                └─── MCP RAG Server ───────┘
```

## Database Schema Requirements

The system works with the existing LiveGuide schema:

- `graph_nodes` - User's knowledge graph nodes (goals, insights, skills, etc.)
- `knowledge_documents` - Document storage for knowledge base
- `knowledge_chunks` - Vectorized chunks of knowledge documents
- pgvector extension for 1536-dimensional OpenAI embeddings

## Database Functions

### Core Functions

#### `get_user_context_summary(p_user_id, days_back)`

Retrieves comprehensive user context including active goals and recent insights.

```sql
SELECT * FROM get_user_context_summary(
  '97edc6b5-55d6-4b7c-8e6c-8f87dc3b1650'::uuid,
  30
);
```

**Returns:**
- `active_goals`: JSON array of user's goals
- `recent_insights`: JSON array of skills, accomplishments, emotions
- `context_summary`: Human-readable summary
- `total_nodes`: Count of all user's graph nodes

#### `search_insights_semantic(p_user_id, query_embedding, similarity_threshold, max_results)`

Performs semantic search on user's insights using vector similarity.

```sql
SELECT * FROM search_insights_semantic(
  '97edc6b5-55d6-4b7c-8e6c-8f87dc3b1650'::uuid,
  '[0.1, 0.2, ...]'::vector(1536),
  0.6,
  15
);
```

#### `search_user_goals_semantic(p_user_id, query_embedding, include_completed, similarity_threshold, max_results)`

Semantic search specifically for user's goals with optional completion filtering.

#### `find_similar_goal_patterns(target_embedding, user_id_to_exclude, similarity_threshold, max_results)`

Finds anonymized patterns from other users with similar goals for inspiration and benchmarking.

#### `match_knowledge_chunks(query_embedding, match_threshold, match_count)`

Searches knowledge base chunks using vector similarity.

## Edge Functions

### 1. Agent RAG Function (`/functions/v1/agent-rag`)

**Purpose:** Primary integration point for ElevenLabs agents to get user context.

**Endpoint:** `POST /functions/v1/agent-rag`

**Request Format:**
```json
{
  "userId": "uuid",
  "query": "What are my learning goals?",
  "agentId": "optional-agent-id",
  "conversationId": "optional-conversation-id",
  "maxTokens": 12000,
  "includeKnowledgeBase": true,
  "includeSimilarPatterns": true
}
```

**Response Format:**
```json
{
  "context": "formatted context string for ElevenLabs",
  "userSummary": "brief user summary",
  "relevantGoals": [...],
  "relevantInsights": [...],
  "knowledgeChunks": [...],
  "similarPatterns": {...},
  "tokenCount": 8534,
  "truncated": false
}
```

**Key Features:**
- Generates OpenAI embeddings for semantic search
- Formats output for 50k character limit (ElevenLabs constraint)
- Includes similarity scores for relevance ranking
- Optimized for conversation context

### 2. MCP RAG Server (`/functions/v1/mcp-rag-server`)

**Purpose:** Provides MCP tools for real-time conversation access during agent interactions.

**Protocol:** JSON-RPC 2.0 over HTTP

**Available Tools:**

#### `searchUserGoals`
Search user's goals with text or semantic matching.
```json
{
  "name": "searchUserGoals",
  "arguments": {
    "userId": "uuid",
    "query": "career development",
    "searchType": "semantic",
    "limit": 10,
    "includeCompleted": false
  }
}
```

#### `getSimilarJourneys`
Find anonymized patterns from similar users.
```json
{
  "name": "getSimilarJourneys",
  "arguments": {
    "userId": "uuid",
    "goalQuery": "learn web development",
    "minSimilarity": 0.7,
    "maxResults": 5
  }
}
```

#### `getRelevantInsights`
Retrieve insights based on topic similarity.
```json
{
  "name": "getRelevantInsights",
  "arguments": {
    "userId": "uuid",
    "topic": "project management",
    "insightTypes": ["skill", "accomplishment", "emotion"],
    "limit": 15,
    "minSimilarity": 0.6
  }
}
```

#### `getUserContextSummary`
Get comprehensive context summary.
```json
{
  "name": "getUserContextSummary",
  "arguments": {
    "userId": "uuid",
    "daysBack": 30
  }
}
```

#### `searchKnowledgeBase`
Search knowledge base chunks semantically.
```json
{
  "name": "searchKnowledgeBase",
  "arguments": {
    "query": "goal setting techniques",
    "limit": 8,
    "minSimilarity": 0.5
  }
}
```

### 3. Test RAG Function (`/functions/v1/test-rag`)

**Purpose:** Validation and testing of RAG system components.

**Usage:**
```bash
curl "https://PROJECT_URL/functions/v1/test-rag?test=all&userId=UUID"
```

**Test Types:**
- `db` - Database connectivity
- `context` - User context summary
- `knowledge` - Knowledge base search
- `patterns` - Similar goal patterns
- `goals` - Goal semantic search
- `insights` - Insight search

## Integration Guide

### ElevenLabs Agent Setup

1. **Configure Knowledge Base URL:**
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/agent-rag
   ```

2. **Set up Authentication:**
   - Use Supabase service role key in Authorization header
   - Or implement user-specific JWT token validation

3. **Sample Integration:**
   ```javascript
   const response = await fetch('/functions/v1/agent-rag', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_SERVICE_KEY',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       userId: conversation.userId,
       query: conversation.transcript,
       maxTokens: 10000,
       includeKnowledgeBase: true,
       includeSimilarPatterns: true
     })
   });
   
   const context = await response.json();
   // Use context.context in agent prompt
   ```

### MCP Server Integration

1. **ElevenLabs MCP Configuration:**
   ```json
   {
     "mcp_servers": {
       "maya-rag": {
         "command": "curl",
         "args": [
           "-X", "POST",
           "https://YOUR_PROJECT.supabase.co/functions/v1/mcp-rag-server",
           "-H", "Authorization: Bearer YOUR_KEY",
           "-H", "Content-Type: application/json"
         ]
       }
     }
   }
   ```

2. **Tool Usage in Conversation:**
   ```javascript
   // ElevenLabs agent can call tools during conversation
   const userGoals = await mcp.call('searchUserGoals', {
     userId: currentUser.id,
     query: 'current objectives',
     searchType: 'semantic'
   });
   ```

## Performance Considerations

### Embedding Generation
- **Cost:** ~$0.0001 per 1K tokens (OpenAI pricing)
- **Latency:** ~100-300ms per request
- **Optimization:** Cache embeddings for repeated queries

### Database Queries
- **Vector Search:** Uses pgvector cosine distance (`<=>`)
- **Indexes:** Ensure HNSW indexes on embedding columns
- **Query Limits:** Always use LIMIT clauses (max 50 results)

### Memory Usage
- **Token Estimation:** ~4 characters per token
- **Context Limits:** 50k characters for ElevenLabs
- **Truncation:** Graceful truncation with priority ordering

## Security

### Authentication
- Service role key for internal functions
- User JWT validation for client access
- Row Level Security (RLS) on all tables

### Data Privacy
- Similar patterns are fully anonymized
- No user-identifying information in cross-user queries
- Embedding vectors don't contain raw text

### Rate Limiting
- Implement at API Gateway level
- Consider per-user embedding quotas
- Monitor OpenAI API usage

## Monitoring and Logging

### Key Metrics
- RAG request volume and latency
- Embedding generation costs
- Context truncation frequency
- MCP tool usage patterns

### Error Handling
- OpenAI API failures → fallback to text search
- Empty search results → return default context
- Token limit exceeded → intelligent truncation

### Logging
```typescript
console.log('RAG request:', {
  userId,
  queryLength: query.length,
  tokensGenerated: response.tokenCount,
  truncated: response.truncated,
  processingTime: Date.now() - startTime
});
```

## Deployment

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
RAG_MAX_TOKENS=12000
RAG_SIMILARITY_THRESHOLD=0.6
```

### Deployment Commands
```bash
# Deploy all functions
supabase functions deploy agent-rag --project-ref YOUR_PROJECT_REF
supabase functions deploy mcp-rag-server --project-ref YOUR_PROJECT_REF
supabase functions deploy test-rag --project-ref YOUR_PROJECT_REF

# Apply database migrations
supabase db push --project-ref YOUR_PROJECT_REF
```

### Testing
```bash
# Test individual components
node test-maya-rag.js

# Test specific function
curl "https://PROJECT_URL/functions/v1/test-rag?test=context&userId=UUID"

# Load testing
ab -n 100 -c 10 -H "Authorization: Bearer KEY" \
   "https://PROJECT_URL/functions/v1/agent-rag"
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   ```
   Error: OpenAI API key not configured
   ```
   → Set OPENAI_API_KEY environment variable

2. **Vector Dimension Mismatch**
   ```
   Error: vector dimension mismatch
   ```
   → Ensure all embeddings use 1536 dimensions

3. **Context Too Large**
   ```
   Warning: Context truncated
   ```
   → Reduce maxTokens parameter or optimize content

4. **No Search Results**
   ```
   Warning: Empty search results
   ```
   → Lower similarity thresholds or check embedding quality

### Debug Tools

1. **Test Function:**
   ```bash
   curl "PROJECT_URL/functions/v1/test-rag?test=all&userId=UUID"
   ```

2. **Direct Database Query:**
   ```sql
   SELECT embedding IS NOT NULL as has_embedding, count(*)
   FROM graph_nodes 
   WHERE user_id = 'UUID'
   GROUP BY has_embedding;
   ```

3. **Function Logs:**
   ```bash
   supabase functions logs agent-rag --project-ref PROJECT_REF
   ```

## Future Enhancements

### Planned Features
- **Caching Layer:** Redis for frequent queries
- **Batch Processing:** Multiple user contexts in single request  
- **A/B Testing:** Different similarity thresholds by user segment
- **Advanced Analytics:** Context quality metrics

### Performance Optimizations
- **Embedding Caching:** Store frequently used embeddings
- **Query Optimization:** Materialized views for common patterns
- **CDN Integration:** Cache static knowledge base content

This completes the Maya RAG system implementation. The system is production-ready and provides comprehensive semantic search capabilities for ElevenLabs agents with optimal performance and security.