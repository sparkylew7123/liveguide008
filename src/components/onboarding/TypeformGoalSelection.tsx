'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRealtimeGoalDetection } from '@/hooks/useRealtimeGoalDetection'
import { useMicrophoneAccess } from '@/hooks/useMicrophoneAccess'
import { ConversationWaveforms, WaveformGlow } from '@/components/ui/waveform-animation'
import { useUser } from '@/contexts/UserContext'
import { goalService, PREDEFINED_GOALS, GOAL_CATEGORY_ICONS } from '@/lib/goals'
import { createClient } from '@/utils/supabase/client'
import { useElevenLabsConversation, generateCallId, formatMetadata } from '@/hooks/useElevenLabsConversation'
import { 
  Mic, 
  MicOff, 
  Check, 
  X,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Target,
  Sparkles,
  Users,
  Heart,
  Briefcase,
  DollarSign,
  Palette,
  GraduationCap
} from 'lucide-react'

interface TypeformGoalSelectionProps {
  onComplete: (selectedGoals: any[]) => void
  onSkip: () => void
  userPreferences?: {
    userName: string
    voicePreference: 'male' | 'female' | 'no-preference'
    microphoneWorking: boolean
  }
}

interface ConversationPhase {
  id: string
  title: string
  description: string
  question: string
  example?: string
  expectedResponses: string[]
}

const CONVERSATION_PHASES: ConversationPhase[] = [
  {
    id: 'goal_awareness',
    title: 'Step 1: Goal Discovery',
    description: 'Let\'s have a natural conversation to discover your personal goals and aspirations.',
    question: 'Do you already know what goal(s) you would like to discuss?',
    expectedResponses: ['yes', 'no', 'maybe', 'somewhat', 'not sure']
  },
  {
    id: 'goal_exploration',
    title: 'Step 2: Goal Exploration',
    description: 'Let\'s explore different areas of your life where you might want to grow.',
    question: 'What areas of your life would you most like to improve or develop?',
    example: 'Areas like: personal growth, career, health, relationships, creativity',
    expectedResponses: ['personal', 'career', 'health', 'relationships', 'creative']
  },
  {
    id: 'goal_confirmation',
    title: 'Step 3: Goal Confirmation',
    description: 'Let\'s confirm the goals we\'ve discussed.',
    question: 'Which of these goals resonates most with you right now?',
    expectedResponses: ['this one', 'that one', 'first', 'second', 'all of them']
  }
]

