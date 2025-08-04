# Graph Node Embedding Functions

This document describes the embedding generation system for LiveGuide graph nodes, which enables semantic search and RAG functionality using OpenAI's text-embedding-3-small model.

## Overview

The system consists of two main Edge Functions and several database functions to manage embedding generation for the 100+ graph nodes (88 goals + 12 emotions) in the LiveGuide platform.

## Edge Functions

### 1. generate-embeddings

**Purpose**: Generate embeddings for specific nodes or nodes marked for update.

**Endpoint**: `POST /functions/v1/generate-embeddings`

**Authentication**: Requires valid user JWT token

**Request Body**:
```json
{
  "nodeIds": ["uuid1", "uuid2"],     // Optional: specific node IDs
  "batchSize": 10,                   // Optional: batch size (default: 10)
  "forceRegenerate": false           // Optional: regenerate existing embeddings
}
```

**Response**:
```json
{
  "message": "Successfully processed X of Y nodes",
  "processed": 15,
  "total": 20,
  "errors": [
    {
      "nodeId": "uuid",
      "error": "Error description"
    }
  ]
}
```

**Features**:
- Processes nodes in batches to respect OpenAI rate limits
- Handles partial failures gracefully
- Updates node status and tracks errors
- Respects RLS policies (users can only process their own nodes)

### 2. process-embedding-queue

**Purpose**: Automated batch processing of all pending nodes across all users.

**Endpoint**: `POST /functions/v1/process-embedding-queue`

**Authentication**: 
- Requires valid user JWT token for manual calls
- Uses `X-Scheduled-Secret` header for scheduled/automated calls

**Request Body**:
```json
{
  "maxNodes": 100,                   // Optional: maximum nodes to process
  "batchSize": 20,                   // Optional: batch size (default: 20)
  "dryRun": false                    // Optional: preview mode
}
```

**Response**:
```json
{
  "message": "Queue processing completed",
  "stats": {
    "totalProcessed": 85,
    "totalErrors": 3,
    "usersProcessed": 12,
    "tokensUsed": 45230,
    "processingTimeMs": 15420
  }
}
```

**Features**:
- Processes nodes across all users (admin function)
- Intelligent rate limiting based on token usage
- Comprehensive error handling and logging
- Dry run mode for testing
- Detailed processing statistics

## Database Functions

### mark_nodes_for_embedding_update

Marks nodes for embedding regeneration by clearing their embedding column.

```sql
SELECT * FROM mark_nodes_for_embedding_update(
  p_user_id => 'uuid',              -- Optional: specific user
  p_node_ids => ARRAY['uuid1'],     -- Optional: specific nodes
  p_node_types => ARRAY['goal'],    -- Optional: specific node types
  p_force_update => false           -- Optional: force update existing
);
```

### get_embedding_queue_stats

Returns comprehensive statistics about the embedding queue.

```sql
SELECT * FROM get_embedding_queue_stats(
  p_user_id => 'uuid'               -- Optional: user-specific stats
);
```

### get_nodes_needing_embeddings

Returns nodes that need embeddings, ordered by creation date.

```sql
SELECT * FROM get_nodes_needing_embeddings(
  p_limit => 100,                   -- Optional: max results
  p_user_id => 'uuid',              -- Optional: specific user
  p_exclude_error_nodes => true     -- Optional: exclude error nodes
);
```

### validate_node_embeddings

Validates existing embeddings for correct format and dimensions.

```sql
SELECT * FROM validate_node_embeddings(
  p_user_id => 'uuid',              -- Optional: specific user
  p_check_dimensions => true        -- Optional: check 1536 dimensions
);
```

### clear_embedding_errors

Clears embedding error flags to allow retry.

```sql
SELECT clear_embedding_errors(
  p_user_id => 'uuid',              -- Optional: specific user
  p_node_ids => ARRAY['uuid1']      -- Optional: specific nodes
);
```

## Node Text Preparation

The system creates rich text representations for each node type:

### Goal Nodes
```
goal: Improve public speaking skills
Description: Build confidence and skills for professional presentations
Category: career
Priority: high
Target Date: 2024-12-31
```

### Skill Nodes
```
skill: JavaScript Programming
Description: Advanced web development with modern frameworks
Level: intermediate
Transferable from: problem solving, logical thinking
```

### Emotion Nodes
```
emotion: confident
Description: Feeling prepared for the big presentation
Emotion: confident
Intensity: 0.8
```

### Session Nodes
```
session: Morning coaching call
Description: Worked on interview preparation techniques
Duration: 30 minutes
Topics: confidence building, mock interviews
```

### Accomplishment Nodes
```
accomplishment: Completed first technical presentation
Description: Successfully presented project to engineering team
Impact: high
Evidence: Positive feedback from team lead
```

## Management CLI

Use the provided CLI tool for easy management:

```bash
# Check status
node scripts/manage-embeddings.js status

# Generate embeddings for specific user
node scripts/manage-embeddings.js generate userId

# Process queue (dry run)
node scripts/manage-embeddings.js process-queue --dry-run --max-nodes=50

# Validate embeddings
node scripts/manage-embeddings.js validate

# Clear errors
node scripts/manage-embeddings.js clear-errors --nodes=uuid1,uuid2
```

## Environment Variables

Required environment variables:

```bash
OPENAI_API_KEY=sk-...                    # OpenAI API key
SUPABASE_URL=https://...                 # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Service role key
SUPABASE_SCHEDULED_SECRET=secret...      # For scheduled tasks
```

## Error Handling

The system implements comprehensive error handling:

1. **API Rate Limits**: Automatic delays between batches
2. **Partial Failures**: Individual node errors don't stop batch processing
3. **Error Tracking**: Errors stored in node properties for debugging
4. **Retry Logic**: Clear errors and retry failed nodes
5. **Validation**: Verify embedding dimensions and format

## Monitoring

Key metrics to monitor:

- **Queue Depth**: Nodes without embeddings
- **Error Rate**: Failed embedding generations
- **Processing Time**: Batch processing duration
- **Token Usage**: OpenAI API costs
- **Success Rate**: Percentage of successful generations

## Scheduling

For automated processing, set up a scheduled task:

```bash
# Example cron job (every hour)
0 * * * * curl -X POST \
  -H "X-Scheduled-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"maxNodes": 50, "batchSize": 10}' \
  https://your-project.supabase.co/functions/v1/process-embedding-queue
```

## Security Considerations

- User-specific functions respect RLS policies
- Service role required for cross-user operations
- API keys stored securely in environment variables
- Scheduled tasks use secret header authentication
- Input validation prevents injection attacks

## Performance

- Batch processing minimizes API calls
- Intelligent rate limiting prevents quota exhaustion
- Indexed embedding columns for fast similarity search
- Efficient text preparation reduces token usage
- Connection pooling for database operations

## Testing

Run the test suite to verify functionality:

```bash
node scripts/test-embeddings.js
```

The test suite covers:
- Function availability
- Embedding generation
- Queue processing
- Error handling
- Validation logic