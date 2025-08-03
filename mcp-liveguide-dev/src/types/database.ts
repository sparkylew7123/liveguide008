export type Database = {
  public: {
    Tables: {
      graph_nodes: {
        Row: {
          id: string
          user_id: string
          node_type: string
          label: string
          description: string | null
          properties: Record<string, any> | null
          embedding: number[] | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          node_type: string
          label: string
          description?: string | null
          properties?: Record<string, any> | null
          embedding?: number[] | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          node_type?: string
          label?: string
          description?: string | null
          properties?: Record<string, any> | null
          embedding?: number[] | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      graph_edges: {
        Row: {
          id: string
          user_id: string
          edge_type: string
          source_node_id: string
          target_node_id: string
          properties: Record<string, any> | null
          valid_from: string | null
          valid_to: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          edge_type: string
          source_node_id: string
          target_node_id: string
          properties?: Record<string, any> | null
          valid_from?: string | null
          valid_to?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          edge_type?: string
          source_node_id?: string
          target_node_id?: string
          properties?: Record<string, any> | null
          valid_from?: string | null
          valid_to?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Functions: {
      get_node_neighborhood: {
        Args: {
          node_id: string
          depth: number
        }
        Returns: {
          nodes: Array<{
            id: string
            label: string
            node_type: string
            depth: number
          }>
          edges: Array<{
            source: string
            target: string
            edge_type: string
          }>
        }
      }
      find_similar_nodes: {
        Args: {
          node_id: string
          embedding: number[]
          match_count: number
        }
        Returns: Array<{
          id: string
          label: string
          similarity: number
        }>
      }
      search_knowledge_chunks: {
        Args: {
          query_text: string
          match_count: number
        }
        Returns: Array<{
          id: string
          content: string
          similarity: number
        }>
      }
    }
  }
}