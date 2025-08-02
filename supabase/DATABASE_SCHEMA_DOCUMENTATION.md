# LGtempo Database Schema Documentation

## Overview
This document captures the current state of the production database schema at `aesefwyijcsynbbhozhb.supabase.co` as of August 2, 2025.

## Backup Information
- **Backup Date**: August 2, 2025
- **Backup File**: `supabase/backups/production_full_backup_20250802_111544.sql` (172K)
- **Database Version**: PostgreSQL 15.8.1

## Key Database Components

### 1. Custom Types (Enums)

#### Graph-related Types
- `edge_type`: Enum for different types of relationships between nodes
- `node_type`: Enum for different types of graph nodes
- `skill_level`: Enum for skill proficiency levels

#### Communication Types
- `emotion_type`: Enum for emotion classifications
- `message_priority`: Enum for message priority levels (urgent, high, normal, low)
- `message_type`: Enum for different message categories

### 2. Main Tables

#### User & Profile Management
- `profiles`: User profile information with goals and preferences
- `users`: Core user authentication table
- `agent_personae`: AI agent configurations and personalities

#### Knowledge & RAG System
- `knowledge`: Knowledge base entries
- `knowledge_documents`: Documents within knowledge bases
- `knowledge_chunks`: Document chunks for vector search
- `agent_knowledge_bases`: Knowledge bases assigned to specific agents

#### Graph Database
- `graph_nodes`: Nodes in the user's knowledge graph
- `graph_edges`: Relationships between nodes
- `graph_insights`: AI-generated insights from graph analysis

#### Communication & Inbox
- `inbox_messages`: User messages from AI coaches
- `message_attachments`: Attachments for inbox messages
- `message_read_receipts`: Read tracking for messages

#### Voice & Conversations
- `voice_chat_events`: Real-time voice conversation events
- `elevenlabs_conversations`: ElevenLabs conversation records
- `webhook_events`: Webhook event logging

#### Goals & Analytics
- `user_goals`: User's personal and professional goals
- `goal_categories`: Categories for organizing goals

### 3. Key Functions

#### Graph Operations
- `get_node_neighborhood(uuid, int)`: Retrieves nodes within N degrees of separation
- `find_similar_nodes(uuid, vector)`: Semantic search using pgvector
- `track_emotion(uuid, emotion_type, text)`: Records emotional states
- `create_session_node()`: Creates coaching session nodes
- `update_session_node()`: Updates session information

#### Knowledge & Search
- `search_knowledge_base()`: RAG search functionality
- `search_knowledge_chunks()`: Vector similarity search

### 4. Extensions
- `vector`: pgvector for semantic embeddings
- `uuid-ossp`: UUID generation
- `btree_gist`: Advanced indexing

### 5. Row Level Security (RLS)
All user-facing tables have RLS policies ensuring:
- Users can only access their own data
- Service role has full access for backend operations
- Anonymous users have limited read access to public data

### 6. Indexes
Key indexes for performance:
- User ID indexes on all user-related tables
- Timestamp indexes for temporal queries
- Vector indexes for similarity search
- Composite indexes for common query patterns

## Migration History
The database has been evolved through multiple migrations:
1. Initial schema setup (June 2025)
2. Graph schema implementation (January 2025)
3. Knowledge RAG system (January 2025)
4. Inbox infrastructure (January 2025)
5. Security fixes and optimizations (July 2025)
6. Unique constraints for graph nodes (August 2025)

## Notes
- The database uses Supabase's built-in auth system
- All timestamps are stored in UTC
- Vector embeddings use OpenAI's text-embedding-3-small (1536 dimensions)
- The graph system supports both AI-generated and user-curated nodes