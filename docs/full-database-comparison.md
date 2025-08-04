# Full Database Schema Comparison: Production vs Development

## Executive Summary

After comprehensive analysis, **Production is the more complete and mature schema** that should be used as the source of truth.

## Table Comparison

### Tables in Both Environments (27 tables)
Both production and dev have the same 27 base tables:
- agent_knowledge_bases
- agent_personae
- coaching_effectiveness
- conversation_insights
- document_access_logs
- document_categories
- document_chunks
- elevenlabs_conversations
- goal_categories
- goal_progress
- graph_edges
- graph_nodes
- inbox_messages
- knowledge_base
- knowledge_categories
- knowledge_chunks
- knowledge_documents
- message_attachments
- message_read_receipts
- profiles
- subscriptions
- user_coaching_journey
- user_goals
- users
- voice_chat_conversations
- voice_chat_events
- webhook_events

### Views
- **Production**: 2 views (graph_monitoring_dashboard, user_goals_graph)
- **Dev**: 1 view (user_goals_graph)
- **Missing in Dev**: graph_monitoring_dashboard

## Key Schema Differences

### 1. graph_nodes Table (CRITICAL DIFFERENCE)
**Production has 4 additional columns:**
- `status` (node_status enum) - for draft vs curated states
- `embedding` (vector) - for semantic search
- `embedding_generated_at` (timestamptz)
- `embedding_status` (text)

**Dev is missing these critical features for AI/RAG functionality**

### 2. Custom Types
**Production has:**
- `node_status` enum ('draft_verbal', 'curated')
- All other enum types present in both

**Dev is missing:**
- `node_status` enum

### 3. Indexes
**Production has 27 indexes on graph tables:**
- Advanced performance optimization
- Vector similarity search indexes
- Unique constraint preventing duplicate goals

**Dev has basic indexes only**

### 4. Other Tables Comparison
All other tables appear to have identical column structures between environments.

## Database Maturity Assessment

### Production Database Strengths:
1. **Complete AI Infrastructure**: Vector embeddings for semantic search
2. **Node Lifecycle Management**: Status tracking system
3. **Performance Optimization**: Comprehensive indexing strategy
4. **Data Integrity**: Unique constraints to prevent duplicates
5. **Monitoring**: Dashboard view for analytics

### Dev Database Weaknesses:
1. **No AI/RAG Support**: Missing embedding infrastructure
2. **No Status System**: Can't track draft vs curated nodes
3. **Poor Performance**: Missing critical indexes
4. **No Monitoring**: Missing dashboard view
5. **Allows Duplicates**: No unique constraint on goals

## Project Goal Alignment

For LiveGuide's goals of:
- **AI-powered coaching**: Production has embeddings
- **Knowledge graph evolution**: Production has status tracking
- **Semantic search**: Production has pgvector infrastructure
- **Performance at scale**: Production has proper indexes
- **Data quality**: Production prevents duplicate goals

## Recommendation

**Production schema is definitively superior and should be the source of truth.**

### Migration Strategy:
1. **Immediate**: Sync dev to match production schema
2. **Future**: All schema changes should go through production first
3. **Process**: Use migrations to keep environments in sync

### Evidence of Production Being Primary:
1. More complete feature set
2. Performance optimizations in place
3. AI/embedding infrastructure ready
4. Data integrity constraints implemented
5. Monitoring capabilities built-in

## Conclusion

The production database represents the evolved, feature-complete schema that supports all of LiveGuide's advanced capabilities. The dev database is missing critical infrastructure for AI features, performance, and data integrity. 

**Action Required**: Execute the migration script to bring dev up to production standards before any new development.