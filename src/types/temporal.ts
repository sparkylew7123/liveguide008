// Temporal graph visualization types

export interface GraphEvent {
  id: string;
  user_id: string;
  node_id?: string;
  edge_id?: string;
  session_id?: string;
  event_type: GraphEventType;
  previous_state?: any;
  new_state: any;
  metadata?: Record<string, any>;
  created_at: string;
  created_by?: string;
}

export type GraphEventType = 
  | 'node_created'
  | 'node_updated'
  | 'node_deleted'
  | 'edge_created'
  | 'edge_updated'
  | 'edge_removed'
  | 'progress_changed'
  | 'status_changed'
  | 'embedding_generated';

export interface Session {
  id: string;
  user_id: string;
  node_type: 'session';
  label: string;
  created_at: string;
  updated_at: string;
  properties?: {
    duration?: number;
    agent_id?: string;
    summary?: string;
    emotion?: string;
    topics?: string[];
  };
}

export interface TimelineState {
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedSession?: Session;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface NodeEvolution {
  event_id: string;
  event_type: GraphEventType;
  event_timestamp: string;
  changes: Record<string, { old: any; new: any }>;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface TemporalNode {
  id: string;
  user_id: string;
  node_type: string;
  label: string;
  description?: string;
  properties?: any;
  status?: 'draft_verbal' | 'curated';
  
  // Temporal fields
  created_at: string;
  updated_at: string;
  first_mentioned_at?: string;
  last_discussed_at?: string;
  session_mentions?: Array<{
    session_id: string;
    timestamp: string;
    event_type: string;
  }>;
  evolution_metadata?: Record<string, any>;
  
  // Computed temporal properties
  age?: number; // in milliseconds
  isNew?: boolean;
  isRecent?: boolean;
  visibility?: number; // 0-1 based on time
}

export interface TemporalEdge {
  id: string;
  edge_type: string;
  source_id: string;
  target_id: string;
  label?: string;
  weight?: number;
  properties?: any;
  
  // Temporal fields
  created_at: string;
  updated_at: string;
  discovered_at?: string;
  strength_history?: Array<{
    timestamp: string;
    strength: number;
    session_id?: string;
  }>;
  last_reinforced_at?: string;
  
  // Computed temporal properties
  age?: number;
  isNew?: boolean;
  currentStrength?: number;
}