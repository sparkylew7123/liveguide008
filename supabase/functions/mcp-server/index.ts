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
    // Full set of tools for LiveGuide knowledge graph
    return [
      {
        name: "get_user_graph",
        description: "Retrieve the user's complete knowledge graph including all nodes and edges",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
            userId: { 
              type: "string",
              description: "User ID to fetch graph for"
            }
          },
          required: ["instructions"]
        }
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph using semantic search",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "create_node",
        description: "Create a new node in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "create_edge",
        description: "Create a relationship between two nodes",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "update_node",
        description: "Update an existing node's properties",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "get_recent_nodes",
        description: "Get the most recently created or modified nodes",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "update_goal_progress",
        description: "Update the progress status of a goal node",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
        }
      },
      {
        name: "get_temporal_context",
        description: "Retrieve nodes and edges within a specific time range",
        inputSchema: {
          type: "object",
          properties: {
            instructions: { 
              type: "string",
              description: "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
            },
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
          required: ["instructions"]
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
  }  // Helper method to queue embedding generation
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
    // Always return SSE for /sse endpoint, or when Accept header requests it
    const wantsSSE = pathname === "/sse" || 
                     url.pathname.endsWith("/sse") || 
                     req.headers.get("accept")?.includes("text/event-stream");
    
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
      
      // Check if this is a streaming request
      const isStreaming = req.headers.get("accept")?.includes("text/event-stream") || 
                         req.headers.get("accept")?.includes("application/x-ndjson");
      
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