export default function TypeformGoalSelection({ onComplete, onSkip, userPreferences }: TypeformGoalSelectionProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  
  console.log('TypeformGoalSelection render - currentPhase:', currentPhase, 'userPreferences:', userPreferences)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState<any[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [availableGoals, setAvailableGoals] = useState<Record<string, string[]>>({})
  const [isMuted, setIsMuted] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const [conversationConnected, setConversationConnected] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [hasSpokenPhase, setHasSpokenPhase] = useState<string | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [matchedResponse, setMatchedResponse] = useState<string | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isSpeakingRef = useRef(false)
  const conversationSessionId = useRef(`goal_discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  const { effectiveUserId } = useUser()
  const anonymousId = null // TypeformGoalSelection doesn't use anonymous ID from context
  
  // ElevenLabs agent configuration
  const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8'
  
  const { 
    detectedGoals, 
    startListening: startGoalListening, 
    stopListening: stopGoalListening, 
    playChime,
    clearDetectedGoals
  } = useRealtimeGoalDetection()
  
  const {
    microphoneState,
    startListening: startMicListening,
    stopListening: stopMicListening,
    toggleListening
  } = useMicrophoneAccess()

  // Ensure currentPhase is within bounds
  const validPhase = Math.max(0, Math.min(currentPhase, CONVERSATION_PHASES.length - 1))
  const currentPhaseData = CONVERSATION_PHASES[validPhase]
  
  // Debug log
  if (currentPhase !== validPhase) {
    console.warn('Phase out of bounds, corrected:', currentPhase, '→', validPhase)
  }
  const supabase = createClient()
  
  // Early return if no valid phase data
  if (!currentPhaseData) {
    console.error('No valid phase data found for phase:', currentPhase, 'Available phases:', CONVERSATION_PHASES.length)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p>Initializing goal discovery...</p>
          <p className="text-sm text-gray-400 mt-2">Phase: {currentPhase}</p>
        </div>
      </div>
    )
  }
  
  // Load available goals on component mount
  useEffect(() => {
    setAvailableGoals(PREDEFINED_GOALS)
    // Auto-expand first category
    const firstCategory = Object.keys(PREDEFINED_GOALS)[0]
    if (firstCategory) {
      setExpandedCategories({ [firstCategory]: true })
    }
  }, [])
  
  // Save voice interaction to database
  const saveVoiceInteraction = async (
    transcript: string,
    matchedIntent: string,
    phaseId: string,
    response: 'yes' | 'no' | 'other'
  ) => {
    if (!effectiveUserId) return
    
    try {
      const { error } = await supabase
        .from('voice_chat_events')
        .insert({
          user_id: effectiveUserId,
          anonymous_id: anonymousId,
          conversation_id: conversationSessionId.current,
          event_type: 'user_response',
          event_data: {
            transcript,
            matched_intent: matchedIntent,
            phase_id: phaseId,
            phase_title: currentPhaseData?.title,
            question: currentPhaseData?.question,
            response_type: response,
            timestamp: new Date().toISOString()
          }
        })
        
      if (error) {
        console.error('Error saving voice interaction:', error)
      } else {
        console.log('✅ Voice interaction saved')
      }
    } catch (error) {
      console.error('Error saving voice interaction:', error)
    }
  }
  
  // Check user's transcript against expected responses or goal names
  useEffect(() => {
    if (!microphoneState.transcript || !microphoneState.isRecognizing) return
    
    const userInput = microphoneState.transcript.toLowerCase()
    
    // For goal exploration phase (step 2), check for goal matches
    if (currentPhase === 1) {
      // Check if user mentioned any goal from any category
      for (const [category, goals] of Object.entries(availableGoals)) {
        for (const goal of goals) {
          const goalWords = goal.toLowerCase().split(' ')
          const userWords = userInput.split(' ')
          
          // Check for word overlap
          const overlap = goalWords.filter(word => userWords.some(userWord => 
            userWord.includes(word) || word.includes(userWord)
          )).length
          
          if (overlap >= 2) { // At least 2 words match
            console.log('✅ Matched goal:', goal, 'in category:', category)
            
            // Add goal to selected goals if not already selected
            if (!selectedGoals.find(g => g.title === goal)) {
              const newGoal = {
                id: `${category}-${goals.indexOf(goal)}`,
                title: goal,
                category,
                confidence: overlap / goalWords.length
              }
              setSelectedGoals(prev => [...prev, newGoal])
              setMatchedResponse(goal)
              
              // Save the interaction
              saveVoiceInteraction(
                microphoneState.transcript,
                goal,
                currentPhaseData.id,
                'yes' // Changed from 'goal_selected' to match the type
              )
              
              // Clear matched response after animation
              setTimeout(() => setMatchedResponse(null), 2000)
            }
            return
          }
        }
      }
      
      // Check for category mentions
      for (const category of Object.keys(availableGoals)) {
        if (userInput.includes(category.toLowerCase())) {
          console.log('✅ Matched category:', category)
          setExpandedCategories(prev => ({ ...prev, [category]: true }))
          setMatchedResponse(`${category} category`)
          setTimeout(() => setMatchedResponse(null), 2000)
          return
        }
      }
    } else {
      // For other phases, use original logic
      const currentExpectedResponses = currentPhaseData?.expectedResponses || []
      
      const matchedResponse = currentExpectedResponses.find(response => 
        userInput.includes(response.toLowerCase())
      )
      
      if (matchedResponse) {
        console.log('✅ Matched user response:', matchedResponse)
        
        stopMicListening()
        setMatchedResponse(matchedResponse)
        
        const responseType = ['yes', 'ready', 'let\'s start', 'sure', 'okay'].includes(matchedResponse) 
          ? 'yes' 
          : ['no', 'not sure', 'maybe'].includes(matchedResponse) 
          ? 'no' 
          : 'other'
          
        saveVoiceInteraction(
          microphoneState.transcript,
          matchedResponse,
          currentPhaseData?.id || '',
          responseType
        )
        
        setTimeout(() => {
          if (['yes', 'ready', 'let\'s start', 'sure', 'okay'].includes(matchedResponse)) {
            handleYesResponse()
          } else if (['no', 'not sure', 'maybe'].includes(matchedResponse)) {
            handleNoResponse()
          }
          
          setMatchedResponse(null)
        }, 3000)
      }
    }
  }, [microphoneState.transcript, microphoneState.isRecognizing, currentPhase, availableGoals, selectedGoals])
  
  
  // Get voice ID and name based on user preference
  const getVoiceConfig = () => {
    if (userPreferences?.voicePreference === 'female') {
      return {
        voiceId: '19STyYD15bswVz51nqLf',
        agentName: 'Maya'
      }
    } else if (userPreferences?.voicePreference === 'male') {
      return {
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        agentName: 'Ryan'
      }
    }
    return {
      voiceId: 'JBFqnCBsd6RMkjVDRZzb', // Default voice
      agentName: 'Maya' // Default name
    }
  }

  // Get the appropriate agent ID based on voice preference
  const getAgentId = () => {
    // You can map voice preferences to specific agent IDs if needed
    const defaultAgentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8'
    return defaultAgentId
  }

  // Real ElevenLabs WebSocket conversation
  const conversation = useElevenLabsConversation(
    {
      agentId: getAgentId(),
      userId: effectiveUserId,
      customCallId: conversationSessionId.current,
      metadata: formatMetadata({
        userName: userPreferences?.userName || 'there',
        sessionType: 'typeform_goal_selection',
        voicePreference: userPreferences?.voicePreference || 'female',
        microphoneWorking: userPreferences?.microphoneWorking || false
      })
    },
    {
      onConnect: () => {
        console.log('🤖 CONNECTED TO ELEVENLABS - Real WebSocket')
        // Cancel any browser speech synthesis immediately
        if ('speechSynthesis' in window) {
          console.log('🔇 Cancelling browser TTS - ElevenLabs is now connected')
          speechSynthesis.cancel()
        }
        setConversationConnected(true)
        setConversationError(null)
      },
      onDisconnect: () => {
        console.log('👋 DISCONNECTED FROM ELEVENLABS')
        setConversationConnected(false)
      },
      onMessage: (message) => {
        console.log('💬 ELEVENLABS MESSAGE RECEIVED:', message)
        setAgentSpeaking(true)
        setCurrentTranscript(message.message || '')
        
        // Save agent's speech to conversation history
        if (effectiveUserId) {
          const { agentName } = getVoiceConfig()
          supabase
            .from('voice_chat_events')
            .insert({
              user_id: effectiveUserId,
              anonymous_id: anonymousId,
              conversation_id: conversationSessionId.current,
              event_type: 'agent_speech',
              event_data: {
                text: message.message,
                agent_name: agentName,
                phase_id: currentPhaseData?.id,
                phase_title: currentPhaseData?.title,
                timestamp: new Date().toISOString()
              }
            })
            .then(({ error }) => {
              if (error) console.error('Error saving agent speech:', error)
            })
        }
        
        // Set speaking animation duration based on message length
        setTimeout(() => {
          setAgentSpeaking(false)
        }, Math.min(message.message?.length * 50, 5000))
      },
      onError: (error) => {
        console.error('❌ ELEVENLABS ERROR:', error)
        setConversationError(`ElevenLabs error: ${error.message || String(error)}`)
        setConversationConnected(false)
      }
    },
    // Pass overrides as third parameter for custom first message
    {
      agent: {
        firstMessage: `Hello ${userPreferences?.userName || 'there'}! I'm Maya, your goal discovery guide. Let's explore what you'd like to achieve. What's been on your mind lately that you'd like to work on?`,
        language: "en",
      },
      conversation: {
        textOnly: false,
      },
    }
  )
  
  
  // Initialize ElevenLabs session when component loads (but don't play audio yet)
  useEffect(() => {
    const initializeSession = async () => {
      console.log('🎬 Initializing ElevenLabs session...')
      try {
        await conversation.startSession()
        console.log('✅ ElevenLabs session started successfully')
      } catch (error) {
        console.error('❌ Failed to start ElevenLabs session:', error)
      }
    }
    
    initializeSession()
  }, []) // Run once when component mounts

  // Start the conversation flow
  useEffect(() => {
    if (!conversationStarted) return
    
    // Prevent speaking the same phase multiple times
    const phaseKey = `${currentPhase}-${currentPhaseData?.id || 'unknown'}`
    if (hasSpokenPhase === phaseKey) {
      console.log('🚫 Phase already spoken, skipping:', phaseKey)
      return
    }
    
    // Add a delay for the first phase to let ElevenLabs finish any initial greeting
    const phaseDelay = currentPhase === 0 ? 1500 : 0
    
    const startPhase = async () => {
      // Wait for the phase delay if needed
      if (phaseDelay > 0) {
        console.log(`⏳ Waiting ${phaseDelay}ms before starting phase ${currentPhase}...`)
        await new Promise(resolve => setTimeout(resolve, phaseDelay))
      }
      
      console.log('🎬 Starting NEW phase:', currentPhaseData?.id, 'Phase key:', phaseKey)
      console.log('🔗 ElevenLabs connected:', conversationConnected)
      console.log('🔗 ElevenLabs status:', conversation.status)
      
      // Mark this phase as spoken IMMEDIATELY to prevent repeats
      setHasSpokenPhase(phaseKey)
      
      // Small delay to ensure ElevenLabs is fully ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // With real WebSocket connection, the agent speaks automatically when connected
      if (conversationConnected) {
        console.log(`🎤 ${getVoiceConfig().agentName} connected via WebSocket`)
        // The agent will speak automatically through the WebSocket connection
        // Do NOT use speechSynthesis here - ElevenLabs handles it
        setAgentSpeaking(true)
        
        // Auto-activate microphone after a delay to let agent speak first
        setTimeout(() => {
          console.log(`🎤 Auto-activating microphone...`)
          setAgentSpeaking(false)
          // Ensure clean start
          stopMicListening()
          setTimeout(() => {
            startMicListening()
          }, 200)
        }, 3000) // Give agent time to speak
      } else {
        console.log('⚠️ No ElevenLabs connection, using fallback...')
        console.log('⚠️ FALLBACK SPEECH - Phase:', currentPhaseData?.id, 'Question:', currentPhaseData?.question?.substring(0, 50) + '...')
        setAgentSpeaking(true)
        // Use browser speech synthesis as fallback ONLY when ElevenLabs is NOT connected
        if ('speechSynthesis' in window && currentPhaseData?.question) {
          // Double-check ElevenLabs is not connected before speaking
          if (conversationConnected || conversation.status === 'connected') {
            console.log('🚫 PREVENTING FALLBACK - ElevenLabs is actually connected!')
            return
          }
          
          // Cancel any ongoing speech first
          speechSynthesis.cancel()
          
          const utterance = new SpeechSynthesisUtterance(currentPhaseData.question)
          utterance.rate = 0.9
          utterance.pitch = 1
          utterance.onend = () => {
            console.log('⚠️ FALLBACK SPEECH ENDED')
            setAgentSpeaking(false)
            // Auto-activate microphone after fallback speech
            startMicListening()
          }
          speechSynthesis.speak(utterance)
        }
      }
      
      // Show question after a brief delay
      setTimeout(() => {
        setShowQuestion(true)
      }, 500)
      
      // Show example after question
      setTimeout(() => {
        if (currentPhaseData.example) {
          setShowExample(true)
        }
      }, 2000)
      
      // Show buttons after question
      setTimeout(() => {
        setShowButtons(true)
        // Don't auto-start microphone - let user click to start
      }, 3000)
    }
    
    startPhase()
  }, [currentPhase, conversationStarted, currentPhaseData?.id, conversationConnected])

  // Handle goal detection
  useEffect(() => {
    if (detectedGoals.length > 0) {
      setSelectedGoals(prev => {
        const newGoals = [...prev]
        detectedGoals.forEach(goal => {
          if (!newGoals.find(g => g.id === goal.id)) {
            newGoals.push(goal)
          }
        })
        return newGoals
      })
      playChime('match')
    }
  }, [detectedGoals, playChime])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Stop any playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      
      // Reset speaking flag
      isSpeakingRef.current = false
      
      // Cancel any pending speech synthesis
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      
      // Disconnect ElevenLabs if connected
      if (conversation && conversation.status === 'connected') {
        conversation.endSession()
      }
    }
  }, []) // Empty dependency array - only run cleanup on unmount

  const handleStartConversation = async () => {
    setConversationStarted(true)
    setHasConsented(true)
    
    // Start goal detection listening with our session ID
    if (effectiveUserId) {
      startGoalListening(conversationSessionId.current)
    }
    
    // Now that user has interacted, handle the welcome message
    const userName = userPreferences?.userName || 'there'
    const { agentName } = getVoiceConfig()
    const welcomeText = `Hello ${userName}! I'm ${agentName}. Let's have a natural conversation to discover your personal goals and aspirations. I'll ask you some questions about your goals. You can respond by speaking or using the buttons. I'll help identify goals that match your interests.`
    
    console.log('🎙️ Starting conversation, ElevenLabs connected:', conversationConnected)
    setCurrentTranscript(welcomeText) // Set transcript for welcome message
    
    // IMPORTANT: Do NOT use browser speech synthesis here if ElevenLabs is connected
    // The welcome message is handled by the conversation flow in the useEffect below
    if (!conversationConnected && 'speechSynthesis' in window) {
      console.log('🔊 Using browser TTS for welcome message (ElevenLabs not connected)')
      const utterance = new SpeechSynthesisUtterance(welcomeText)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.onend = () => {
        // Auto-activate microphone after speech
        console.log('🎤 Auto-activating microphone after welcome message...')
        setTimeout(() => {
          // Ensure clean start
          stopMicListening()
          setTimeout(() => {
            startMicListening()
          }, 200)
        }, 500)
      }
      speechSynthesis.speak(utterance)
    } else if (conversationConnected) {
      console.log('🎤 ElevenLabs connected - will handle speech through conversation flow')
      // The welcome message will be spoken by ElevenLabs through the phase system
      // Just prepare the microphone activation
      setTimeout(() => {
        console.log('🎤 Preparing microphone for ElevenLabs conversation...')
        stopMicListening()
        setTimeout(() => {
          startMicListening()
        }, 200)
      }, 3000) // Give agent time to speak
    }
    
    console.log('✅ Starting conversation flow')
  }

  const handleVoiceToggle = () => {
    console.log('Voice toggle clicked, current state:', microphoneState.isListening)
    toggleListening()
  }

  const handleYesResponse = () => {
    // Turn off microphone when user responds
    stopMicListening()
    
    if (currentPhase < CONVERSATION_PHASES.length - 1) {
      nextPhase()
    } else {
      completeSelection()
    }
  }

  const handleNoResponse = () => {
    // Turn off microphone when user responds
    stopMicListening()
    
    if (currentPhase === 1) {
      // If user doesn't know their goals, move to exploration
      setCurrentPhase(2)
    } else {
      // Skip this phase or provide alternatives
      nextPhase()
    }
  }

  const nextPhase = () => {
    console.log('🔄 Moving to next phase from:', currentPhase)
    
    // Stop any current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    
    
    // Reset speaking flag
    isSpeakingRef.current = false
    
    // Reset UI state
    setShowQuestion(false)
    setShowExample(false)
    setShowButtons(false)
    setAgentSpeaking(false)
    setCurrentTranscript('')
    setMatchedResponse(null)
    
    // Reset spoken phase and advance to next phase
    setHasSpokenPhase(null)
    
    setTimeout(() => {
      setCurrentPhase(prev => {
        const newPhase = prev + 1
        console.log('📊 Phase transition:', prev, '→', newPhase)
        return newPhase
      })
    }, 500)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }
  
  const toggleGoalSelection = (goal: string, category: string) => {
    const goalId = `${category}-${availableGoals[category]?.indexOf(goal) || 0}`
    const existingGoal = selectedGoals.find(g => g.id === goalId)
    
    if (existingGoal) {
      // Remove goal
      setSelectedGoals(prev => prev.filter(g => g.id !== goalId))
    } else {
      // Add goal
      const newGoal = {
        id: goalId,
        title: goal,
        category,
        confidence: 1.0
      }
      setSelectedGoals(prev => [...prev, newGoal])
    }
  }
  
  const getIconForCategory = (category: string) => {
    const iconMap: Record<string, any> = {
      'Personal Growth': Target,
      'Professional': Briefcase,
      'Health & Wellness': Heart,
      'Relationships': Users,
      'Financial': DollarSign,
      'Creative': Palette,
      'Spiritual': Sparkles,
      'Education': GraduationCap
    }
    return iconMap[category] || Target
  }

  const completeSelection = () => {
    stopGoalListening()
    stopMicListening()
    // End ElevenLabs session
    if (conversationConnected) {
      conversation.endSession()
    }
    onComplete(selectedGoals)
  }

  const handleSkip = () => {
    stopGoalListening()
    stopMicListening()
    // End ElevenLabs session
    if (conversationConnected) {
      conversation.endSession()
    }
    onSkip()
  }

  const speakQuestion = async () => {
    console.log('🔊 speakQuestion called - conversation connected:', conversationConnected)
    if (!isMuted) {
      // For replay functionality, we need to use browser synthesis
      // since WebSocket doesn't support replaying previous messages
      console.log('🔊 Using browser synthesis for replay')
      if ('speechSynthesis' in window) {
        const question = currentPhaseData?.question || ''
        if (question) {
          // Cancel any ongoing speech first to avoid overlaps
          speechSynthesis.cancel()
          
          const utterance = new SpeechSynthesisUtterance(question)
          utterance.rate = 0.9
          utterance.pitch = 1
          setCurrentTranscript(question)
          speechSynthesis.speak(utterance)
        }
      }
    }
  }

  if (!conversationStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6">
                <Target className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  Goal Discovery Session
                </h1>
                <p className="text-gray-300 text-lg">
                  Let's have a natural conversation to discover your personal goals and aspirations.
                </p>
              </div>

              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-2 w-2 bg-blue-400 rounded-full" />
                  <span className="text-gray-300">I'll ask you some questions about your goals</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="h-2 w-2 bg-blue-400 rounded-full" />
                  <span className="text-gray-300">You can respond by speaking or using the buttons</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="h-2 w-2 bg-blue-400 rounded-full" />
                  <span className="text-gray-300">I'll help identify goals that match your interests</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleStartConversation}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Goal Discovery
                </Button>
                
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  size="lg"
                  className="border-gray-400 text-gray-300 hover:bg-gray-800"
                >
                  Skip for Now
                </Button>
              </div>

              {/* Connection Status */}
              {conversationConnected && (
                <p className="text-green-400 text-sm mt-4">
                  {getVoiceConfig().agentName} is ready to help you discover your goals
                </p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main component return
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              Step {currentPhase + 1} of {CONVERSATION_PHASES.length}
            </span>
            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentPhase + 1) / CONVERSATION_PHASES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8">
            {/* Phase Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentPhaseData?.title || 'Loading...'}
              </h2>
              <p className="text-gray-300">
                {currentPhaseData?.description || ''}
              </p>
            </motion.div>


            {/* Question Display */}
            <AnimatePresence>
              {showQuestion && (
                <motion.div
                  key="question-display"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center mb-6"
                >
                  <div className="relative bg-slate-700/50 rounded-lg p-6 mb-4 overflow-hidden">
                    {/* Glow effect behind text */}
                    <WaveformGlow
                      userSpeaking={microphoneState.isSpeaking}
                      agentSpeaking={agentSpeaking}
                      isListening={microphoneState.isListening}
                      audioLevel={microphoneState.audioLevel}
                      className="z-0"
                    />
                    
                    <h3 className="relative z-10 text-xl font-semibold text-white mb-2 min-h-[3rem] flex items-center justify-center">
                      <span className="text-center">
                        {currentPhaseData?.question || ''}
                      </span>
                    </h3>
                    
                    {/* Transcript display for what the agent is saying */}
                    {currentTranscript && (
                      <div className="relative z-10 bg-slate-600/30 rounded-lg p-3 mt-4 border-l-4 border-purple-400">
                        <div className="text-sm text-purple-300 mb-1">{getVoiceConfig().agentName} is saying:</div>
                        <div className="text-white">
                          {currentTranscript}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {showExample && currentPhaseData?.example && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-gray-400 text-sm italic"
                    >
                      {currentPhaseData?.example}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Response Buttons or Goal Categories */}
            <AnimatePresence>
              {showButtons && (
                <motion.div
                  key="response-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-4"
                >
                  {/* Microphone Status */}
                  <div className="flex flex-col items-center gap-2">
                    {microphoneState.isListening && (
                      <div className="text-green-400 text-sm animate-pulse">
                        <Mic className="inline mr-2 h-4 w-4" />
                        {currentPhase === 1 ? 'Listening for goals...' : 'Listening...'}
                      </div>
                    )}
                    
                    {/* User transcript */}
                    {microphoneState.transcript && (
                      <motion.div 
                        className={`rounded-lg p-3 mt-2 border-l-4 max-w-md ${
                          matchedResponse 
                            ? 'bg-green-500/30 border-green-400' 
                            : 'bg-slate-600/30 border-blue-400'
                        }`}
                        animate={matchedResponse ? {
                          scale: [1, 1.05, 1],
                          transition: { 
                            duration: 0.5,
                            repeat: 3,
                            repeatType: "reverse"
                          }
                        } : {}}
                      >
                        <div className={`text-sm mb-1 ${
                          matchedResponse ? 'text-green-300' : 'text-blue-300'
                        }`}>
                          {matchedResponse ? 'Found goal!' : 'You said:'}
                        </div>
                        <div className="text-white font-medium">
                          {matchedResponse ? (
                            <>
                              <Check className="inline mr-2 h-5 w-5 text-green-400" />
                              {matchedResponse}
                            </>
                          ) : (
                            microphoneState.transcript
                          )}
                        </div>
                      </motion.div>
                    )}
                    
                    {conversationConnected && (
                      <p className="text-green-400 text-xs text-center">
                        Connected to {getVoiceConfig().agentName}
                      </p>
                    )}
                    
                    {conversationError && (
                      <p className="text-red-400 text-xs text-center max-w-xs">
                        {conversationError}
                      </p>
                    )}
                    
                    {microphoneState.error && (
                      <p className="text-red-400 text-xs text-center max-w-xs">
                        {microphoneState.error}
                      </p>
                    )}
                  </div>

                  {/* Goal Categories (Step 2) or Yes/No Buttons (Steps 1 & 3) */}
                  {currentPhase === 1 ? (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {Object.entries(availableGoals).map(([category, goals]) => {
                        const IconComponent = getIconForCategory(category)
                        const isExpanded = expandedCategories[category]
                        
                        return (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-700/30 rounded-lg overflow-hidden"
                          >
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(category)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-600/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-5 w-5 text-blue-400" />
                                <span className="text-white font-medium">{category}</span>
                                <span className="text-gray-400 text-sm">({goals.length} goals)</span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            
                            {/* Goals List */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  key={`goals-${category}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-slate-600/50"
                                >
                                  <div className="p-4 space-y-2">
                                    {goals.map((goal, index) => {
                                      const goalId = `${category}-${index}`
                                      const isSelected = selectedGoals.some(g => g.id === goalId)
                                      
                                      return (
                                        <button
                                          key={goalId}
                                          onClick={() => toggleGoalSelection(goal, category)}
                                          className={`w-full text-left p-3 rounded-lg transition-all ${
                                            isSelected
                                              ? 'bg-blue-500/20 border border-blue-400 text-blue-200'
                                              : 'bg-slate-600/30 hover:bg-slate-600/50 text-gray-300'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm">{goal}</span>
                                            {isSelected && (
                                              <Check className="h-4 w-4 text-blue-400" />
                                            )}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                      
                      {/* Continue Button */}
                      {selectedGoals.length > 0 && (
                        <motion.div
                          key="continue-button"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center pt-4"
                        >
                          <Button
                            onClick={nextPhase}
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
                          >
                            Continue with {selectedGoals.length} Goal{selectedGoals.length !== 1 ? 's' : ''}
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  ) : currentPhase === 0 ? (
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={handleYesResponse}
                        size="lg"
                        variant="outline"
                        className="border-gray-400 text-gray-300 hover:bg-gray-800"
                      >
                        <Check className="mr-2 h-5 w-5" />
                        Yes
                      </Button>
                      
                      <Button
                        onClick={handleNoResponse}
                        size="lg"
                        variant="outline"
                        className="border-gray-400 text-gray-300 hover:bg-gray-800"
                      >
                        <X className="mr-2 h-5 w-5" />
                        No
                      </Button>
                    </div>
                  ) : currentPhase === 2 ? (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <div className="space-y-4">
                        {selectedGoals.map((goal, index) => (
                          <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-slate-700/30 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Target className="h-5 w-5 text-blue-400" />
                                <span className="text-white font-medium">{goal.title}</span>
                              </div>
                              <span className="text-gray-400 text-sm">{goal.category}</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-gray-300 text-sm font-medium">
                                Target timescale for achieving this goal:
                              </label>
                              <select
                                value={goal.timescale || '6-months'}
                                onChange={(e) => {
                                  const updatedGoals = selectedGoals.map(g => 
                                    g.id === goal.id ? { ...g, timescale: e.target.value } : g
                                  )
                                  setSelectedGoals(updatedGoals)
                                }}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="1-month">1 month</option>
                                <option value="3-months">3 months</option>
                                <option value="6-months">6 months</option>
                                <option value="1-year">1 year</option>
                                <option value="2-years">2+ years</option>
                              </select>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="text-center">
                        <Button
                          onClick={completeSelection}
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
                        >
                          Complete Goal Setup
                          <Check className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Privacy Policy Link - Show on first phase */}
                  {currentPhase === 0 && (
                    <div className="text-center mt-4">
                      <p className="text-gray-400 text-sm">
                        By proceeding, you agree to our{' '}
                        <a 
                          href="/privacy-policy" 
                          target="_blank" 
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Privacy Policy
                        </a>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Detected Goals */}
            {selectedGoals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-4 bg-slate-700/30 rounded-lg"
              >
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  Goals Detected
                </h4>
                <div className="space-y-2">
                  {selectedGoals.map((goal, index) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg"
                    >
                      <div>
                        <div className="text-white font-medium">{goal.title}</div>
                        <div className="text-gray-400 text-sm">{goal.category}</div>
                      </div>
                      <div className="text-green-400 text-sm">
                        {Math.round(goal.confidence * 100)}% match
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            Skip Goal Discovery
          </Button>
          
          {selectedGoals.length > 0 && (
            <Button
              onClick={completeSelection}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Continue with {selectedGoals.length} Goal{selectedGoals.length !== 1 ? 's' : ''}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}