import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Types for MCP protocol
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Node and Edge types - must match database enums
type NodeType = "goal" | "skill" | "emotion" | "session" | "accomplishment";
type EdgeType = "relates_to" | "supports" | "temporal" | "derived_from";
type GoalStatus = "active" | "completed" | "paused" | "cancelled";

interface GraphNode {
  id: string;
  node_type: NodeType;
  label: string;
  description?: string;
  status?: GoalStatus;
  user_id: string;
  created_at: string;
  properties?: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  user_id: string;
  created_at: string;
  properties?: Record<string, any>;
}

// MCP Error codes
const MCP_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
};

class MCPServer {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  // Define available MCP tools - following ElevenLabs format with instructions parameter
  public getTools(): MCPTool[] {
    // Full set of tools for LiveGuide knowledge graph AND onboarding support
    return [
      // Onboarding-specific tools for Maya conversations
      {
        name: "process_voice_command",
        description: "Process natural language voice input during onboarding and return structured response",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            },
            voiceInput: {
              type: "string", 
              description: "Raw voice input from user"
            },
            currentPhase: {
              type: "string",
              description: "Current onboarding phase (name_input, category_selection, goal_selection, timeline_selection, learning_preferences, agent_selection)",
              enum: ["name_input", "category_selection", "goal_selection", "timeline_selection", "learning_preferences", "agent_selection", "completion"]
            },
            conversationContext: {
              type: "object",
              description: "Current conversation context and user profile data"
            }
          },
          required: ["userId", "voiceInput"]
        }
      },
      {
        name: "get_onboarding_state",
        description: "Get current onboarding progress and user selections",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "save_onboarding_progress",
        description: "Save user selections from voice commands during onboarding",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            },
            phase: {
              type: "string",
              description: "Current onboarding phase"
            },
            data: {
              type: "object",
              description: "Data to save (name, categories, goals, timeline, preferences, agent)"
            }
          },
          required: ["userId", "phase", "data"]
        }
      },
      {
        name: "get_available_categories",
        description: "Get available goal categories for selection during onboarding",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description: "Maximum number of categories to return",
              default: 8
            }
          }
        }
      },
      {
        name: "search_goals_by_category",
        description: "Search for goals within selected categories for goal selection phase",
        inputSchema: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: { type: "string" },
              description: "Selected category IDs"
            },
            searchQuery: {
              type: "string",
              description: "Optional search query to filter goals"
            },
            limit: {
              type: "integer",
              description: "Maximum number of goals to return",
              default: 10
            }
          },
          required: ["categories"]
        }
      },
      {
        name: "match_user_goal_to_preset",
        description: "Match user's verbal goal description to preset goals in the system",
        inputSchema: {
          type: "object",
          properties: {
            userPhrase: {
              type: "string",
              description: "User's verbal description of their goal"
            },
            category: {
              type: "string",
              description: "Optional category to search within"
            },
            confidenceThreshold: {
              type: "number",
              description: "Minimum confidence score for a match (0-1)",
              default: 0.7
            }
          },
          required: ["userPhrase"]
        }
      },
      {
        name: "confirm_goal_selection",
        description: "Confirm user's goal selection with their preferred terminology",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            },
            userPhrase: {
              type: "string",
              description: "Original user phrase"
            },
            matchedGoalId: {
              type: "string",
              description: "ID of matched preset goal (if any)"
            },
            userPreferredTerm: {
              type: "string",
              description: "User's preferred terminology for the goal"
            },
            confirmed: {
              type: "boolean",
              description: "Whether user confirmed the match"
            },
            timeline: {
              type: "string",
              description: "Goal timeline (short/medium/long)",
              enum: ["short", "medium", "long"]
            }
          },
          required: ["userId", "userPhrase", "userPreferredTerm", "confirmed"]
        }
      },
      {
        name: "get_matching_agents",
        description: "Find coaching agents that match user's goals and preferences",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            },
            trigger: {
              type: "string",
              description: "Matching trigger type",
              enum: ["onboarding", "user_request"],
              default: "onboarding"
            },
            maxAgents: {
              type: "integer",
              description: "Maximum number of agents to return",
              default: 3
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_conversation_context",
        description: "Get current conversation state and history for context-aware responses",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID"
            },
            conversationId: {
              type: "string",
              description: "Conversation ID"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_user_graph",
        description: "Retrieve the user's complete knowledge graph including all nodes and edges",
        inputSchema: {
          type: "object",
          properties: {
            userId: { 
              type: "string",
              description: "User ID to fetch graph for"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph using semantic search",
        inputSchema: {
          type: "object",
          properties: {
            query: { 
              type: "string",
              description: "Search query"
            },
            userId: { 
              type: "string",
              description: "User ID"
            },
            nodeType: { 
              type: "string",
              description: "Filter by node type (goal, skill, emotion, session, accomplishment)",
              enum: ["goal", "skill", "emotion", "session", "accomplishment"]
            },
            limit: { 
              type: "integer",
              description: "Maximum number of results",
              default: 10
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "create_node",
        description: "Create a new node in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            type: { 
              type: "string",
              description: "Node type",
              enum: ["goal", "skill", "emotion", "session", "accomplishment"]
            },
            label: { 
              type: "string",
              description: "Node label"
            },
            description: { 
              type: "string",
              description: "Node description"
            },
            userId: { 
              type: "string",
              description: "User ID"
            },
            properties: { 
              type: "object",
              description: "Additional properties"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "create_edge",
        description: "Create a relationship between two nodes",
        inputSchema: {
          type: "object",
          properties: {
            sourceId: { 
              type: "string",
              description: "Source node ID"
            },
            targetId: { 
              type: "string",
              description: "Target node ID"
            },
            edgeType: { 
              type: "string",
              description: "Type of relationship",
              enum: ["relates_to", "supports", "temporal", "derived_from"]
            },
            properties: { 
              type: "object",
              description: "Additional edge properties"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "update_node",
        description: "Update an existing node's properties",
        inputSchema: {
          type: "object",
          properties: {
            nodeId: { 
              type: "string",
              description: "Node ID to update"
            },
            updates: { 
              type: "object",
              description: "Properties to update",
              properties: {
                label: { type: "string" },
                description: { type: "string" },
                status: { type: "string" },
                properties: { type: "object" }
              }
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_recent_nodes",
        description: "Get the most recently created or modified nodes",
        inputSchema: {
          type: "object",
          properties: {
            userId: { 
              type: "string",
              description: "User ID"
            },
            limit: { 
              type: "integer",
              description: "Number of nodes to return",
              default: 10
            },
            nodeType: { 
              type: "string",
              description: "Filter by node type",
              enum: ["goal", "skill", "emotion", "session", "accomplishment"]
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "update_goal_progress",
        description: "Update the progress status of a goal node",
        inputSchema: {
          type: "object",
          properties: {
            goalId: { 
              type: "string",
              description: "Goal node ID"
            },
            status: { 
              type: "string",
              description: "New status",
              enum: ["pending", "in_progress", "completed", "archived"]
            },
            progress: { 
              type: "integer",
              description: "Progress percentage (0-100)"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_temporal_context",
        description: "Retrieve nodes and edges within a specific time range",
        inputSchema: {
          type: "object",
          properties: {
            userId: { 
              type: "string",
              description: "User ID"
            },
            startDate: { 
              type: "string",
              description: "Start date (ISO format)"
            },
            endDate: { 
              type: "string",
              description: "End date (ISO format)"
            }
          },
          required: ["userId"]
        }
      }
    ];
  }

  // Tool implementations
  private async getUserGraph(params: any): Promise<any> {
    const { userId } = params;
    
    // Fetch nodes
    const { data: nodes, error: nodesError } = await this.supabase
      .from("graph_nodes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (nodesError) throw new Error(`Failed to fetch nodes: ${nodesError.message}`);

    // Fetch edges
    const { data: edges, error: edgesError } = await this.supabase
      .from("graph_edges")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (edgesError) throw new Error(`Failed to fetch edges: ${edgesError.message}`);

    return {
      nodes: nodes || [],
      edges: edges || [],
      nodeCount: nodes?.length || 0,
      edgeCount: edges?.length || 0
    };
  }

  private async getActiveGoals(params: any): Promise<GraphNode[]> {
    const { userId } = params;
    
    const { data, error } = await this.supabase
      .from("graph_nodes")
      .select("*")
      .eq("user_id", userId)
      .eq("node_type", "goal")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
    
    // Filter for active goals based on properties.goal_status
    const activeGoals = (data || []).filter(node => {
      const goalStatus = node.properties?.goal_status;
      return !goalStatus || (goalStatus !== "completed" && goalStatus !== "cancelled");
    });
    
    return activeGoals;
  }

  private async createEdge(params: any): Promise<any> {
    const { sourceId, targetId, edgeType = "relates_to", properties = {} } = params;
    
    const { data, error } = await this.supabase
      .from("graph_edges")
      .insert({
        source_id: sourceId,
        target_id: targetId,
        edge_type: edgeType,
        properties
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create edge: ${error.message}`);
    return data;
  }

  private async updateNode(params: any): Promise<any> {
    const { nodeId, updates } = params;
    
    const updateData: any = {};
    if (updates.label) updateData.label = updates.label;
    if (updates.description) updateData.description = updates.description;
    if (updates.properties) {
      // Merge with existing properties
      const { data: existing } = await this.supabase
        .from("graph_nodes")
        .select("properties")
        .eq("id", nodeId)
        .single();
      
      updateData.properties = { ...existing?.properties, ...updates.properties };
    }
    if (updates.status) {
      // Handle status update for goals
      if (!updateData.properties) updateData.properties = {};
      updateData.properties.goal_status = updates.status;
    }
    
    const { data, error } = await this.supabase
      .from("graph_nodes")
      .update(updateData)
      .eq("id", nodeId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update node: ${error.message}`);
    return data;
  }

  private async getRecentNodes(params: any): Promise<any> {
    const { userId, limit = 10, nodeType } = params;
    
    let query = this.supabase
      .from("graph_nodes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (nodeType) {
      query = query.eq("node_type", nodeType);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch recent nodes: ${error.message}`);
    return data || [];
  }

  private async updateGoalProgress(params: any): Promise<any> {
    const { goalId, status, progress } = params;
    
    const updates: any = { properties: {} };
    
    // Get existing properties
    const { data: existing } = await this.supabase
      .from("graph_nodes")
      .select("properties")
      .eq("id", goalId)
      .single();
    
    updates.properties = { ...existing?.properties };
    
    if (status) {
      updates.properties.goal_status = status;
    }
    if (progress !== undefined) {
      updates.properties.progress = progress;
    }
    
    const { data, error } = await this.supabase
      .from("graph_nodes")
      .update(updates)
      .eq("id", goalId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update goal progress: ${error.message}`);
    return data;
  }

  private async getTemporalContext(params: any): Promise<any> {
    const { userId, startDate, endDate } = params;
    
    // Fetch nodes within time range
    let nodesQuery = this.supabase
      .from("graph_nodes")
      .select("*")
      .eq("user_id", userId);
    
    if (startDate) {
      nodesQuery = nodesQuery.gte("created_at", startDate);
    }
    if (endDate) {
      nodesQuery = nodesQuery.lte("created_at", endDate);
    }
    
    const { data: nodes, error: nodesError } = await nodesQuery.order("created_at", { ascending: true });
    if (nodesError) throw new Error(`Failed to fetch temporal nodes: ${nodesError.message}`);
    
    // Fetch temporal edges
    const nodeIds = (nodes || []).map(n => n.id);
    const { data: edges, error: edgesError } = await this.supabase
      .from("graph_edges")
      .select("*")
      .eq("edge_type", "temporal")
      .or(`source_id.in.(${nodeIds.join(",")}),target_id.in.(${nodeIds.join(",")})`);
    
    if (edgesError) throw new Error(`Failed to fetch temporal edges: ${edgesError.message}`);
    
    return {
      nodes: nodes || [],
      edges: edges || [],
      timeRange: { startDate, endDate }
    };
  }

  private async searchNodes(params: any): Promise<any> {
    const { query, nodeType, userId, limit = 10 } = params;
    
    try {
      // First, get embedding for the search query
      const openaiResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: query,
          model: "text-embedding-3-small",
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      const queryEmbedding = openaiData.data[0].embedding;

      // Call the RPC function directly for vector similarity search
      const { data, error } = await this.supabase.rpc("match_nodes", {
        query_embedding: queryEmbedding,
        match_threshold: 0.8,
        match_count: limit,
        user_id_filter: userId,
        node_type_filter: nodeType
      });

      if (error) {
        // Fallback to text search if vector search fails
        console.warn("Vector search failed, falling back to text search:", error);
        
        let fallbackQuery = this.supabase
          .from("graph_nodes")
          .select("*")
          .eq("user_id", userId)
          .or(`label.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(limit);

        if (nodeType) {
          fallbackQuery = fallbackQuery.eq("node_type", nodeType);
        }

        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) throw new Error(`Search failed: ${fallbackResult.error.message}`);
        
        return fallbackResult.data || [];
      }

      return data || [];
    } catch (error) {
      console.error("Search nodes error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  private async createNode(params: any): Promise<GraphNode> {
    const { type, label, description, userId, properties = {} } = params;
    
    // Create a new properties object to avoid mutation
    const nodeProperties = { ...properties };
    
    // If it's a goal node, add goal_status to properties instead of status field
    if (type === "goal") {
      nodeProperties.goal_status = "active";
    }
    
    const nodeData = {
      node_type: type,
      label,
      description,
      user_id: userId,
      properties: nodeProperties,
      status: "draft_verbal" // Use valid enum value
    };

    const { data, error } = await this.supabase
      .from("graph_nodes")
      .insert(nodeData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create node: ${error.message}`);
    
    // Queue for embedding generation
    await this.queueEmbedding(data.id, `${label} ${description || ""}`);
    
    return data;
  }

  private async createEdge(params: any): Promise<GraphEdge> {
    const { sourceId, targetId, type, userId, properties = {} } = params;
    
    // Verify both nodes exist and belong to user
    const { data: sourceNode, error: sourceError } = await this.supabase
      .from("graph_nodes")
      .select("id")
      .eq("id", sourceId)
      .eq("user_id", userId)
      .single();

    if (sourceError || !sourceNode) {
      throw new Error("Source node not found or access denied");
    }

    const { data: targetNode, error: targetError } = await this.supabase
      .from("graph_nodes")
      .select("id")
      .eq("id", targetId)
      .eq("user_id", userId)
      .single();

    if (targetError || !targetNode) {
      throw new Error("Target node not found or access denied");
    }

    const edgeData = {
      source_node_id: sourceId,
      target_node_id: targetId,
      edge_type: type,
      user_id: userId,
      properties
    };

    const { data, error } = await this.supabase
      .from("graph_edges")
      .insert(edgeData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create edge: ${error.message}`);
    
    return data;
  }  private async updateGoalStatus(params: any): Promise<GraphNode> {
    const { goalId, status, userId } = params;
    
    // First get the current node to preserve existing properties
    const { data: currentNode, error: fetchError } = await this.supabase
      .from("graph_nodes")
      .select("properties")
      .eq("id", goalId)
      .eq("user_id", userId)
      .eq("node_type", "goal")
      .single();
    
    if (fetchError || !currentNode) {
      throw new Error("Goal not found or access denied");
    }
    
    // Merge the new goal_status with existing properties
    const updatedProperties = {
      ...currentNode.properties,
      goal_status: status,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await this.supabase
      .from("graph_nodes")
      .update({ 
        properties: updatedProperties
      })
      .eq("id", goalId)
      .eq("user_id", userId)
      .eq("node_type", "goal")
      .select()
      .single();

    if (error) throw new Error(`Failed to update goal status: ${error.message}`);
    if (!data) throw new Error("Goal not found or access denied");
    
    return data;
  }

  private async getRecentInsights(params: any): Promise<GraphNode[]> {
    const { userId, days = 7, limit = 20 } = params;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from("graph_nodes")
      .select("*")
      .eq("user_id", userId)
      .eq("node_type", "insight")
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch insights: ${error.message}`);
    
    return data || [];
  }

  private async getTemporalContext(params: any): Promise<any> {
    const { userId, timeRange, nodeTypes } = params;
    
    // Convert time range to hours
    const rangeHours = {
      "1h": 1,
      "6h": 6,
      "24h": 24,
      "7d": 168,
      "30d": 720
    }[timeRange] || 24;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - rangeHours);

    let query = this.supabase
      .from("graph_nodes")
      .select("*, edges:graph_edges!source_node_id(*)")
      .eq("user_id", userId)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false });

    if (nodeTypes && nodeTypes.length > 0) {
      query = query.in("node_type", nodeTypes);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch temporal context: ${error.message}`);
    
    return {
      timeRange,
      rangeHours,
      cutoffDate: cutoffDate.toISOString(),
      nodes: data || [],
      nodeCount: data?.length || 0
    };
  }

  private async findRelatedInsights(params: any): Promise<any> {
    const { nodeId, userId, maxDepth = 2 } = params;
    
    // Use recursive CTE to find connected insights
    const { data, error } = await this.supabase.rpc("find_connected_insights", {
      start_node_id: nodeId,
      user_id_filter: userId,
      max_depth: maxDepth
    });

    if (error) {
      console.warn("Recursive query failed, using simple approach:", error);
      
      // Fallback: find directly connected insights
      const { data: edges, error: edgeError } = await this.supabase
        .from("graph_edges")
        .select("*, target:graph_nodes!target_node_id(*)")
        .eq("source_node_id", nodeId)
        .eq("user_id", userId);

      if (edgeError) throw new Error(`Failed to find related insights: ${edgeError.message}`);
      
      const insights = edges?.filter(edge => 
        edge.target && edge.target.node_type === "insight"
      ).map(edge => edge.target) || [];

      return {
        insights,
        depth: 1,
        totalConnections: edges?.length || 0
      };
    }

    return data || { insights: [], depth: 0, totalConnections: 0 };
  }

  private async extractKeyTopics(params: any): Promise<any> {
    const { transcript, userId, createNodes = false } = params;
    
    try {
      // Use OpenAI to extract key topics
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Extract 3-5 key topics from this conversation transcript. Return as JSON array of strings, each topic should be 1-3 words."
            },
            {
              role: "user",
              content: transcript
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0].message.content;
      
      let topics: string[];
      try {
        topics = JSON.parse(content);
      } catch {
        // Fallback: split by lines and clean
        topics = content.split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[-*\d.]\s*/, '').trim())
          .filter(topic => topic.length > 0)
          .slice(0, 5);
      }

      const result = { topics, createdNodes: [] };

      if (createNodes && topics.length > 0) {
        // Create topic nodes
        for (const topic of topics) {
          try {
            const node = await this.createNode({
              type: "skill",  // Changed from "topic" which doesn't exist in enum
              label: topic,
              description: `Topic/skill extracted from conversation`,
              userId,
              properties: { 
                source: "conversation_extraction",
                extractedAt: new Date().toISOString()
              }
            });
            result.createdNodes.push(node);
          } catch (error) {
            console.warn(`Failed to create topic node for "${topic}":`, error);
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Topic extraction error:", error);
      return { topics: [], createdNodes: [], error: error.message };
    }
  }

  // =====================================================
  // ONBOARDING-SPECIFIC TOOL IMPLEMENTATIONS
  // =====================================================

  /**
   * Process voice command during onboarding using the Maya conversation service
   */
  private async processVoiceCommand(params: any): Promise<any> {
    const { userId, voiceInput, currentPhase, conversationContext } = params;
    
    try {
      // Note: In a real implementation, we would need to import and use the
      // MayaConversationService here. For now, we'll provide a simplified response.
      
      // Simulate voice command processing
      const confidence = this.calculateVoiceConfidence(voiceInput, currentPhase);
      const commandType = this.inferCommandType(voiceInput, currentPhase);
      
      const response = {
        success: confidence > 0.6,
        command_type: commandType,
        confidence: confidence,
        maya_response: this.generateMayaResponse(voiceInput, currentPhase, confidence > 0.6),
        parsed_data: this.extractDataFromVoiceInput(voiceInput, currentPhase),
        next_phase: confidence > 0.6 ? this.getNextOnboardingPhase(currentPhase) : currentPhase,
        requires_clarification: confidence <= 0.6
      };

      // Log voice command for analytics
      await this.logVoiceCommand(userId, voiceInput, currentPhase, response);

      return response;
    } catch (error) {
      console.error('Voice command processing error:', error);
      return {
        success: false,
        error: error.message,
        maya_response: "I'm sorry, I had trouble processing what you said. Could you try again?"
      };
    }
  }

  /**
   * Get current onboarding state for a user
   */
  private async getOnboardingState(params: any): Promise<any> {
    const { userId } = params;
    
    try {
      // Fetch user questionnaire data
      const { data: questionnaire, error: qError } = await this.supabase
        .from('user_questionnaire')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch user goals
      const { data: goals, error: gError } = await this.supabase
        .from('user_goals')
        .select(`
          *,
          goals:goal_id (title, description, category_id)
        `)
        .eq('user_id', userId)
        .eq('goal_status', 'active');

      // Fetch interaction events for onboarding progress
      const { data: events, error: eError } = await this.supabase
        .from('interaction_events')
        .select('event_type, payload, created_at')
        .eq('user_id', userId)
        .eq('source', 'maya_conversation')
        .order('created_at', { ascending: false })
        .limit(10);

      const onboardingState = {
        user_id: userId,
        questionnaire: questionnaire || null,
        goals: goals || [],
        recent_events: events || [],
        completion_status: {
          has_questionnaire: !!questionnaire,
          has_goals: (goals || []).length > 0,
          onboarding_completed: !!questionnaire?.onboarding_completed_at,
          completion_date: questionnaire?.onboarding_completed_at
        },
        current_phase: this.inferCurrentPhase(questionnaire, goals),
        total_goals: (goals || []).length
      };

      return onboardingState;
    } catch (error) {
      console.error('Error fetching onboarding state:', error);
      throw new Error(`Failed to fetch onboarding state: ${error.message}`);
    }
  }

  /**
   * Save onboarding progress from voice commands
   */
  private async saveOnboardingProgress(params: any): Promise<any> {
    const { userId, phase, data } = params;
    
    try {
      const results: any = {};

      switch (phase) {
        case 'name_input':
          // Store name in user profile or session
          results.name = data.name;
          break;

        case 'category_selection':
          // Update preferred categories
          if (data.categories && data.categories.length > 0) {
            await this.supabase
              .from('user_questionnaire')
              .upsert({
                user_id: userId,
                preferred_categories: data.categories,
                updated_at: new Date().toISOString()
              });
            results.categories = data.categories;
          }
          break;

        case 'goal_selection':
          // Create user goals
          if (data.goals && data.goals.length > 0) {
            const goalInserts = data.goals.map((goal: any) => ({
              user_id: userId,
              goal_title: goal.title || goal.customTitle,
              goal_description: goal.description || goal.customDescription,
              goal_status: 'active',
              target_date: goal.targetDate,
              metadata: {
                source: 'voice_command',
                selection_context: goal.selectionContext
              }
            }));

            const { data: insertedGoals, error } = await this.supabase
              .from('user_goals')
              .insert(goalInserts)
              .select();

            if (error) throw error;
            results.goals = insertedGoals;
          }
          break;

        case 'timeline_selection':
          // Update time horizon
          await this.supabase
            .from('user_questionnaire')
            .upsert({
              user_id: userId,
              time_horizon: data.timeframe || data.timeline,
              updated_at: new Date().toISOString()
            });
          results.timeline = data.timeframe || data.timeline;
          break;

        case 'learning_preferences':
          // Update learning preferences
          await this.supabase
            .from('user_questionnaire')
            .upsert({
              user_id: userId,
              learning_prefs: data.learningStyles || data.preferences,
              experience_level: data.experienceLevel || 'intermediate',
              updated_at: new Date().toISOString()
            });
          results.learning_preferences = data;
          break;

        case 'agent_selection':
          // Record agent selection
          results.selected_agent = data.agentName || data.agent;
          break;
      }

      // Log the progress save event
      await this.supabase
        .from('interaction_events')
        .insert({
          user_id: userId,
          source: 'maya_conversation',
          event_type: 'onboarding_progress_saved',
          payload: {
            phase,
            data,
            saved_results: results
          }
        });

      return {
        success: true,
        phase,
        saved_data: results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      throw new Error(`Failed to save onboarding progress: ${error.message}`);
    }
  }

  /**
   * Get available goal categories for onboarding
   */
  private async getAvailableCategories(params: any): Promise<any> {
    const { limit = 8 } = params;
    
    try {
      const { data, error } = await this.supabase.rpc('get_top_goal_categories', {
        p_limit: limit
      });

      if (error) {
        // Fallback to direct table query
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .from('goal_categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .limit(limit);

        if (fallbackError) throw fallbackError;
        
        return {
          categories: fallbackData || [],
          total: (fallbackData || []).length,
          source: 'fallback_query'
        };
      }

      return {
        categories: data || [],
        total: (data || []).length,
        source: 'rpc_function'
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      
      // Return hardcoded categories as final fallback
      return {
        categories: [
          { id: 'career', title: 'Career Development', icon_name: 'briefcase' },
          { id: 'health', title: 'Health & Fitness', icon_name: 'heart' },
          { id: 'personal', title: 'Personal Development', icon_name: 'user' },
          { id: 'finance', title: 'Financial Wellness', icon_name: 'dollar-sign' },
          { id: 'relationships', title: 'Relationships', icon_name: 'users' },
          { id: 'learning', title: 'Learning & Education', icon_name: 'book' },
          { id: 'creativity', title: 'Creativity & Hobbies', icon_name: 'palette' },
          { id: 'productivity', title: 'Productivity', icon_name: 'target' }
        ],
        total: 8,
        source: 'hardcoded_fallback'
      };
    }
  }

  /**
   * Search for goals within selected categories
   */
  private async searchGoalsByCategory(params: any): Promise<any> {
    const { categories, searchQuery, limit = 10 } = params;
    
    try {
      const { data, error } = await this.supabase.rpc('get_onboarding_goals', {
        p_category_ids: categories,
        p_search_query: searchQuery,
        p_limit: limit
      });

      if (error) {
        // Fallback query
        let query = this.supabase
          .from('goals')
          .select(`
            *,
            goal_categories (title, display_color, icon_name)
          `)
          .in('category_id', categories)
          .limit(limit);

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const { data: fallbackData, error: fallbackError } = await query;
        if (fallbackError) throw fallbackError;

        return {
          goals: fallbackData || [],
          categories_searched: categories,
          search_query: searchQuery,
          total: (fallbackData || []).length
        };
      }

      return {
        goals: data || [],
        categories_searched: categories,
        search_query: searchQuery,
        total: (data || []).length
      };
    } catch (error) {
      console.error('Error searching goals by category:', error);
      throw new Error(`Failed to search goals: ${error.message}`);
    }
  }

  /**
   * Match user's verbal goal description to preset goals
   */
  private async matchUserGoalToPreset(params: any): Promise<any> {
    const { userPhrase, category, confidenceThreshold = 0.7 } = params;
    
    try {
      // Search for similar goals using semantic search
      const { data: goals, error } = await this.supabase
        .from('goals')
        .select('id, title, description, category_id')
        .limit(10);
      
      if (error) throw error;
      
      // For now, do a simple text matching
      // In production, this would use embeddings and semantic similarity
      const matches = goals?.map(goal => {
        const similarity = this.calculateTextSimilarity(
          userPhrase.toLowerCase(),
          (goal.title + ' ' + (goal.description || '')).toLowerCase()
        );
        
        return {
          goal,
          confidence: similarity
        };
      })
      .filter(match => match.confidence >= confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
      
      const bestMatch = matches?.[0];
      
      return {
        matched: !!bestMatch,
        goal: bestMatch?.goal || null,
        confidence: bestMatch?.confidence || 0,
        alternativeMatches: matches?.slice(1, 3).map(m => m.goal) || []
      };
    } catch (error: any) {
      throw new Error(`Failed to match goal: ${error.message}`);
    }
  }

  /**
   * Confirm user's goal selection with their preferred terminology
   */
  private async confirmGoalSelection(params: any): Promise<any> {
    const { 
      userId, 
      userPhrase, 
      matchedGoalId, 
      userPreferredTerm, 
      confirmed,
      timeline 
    } = params;
    
    try {
      // Save the goal translation/confirmation
      const { data, error } = await this.supabase
        .from('goal_translations')
        .insert({
          user_id: userId,
          user_phrase: userPhrase,
          matched_goal_id: matchedGoalId,
          user_confirmed: confirmed,
          user_preferred_term: userPreferredTerm,
          confidence_score: confirmed ? 1.0 : 0.0,
          confirmed_at: confirmed ? new Date().toISOString() : null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If confirmed, create the goal node
      if (confirmed) {
        const goalData = {
          p_user_id: userId,
          p_title: userPreferredTerm,
          p_category: 'Personal Growth',
          p_properties: {
            original_phrase: userPhrase,
            matched_goal_id: matchedGoalId,
            timeline: timeline,
            source: 'voice_onboarding'
          }
        };
        
        const { data: goalNode, error: goalError } = await this.supabase
          .rpc('create_goal_node', goalData);
        
        if (goalError) {
          console.error('Error creating goal node:', goalError);
        }
        
        return {
          success: true,
          translationId: data.id,
          goalNodeId: goalNode?.id || null,
          message: 'Goal confirmed and saved'
        };
      }
      
      return {
        success: true,
        translationId: data.id,
        message: 'Goal marked as not confirmed'
      };
    } catch (error: any) {
      throw new Error(`Failed to confirm goal: ${error.message}`);
    }
  }

  /**
   * Simple text similarity calculation (Jaccard similarity)
   * In production, use proper embeddings and cosine similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get matching agents using the agent matching service
   */
  private async getMatchingAgents(params: any): Promise<any> {
    const { userId, trigger = 'onboarding', maxAgents = 3 } = params;
    
    try {
      // Use the sophisticated agent matching function
      const { data, error } = await this.supabase.rpc('find_matching_agents', {
        p_user_id: userId,
        p_trigger_type: trigger,
        p_max_agents: maxAgents
      });

      if (error || !data || data.length === 0) {
        // Fallback to simple agent query
        const { data: agentData, error: agentError } = await this.supabase
          .from('agent_personae')
          .select(`
            uuid,
            "Name",
            "Speciality",
            "Category",
            "Goal Category",
            "11labs_agentID",
            "Personality",
            "Strengths"
          `)
          .not('"11labs_agentID"', 'is', null)
          .limit(maxAgents);

        if (agentError) throw agentError;

        const fallbackMatches = (agentData || []).map(agent => ({
          agent_id: agent.uuid,
          agent_name: agent.Name,
          specialty: agent.Speciality,
          category: agent.Category,
          elevenlabs_agent_id: agent['11labs_agentID'],
          total_score: 0.7, // Default score
          reasoning: `${agent.Name} is a great general match for your onboarding journey.`,
          personality: agent.Personality,
          strengths: agent.Strengths
        }));

        return {
          matches: fallbackMatches,
          trigger,
          matching_performed_at: new Date().toISOString(),
          source: 'fallback_query'
        };
      }

      return {
        matches: data.map((match: any) => ({
          agent_id: match.agent_id,
          agent_name: match.agent_name,
          specialty: match.agent_specialty,
          category: match.agent_category,
          elevenlabs_agent_id: match.elevenlabs_agent_id,
          total_score: match.total_score,
          reasoning: match.reasoning || `${match.agent_name} is a great match based on your selections.`
        })),
        trigger,
        matching_performed_at: new Date().toISOString(),
        source: 'sophisticated_matching'
      };
    } catch (error) {
      console.error('Error getting matching agents:', error);
      throw new Error(`Failed to get matching agents: ${error.message}`);
    }
  }

  /**
   * Get conversation context and history
   */
  private async getConversationContext(params: any): Promise<any> {
    const { userId, conversationId } = params;
    
    try {
      // Get recent conversation events
      const { data: events, error: eventsError } = await this.supabase
        .from('interaction_events')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'maya_conversation')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError && eventsError.code !== 'PGRST116') {
        console.warn('Failed to fetch conversation events:', eventsError);
      }

      // Get current onboarding state
      const onboardingState = await this.getOnboardingState({ userId });

      return {
        user_id: userId,
        conversation_id: conversationId,
        recent_events: events || [],
        onboarding_state: onboardingState,
        context_retrieved_at: new Date().toISOString(),
        total_events: (events || []).length
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        user_id: userId,
        conversation_id: conversationId,
        recent_events: [],
        onboarding_state: { user_id: userId },
        error: error.message,
        context_retrieved_at: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // ONBOARDING HELPER METHODS
  // =====================================================

  private calculateVoiceConfidence(voiceInput: string, currentPhase: string): number {
    // Simple confidence calculation based on input length and phase appropriateness
    let confidence = 0.5; // Base confidence

    // Boost for appropriate length
    if (voiceInput.length > 5 && voiceInput.length < 200) {
      confidence += 0.2;
    }

    // Boost for phase-appropriate keywords
    const phaseKeywords: Record<string, string[]> = {
      name_input: ['name', 'call', 'i\'m', 'i am'],
      category_selection: ['want', 'interested', 'career', 'health', 'personal'],
      goal_selection: ['goal', 'improve', 'learn', 'get better', 'work on'],
      timeline_selection: ['month', 'year', 'short', 'long', 'soon', 'time'],
      learning_preferences: ['learn', 'visual', 'hands-on', 'practice', 'reading'],
      agent_selection: ['choose', 'pick', 'agent', 'coach', 'maya', 'alex', 'sage']
    };

    const keywords = phaseKeywords[currentPhase] || [];
    const inputLower = voiceInput.toLowerCase();
    
    for (const keyword of keywords) {
      if (inputLower.includes(keyword)) {
        confidence += 0.1;
        break;
      }
    }

    return Math.min(0.95, confidence);
  }

  private inferCommandType(voiceInput: string, currentPhase: string): string {
    const inputLower = voiceInput.toLowerCase();

    if (inputLower.includes('yes') || inputLower.includes('okay') || inputLower.includes('sure')) {
      return 'confirm';
    }

    if (inputLower.includes('help') || inputLower.includes('what') || inputLower.includes('explain')) {
      return 'request_info';
    }

    switch (currentPhase) {
      case 'name_input':
        return 'set_name';
      case 'category_selection':
        return 'select_categories';
      case 'goal_selection':
        return 'select_goals';
      case 'timeline_selection':
        return 'set_timeline';
      case 'learning_preferences':
        return 'set_learning_style';
      case 'agent_selection':
        return 'select_agent';
      default:
        return 'unknown';
    }
  }

  private generateMayaResponse(voiceInput: string, currentPhase: string, success: boolean): string {
    if (!success) {
      const clarifications: Record<string, string> = {
        name_input: "I want to make sure I get your name right! Could you tell me your name again?",
        category_selection: "I'm not sure which areas you're interested in. Could you tell me about your focus areas?",
        goal_selection: "Could you be more specific about your goals? What would you like to achieve?",
        timeline_selection: "When are you hoping to see progress? You can say things like 'in 3 months' or 'long term'.",
        learning_preferences: "How do you like to learn? Are you more visual, or do you prefer hands-on practice?",
        agent_selection: "Which coaching agent would you like to work with? Or would you like to hear more about them?"
      };
      return clarifications[currentPhase] || "I didn't catch that. Could you try again?";
    }

    const responses: Record<string, string> = {
      name_input: "Nice to meet you! Now let's talk about what areas you'd like to focus on.",
      category_selection: "Great choices! Let's get specific about your goals in these areas.",
      goal_selection: "Excellent goals! Now, when would you like to achieve these?",
      timeline_selection: "Perfect! That timeline makes sense. Let's talk about how you like to learn.",
      learning_preferences: "Good to know! Now let me introduce you to some coaching agents who can help.",
      agent_selection: "Wonderful choice! You're all set to begin your journey!"
    };

    return responses[currentPhase] || "Great! Let's continue.";
  }

  private extractDataFromVoiceInput(voiceInput: string, currentPhase: string): Record<string, any> {
    const inputLower = voiceInput.toLowerCase();
    const data: Record<string, any> = {};

    switch (currentPhase) {
      case 'name_input':
        // Extract name from patterns like "my name is John" or "I'm Sarah"
        const namePatterns = [
          /(?:my name is|i'm|i am|call me)\s+([a-zA-Z\s]+)/i,
          /^([a-zA-Z\s]{2,20})$/i
        ];
        
        for (const pattern of namePatterns) {
          const match = voiceInput.match(pattern);
          if (match) {
            data.name = match[1].trim();
            break;
          }
        }
        break;

      case 'category_selection':
        // Extract categories from voice input
        const categoryKeywords = {
          career: ['career', 'job', 'work', 'professional'],
          health: ['health', 'fitness', 'wellness', 'physical'],
          personal: ['personal', 'self', 'development'],
          finance: ['finance', 'money', 'financial', 'budget'],
          relationships: ['relationships', 'social', 'family'],
          learning: ['learning', 'education', 'study', 'skill'],
          creativity: ['creative', 'art', 'hobbies', 'music']
        };

        data.categories = [];
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
          for (const keyword of keywords) {
            if (inputLower.includes(keyword)) {
              data.categories.push(category);
              break;
            }
          }
        }
        break;

      case 'goal_selection':
        // Extract goal descriptions
        data.goals = [{
          title: voiceInput.substring(0, 50),
          description: voiceInput,
          customTitle: voiceInput.length > 50 ? voiceInput.substring(0, 47) + '...' : voiceInput
        }];
        break;

      case 'timeline_selection':
        // Extract timeline information
        if (inputLower.includes('short') || inputLower.includes('soon') || inputLower.includes('month')) {
          data.timeframe = 'short';
        } else if (inputLower.includes('long') || inputLower.includes('year') || inputLower.includes('eventually')) {
          data.timeframe = 'long';
        } else {
          data.timeframe = 'medium';
        }
        break;

      case 'learning_preferences':
        // Extract learning style preferences
        data.learningStyles = [];
        if (inputLower.includes('visual') || inputLower.includes('seeing') || inputLower.includes('reading')) {
          data.learningStyles.push('visual');
        }
        if (inputLower.includes('hands-on') || inputLower.includes('doing') || inputLower.includes('practice')) {
          data.learningStyles.push('kinesthetic');
        }
        if (inputLower.includes('listening') || inputLower.includes('audio') || inputLower.includes('hearing')) {
          data.learningStyles.push('auditory');
        }
        if (data.learningStyles.length === 0) {
          data.learningStyles.push('mixed');
        }
        break;

      case 'agent_selection':
        // Extract agent selection
        const agentNames = ['maya', 'alex', 'sage', 'elena', 'jordan'];
        for (const name of agentNames) {
          if (inputLower.includes(name)) {
            data.agentName = name;
            break;
          }
        }
        break;
    }

    return data;
  }

  private getNextOnboardingPhase(currentPhase: string): string | null {
    const phases = [
      'name_input',
      'category_selection', 
      'goal_selection',
      'timeline_selection',
      'learning_preferences',
      'agent_selection',
      'completion'
    ];

    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  }

  private inferCurrentPhase(questionnaire: any, goals: any[]): string {
    if (!questionnaire) return 'name_input';
    if (!questionnaire.preferred_categories || questionnaire.preferred_categories.length === 0) return 'category_selection';
    if (!goals || goals.length === 0) return 'goal_selection';
    if (!questionnaire.time_horizon) return 'timeline_selection';
    if (!questionnaire.learning_prefs) return 'learning_preferences';
    if (!questionnaire.onboarding_completed_at) return 'agent_selection';
    return 'completion';
  }

  private async logVoiceCommand(userId: string, voiceInput: string, phase: string, response: any): Promise<void> {
    try {
      await this.supabase
        .from('interaction_events')
        .insert({
          user_id: userId,
          source: 'maya_conversation',
          event_type: 'voice_command_processed',
          payload: {
            voice_input: voiceInput,
            phase,
            response: {
              success: response.success,
              confidence: response.confidence,
              command_type: response.command_type,
              requires_clarification: response.requires_clarification
            }
          }
        });
    } catch (error) {
      console.warn('Failed to log voice command:', error);
    }
  }

  // Helper method to queue embedding generation
  private async queueEmbedding(nodeId: string, content: string): Promise<void> {
    try {
      await this.supabase
        .from("embedding_queue")
        .insert({
          node_id: nodeId,
          content,
          status: "pending",
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn("Failed to queue embedding:", error);
    }
  }

  // Handle MCP method calls
  private async handleMethod(method: string, params: any): Promise<any> {
    switch (method) {
      case "tools/list":
        // Return tools in simplified format for ElevenLabs
        const tools = this.getTools();
        console.error("TOOLS/LIST CALLED - Returning", tools.length, "tools:", tools.map(t => t.name));
        return { 
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        };
      
      case "tools/call":
        const { name, arguments: args } = params;
        
        // Parse instructions if present to extract parameters
        if (args.instructions) {
          // Simple parsing - in production, use AI to parse instructions
          const instructions = args.instructions.toLowerCase();
          
          // Extract userId if not provided
          if (!args.userId) {
            // Use a real test user ID for now (mark.lewis@sparkytek.com)
            // TODO: In production, get this from ElevenLabs context or auth
            args.userId = "907f679d-b36a-42a8-8b60-ce0d9cc11726";
          }
          
          // For create node, extract type and label from instructions
          if (name === "create_node" || name === "graph_create_node") {
            if (!args.type && !args.nodeType) {
              if (instructions.includes("goal")) args.type = "goal";
              else if (instructions.includes("skill")) args.type = "skill";
              else if (instructions.includes("emotion")) args.type = "emotion";
              else if (instructions.includes("accomplishment")) args.type = "accomplishment";
              else args.type = "goal"; // Default to goal
            }
            // Map nodeType to type if provided
            if (args.nodeType && !args.type) {
              args.type = args.nodeType;
            }
            
            if (!args.label) {
              // Extract label from instructions (simplified)
              args.label = instructions.substring(0, 50);
            }
          }
          
          // For search, extract query from instructions
          if (name === "graph_search_nodes" && !args.query) {
            args.query = instructions;
          }
        }
        
        switch (name) {
          // Tool implementations
          case "get_user_graph":
          case "graph_get_user_data":
          case "getUserGraph":
            return await this.getUserGraph(args);
          
          case "search_nodes":
          case "graph_search_nodes":
          case "searchNodes":
            return await this.searchNodes(args);
          
          case "create_node":
          case "graph_create_node":
          case "createNode":
            return await this.createNode(args);
          
          case "create_edge":
          case "graph_create_edge":
          case "createEdge":
            return await this.createEdge(args);
          
          case "update_node":
          case "graph_update_node":
          case "updateNode":
            return await this.updateNode(args);
          
          case "get_recent_nodes":
          case "graph_get_recent_nodes":
          case "getRecentNodes":
            return await this.getRecentNodes(args);
          
          case "update_goal_progress":
          case "graph_update_goal_progress":
          case "updateGoalProgress":
            return await this.updateGoalProgress(args);
          
          case "get_temporal_context":
          case "graph_get_temporal_context":
          case "getTemporalContext":
            return await this.getTemporalContext(args);
          // Keep old names for compatibility
          case "graph_get_active_goals":
          case "getActiveGoals":
            return await this.getActiveGoals(args);
          case "graph_search_nodes":
          case "searchNodes":
            return await this.searchNodes(args);
          case "graph_create_edge":
          case "createEdge":
            return await this.createEdge(args);
          case "graph_update_goal_status":
          case "updateGoalStatus":
            return await this.updateGoalStatus(args);
          case "graph_get_temporal_context":
          case "getTemporalContext":
            return await this.getTemporalContext(args);
          case "graph_extract_topics":
          case "extractKeyTopics":
            return await this.extractKeyTopics(args);
          case "getRecentInsights":
            return await this.getRecentInsights(args);
          case "findRelatedInsights":
            return await this.findRelatedInsights(args);
          
          // Onboarding-specific tools
          case "process_voice_command":
            return await this.processVoiceCommand(args);
          case "get_onboarding_state":
            return await this.getOnboardingState(args);
          case "save_onboarding_progress":
            return await this.saveOnboardingProgress(args);
          case "get_available_categories":
            return await this.getAvailableCategories(args);
          case "search_goals_by_category":
            return await this.searchGoalsByCategory(args);
          case "match_user_goal_to_preset":
            return await this.matchUserGoalToPreset(args);
          case "confirm_goal_selection":
            return await this.confirmGoalSelection(args);
          case "get_matching_agents":
            return await this.getMatchingAgents(args);
          case "get_conversation_context":
            return await this.getConversationContext(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      
      case "initialize":
        // Accept any protocol version and echo it back
        const requestedVersion = params?.protocolVersion || "2024-11-05";
        console.error("INITIALIZE CALLED - Protocol version:", requestedVersion);
        return {
          protocolVersion: requestedVersion,
          capabilities: {
            tools: {},
            experimental: {}
          },
          serverInfo: {
            name: "LiveGuide MCP Server",
            version: "1.0.0"
          }
        };
      
      case "notifications/list":
        // Return empty notifications list with proper format
        return { 
          notifications: [],
          _meta: {}
        };
      
      case "prompts/list":
        // Return empty prompts with proper format
        return { 
          prompts: [],
          _meta: {}
        };
      
      case "resources/list":
        // Return empty resources with proper format
        return { 
          resources: [],
          _meta: {}
        };
      
      case "initialized":
        // Some MCP clients send this after initialize
        return { status: "ok" };
        
      default:
        console.warn(`Unknown method requested: ${method}`);
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Process MCP request and generate response
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const result = await this.handleMethod(request.method, request.params);
      console.log(`MCP Response for ${request.method}:`, JSON.stringify(result).substring(0, 200));
      return {
        jsonrpc: "2.0",
        id: request.id,
        result
      };
    } catch (error) {
      console.error(`MCP method ${request.method} error:`, error);
      
      let errorCode = MCP_ERRORS.INTERNAL_ERROR;
      if (error.message.includes("Unknown")) {
        errorCode = MCP_ERRORS.METHOD_NOT_FOUND;
      } else if (error.message.includes("Invalid")) {
        errorCode = MCP_ERRORS.INVALID_PARAMS;
      }

      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: errorCode,
          message: error.message,
          data: error.stack
        }
      };
    }
  }
}

// Authentication middleware (disabled for public access)
function authenticateRequest(req: Request): boolean {
  // Allow all requests for now since ElevenLabs doesn't send auth headers
  console.log("Authentication bypassed - public access enabled");
  return true;
}

// Session storage for SSE connections
const sessions = new Map<string, any>();

// Create a single instance of MCPServer
const mcpServer = new MCPServer();

// Main handler
Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

  const url = new URL(req.url);
  // Handle both /functions/v1/mcp-server and /functions/mcp-server paths
  let pathname = url.pathname;
  pathname = pathname.replace(/^\/functions\/v1\/mcp-server/, '');
  pathname = pathname.replace(/^\/functions\/mcp-server/, '');
  
  // Handle /mcp endpoint for remote MCP server discovery
  if (pathname === '/mcp' || pathname.endsWith('/mcp')) {
    // Return MCP server info for discovery
    return new Response(
      JSON.stringify({
        name: "LiveGuide MCP Server",
        version: "1.0.0",
        protocol: "2024-11-05",
        transport: "http",
        endpoint: url.origin + url.pathname.replace('/mcp', ''),
        capabilities: {
          tools: true,
          resources: false,
          prompts: false
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  }
  
  // Handle ElevenLabs registration endpoint BEFORE other handlers
  if (pathname === '/register' || pathname.endsWith('/register')) {
    console.log(`ElevenLabs ${req.method} /register request received`);
    const tools = mcpServer.getTools();
    
    if (req.method === 'GET') {
      // GET /register - return available tools for discovery
      const response = {
        status: "available",
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: Object.keys(t.inputSchema.properties || {})
        })),
        server: "LiveGuide MCP Server",
        version: "1.0.0"
      };
      
      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
    
    if (req.method === 'POST') {
      // POST /register - confirm registration
      const response = {
        status: "registered",
        tools: tools.map(t => t.name),
        message: "MCP server registered successfully",
        capabilities: {
          tools: true,
          resources: false,
          prompts: false
        }
      };
      
      console.log("Registration response:", JSON.stringify(response));
      
      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }
  }
  
  // Generate session ID for SSE connections
  const sessionId = crypto.randomUUID();
  
  try {
    // No authentication required - public MCP server
    console.log("Request received:", { 
      pathname, 
      method: req.method,
      sessionId: url.searchParams.get("sessionId") || sessionId
    });

    const mcpServer = new MCPServer();

    // Handle SSE endpoint for HTTP+SSE transport
    // Only return SSE for GET requests to /sse endpoint
    const wantsSSE = pathname === "/sse" || url.pathname.endsWith("/sse");
    
    if (req.method === "GET" && wantsSSE) {
      const encoder = new TextEncoder();
      
      // Store session
      sessions.set(sessionId, { created: Date.now() });
      console.log("SSE connection established, sessionId:", sessionId);
      
      const stream = new ReadableStream({
        start(controller) {
          // Send initial endpoint event with session ID (MCP SSE protocol)
          // The endpoint should be relative to the base URL
          const endpointPath = `/functions/v1/mcp-server/messages?sessionId=${sessionId}`;
          const endpointEvent = `event: endpoint\ndata: ${endpointPath}\n\n`;
          controller.enqueue(encoder.encode(endpointEvent));
          console.log("Sent endpoint event with path:", endpointPath);
          
          // Keep connection alive with heartbeats
          const keepAlive = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            } catch (e) {
              clearInterval(keepAlive);
              sessions.delete(sessionId);
            }
          }, 30000);
          
          // Clean up on close
          req.signal?.addEventListener("abort", () => {
            clearInterval(keepAlive);
            sessions.delete(sessionId);
            controller.close();
          });
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        }
      });
    }
    
    // Handle messages endpoint for SSE transport
    if (pathname.startsWith("/messages") && req.method === "POST") {
      const querySessionId = url.searchParams.get("sessionId");
      
      // For now, don't require valid session to debug
      console.log("Messages endpoint hit with sessionId:", querySessionId);
      console.log("Active sessions:", Array.from(sessions.keys()));
      
      const body = await req.text();
      const mcpRequest: MCPRequest = JSON.parse(body);
      
      console.log("MCP Request via SSE transport:", {
        method: mcpRequest.method,
        sessionId: querySessionId
      });
      
      const response = await mcpServer.processRequest(mcpRequest);
      
      // Return as JSON (not SSE) for messages endpoint
      return new Response(
        JSON.stringify(response),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }    // Handle HTTP/JSON-RPC endpoint
    if (req.method === "POST") {
      const body = await req.text();
      
      // Log the request for debugging
      console.log("Request body:", body);
      
      // Never stream for POST JSON-RPC requests - ElevenLabs expects standard JSON
      const isStreaming = false;
      
      // Handle single request
      try {
        const mcpRequest: MCPRequest = JSON.parse(body);
        
        // Log the incoming request for debugging
        console.log("MCP Request:", {
          method: mcpRequest.method,
          id: mcpRequest.id,
          params: mcpRequest.params ? JSON.stringify(mcpRequest.params).substring(0, 100) : null,
          isStreaming,
          userAgent: req.headers.get("user-agent"),
          timestamp: new Date().toISOString()
        });
        
        // Validate JSON-RPC structure
        if (mcpRequest.jsonrpc !== "2.0" || !mcpRequest.method) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: mcpRequest.id || null,
              error: {
                code: MCP_ERRORS.INVALID_REQUEST,
                message: "Invalid JSON-RPC request"
              }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }

        const response = await mcpServer.processRequest(mcpRequest);
        
        // For streaming requests, send as newline-delimited JSON
        if (isStreaming) {
          return new Response(JSON.stringify(response) + "\n", {
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/x-ndjson",
              "Transfer-Encoding": "chunked"
            }
          });
        }
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
        
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: MCP_ERRORS.PARSE_ERROR,
              message: "Parse error",
              data: parseError.message
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Handle GET requests (health check / info) - only if not SSE
    if (req.method === "GET" && !wantsSSE) {
      return new Response(
        JSON.stringify({
          name: "LiveGuide MCP Server",
          version: "1.0.0",
          protocol: "2024-11-05",
          transport: "http",  // Single transport method for ElevenLabs
          capabilities: {
            tools: {},
            resources: {}
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("Server error:", error);
    
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: MCP_ERRORS.INTERNAL_ERROR,
          message: "Internal server error",
          data: error.message
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
  } catch (error) {
    console.error("Unhandled error in MCP server:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error occurred"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});