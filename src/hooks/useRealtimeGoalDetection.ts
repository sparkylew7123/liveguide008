'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useUser } from '@/contexts/UserContext'

export interface DetectedGoal {
  id: string
  title: string
  category: string
  confidence: number
  detected_at: string
}

export interface GoalDetectionEvent {
  event_type: 'goals_detected' | 'goal_matched' | 'category_matched'
  goals: DetectedGoal[]
  timestamp: string
  conversation_id: string
}

export function useRealtimeGoalDetection() {
  const [detectedGoals, setDetectedGoals] = useState<DetectedGoal[]>([])
  const [lastDetection, setLastDetection] = useState<GoalDetectionEvent | null>(null)
  const [isListening, setIsListening] = useState(false)
  const { effectiveUserId } = useUser()
  const supabase = createClient()

  // Audio chime for goal detection
  const playChime = useCallback((type: 'match' | 'category' | 'detection') => {
    if (typeof window === 'undefined') return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different frequencies for different events
      switch (type) {
        case 'match':
          oscillator.frequency.value = 800 // High pitch for exact matches
          break
        case 'category':
          oscillator.frequency.value = 600 // Medium pitch for category matches
          break
        case 'detection':
          oscillator.frequency.value = 400 // Lower pitch for general detection
          break
      }
      
      // Create a pleasant chime sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Could not play audio chime:', error)
    }
  }, [])

  // Start listening for real-time events
  const startListening = useCallback((conversationId: string) => {
    if (!effectiveUserId) return
    
    setIsListening(true)
    setDetectedGoals([])
    
    // Listen for voice chat events
    const subscription = supabase
      .channel('goal_detection')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_chat_events',
          filter: `user_id=eq.${effectiveUserId}`
        },
        (payload) => {
          const event = payload.new as any
          
          if (event.event_type === 'goals_detected' && event.conversation_id === conversationId) {
            const detectionEvent: GoalDetectionEvent = {
              event_type: 'goals_detected',
              goals: event.event_data.goals,
              timestamp: event.event_data.timestamp,
              conversation_id: event.conversation_id
            }
            
            setLastDetection(detectionEvent)
            setDetectedGoals(prev => {
              const newGoals = [...prev]
              
              // Add new goals, avoiding duplicates
              for (const goal of detectionEvent.goals) {
                if (!newGoals.find(g => g.id === goal.id)) {
                  newGoals.push(goal)
                }
              }
              
              return newGoals.sort((a, b) => b.confidence - a.confidence)
            })
            
            // Play chime for goal detection
            playChime('detection')
          }
        }
      )
      .subscribe()
    
    // Listen for user_goals changes (when goals are confirmed/selected)
    const goalsSubscription = supabase
      .channel('user_goals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${effectiveUserId}`
        },
        (payload) => {
          const goal = payload.new as any
          
          if (goal.metadata?.selection_method === 'voice_webhook') {
            // Goal was confirmed from voice detection
            playChime('match')
          }
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
      goalsSubscription.unsubscribe()
    }
  }, [effectiveUserId, supabase, playChime])

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  // Clear detected goals
  const clearDetectedGoals = useCallback(() => {
    setDetectedGoals([])
    setLastDetection(null)
  }, [])

  // Manual goal detection for testing
  const triggerGoalDetection = useCallback((goals: DetectedGoal[]) => {
    setDetectedGoals(goals)
    playChime('detection')
  }, [playChime])

  // Get goals by category
  const getGoalsByCategory = useCallback((category: string) => {
    return detectedGoals.filter(goal => goal.category === category)
  }, [detectedGoals])

  // Get high confidence goals (>70%)
  const getHighConfidenceGoals = useCallback(() => {
    return detectedGoals.filter(goal => goal.confidence > 0.7)
  }, [detectedGoals])

  return {
    detectedGoals,
    lastDetection,
    isListening,
    startListening,
    stopListening,
    clearDetectedGoals,
    triggerGoalDetection,
    getGoalsByCategory,
    getHighConfidenceGoals,
    playChime
  }
}