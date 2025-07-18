import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, ElevenLabs-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// ElevenLabs webhook event types
interface ElevenLabsWebhookEvent {
  event_type: 'conversation_started' | 'conversation_ended' | 'message_received' | 'message_sent' | 'error' | 'tool_call'
  conversation_id: string
  agent_id: string
  user_id?: string
  custom_call_id?: string
  timestamp: string
  data: {
    transcript?: string
    audio_url?: string
    message?: string
    user_input?: string
    agent_response?: string
    session_duration?: number
    error_message?: string
    metadata?: any
    tool_call?: {
      name: string
      parameters: any
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // ElevenLabs webhook URL verification
      const url = new URL(req.url)
      const challenge = url.searchParams.get('challenge')
      
      if (challenge) {
        return new Response(JSON.stringify({ challenge }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({ 
        status: 'ElevenLabs Webhook Endpoint (Supabase Edge Function)',
        timestamp: new Date().toISOString(),
        function: 'elevenlabs-webhook'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const body = await req.json() as ElevenLabsWebhookEvent
      
      console.log('🎯 ElevenLabs Webhook Event:', body.event_type, body.conversation_id)
      
      // Verify webhook signature (recommended for production)
      const signature = req.headers.get('ElevenLabs-Signature')
      if (!(await verifyWebhookSignature(body, signature))) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      // Handle different event types
      switch (body.event_type) {
        case 'conversation_started':
          await handleConversationStarted(supabaseClient, body)
          break
          
        case 'conversation_ended':
          await handleConversationEnded(supabaseClient, body)
          break
          
        case 'message_received':
          await handleMessageReceived(supabaseClient, body)
          break
          
        case 'message_sent':
          await handleMessageSent(supabaseClient, body)
          break
          
        case 'error':
          await handleError(supabaseClient, body)
          break
          
        case 'tool_call':
          await handleToolCall(supabaseClient, body)
          break
          
        default:
          console.warn('Unknown event type:', body.event_type)
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleConversationStarted(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.log('🚀 Conversation started:', event.conversation_id)
  
  // Create conversation record
  const { error } = await supabaseClient
    .from('elevenlabs_conversations')
    .insert({
      conversation_id: event.conversation_id,
      agent_id: event.agent_id,
      user_id: event.user_id,
      custom_call_id: event.custom_call_id,
      status: 'active',
      started_at: event.timestamp,
      metadata: event.data.metadata || {}
    })
  
  if (error) {
    console.error('Failed to create conversation record:', error)
    throw error
  }
}

async function handleConversationEnded(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.log('🏁 Conversation ended:', event.conversation_id)
  
  // Update conversation record
  const { error } = await supabaseClient
    .from('elevenlabs_conversations')
    .update({
      status: 'completed',
      ended_at: event.timestamp,
      duration_seconds: event.data.session_duration,
      final_transcript: event.data.transcript,
      audio_url: event.data.audio_url
    })
    .eq('conversation_id', event.conversation_id)
  
  if (error) {
    console.error('Failed to update conversation record:', error)
    throw error
  }
  
  // Process conversation for goal/preference extraction
  if (event.data.transcript) {
    await processConversationTranscript(supabaseClient, event)
  }
}

async function handleMessageReceived(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.log('📨 Message received:', event.conversation_id)
  
  // Store user message
  const { error } = await supabaseClient
    .from('voice_chat_conversations')
    .insert({
      conversation_id: event.conversation_id,
      message_type: 'user',
      message_content: event.data.user_input || event.data.message,
      timestamp: event.timestamp,
      audio_url: event.data.audio_url
    })
  
  if (error) {
    console.error('Failed to store user message:', error)
    throw error
  }
}

async function handleMessageSent(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.log('📤 Message sent:', event.conversation_id)
  
  // Store agent response
  const { error } = await supabaseClient
    .from('voice_chat_conversations')
    .insert({
      conversation_id: event.conversation_id,
      message_type: 'agent',
      message_content: event.data.agent_response || event.data.message,
      timestamp: event.timestamp,
      audio_url: event.data.audio_url
    })
  
  if (error) {
    console.error('Failed to store agent message:', error)
    throw error
  }
  
  // Real-time analysis for goal/preference detection
  if (event.data.agent_response) {
    await analyzeAgentResponse(supabaseClient, event)
  }
}

async function handleError(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.error('🚨 Conversation error:', event.conversation_id, event.data.error_message)
  
  // Update conversation status
  const { error } = await supabaseClient
    .from('elevenlabs_conversations')
    .update({
      status: 'error',
      error_message: event.data.error_message,
      ended_at: event.timestamp
    })
    .eq('conversation_id', event.conversation_id)
  
  if (error) {
    console.error('Failed to update conversation error:', error)
    throw error
  }
}

async function handleToolCall(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  console.log('🛠️ Tool call received:', event.conversation_id, event.data.tool_call?.name)
  
  if (!event.data.tool_call) {
    console.warn('Tool call event without tool_call data')
    return
  }
  
  const { name, parameters } = event.data.tool_call
  
  // Get user ID from conversation
  const { data: conversation } = await supabaseClient
    .from('elevenlabs_conversations')
    .select('user_id')
    .eq('conversation_id', event.conversation_id)
    .single()
  
  if (!conversation?.user_id) {
    console.warn('No user ID found for conversation:', event.conversation_id)
    return
  }
  
  // Store tool call for real-time processing
  const { error } = await supabaseClient
    .from('voice_chat_events')
    .insert({
      user_id: conversation.user_id,
      conversation_id: event.conversation_id,
      event_type: 'tool_call',
      event_data: {
        tool_name: name,
        tool_parameters: parameters,
        timestamp: event.timestamp
      }
    })
  
  if (error) {
    console.error('Failed to store tool call:', error)
    return
  }
  
  // Handle specific tool calls
  switch (name) {
    case 'goal_match':
      await handleGoalMatchTool(supabaseClient, event, parameters)
      break
      
    case 'category_highlight':
      await handleCategoryHighlightTool(supabaseClient, event, parameters)
      break
      
    case 'ui_update':
      await handleUIUpdateTool(supabaseClient, event, parameters)
      break
      
    case 'conversation_state':
      await handleConversationStateTool(supabaseClient, event, parameters)
      break
      
    default:
      console.warn('Unknown tool call:', name)
  }
}

async function handleGoalMatchTool(supabaseClient: any, event: ElevenLabsWebhookEvent, parameters: any) {
  console.log('🎯 Goal match tool called:', parameters.goal_text)
  
  const { data: conversation } = await supabaseClient
    .from('elevenlabs_conversations')
    .select('user_id')
    .eq('conversation_id', event.conversation_id)
    .single()
  
  if (!conversation?.user_id) return
  
  // Get category ID from database
  const { data: category } = await supabaseClient
    .from('goal_categories')
    .select('id')
    .eq('title', parameters.category)
    .single()
  
  // Create goal from agent tool call
  const goalData = {
    user_id: conversation.user_id,
    profile_id: conversation.user_id,
    category_id: category?.id || null,
    goal_title: parameters.suggested_goals?.[0]?.title || parameters.goal_text,
    goal_description: parameters.suggested_goals?.[0]?.description || `Agent detected: ${parameters.goal_text}`,
    goal_status: 'pending',
    metadata: {
      conversation_id: event.conversation_id,
      selection_method: 'agent_tool',
      tool_confidence: parameters.confidence,
      original_text: parameters.goal_text,
      category: parameters.category,
      detected_at: event.timestamp
    }
  }
  
  const { error } = await supabaseClient
    .from('user_goals')
    .insert(goalData)
  
  if (error) {
    console.error('Failed to create goal from tool call:', error)
    return
  }
  
  // Trigger UI update
  await supabaseClient
    .from('voice_chat_events')
    .insert({
      user_id: conversation.user_id,
      conversation_id: event.conversation_id,
      event_type: 'goal_matched',
      event_data: {
        goal_text: parameters.goal_text,
        category: parameters.category,
        confidence: parameters.confidence,
        suggested_goals: parameters.suggested_goals,
        timestamp: event.timestamp
      }
    })
}

async function handleCategoryHighlightTool(supabaseClient: any, event: ElevenLabsWebhookEvent, parameters: any) {
  console.log('🎨 Category highlight tool called:', parameters.category)
  
  const { data: conversation } = await supabaseClient
    .from('elevenlabs_conversations')
    .select('user_id')
    .eq('conversation_id', event.conversation_id)
    .single()
  
  if (!conversation?.user_id) return
  
  // Trigger UI category highlight
  await supabaseClient
    .from('voice_chat_events')
    .insert({
      user_id: conversation.user_id,
      conversation_id: event.conversation_id,
      event_type: 'category_highlight',
      event_data: {
        category: parameters.category,
        reason: parameters.reason,
        timestamp: event.timestamp
      }
    })
}

async function handleUIUpdateTool(supabaseClient: any, event: ElevenLabsWebhookEvent, parameters: any) {
  console.log('🖥️ UI update tool called:', parameters.action)
  
  const { data: conversation } = await supabaseClient
    .from('elevenlabs_conversations')
    .select('user_id')
    .eq('conversation_id', event.conversation_id)
    .single()
  
  if (!conversation?.user_id) return
  
  // Trigger UI update
  await supabaseClient
    .from('voice_chat_events')
    .insert({
      user_id: conversation.user_id,
      conversation_id: event.conversation_id,
      event_type: 'ui_update',
      event_data: {
        action: parameters.action,
        data: parameters.data,
        timestamp: event.timestamp
      }
    })
}

async function handleConversationStateTool(supabaseClient: any, event: ElevenLabsWebhookEvent, parameters: any) {
  console.log('🔄 Conversation state tool called:', parameters.phase)
  
  const { data: conversation } = await supabaseClient
    .from('elevenlabs_conversations')
    .select('user_id')
    .eq('conversation_id', event.conversation_id)
    .single()
  
  if (!conversation?.user_id) return
  
  // Update conversation metadata
  await supabaseClient
    .from('elevenlabs_conversations')
    .update({
      metadata: {
        ...conversation.metadata,
        phase: parameters.phase,
        phase_context: parameters.context,
        last_phase_update: event.timestamp
      }
    })
    .eq('conversation_id', event.conversation_id)
  
  // Trigger UI state update
  await supabaseClient
    .from('voice_chat_events')
    .insert({
      user_id: conversation.user_id,
      conversation_id: event.conversation_id,
      event_type: 'conversation_state',
      event_data: {
        phase: parameters.phase,
        context: parameters.context,
        timestamp: event.timestamp
      }
    })
}

async function processConversationTranscript(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  try {
    const transcript = event.data.transcript
    const conversationId = event.conversation_id
    
    // Extract goals from transcript
    const detectedGoals = await extractGoalsFromTranscript(transcript)
    
    // Extract coaching preferences from transcript
    const detectedPreferences = await extractPreferencesFromTranscript(transcript)
    
    // Get user ID from conversation
    const { data: conversation } = await supabaseClient
      .from('elevenlabs_conversations')
      .select('user_id, metadata')
      .eq('conversation_id', conversationId)
      .single()
    
    if (!conversation?.user_id) {
      console.warn('No user ID found for conversation:', conversationId)
      return
    }
    
    const userId = conversation.user_id
    const sessionType = conversation.metadata?.session_type || 'unknown'
    
    // Save detected goals
    if (detectedGoals.length > 0 && sessionType === 'goal_discovery') {
      // Get category IDs from database
      const { data: categories } = await supabaseClient
        .from('goal_categories')
        .select('id, title')
      
      const categoryMap = new Map()
      categories?.forEach(cat => categoryMap.set(cat.title, cat.id))
      
      const goalInserts = detectedGoals.map(goal => ({
        user_id: userId,
        profile_id: userId,
        category_id: categoryMap.get(goal.category) || null,
        goal_title: goal.title,
        goal_description: `Detected from conversation with ${Math.round(goal.confidence * 100)}% confidence`,
        goal_status: 'pending',
        metadata: {
          conversation_id: conversationId,
          transcript: transcript,
          confidence: goal.confidence,
          detected_at: event.timestamp,
          selection_method: 'voice_webhook',
          voice_confidence: goal.confidence,
          category: goal.category,
          goal_id: goal.id,
          original_goal_id: goal.id
        }
      }))
      
      const { error } = await supabaseClient.from('user_goals').insert(goalInserts)
      if (error) {
        console.error('Failed to save detected goals:', error)
      } else {
        console.log('✅ Saved detected goals:', detectedGoals.length)
        
        // Trigger real-time update for UI
        await supabaseClient
          .from('voice_chat_events')
          .insert({
            user_id: userId,
            conversation_id: conversationId,
            event_type: 'goals_detected',
            event_data: {
              goals: detectedGoals,
              timestamp: event.timestamp
            }
          })
      }
    }
    
    // Save coaching preferences
    if (detectedPreferences && sessionType === 'coaching_style_discovery') {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          coaching_preferences: detectedPreferences,
          preferences: {
            onboarding_method: 'voice_webhook',
            conversation_id: conversationId,
            detected_at: event.timestamp
          }
        })
        .eq('id', userId)
      
      if (error) {
        console.error('Failed to save coaching preferences:', error)
      } else {
        console.log('✅ Saved coaching preferences')
      }
    }
    
  } catch (error) {
    console.error('Failed to process conversation transcript:', error)
  }
}

async function analyzeAgentResponse(supabaseClient: any, event: ElevenLabsWebhookEvent) {
  // Real-time analysis of agent responses for immediate feedback
  const response = event.data.agent_response
  
  // This could integrate with your MCP tools for real-time analysis
  // For now, we'll do simple keyword detection
  
  if (response?.toLowerCase().includes('goal') || response?.toLowerCase().includes('achieve')) {
    // Log potential goal discussion
    console.log('🎯 Goal discussion detected in conversation:', event.conversation_id)
  }
  
  if (response?.toLowerCase().includes('preference') || response?.toLowerCase().includes('style')) {
    // Log potential preference discussion
    console.log('🧠 Preference discussion detected in conversation:', event.conversation_id)
  }
}

async function extractGoalsFromTranscript(transcript: string): Promise<Array<{id: string, confidence: number, category: string, title: string}>> {
  const goals = []
  
  // Enhanced goal keywords with categories
  const goalKeywords = {
    // Personal Growth
    'public_speaking_confidence': {
      category: 'Personal Growth',
      title: 'Build confidence in public speaking',
      keywords: ['public speaking', 'presentation', 'confidence', 'speaking', 'stage fright', 'audience']
    },
    'leadership_skills': {
      category: 'Professional',
      title: 'Develop leadership skills',
      keywords: ['leadership', 'lead', 'manage', 'team', 'authority', 'influence']
    },
    'emotional_intelligence': {
      category: 'Personal Growth',
      title: 'Improve emotional intelligence',
      keywords: ['emotional', 'emotions', 'empathy', 'awareness', 'feelings', 'emotional quotient']
    },
    'mindfulness_meditation': {
      category: 'Personal Growth',
      title: 'Create a daily mindfulness practice',
      keywords: ['mindfulness', 'meditation', 'mindful', 'calm', 'present', 'awareness']
    },
    'time_management': {
      category: 'Personal Growth',
      title: 'Develop better time management skills',
      keywords: ['time', 'productivity', 'organize', 'schedule', 'efficient', 'prioritize']
    },
    
    // Professional
    'career_advancement': {
      category: 'Professional',
      title: 'Advance to a leadership role',
      keywords: ['career', 'promotion', 'advancement', 'professional', 'climb', 'progress']
    },
    'skill_development': {
      category: 'Professional',
      title: 'Develop new technical skills',
      keywords: ['skill', 'learn', 'training', 'develop', 'competency', 'expertise']
    },
    'networking': {
      category: 'Professional',
      title: 'Build a professional network',
      keywords: ['network', 'connection', 'relationship', 'professional', 'contacts', 'collaborate']
    },
    'work_life_balance': {
      category: 'Professional',
      title: 'Improve work-life balance',
      keywords: ['balance', 'work life', 'stress', 'burnout', 'harmony', 'boundary']
    },
    'entrepreneurship': {
      category: 'Professional',
      title: 'Start a side business',
      keywords: ['business', 'startup', 'entrepreneur', 'venture', 'company', 'venture']
    },
    
    // Health & Wellness
    'fitness_goals': {
      category: 'Health & Wellness',
      title: 'Establish a consistent exercise routine',
      keywords: ['fitness', 'exercise', 'workout', 'health', 'gym', 'physical']
    },
    'nutrition_habits': {
      category: 'Health & Wellness',
      title: 'Develop healthier eating habits',
      keywords: ['nutrition', 'diet', 'eating', 'healthy food', 'meal', 'nutrition']
    },
    'stress_management': {
      category: 'Health & Wellness',
      title: 'Reduce stress and anxiety',
      keywords: ['stress', 'anxiety', 'overwhelmed', 'pressure', 'tension', 'worry']
    },
    'sleep_optimization': {
      category: 'Health & Wellness',
      title: 'Improve sleep quality',
      keywords: ['sleep', 'rest', 'insomnia', 'tired', 'exhausted', 'sleep quality']
    },
    'mental_health': {
      category: 'Health & Wellness',
      title: 'Build mental resilience',
      keywords: ['mental health', 'wellbeing', 'therapy', 'counseling', 'psychological', 'resilience']
    },
    
    // Relationships
    'communication_skills': {
      category: 'Relationships',
      title: 'Improve communication skills',
      keywords: ['communication', 'listening', 'express', 'conversation', 'dialogue', 'communicate']
    },
    'dating_relationships': {
      category: 'Relationships',
      title: 'Develop romantic relationships',
      keywords: ['dating', 'relationship', 'romance', 'partner', 'love', 'romantic']
    },
    'family_dynamics': {
      category: 'Relationships',
      title: 'Strengthen family bonds',
      keywords: ['family', 'parents', 'siblings', 'relatives', 'family relationship', 'family time']
    },
    'social_skills': {
      category: 'Relationships',
      title: 'Build stronger friendships',
      keywords: ['social', 'shy', 'confident', 'friends', 'friendship', 'social skills']
    },
    'conflict_resolution': {
      category: 'Relationships',
      title: 'Learn conflict resolution skills',
      keywords: ['conflict', 'argument', 'disagreement', 'resolve', 'mediation', 'resolution']
    }
  }
  
  const lowerTranscript = transcript.toLowerCase()
  
  // Enhanced matching with phrase detection
  for (const [goalId, goalInfo] of Object.entries(goalKeywords)) {
    let matches = 0
    let totalScore = 0
    
    // Check for exact phrase matches (higher weight)
    for (const keyword of goalInfo.keywords) {
      if (lowerTranscript.includes(keyword)) {
        matches++
        // Longer phrases get higher scores
        totalScore += keyword.split(' ').length
      }
    }
    
    if (matches > 0) {
      // Calculate confidence based on matches and phrase complexity
      const confidence = Math.min((totalScore / goalInfo.keywords.length) * 0.8, 1.0)
      
      if (confidence > 0.3) { // Only include goals with decent confidence
        goals.push({
          id: goalId,
          confidence: confidence,
          category: goalInfo.category,
          title: goalInfo.title
        })
      }
    }
  }
  
  // Sort by confidence and return top matches
  return goals.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

async function extractPreferencesFromTranscript(transcript: string): Promise<any> {
  // TODO: This could integrate with MCP preference extraction tools
  // For now, simple keyword matching
  const preferences: any = {}
  
  const lowerTranscript = transcript.toLowerCase()
  
  // Energy dimension
  if (lowerTranscript.includes('energetic') || lowerTranscript.includes('enthusiastic') || lowerTranscript.includes('motivation')) {
    preferences.Energy = { 
      preference: 'Energetic', 
      confidence: 0.8,
      reasoning: 'Mentioned energetic approach or motivation'
    }
  } else if (lowerTranscript.includes('calm') || lowerTranscript.includes('quiet') || lowerTranscript.includes('reflect')) {
    preferences.Energy = { 
      preference: 'Reflective', 
      confidence: 0.8,
      reasoning: 'Mentioned calm or reflective approach'
    }
  }
  
  // Information dimension
  if (lowerTranscript.includes('details') || lowerTranscript.includes('specific') || lowerTranscript.includes('step by step')) {
    preferences.Information = { 
      preference: 'Detail-Oriented', 
      confidence: 0.8,
      reasoning: 'Mentioned preference for details and specifics'
    }
  } else if (lowerTranscript.includes('big picture') || lowerTranscript.includes('overview') || lowerTranscript.includes('general')) {
    preferences.Information = { 
      preference: 'Big Picture', 
      confidence: 0.8,
      reasoning: 'Mentioned preference for big picture thinking'
    }
  }
  
  // Decisions dimension
  if (lowerTranscript.includes('logical') || lowerTranscript.includes('analytical') || lowerTranscript.includes('data')) {
    preferences.Decisions = { 
      preference: 'Logical', 
      confidence: 0.8,
      reasoning: 'Mentioned logical or analytical approach'
    }
  } else if (lowerTranscript.includes('feelings') || lowerTranscript.includes('values') || lowerTranscript.includes('intuition')) {
    preferences.Decisions = { 
      preference: 'Values-Based', 
      confidence: 0.8,
      reasoning: 'Mentioned values or feelings-based approach'
    }
  }
  
  // Structure dimension
  if (lowerTranscript.includes('structured') || lowerTranscript.includes('organized') || lowerTranscript.includes('plan')) {
    preferences.Structure = { 
      preference: 'Structured', 
      confidence: 0.8,
      reasoning: 'Mentioned preference for structure and planning'
    }
  } else if (lowerTranscript.includes('flexible') || lowerTranscript.includes('spontaneous') || lowerTranscript.includes('adaptable')) {
    preferences.Structure = { 
      preference: 'Flexible', 
      confidence: 0.8,
      reasoning: 'Mentioned preference for flexibility and adaptability'
    }
  }
  
  return Object.keys(preferences).length > 0 ? preferences : null
}

// Helper functions for goal formatting
function formatGoalTitle(goalId: string): string {
  const goalTitles: Record<string, string> = {
    'public_speaking_confidence': 'Public Speaking Confidence',
    'leadership_skills': 'Leadership Skills',
    'emotional_intelligence': 'Emotional Intelligence',
    'mindfulness_meditation': 'Mindfulness & Meditation',
    'time_management': 'Time Management',
    'career_advancement': 'Career Advancement',
    'skill_development': 'Skill Development',
    'networking': 'Professional Networking',
    'work_life_balance': 'Work-Life Balance',
    'entrepreneurship': 'Entrepreneurship',
    'fitness_goals': 'Fitness Goals',
    'nutrition_habits': 'Nutrition & Healthy Eating',
    'stress_management': 'Stress Management',
    'sleep_optimization': 'Sleep Optimization',
    'mental_health': 'Mental Health & Wellbeing',
    'communication_skills': 'Communication Skills',
    'dating_relationships': 'Dating & Relationships',
    'family_dynamics': 'Family Dynamics',
    'social_skills': 'Social Skills',
    'conflict_resolution': 'Conflict Resolution'
  };
  
  return goalTitles[goalId] || goalId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getGoalCategory(goalId: string): string {
  const goalCategories: Record<string, string> = {
    'public_speaking_confidence': 'personal_growth',
    'leadership_skills': 'personal_growth',
    'emotional_intelligence': 'personal_growth',
    'mindfulness_meditation': 'personal_growth',
    'time_management': 'personal_growth',
    'career_advancement': 'professional',
    'skill_development': 'professional',
    'networking': 'professional',
    'work_life_balance': 'professional',
    'entrepreneurship': 'professional',
    'fitness_goals': 'health_wellness',
    'nutrition_habits': 'health_wellness',
    'stress_management': 'health_wellness',
    'sleep_optimization': 'health_wellness',
    'mental_health': 'health_wellness',
    'communication_skills': 'relationships',
    'dating_relationships': 'relationships',
    'family_dynamics': 'relationships',
    'social_skills': 'relationships',
    'conflict_resolution': 'relationships'
  };
  
  return goalCategories[goalId] || 'personal_growth';
}

async function verifyWebhookSignature(body: any, signature: string | null): Promise<boolean> {
  const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET')
  
  if (!webhookSecret) {
    console.warn('⚠️ ELEVENLABS_WEBHOOK_SECRET not configured - skipping signature verification')
    return true
  }
  
  if (!signature) {
    console.warn('⚠️ No signature provided in webhook request')
    return false
  }
  
  try {
    // ElevenLabs uses HMAC-SHA256 for webhook signatures
    const encoder = new TextEncoder()
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const bodyString = JSON.stringify(body)
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(bodyString)
    )
    
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // ElevenLabs typically sends signature as "sha256=<hash>"
    const providedSignature = signature.replace('sha256=', '')
    
    const isValid = expectedSignatureHex === providedSignature
    
    if (!isValid) {
      console.error('❌ Webhook signature verification failed')
      console.error('Expected:', expectedSignatureHex)
      console.error('Provided:', providedSignature)
    } else {
      console.log('✅ Webhook signature verified successfully')
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error)
    return false
  }
}