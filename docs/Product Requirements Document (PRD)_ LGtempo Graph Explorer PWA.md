### **Product Requirements Document (PRD): LGtempo Graph Explorer PWA**

#### **1\. Vision & Goals**

* **Product Vision**: To empower users with a dynamic, interactive, and AI-augmented visual interface to their personal LGtempo knowledge graph. The PWA will transform abstract data into tangible insights, fostering deeper self-reflection and accelerating progress towards personal and professional goals.  
* **Core User Flow**:  
  * A user has a **verbal conversation** with an AI agent.  
  * The agent captures insights and automatically populates the user's graph in the LGtempo database.  
  * The user opens the **Graph Explorer PWA** to visually explore a real-time representation of their knowledge graph.  
  * The user can **interact** with the graph—rearranging nodes, editing labels, and creating new connections—to curate and refine the AI-generated structure.  
  * The PWA provides both **real-time emotional insights** during interactions and delivers **deeper, asynchronous analyses** of the user's long-term patterns.  
* **Success Metrics**:  
  * **Engagement**: Daily Active Users (DAU), average session duration in the PWA.  
  * **Adoption**: Percentage of users who interact with (edit, move, or link) at least one node per week.  
  * **AI Value**: Usage rate of real-time vs. asynchronous AI features.

---

### **2\. Agentic Role-Based Technical Instructions**

This section breaks down the implementation into specific tasks assigned to each specialized agent role.

#### **🏛️ `lead-systems-architect`**

Your primary role is to ensure all components integrate seamlessly into a robust, scalable, and secure system.

* **Overall Architecture**: You will oversee the end-to-end data flow: from the PWA client, through the Supabase API layer, to the PostgreSQL database, and back again via real-time subscriptions.  
* **Key Decisions & Trade-offs**:  
  * **Graph Visualization Library**: Finalize the choice of a frontend library.  
    * **Recommendation**: Start with **Cytoscape.js** due to its strong performance with large graphs, extensive customization options, and built-in graph theory algorithms, which align perfectly with the LGtempo schema.  
  * **Real-time vs. Async Pipeline**: Formalize the logic for the "Query Router."  
    * A user action in the PWA will trigger a Supabase Edge Function.  
    * This function will first perform a quick, low-cost operation (e.g., an LLM call with a function-calling model) to classify the user's intent.  
    * If the intent is simple (e.g., "What is this node?"), route to the real-time pipeline.  
    * If the intent is complex (e.g., "What patterns emerge from my goals over the last month?"), route to the asynchronous pipeline by enqueuing a job in Supabase Queues.  
* **Security**: Define the security model. All communication between the PWA and backend will be authenticated using Supabase's JWT-based authentication. Implement Row Level Security (RLS) policies on all graph tables to ensure users can only access their own data.

---

#### **🗄️ `postgres-database-architect`**

Your task is to leverage and extend the existing LGtempo schema to support the new interactive and analytical workloads from the PWA.

* **Schema Enhancements**:  
  * **Node Status**: Add a `status` column to the `graph_nodes` table. This is crucial for reconciling verbal and manual input.  
    * `status` (ENUM): `'draft_verbal'`, `'curated'`  
    * When the AI agent captures a new node from a conversation, it's inserted with the status `'draft_verbal'`.  
    * When the user edits or confirms this node in the PWA, its status is updated to `'curated'`.  
  * **Vector Embeddings**: Add an `embedding (vector)` column to the `graph_nodes` table. This will store vector representations of the node's `label` and `description` to power semantic search (RAG) capabilities.  
* **Function Development**:  
  * **Graph Traversal**: Create a PostgreSQL function `get_node_neighborhood(p_node_id uuid, p_depth integer)` that uses a **Recursive CTE** to fetch a node and all its neighbors up to a specified depth. This will be the primary function used by the PWA to load sections of the graph.  
  * **Semantic Search**: Create a function `find_similar_nodes(p_user_id uuid, p_query_embedding vector, p_limit integer)` that uses the `pgvector` extension to find the most semantically similar nodes to a user's query.

---

#### **⚛️ `frontend-nextjs-react-engineer`**

You are responsible for building the interactive PWA, which is the core user-facing component.

