export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          Personality: string | null
          response_templates: Json | null
          Speciality: string | null
          Strengths: string | null
          "Tone and Style": string | null
          uuid: string
          voice_profile: Json | null
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
          Personality?: string | null
          response_templates?: Json | null
          Speciality?: string | null
          Strengths?: string | null
          "Tone and Style"?: string | null
          uuid?: string
          voice_profile?: Json | null
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
          Personality?: string | null
          response_templates?: Json | null
          Speciality?: string | null
          Strengths?: string | null
          "Tone and Style"?: string | null
          uuid?: string
          voice_profile?: Json | null
        }
        Relationships: []
      }
      elevenlabs_conversations: {
        Row: {
          agent_id: string | null
          call_type: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          interaction_metrics: Json | null
          metadata: Json | null
          scheduled_duration: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          call_type?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_metrics?: Json | null
          metadata?: Json | null
          scheduled_duration?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          call_type?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_metrics?: Json | null
          metadata?: Json | null
          scheduled_duration?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      goal_categories: {
        Row: {
          created_at: string | null
          display_color: string | null
          icon_name: string | null
          id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_color?: string | null
          icon_name?: string | null
          id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_color?: string | null
          icon_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          locale: string | null
          preferences: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          preferences?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          cancel_at_period_end: boolean | null
          canceled_at: number | null
          created_at: string
          currency: string | null
          current_period_end: number | null
          current_period_start: number | null
          custom_field_data: Json | null
          customer_cancellation_comment: string | null
          customer_cancellation_reason: string | null
          customer_id: string | null
          ended_at: number | null
          ends_at: number | null
          id: string
          interval: string | null
          metadata: Json | null
          price_id: string | null
          started_at: number | null
          status: string | null
          stripe_id: string | null
          stripe_price_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          custom_field_data?: Json | null
          customer_cancellation_comment?: string | null
          customer_cancellation_reason?: string | null
          customer_id?: string | null
          ended_at?: number | null
          ends_at?: number | null
          id?: string
          interval?: string | null
          metadata?: Json | null
          price_id?: string | null
          started_at?: number | null
          status?: string | null
          stripe_id?: string | null
          stripe_price_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          custom_field_data?: Json | null
          customer_cancellation_comment?: string | null
          customer_cancellation_reason?: string | null
          customer_id?: string | null
          ended_at?: number | null
          ends_at?: number | null
          id?: string
          interval?: string | null
          metadata?: Json | null
          price_id?: string | null
          started_at?: number | null
          status?: string | null
          stripe_id?: string | null
          stripe_price_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_goals: {
        Row: {
          category_id: string | null
          created_at: string | null
          goal_description: string | null
          goal_status: string | null
          goal_title: string | null
          id: string
          metadata: Json | null
          milestones: Json | null
          profile_id: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          goal_description?: string | null
          goal_status?: string | null
          goal_title?: string | null
          id?: string
          metadata?: Json | null
          milestones?: Json | null
          profile_id?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          goal_description?: string | null
          goal_status?: string | null
          goal_title?: string | null
          id?: string
          metadata?: Json | null
          milestones?: Json | null
          profile_id?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "goal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: string | null
          email: string | null
          full_name: string | null
          id: string
          image: string | null
          name: string | null
          subscription: string | null
          token_identifier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          image?: string | null
          name?: string | null
          subscription?: string | null
          token_identifier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          image?: string | null
          name?: string | null
          subscription?: string | null
          token_identifier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      voice_chat_conversations: {
        Row: {
          agent_id: string
          conversation_id: string
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          agent_id: string
          conversation_id: string
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string
          id: string
          modified_at: string
          stripe_event_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          modified_at?: string
          stripe_event_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          modified_at?: string
          stripe_event_id?: string | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agents_by_category: {
        Args: { p_category?: string }
        Returns: {
          agent_name: string
          agent_category: string
          goal_category: string
          elevenlabs_agent_id: string
          personality: Json
          availability_status: string
        }[]
      }
      get_onboarding_status: {
        Args: { p_user_id: string }
        Returns: Json
      }
      handle_voice_onboarding: {
        Args: {
          p_user_id: string
          p_conversation_transcript: string
          p_extracted_profile: Json
          p_extracted_goal: Json
          p_conversation_metadata?: Json
        }
        Returns: Json
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const