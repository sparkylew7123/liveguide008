import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CreateNodeSchema = z.object({
  node_type: z.string(),
  label: z.string(),
  description: z.string().optional(),
  properties: z.record(z.any()).optional(),
  user_id: z.string().uuid().optional(),
});

export const UpdateNodeSchema = z.object({
  id: z.string().uuid(),
  label: z.string().optional(),
  description: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

export const CreateEdgeSchema = z.object({
  edge_type: z.string(),
  source_node_id: z.string().uuid(),
  target_node_id: z.string().uuid(),
  properties: z.record(z.any()).optional(),
  user_id: z.string().uuid().optional(),
});

export const DeleteNodeSchema = z.object({
  id: z.string().uuid(),
});

export const DeleteEdgeSchema = z.object({
  id: z.string().uuid(),
});

export const GetNodeNeighborhoodSchema = z.object({
  node_id: z.string().uuid(),
  depth: z.number().int().positive().default(1),
});

export const FindSimilarNodesSchema = z.object({
  node_id: z.string().uuid(),
  limit: z.number().int().positive().default(5),
});

export class GraphOperations {
  constructor(private supabase: SupabaseClient<any>) {}

  async createNode(data: z.infer<typeof CreateNodeSchema>) {
    const nodeData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: node, error } = await this.supabase
      .from('graph_nodes')
      .insert(nodeData)
      .select()
      .single();

    if (error) throw error;
    return node;
  }

  async updateNode(data: z.infer<typeof UpdateNodeSchema>) {
    const { id, ...updateData } = data;
    
    const { data: node, error } = await this.supabase
      .from('graph_nodes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return node;
  }

  async createEdge(data: z.infer<typeof CreateEdgeSchema>) {
    const edgeData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: edge, error } = await this.supabase
      .from('graph_edges')
      .insert(edgeData)
      .select()
      .single();

    if (error) throw error;
    return edge;
  }

  async deleteNode(data: z.infer<typeof DeleteNodeSchema>) {
    const { error } = await this.supabase
      .from('graph_nodes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true, id: data.id };
  }

  async deleteEdge(data: z.infer<typeof DeleteEdgeSchema>) {
    const { error } = await this.supabase
      .from('graph_edges')
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { success: true, id: data.id };
  }

  async getNodeNeighborhood(data: z.infer<typeof GetNodeNeighborhoodSchema>) {
    const { data: result, error } = await this.supabase
      .rpc('get_node_neighborhood', {
        node_id: data.node_id,
        depth: data.depth,
      });

    if (error) throw error;
    return result;
  }

  async findSimilarNodes(data: z.infer<typeof FindSimilarNodesSchema>) {
    const { data: node, error: nodeError } = await this.supabase
      .from('graph_nodes')
      .select('embedding')
      .eq('id', data.node_id)
      .single();

    if (nodeError) throw nodeError;
    if (!node?.embedding) {
      throw new Error('Node has no embedding');
    }

    const { data: result, error } = await this.supabase
      .rpc('find_similar_nodes', {
        node_id: data.node_id,
        embedding: node.embedding,
        match_count: data.limit,
      });

    if (error) throw error;
    return result;
  }
}