* **Graph Visualization**:  
  * **Integration**: Use **Cytoscape.js** to render the graph. Fetch the initial graph data by calling the `get_node_neighborhood` function via a Supabase Edge Function.  
  * **Styling**: Create a mapping between the `node_type` and `edge_type` enums in the database and the visual styles (color, shape, thickness) in Cytoscape.js.  
  * **Interaction**: Implement event handlers for user interactions:  
    * `on('tap', 'node', ...)`: When a user clicks a node, display its `label`, `description`, and `properties` in a sidebar.  
    * `on('cxttap', 'node', ...)`: When a user right-clicks a node, open a context menu with options like "Edit," "Delete," or "Find Similar Nodes."  
* **Real-Time Bidirectional Sync**:  
  * **Listening for Changes (Supabase \-\> PWA)**: Use the Supabase client library to subscribe to changes on the `graph_nodes` and `graph_edges` tables for the logged-in user.  
    * On `INSERT`, add the new node/edge to the Cytoscape instance.  
    * On `UPDATE`, refresh the data for the corresponding element.  
    * On `DELETE`, remove the element from the graph.  
  * **Writing Changes (PWA \-\> Supabase)**: User actions (creating, updating, deleting nodes/edges) will call the secure API endpoints built by the `backend-supabase-engineer`.  
  * Implement an **optimistic UI** pattern: update the local Cytoscape graph immediately for a snappy feel, and then revert the change if the API call fails.

---

#### **⚙️ `backend-supabase-engineer`**

You will build the serverless backend logic that powers the PWA and the AI engine.

* **API Development (Edge Functions)**:  
  * Create a set of secure Edge Functions for all CRUD operations on the graph (e.g., `createNode`, `updateNode`, `createEdge`). These functions will enforce business logic and call the database functions created by the `postgres-database-architect`.  
* **Real-Time Emotion Pipeline**:  
  * Create an Edge Function `analyzeEmotion`. This function will receive text input from the PWA.  
  * It will call a low-latency, third-party emotion recognition API.  
  * It will then use the `create_emotion_node` and `create_edge` functions in the database to link the new emotion node to the current session or user node. The PWA will receive this update instantly via its real-time subscription.  
* **Asynchronous Insights Pipeline**:  
  * Set up **Supabase Queues** to handle long-running, cost-effective analysis.  
  * Create an Edge Function to act as a **worker**. This worker will listen for jobs on the queue.  
  * A job payload will contain a `user_id` and an `analysis_type` (e.g., `'community_detection'`).  
  * The worker will execute a complex query or algorithm (e.g., a simplified community detection in PL/pgSQL) and write the results (e.g., a new `insight` node with connections to the community members) back to the database.

---

#### **✍️ `ai-prompt-engineer`**

You will craft the prompts that guide the LLM's behavior, ensuring accurate and relevant AI-powered features.

* **Query Router Prompt**: Design a prompt for a fast LLM (e.g., Claude 3.5 Sonnet, Llama 3 8B) that takes a user's natural language query and classifies it into an intent category.  
  * **Example**: "User query: *What are the main themes in my goals this quarter?* \-\> LLM Output: `{ "intent": "complex_analysis", "pipeline": "asynchronous" }`"  
  * **Example**: "User query: *Tell me more about this 'public speaking' skill.* \-\> LLM Output: `{ "intent": "simple_lookup", "pipeline": "realtime" }`"  
* **GraphRAG Contextualization Prompt**: For the asynchronous pipeline, design a prompt that takes the context retrieved from the graph (e.g., the content of a cluster of nodes) and the user's query, and instructs the LLM to generate a deep insight.  
  * **Example**: "You are a helpful coaching assistant. Based on the following interconnected notes about the user's goals and recent sessions, identify a recurring pattern or a potential conflict the user may not be aware of. Context: ... Query: ..."

---

#### **🧠 `ui-ux-design-psychologist`**

You will design an interface that is intuitive, engaging, and cognitively sound.

* **Visual Language**: Design the visual representation of the graph. Use color, size, and icons to differentiate between `node_type`s (goal, skill, emotion) and `edge_type`s (works\_on, feels). Ensure the design is accessible and avoids overwhelming the user.  
* **Interaction Design**:  
  * Define the "feel" of the physics-based graph layout. It should be playful and responsive but stable enough for exploration.  
  * Design the user flow for creating a new edge. **Recommendation**: A "click-and-drag" interaction from a source node to a target node, which then opens a modal to define the `edge_type`.  
