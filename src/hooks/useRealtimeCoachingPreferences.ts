import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface CoachingPreference {
  dimension: string;
  preference: string;
  confidence: number;
  reasoning: string;
}

interface ProfileUpdate {
  id: string;
  coaching_preferences: Record<string, CoachingPreference>;
  preferences: {
    onboarding_method?: string;
    conversation_id?: string;
    detected_at?: string;
  };
  updated_at: string;
}

interface UseRealtimeCoachingPreferencesProps {
  userId: string;
  enabled?: boolean;
}

export function useRealtimeCoachingPreferences({ 
  userId, 
  enabled = true 
}: UseRealtimeCoachingPreferencesProps) {
  const [coachingPreferences, setCoachingPreferences] = useState<Record<string, CoachingPreference>>({});
  const [isListening, setIsListening] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const supabase = createClient();
    setIsListening(true);

    console.log('🔄 Starting realtime coaching preferences detection for user:', userId);

    // Subscribe to profiles table changes
    const channel = supabase
      .channel('profile_coaching_preferences')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<ProfileUpdate>) => {
          console.log('🧠 Coaching preferences updated via webhook:', payload.new);
          
          const updatedProfile = payload.new as ProfileUpdate;
          
          // Only process if the update includes coaching preferences from voice webhook
          if (updatedProfile.coaching_preferences && updatedProfile.preferences?.onboarding_method === 'voice_webhook') {
            console.log('✅ New coaching preferences detected:', updatedProfile.coaching_preferences);
            setCoachingPreferences(updatedProfile.coaching_preferences);
            setLastUpdated(new Date());
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime coaching preferences subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to coaching preferences changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime coaching preferences subscription error');
          setIsListening(false);
        }
      });

    return () => {
      console.log('🔌 Unsubscribing from realtime coaching preferences updates');
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [userId, enabled]);

  // Function to manually fetch existing preferences (for initial load)
  const fetchExistingPreferences = async () => {
    if (!userId) return;

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('coaching_preferences, onboarding_method')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch existing coaching preferences:', error);
      return;
    }

    if (data?.coaching_preferences) {
      console.log('📚 Loaded existing coaching preferences:', data.coaching_preferences);
      setCoachingPreferences(data.coaching_preferences);
      setLastUpdated(new Date());
    }
  };

  // Function to clear coaching preferences
  const clearCoachingPreferences = () => {
    setCoachingPreferences({});
    setLastUpdated(null);
  };

  // Helper function to get preference count
  const getPreferenceCount = () => {
    return Object.keys(coachingPreferences).length;
  };

  // Helper function to check if all dimensions are discovered
  const isDiscoveryComplete = () => {
    const requiredDimensions = ['Energy', 'Information', 'Decisions', 'Structure'];
    return requiredDimensions.every(dim => coachingPreferences[dim]);
  };

  return {
    coachingPreferences,
    isListening,
    lastUpdated,
    fetchExistingPreferences,
    clearCoachingPreferences,
    preferenceCount: getPreferenceCount(),
    isDiscoveryComplete: isDiscoveryComplete()
  };
}