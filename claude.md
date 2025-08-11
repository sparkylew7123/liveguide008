# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

LiveGuide is a voice-enabled AI coaching platform that captures verbal insights and renders them into an interactive knowledge graph. Built as a Progressive Web App using **Next.js 15**, **Supabase**, **pgvector**, and **Cytoscape.js**.

### Core Capabilities
- Voice conversations via ElevenLabs agents (simplified from 1000+ lines to ~60 lines)
- Real-time graph visualization with temporal tracking
- Semantic search using OpenAI embeddings
- Row-level security for multi-tenant data isolation

## 🛠️ Development Commands

```bash
# Development
npm run dev                  # Start Next.js dev server (port 3000)
npm run dev:branch          # Use development branch database
npm run build               # Production build
npm run lint                # Run ESLint

# Database Environment Switching
npm run use:dev             # Switch to dev database (hlwxmfwrksflvcacjafg)
npm run use:prod            # Switch to prod database (aesefwyijcsynbbhozhb)

# Testing
npm run test:e2e            # Run Playwright tests
npm run test:e2e:ui         # Run tests with UI
npm run test:e2e:debug      # Debug mode
npm run test:e2e:headed     # Run in browser

# Supabase
supabase functions serve graph-operations    # Local edge functions
supabase db push                            # Push migrations
supabase functions deploy [name]            # Deploy edge function
```

## 🏗️ Architecture Patterns

### Graph Data Flow
1. **Voice Input** → ElevenLabs Agent processes conversation
2. **Webhook** → `/api/elevenlabs-webhook` receives transcripts
3. **Edge Functions** → `graph-operations-v2` creates nodes/edges
4. **Database** → PostgreSQL with pgvector stores graph + embeddings
5. **Realtime** → Supabase subscriptions push updates
6. **Frontend** → Cytoscape.js renders interactive graph

### Key Architectural Decisions
- **Optimistic UI**: Graph updates appear instantly, sync in background
- **Temporal Edges**: Special edge type tracks time-based relationships
- **Draft → Curated Flow**: Nodes start as `draft_verbal`, become `curated` after editing
- **Embedding Queue**: Async processing prevents blocking operations

## 📁 Critical File Locations

### Frontend Components
- `src/components/graph/GraphExplorer.tsx` - Main graph interface with temporal controls
- `src/components/graph/GraphCanvas.tsx` - Cytoscape.js wrapper with event handlers
- `src/components/temporal/TemporalGraphProvider.tsx` - State management for temporal graph
- `src/hooks/useTemporalGraph.ts` - Real-time subscriptions and graph operations

### Backend Services
- `supabase/functions/graph-operations-v2/` - Primary CRUD API for graph
- `supabase/functions/generate-embeddings/` - OpenAI embedding generation
- `supabase/functions/process-embedding-queue/` - Background job processor
- `supabase/functions/elevenlabs-webhook/` - Voice transcript handler

### Database Schema
- `supabase/migrations/20250128_create_graph_schema.sql` - Core graph tables
- `supabase/migrations/20250104_add_temporal_tracking.sql` - Temporal edge support
- `supabase/migrations/20250803_add_embedding_management_functions.sql` - Vector search

## 🔐 Security & Environment

### Database Environments
- **ALWAYS verify target database before operations**
- **Development**: `mcp__supabase-dev__*` tools (project: hlwxmfwrksflvcacjafg)
- **Production**: `mcp__supabase__*` tools (project: aesefwyijcsynbbhozhb)
- **Default to dev** unless explicitly working on production

### Required Environment Variables
```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# ElevenLabs Voice
ELEVENLABS_API_KEY
NEXT_PUBLIC_ELEVENLABS_AGENT_ID
ELEVENLABS_WEBHOOK_SECRET

# OpenAI (embeddings)
OPENAI_API_KEY

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
```

## 🧩 Graph Operations

### Node Types
- **session_start**: Auto-created for each conversation
- **goal**: User objectives
- **insight**: Key learnings
- **emotion**: Tracked emotional states
- **topic**: Subject matter nodes

### Edge Types
- **relates_to**: General relationship
- **supports**: Goal support relationship
- **temporal**: Time-based connection with timestamp
- **derived_from**: Source relationship

### Cytoscape Event Handlers
- **Single Click**: Select node, show details panel
- **Right Click**: Context menu (edit, delete, create edge)
- **Drag**: Move node (updates position in DB)
- **Double Click**: Edit node inline

## ⚠️ MCP Tool Guidelines

### Supabase Operations
- **Never use** `list_tables` without `schemas: ["public"]` filter
- **Always use** LIMIT clauses in SQL queries
- **Prefer** dev-specific tools: `mcp__supabase-dev__*`
- **Check logs** with `get_logs(service: "edge-function")` for debugging

### File Operations
- **Use Desktop Commander** for file operations when available
- **Chunk writes** to 25-30 lines per `write_file` call
- **Use absolute paths** consistently

