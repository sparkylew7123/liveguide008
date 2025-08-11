import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { GraphEvent, Session, TimelineState, TemporalNode, TemporalEdge } from '@/types/temporal';
import { GraphNode, GraphEdge } from '@/lib/graph-goals';

interface UseTemporalGraphOptions {
  userId: string;
  autoPlay?: boolean;
  initialSpeed?: number;
}

export function useTemporalGraph({
  userId,
  autoPlay = false,
  initialSpeed = 1
}: UseTemporalGraphOptions) {
  const supabase = createClient();
  
  // Timeline state - start from 30 days ago to see temporal changes
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [timelineState, setTimelineState] = useState<TimelineState>({
    currentTime: startDate, // Start 30 days ago
    isPlaying: autoPlay,
    playbackSpeed: initialSpeed,
    timeRange: {
      start: startDate,
      end: new Date()
    }
  });
  
  console.log('[useTemporalGraph] Initial timeline state:', {
    currentTime: timelineState.currentTime.toISOString(),
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    playbackSpeed: initialSpeed
  });

  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [events, setEvents] = useState<GraphEvent[]>([]);
  const [temporalNodes, setTemporalNodes] = useState<TemporalNode[]>([]);
  const [temporalEdges, setTemporalEdges] = useState<TemporalEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation state
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  const lastSnapshotTimeRef = useRef<number>(0);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      console.log('Loading sessions for userId:', userId);
      
      if (!userId) {
        console.warn('No userId provided to loadSessions');
        return;
      }
      
      const { data, error } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', userId)
        .eq('node_type', 'session')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error loading sessions:', error);
        throw error;
      }
      
      console.log('Sessions loaded:', data);
      
      // Transform the data to match the Session type
      const sessions: Session[] = (data || []).map(node => ({
        id: node.id,
        user_id: node.user_id,
        node_type: 'session' as const,
        label: node.label,
        created_at: node.created_at,
        updated_at: node.updated_at,
        properties: node.properties || {}
      }));
      
      setSessions(sessions);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      console.error('Error type:', typeof err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setError(err?.message || 'Failed to load sessions');
    }
  }, [supabase, userId]);

  // Load events within time range - use stable ref to avoid dependency loops
  const loadEventsRef = useRef<() => Promise<void>>();
  loadEventsRef.current = async () => {
    try {
      const { data, error } = await supabase
        .from('graph_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', timelineState.timeRange.start.toISOString())
        .lte('created_at', timelineState.timeRange.end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    }
  };

  const loadEvents = useCallback(async () => {
    await loadEventsRef.current?.();
  }, []);

  // Get graph snapshot at current time
  const getGraphSnapshot = useCallback(async (timestamp: Date) => {
    if (!userId) {
      console.warn('getGraphSnapshot called without userId');
      return;
    }
    
    try {
      console.log('[GraphSnapshot] Getting snapshot for:', { 
        userId, 
        timestamp: timestamp.toISOString(),
        timestampDate: timestamp,
        caller: new Error().stack?.split('\n')[2]
      });
      
      // For now, directly query nodes and edges instead of using the event-sourced function
      // since there are no events in the graph_events table yet
      
      // Get ALL nodes first, then filter in JavaScript for accurate comparison
      const { data: nodesData, error: nodesError } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (nodesError) throw nodesError;

      // Get ALL edges first, then filter in JavaScript
      const { data: edgesData, error: edgesError } = await supabase
        .from('graph_edges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (edgesError) throw edgesError;

      // Process nodes with temporal metadata
      console.log('[GraphSnapshot] Processing nodes at timestamp:', timestamp.toISOString());
      
      const nodes: TemporalNode[] = (nodesData || [])
        .filter((node: any) => {
          const createdAt = new Date(node.created_at);
          const exists = createdAt <= timestamp;
          
          if (!exists) {
            console.log(`[GraphSnapshot] Filtering out future node: ${node.label} (created: ${node.created_at})`);
          }
          
          return exists;
        })
        .map((node: any) => {
          const createdAt = new Date(node.created_at);
          const age = timestamp.getTime() - createdAt.getTime();
          const hoursSinceCreation = age / (1000 * 60 * 60);

          return {
            ...node,
            age,
            isNew: hoursSinceCreation < 1,
            isRecent: hoursSinceCreation < 24,
            visibility: Math.max(0.3, 1 - (hoursSinceCreation / 168)) // Fade over a week
          };
        });

      // Process edges with temporal metadata
      const edges: TemporalEdge[] = (edgesData || [])
        .filter((edge: any) => {
          const createdAt = new Date(edge.created_at || edge.discovered_at);
          return createdAt <= timestamp;
        })
        .map((edge: any) => {
          const createdAt = new Date(edge.created_at || edge.discovered_at);
          const age = timestamp.getTime() - createdAt.getTime();

          return {
            ...edge,
            // Map database column names to type field names
            source_id: edge.source_node_id,
            target_id: edge.target_node_id,
            weight: edge.properties?.weight || 1.0,
            label: edge.properties?.label || edge.edge_type,
            age,
            isNew: age < 60 * 60 * 1000, // New if less than 1 hour old
            currentStrength: edge.properties?.weight || 1.0
          };
        });

      console.log('[GraphSnapshot] Filtered nodes:', {
        timestamp: timestamp.toISOString(),
        totalNodes: nodesData?.length || 0,
        filteredNodes: nodes.length,
        nodesByTime: nodes.map(n => ({
          label: n.label,
          createdAt: n.created_at,
          beforeTimestamp: new Date(n.created_at) <= timestamp
        }))
      });
      
      console.log('[GraphSnapshot] Filtered edges:', {
        timestamp: timestamp.toISOString(),
        totalEdges: edgesData?.length || 0,
        filteredEdges: edges.length,
        edgesByTime: edges.slice(0, 5).map(e => ({
          type: e.edge_type,
          source: e.source_id,
          target: e.target_id,
          label: e.label,
          createdAt: e.created_at
        }))
      });
      
      setTemporalNodes(nodes);
      setTemporalEdges(edges);
    } catch (err: any) {
      console.error('Error getting graph snapshot:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack
      });
      setError(err?.message || 'Failed to get graph snapshot');
    }
  }, [supabase, userId]);

  // Enhanced playback animation loop - using refs to avoid stale closures
  const timelineStateRef = useRef(timelineState);
  timelineStateRef.current = timelineState;
  
  const animate = useCallback(() => {
    const state = timelineStateRef.current;
    if (!state.isPlaying) return;

    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    
    // Throttle updates to prevent excessive re-renders (update max every 50ms for smoother playback)
    if (deltaTime < 50) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }
    
    lastUpdateRef.current = now;

    // Calculate time increment based on playback speed
    // Convert real-time milliseconds to timeline time based on speed
    // Increased multiplier from 0.01 to 1.0 for normal speed
    const timeIncrement = deltaTime * state.playbackSpeed * 1.0;
    const newTime = new Date(state.currentTime.getTime() + timeIncrement);

    // Stop at end of time range or current time
    const endTime = state.timeRange.end;
    if (newTime >= endTime) {
      setTimelineState(prev => ({ ...prev, isPlaying: false, currentTime: endTime }));
      return;
    }

    console.log('[Timeline] Updating time:', {
      from: state.currentTime.toISOString(),
      to: newTime.toISOString(),
      deltaTime,
      speed: state.playbackSpeed
    });
    
    setTimelineState(prev => ({ ...prev, currentTime: newTime }));
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []); // Empty dependency array since we use refs

  // Enhanced animation control with better synchronization
  useEffect(() => {
    if (timelineState.isPlaying) {
      lastUpdateRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timelineState.isPlaying, animate]);

  // Update graph snapshot when time changes - use ref to avoid dependency loop
  const getGraphSnapshotRef = useRef(getGraphSnapshot);
  getGraphSnapshotRef.current = getGraphSnapshot;

  useEffect(() => {
    if (userId) {
      const now = Date.now();
      const timeSinceLastSnapshot = now - lastSnapshotTimeRef.current;
      
      // Throttle snapshot updates to prevent excessive API calls (max every 500ms)
      if (timeSinceLastSnapshot >= 500) {
        lastSnapshotTimeRef.current = now;
        getGraphSnapshotRef.current(timelineState.currentTime);
      } else {
        // Schedule a delayed update if we're being throttled
        const timeoutId = setTimeout(() => {
          lastSnapshotTimeRef.current = Date.now();
          getGraphSnapshotRef.current(timelineState.currentTime);
        }, 500 - timeSinceLastSnapshot);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [userId, timelineState.currentTime]); // ✅ FIXED: Removed getGraphSnapshot dependency

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('Starting data load for userId:', userId);
        await Promise.all([loadSessions(), loadEvents()]);
        console.log('Data load completed successfully');
      } catch (error: any) {
        console.error('Error in loadData:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint
        });
        setError(error?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    } else {
      console.warn('No userId provided, skipping data load');
    }
  }, [userId, loadSessions, loadEvents]);

  // Control functions
  const setCurrentTime = useCallback((time: Date) => {
    setTimelineState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const togglePlayPause = useCallback(() => {
    setTimelineState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setTimelineState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const selectSession = useCallback((session: Session) => {
    setTimelineState(prev => ({
      ...prev,
      selectedSession: session,
      currentTime: new Date(session.created_at)
    }));
  }, []);

  // Get events for a specific node - use ref to avoid dependency loops
  const eventsRef = useRef(events);
  eventsRef.current = events;
  
  const getNodeEvents = useCallback((nodeId: string) => {
    return eventsRef.current.filter(e => e.node_id === nodeId);
  }, []);

  // Get node evolution
  const getNodeEvolution = useCallback(async (nodeId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_node_evolution', {
        p_node_id: nodeId
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting node evolution:', err);
      return [];
    }
  }, [supabase]);

  return {
    // State
    graphAtTime: {
      nodes: temporalNodes,
      edges: temporalEdges
    },
    currentTime: timelineState.currentTime,
    timeRange: timelineState.timeRange,
    isPlaying: timelineState.isPlaying,
    playbackSpeed: timelineState.playbackSpeed,
    sessions,
    events,
    loading,
    error,

    // Control functions
    setCurrentTime,
    setTimeRange: (range: { start: Date; end: Date }) => {
      setTimelineState(prev => ({ ...prev, timeRange: range }));
    },
    togglePlayPause,
    setPlaybackSpeed,
    selectSession,

    // Data functions
    getNodeEvents,
    getNodeEvolution,
    
    // Computed values - memoized to prevent unnecessary recalculations
    currentSession: useMemo(() => 
      sessions.find(s => new Date(s.created_at).getTime() <= timelineState.currentTime.getTime()),
      [sessions, timelineState.currentTime]
    ),
    nextSession: useMemo(() => 
      sessions.find(s => new Date(s.created_at).getTime() > timelineState.currentTime.getTime()),
      [sessions, timelineState.currentTime]
    )
  };
}