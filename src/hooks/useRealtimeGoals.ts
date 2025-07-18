import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface DetectedGoal {
  id: string;
  user_id: string;
  goal_title: string;
  goal_description: string;
  goal_status: string;
  metadata: {
    conversation_id?: string;
    transcript?: string;
    confidence?: number;
    detected_at?: string;
    selection_method?: string;
    voice_confidence?: number;
    category?: string;
  };
  created_at: string;
}

interface UseRealtimeGoalsProps {
  userId: string;
  conversationId?: string;
  enabled?: boolean;
}

export function useRealtimeGoals({ 
  userId, 
  conversationId, 
  enabled = true 
}: UseRealtimeGoalsProps) {
  const [detectedGoals, setDetectedGoals] = useState<DetectedGoal[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const supabase = createClient();
    setIsListening(true);

    console.log('🔄 Starting realtime goal detection for user:', userId);

    // Subscribe to user_goals table changes
    const channel = supabase
      .channel('user_goals_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DetectedGoal>) => {
          console.log('🎯 New goal detected via webhook:', payload.new);
          
          const newGoal = payload.new as DetectedGoal;
          
          // Only add goals from voice webhook if we're listening for a specific conversation
          if (conversationId && newGoal.metadata?.selection_method === 'voice_webhook') {
            const context = newGoal.metadata;
            if (context?.conversation_id === conversationId) {
              setDetectedGoals(prev => {
                const exists = prev.find(g => g.id === newGoal.id);
                if (!exists) {
                  console.log('✅ Adding detected goal:', newGoal.goal_title);
                  return [...prev, newGoal];
                }
                return prev;
              });
              setLastUpdated(new Date());
            }
          } else if (!conversationId && newGoal.metadata?.selection_method === 'voice_webhook') {
            // If no specific conversation, add all voice webhook goals
            setDetectedGoals(prev => {
              const exists = prev.find(g => g.id === newGoal.id);
              if (!exists) {
                console.log('✅ Adding detected goal:', newGoal.goal_title);
                return [...prev, newGoal];
              }
              return prev;
            });
            setLastUpdated(new Date());
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to goal changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error');
          setIsListening(false);
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from realtime goal updates');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [userId, conversationId, enabled]);

  // Function to manually fetch existing goals (for initial load)
  const fetchExistingGoals = async () => {
    if (!userId) return;

    const supabase = createClient();
    
    let query = supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .filter('metadata->>selection_method', 'eq', 'voice_webhook');

    if (conversationId) {
      query = query.filter('metadata->>conversation_id', 'eq', conversationId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch existing goals:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('📚 Loaded existing detected goals:', data.length);
      setDetectedGoals(data as DetectedGoal[]);
      setLastUpdated(new Date());
    }
  };

  // Function to clear detected goals
  const clearDetectedGoals = () => {
    setDetectedGoals([]);
    setLastUpdated(null);
  };

  return {
    detectedGoals,
    isListening,
    lastUpdated,
    fetchExistingGoals,
    clearDetectedGoals,
    goalCount: detectedGoals.length
  };
}