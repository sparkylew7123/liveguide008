export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_knowledge_bases: {
        Row: {
          agent_id: string
          created_at: string | null
          description: string | null
          document_count: number | null
          id: string
          indexing_status: string | null
          metadata: Json | null
          name: string
          total_chunks: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          id?: string
          indexing_status?: string | null
          metadata?: Json | null
          name: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          id?: string
          indexing_status?: string | null
          metadata?: Json | null
          name?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_personae: {
        Row: {
          "11labs_agentID": string | null
          availability_status: string | null
          average_rating: number | null
          Backstory: string | null
          Category: string | null
          "Goal Category": string | null
          id: string | null
          Image: string | null
          JSONB: Json | null
          "Key Features": string | null
          Name: string | null
          persona_id: string
          "Personality Traits": string | null
          rating_count: number | null
          Role: string | null
          "Sample Interactions": string | null
          "Speaking Style": string | null
          "Specialized Knowledge": string | null
          Status: string | null
          stripe_plan_id: string | null
          "Use Cases": string | null
          user_id: string | null
          "Voice ID": string | null
        }
        Insert: {
          "11labs_agentID"?: string | null
          availability_status?: string | null
          average_rating?: number | null
          Backstory?: string | null
          Category?: string | null
          "Goal Category"?: string | null
          id?: string | null
          Image?: string | null
          JSONB?: Json | null
          "Key Features"?: string | null
          Name?: string | null
          persona_id: string
          "Personality Traits"?: string | null
          rating_count?: number | null
          Role?: string | null
          "Sample Interactions"?: string | null
          "Speaking Style"?: string | null
          "Specialized Knowledge"?: string | null
          Status?: string | null
          stripe_plan_id?: string | null
          "Use Cases"?: string | null
          user_id?: string | null
          "Voice ID"?: string | null
        }
        Update: {
          "11labs_agentID"?: string | null
          availability_status?: string | null
          average_rating?: number | null
          Backstory?: string | null
          Category?: string | null
          "Goal Category"?: string | null
          id?: string | null
          Image?: string | null
          JSONB?: Json | null
          "Key Features"?: string | null
          Name?: string | null
          persona_id?: string
          "Personality Traits"?: string | null
          rating_count?: number | null
          Role?: string | null
          "Sample Interactions"?: string | null
          "Speaking Style"?: string | null
          "Specialized Knowledge"?: string | null
          Status?: string | null
          stripe_plan_id?: string | null
          "Use Cases"?: string | null
          user_id?: string | null
          "Voice ID"?: string | null
        }
        Relationships: []
      }
      elevenlabs_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          id: number
          message: string | null
          persona_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: number
          message?: string | null
          persona_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: number
          message?: string | null
          persona_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevenlabs_conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personae"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      goal_categories: {
        Row: {
          category_id: string
          category_name: string
          created_at: string
          id: number
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string
          id?: number
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      knowledge: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_updated_at: string | null
          metadata: Json | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_updated_at?: string | null
          metadata?: Json | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_updated_at?: string | null
          metadata?: Json | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunk_count: number | null
          content: string | null
          content_hash: string | null
          created_at: string
          document_type: string | null
          embedding: string | null
          id: string
          knowledge_base_id: string
          metadata: Json | null
          source_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          chunk_count?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          document_type?: string | null
          embedding?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json | null
          source_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          chunk_count?: number | null
          content?: string | null
          content_hash?: string | null
          created_at?: string
          document_type?: string | null
          embedding?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json | null
          source_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          credits: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: string | null
          subscription: string | null
          token_identifier: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          credits?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          subscription?: string | null
          token_identifier: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          credits?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          subscription?: string | null
          token_identifier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          category_id: string | null
          created_at: string
          goal_id: string
          goal_name: string
          id: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          goal_id: string
          goal_name: string
          id?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          goal_id?: string
          goal_name?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "goal_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          credits: string | null
          id: string
          subscription: string | null
          token_identifier: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          credits?: string | null
          id: string
          subscription?: string | null
          token_identifier: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          credits?: string | null
          id?: string
          subscription?: string | null
          token_identifier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          body: Json | null
          created_at: string
          event_id: string
          headers: Json | null
          id: number
          processed: boolean | null
          status: string | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          event_id: string
          headers?: Json | null
          id?: number
          processed?: boolean | null
          status?: string | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          event_id?: string
          headers?: Json | null
          id?: number
          processed?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_knowledge_base: {
        Args: {
          search_query: string
          kb_id_filter: string
          limit_results: number
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
      search_knowledge_chunks: {
        Args: {
          query_embedding: string
          knowledge_base_id_param: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

// etc.
export type Tables< 
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | {
        schema: keyof Database
      },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | {
        schema: keyof Database
      },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | {
        schema: keyof Database
      },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | {
        schema: keyof Database
      },
  EnumName extends PublicEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | {
        schema: keyof Database
      },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
