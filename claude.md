    # CLAUDE.md – LGtempo Graph Explorer
    
    ## 🔍 Project Overview
    LiveGuide is a voice-enabled AI coaching platform that captures verbal insights from users and renders them into an interactive knowledge graph using a PWA built on **Next.js**, **Supabase**, **pgvector**, and **Cytoscape.js**.
    
    ### Goals:
    - Capture coaching insights via AI agents
    - Populate a personal graph-based knowledge base in real time
    - Allow users to view, edit, and explore their graph visually
    - Power RAG features using semantic embeddings
    
    ---
    
    ## 🧠 System Architecture
    
    | Component | Technology |
    |-----------|------------|
    | Frontend | Next.js (React) PWA with Cytoscape.js |
    | Backend | Supabase (PostgreSQL + Edge Functions + Row-Level Security) |
    | Realtime | Supabase Subscriptions |
    | AI | ElevenLabs (voice), OpenAI Embeddings, Claude Code Agents |
    | Search | pgvector semantic search (OpenAI 3-small) |
    
    Graph data (nodes/edges) flows between agents ➝ Supabase ➝ frontend graph viewer.
    
    ---
    
    ## 🧩 Agent Roles
    
    ### `graph-schema-agent`
    Writes and updates SQL schemas and stored procedures, including:
    - `get_node_neighborhood(uuid, int)`
    - `find_similar_nodes(uuid, vector)`
    - Node status/embedding column changes
    
    ### `edge-fn-agent`
    Builds Supabase Edge Functions for CRUD and real-time graph operations:
    - `createNode`, `updateNode`, `createEdge`
    - `analyzeEmotion`, `enqueueGraphAnalysis`
    
    ### `router-prompt-agent`
    Designs and tests lightweight intent classifier prompts:
    - Simple vs complex analysis
    - Real-time vs queued job routing
    
    ### `graph-rag-agent`
    Implements vector-based retrieval and semantic analysis:
    - Uses pgvector
    - Integrates with OpenAI embeddings
    
    ### `cytoscape-ux-agent`
    Optimizes UX within the graph canvas:
    - Event handlers (click, right-click, drag)
    - Node/edge styling based on type
    - Optimistic UI updates
    
    ### `graph-e2e-agent`
    Automates Playwright/Cypress tests:
    - Node creation via API ➝ renders in Cytoscape ➝ editable ➝ curated
    - Covers PWA + backend sync end to end
    
    ### `code-review-bot`
    Static analyzer and policy enforcer:
    - Prevents leaking embeddings
    - Ensures auth, RLS policies enforced
    - Flags unhandled exceptions or slow queries
    
    ---
    
    ## 📂 Key Directories
    
    | Folder | Purpose |
    |--------|---------|
    | `src/components/graph/` | Frontend graph explorer and controls |
    | `supabase/functions/graph-operations/` | API handlers for node/edge actions |
    | `supabase/migrations/` | Schema and vector extensions |
    | `lib/graph-goals.ts`, `lib/knowledge-rag.ts` | Embedding utilities and GraphRAG logic |
    | `hooks/` | Real-time Supabase hooks for goals, sessions, emotion |
    
    ---
    
    ## 🔐 Auth & Security
    - Supabase JWT + Row-Level Security on all graph tables
    - Realtime updates scoped per user
    - No cross-user access permitted
    
    ---
    
    ## 🧪 Commands
    ```bash
    # Run Supabase functions locally
    supabase functions serve graph-operations
    
    # Run E2E tests
    npm run test:e2e
    
    # List Claude agents
    claude /agents list
    
    # Push DB changes
    supabase db push
    ```
    
    ---
    
    ## 📈 Notes
    - Embeddings stored in `graph_nodes.embedding`
    - `status` field tracks `draft_verbal` vs `curated`
    - Async analysis powered by Supabase Queues (e.g., community detection)
    - Optimistic UI used for Cytoscape performance
    
    ---
    
    ## 📍Maintainers
    This CLAUDE.md supports all Claude agents in `.claude/agents/` and provides global project memory across sessions.
    
    To update project memory live, run:
    ```bash
    claude /memory "Update: added emotion analysis pipeline"
    ```