## 🚀 Common Workflows

### Adding New Graph Node Type
1. Update `supabase/migrations/` with new node_type enum value
2. Modify `graph-operations-v2/index.ts` to handle new type
3. Add styling in `GraphCanvas.tsx` cytoscape configuration
4. Update TypeScript types in `src/types/temporal.ts`

### Debugging Realtime Updates
1. Check Supabase logs: `mcp__supabase-dev__get_logs(service: "realtime")`
2. Verify RLS policies on graph_nodes/graph_edges tables
3. Confirm subscription in `useTemporalGraph.ts` hook
4. Check browser console for WebSocket errors

### Deploying Edge Function
```bash
supabase functions deploy graph-operations-v2 --project-ref hlwxmfwrksflvcacjafg
```

## 📊 Performance Optimizations

### Graph Rendering
- **Batch Updates**: Collect multiple changes before re-rendering
- **Viewport Culling**: Only render visible nodes
- **Layout Caching**: Store computed positions
- **Debounced Saves**: Delay position updates by 500ms

### Embedding Generation
- **Queue-based**: Prevents blocking API calls
- **Batch Processing**: Groups multiple nodes
- **Caching**: Reuses embeddings for identical content

## 🔍 Troubleshooting

### Common Issues
1. **Graph not updating**: Check realtime subscriptions and RLS policies
2. **Embeddings missing**: Verify queue processor is running
3. **Voice not working**: Check ElevenLabs agent ID and API key
4. **Auth errors**: Ensure JWT token is valid and RLS policies match

### Debug Commands
```bash
# Check database connection
supabase db remote status

# View edge function logs
supabase functions logs graph-operations-v2 --project-ref hlwxmfwrksflvcacjafg

# Test edge function locally
curl http://localhost:54321/functions/v1/graph-operations-v2
```

## 🎙️ ElevenLabs Integration

### Architecture Overview
LiveGuide integrates with ElevenLabs conversational agents through:
1. **MCP Server** - Real-time data access during conversations
2. **Webhooks** - Pre/post conversation data exchange
3. **Data Extraction** - Structured goal and insight capture
4. **N8N Workflows** - Orchestration and processing

### MCP Server Implementation
Create `supabase/functions/mcp-server/` with tools:
- `getUserGraph(userId)` - Fetch current graph context
- `searchNodes(query, type)` - Semantic search
- `createNode(type, label, desc)` - Real-time node creation
- `updateGoalStatus(goalId, status)` - Goal tracking
- `getTemporalContext(range)` - Historical data

### Webhook Handlers
1. **Initiation Webhook** (`elevenlabs-init-webhook/`)
   - Provides user context before conversation
   - Returns active goals and recent insights
   - Customizes agent behavior

2. **Post-Call Webhook** (`elevenlabs-post-webhook/`)
   - Processes conversation transcript
   - Extracts goals, insights, emotions
   - Creates graph nodes and edges
   - Triggers embedding generation

### Agent Configuration Checklist
- [ ] Configure MCP server URL in ElevenLabs integrations
- [ ] Set up webhook URLs in agent Widget tab
- [ ] Define evaluation criteria in Analysis tab
- [ ] Add data collection fields (User_Goals, timescales, etc.)
- [ ] Update system prompt with LiveGuide context
- [ ] Enable authentication in Security tab

### Data Flow
```
Pre-Call:  LiveGuide → Init Webhook → Agent Context
During:    Agent ↔ MCP Server ↔ Graph Database
Post-Call: Agent → Post Webhook → N8N → Graph Updates
```

### Implementation Tasks
1. **Phase 1: Core Infrastructure**
   - Create MCP server with SSE/HTTP streaming
   - Implement webhook handlers
   - Set up authentication flow

2. **Phase 2: Agent Setup**
   - Configure ElevenLabs agent
   - Define analysis criteria
   - Test webhook integration

3. **Phase 3: N8N Workflow**
   - Design data transformation nodes
   - Integrate LightRag for synthesis
   - Add error handling

4. **Phase 4: Testing**
   - Unit tests for MCP tools
   - Integration tests for webhooks
   - Load testing for concurrent calls

### Testing ElevenLabs Integration
```bash
# Test MCP server locally
npm run dev:mcp-server

# Test webhook handlers
curl -X POST http://localhost:54321/functions/v1/elevenlabs-init-webhook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId": "uuid", "conversationId": "uuid"}'

# Monitor webhook logs
supabase functions logs elevenlabs-webhook --project-ref hlwxmfwrksflvcacjafg
```

### Common Integration Issues
1. **MCP connection fails**: Check server URL and authentication
2. **Webhooks not firing**: Verify webhook secret and URLs
3. **Data extraction empty**: Review Analysis tab configuration
4. **Real-time updates slow**: Check MCP server response times

See `docs/elevenlabs-liveguide-integration.md` for complete implementation details.