* **Presenting Insights**: Design how AI-generated insights are presented.  
  * Real-time emotional feedback could be a subtle, ambient change in the UI color or a small, non-intrusive notification.  
  * Asynchronous deep insights should appear as new, distinct `insight` nodes within the graph, clearly linked to the nodes they were derived from, allowing the user to explore the evidence for the AI's conclusion.

---

#### **🧪 `qa-test-engineer`**

You are responsible for ensuring the quality, reliability, and performance of the entire system, from the PWA to the backend services.

* **Test Planning**:  
  * Develop a comprehensive test plan covering unit, integration, end-to-end, and performance testing.  
  * Define test cases for all user stories and technical tasks, including positive, negative, and edge cases.  
* **Unit & Integration Testing**:  
  * **Frontend**: Write unit tests for React components using a framework like Jest and React Testing Library. Test state management, component rendering, and user interactions.  
  * **Backend**: Write integration tests for Supabase Edge Functions to verify business logic, database interactions, and API responses.  
* **End-to-End (E2E) Testing**:  
  * Use a framework like Cypress or Playwright to automate E2E tests for the core user flow:  
    1. Simulate a verbal conversation and verify the creation of `draft_verbal` nodes.  
    2. Test the PWA's real-time updates when new nodes are added.  
    3. Automate graph interactions in the PWA (editing, creating, linking nodes) and verify the changes are persisted in the database with the status updated to `curated`.  
* **Performance & Load Testing**:  
  * **Frontend**: Benchmark the performance of the Cytoscape.js graph rendering with a large number of nodes (e.g., 1000+) to ensure a smooth user experience.  
  * **Backend**: Use a tool like k6 to load test the Supabase Edge Functions and API endpoints, ensuring they meet the defined performance targets under concurrent user load.

---

#### **🚀 `devops-cicd-specialist`**

Your role is to establish a robust, automated CI/CD pipeline for seamless and reliable deployments.

* **CI/CD Pipeline Setup**:  
  * Configure a CI/CD pipeline using GitHub Actions or a similar tool.  
  * The pipeline should be triggered on every push to the `main` branch and on the creation of pull requests.  
* **Continuous Integration (CI)**:  
  * **Automated Builds**: The CI pipeline should automatically build the Next.js frontend and bundle the Supabase Edge Functions.  
  * **Automated Testing**: Integrate the unit, integration, and E2E tests into the CI pipeline. The build should fail if any tests fail.  
  * **Linting & Code Quality**: Add steps for linting the code and running static analysis to ensure code quality and consistency.  
* **Continuous Deployment (CD)**:  
  * **Staging Environment**: Configure the pipeline to automatically deploy successful builds from the `main` branch to a staging environment on Supabase.  
  * **Production Deployment**: Implement a manual approval step for deploying to the production environment. This ensures that a human reviews the changes before they go live.  
* **Database Migrations**:  
  * Integrate Supabase database migrations into the CI/CD pipeline. Migrations should be automatically applied to the staging environment and manually triggered for production.  
* **Environment Management**:  
  * Manage environment variables and secrets for different environments (development, staging, production) using Supabase's secret management and environment-specific configuration files.  
* **Monitoring & Alerting**:  
  * Set up monitoring for the production environment to track application health, performance, and error rates.  
  * Configure alerts to notify the team of any critical issues or performance degradation.

![profile picture][image1]  


[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAA40lEQVR4XmNgDJ9NU8SAKURdNGoBQTRqAUE0vC1Yd/L+fzDAlAKi288/4pGFI6IsaFh9FlMWIkUdC379+Ysm1bflMlD88/dfVLBg1p7rmKb8+fvv9x8QwpRCQ4QtYASHxvFbL5GlgCIt685D/IepERkRZQEkPuHi5++/gVtMHQtkMpcBGZlzjkDEgexz995AGNSxAIj+/fv/5cdvIKN86Um4IDUtmLzjCoT949cfeKKipgWMYON2XnwMJCuWnYKLUNOC60/eo5lIZQt44xf8R02vlFpAFTRqAUE0agFBNGoBQQQAdLJwt9Tbr1MAAAAASUVORK5CYII=>