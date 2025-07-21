import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET')!

interface WebhookEvent {
  type: string
  conversation_id: string
  agent_id: string
  metadata?: any
  data: any
  timestamp: string
}

interface ToolCallEvent {
  tool_name: string
  parameters: any
  result?: any
}

// Knowledge retrieval tool handler
async function handleKnowledgeRetrieval(
  supabase: any,
  conversationId: string,
  agentId: string,
  query: string
) {
  console.log('🔍 Handling knowledge retrieval:', { conversationId, query })

  // Get knowledge base for agent
  const { data: knowledgeBase } = await supabase
    .from('agent_knowledge_bases')
    .select('id')
    .eq('agent_id', agentId)
    .single()

  if (!knowledgeBase) {
    return { error: 'Knowledge base not found' }
  }

  // Perform hybrid search
  const { data: results, error } = await supabase
    .rpc('hybrid_search', {
      query_embedding: await generateQueryEmbedding(query),
      query_text: query,
      kb_id_filter: knowledgeBase.id,
      match_count: 5,
      semantic_weight: 0.7
    })

  if (error) {
    console.error('Knowledge search error:', error)
    return { error: 'Search failed' }
  }

  // Store retrieval context
  if (results && results.length > 0) {
    await supabase
      .from('conversation_contexts')
      .insert({
        conversation_id: conversationId,
        agent_id: agentId,
        retrieved_documents: results.map((r: any) => r.id),
        retrieval_metadata: {
          query,
          result_count: results.length,
          timestamp: new Date().toISOString()
        }
      })

    // Update document access analytics
    for (const doc of results) {
      await supabase.rpc('update_document_access', { doc_id: doc.id })
    }
  }

  // Format results for the agent
  const formattedContext = results.map((doc: any) => ({
    title: doc.title,
    content: doc.content,
    relevance: doc.combined_score
  }))

  return { 
    success: true, 
    context: formattedContext,
    count: results.length 
  }
}

// Generate query embedding (placeholder)
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // In production, use OpenAI or similar
  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('ElevenLabs-Signature')
    const body = await req.text()

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const event: WebhookEvent = JSON.parse(body)
    console.log('📥 Webhook event:', event.type, event.conversation_id)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    switch (event.type) {
      case 'conversation.started':
        await handleConversationStarted(supabase, event)
        break

      case 'conversation.ended':
        await handleConversationEnded(supabase, event)
        break

      case 'tool.called':
        await handleToolCall(supabase, event)
        break

      case 'message.received':
      case 'message.sent':
        await handleMessage(supabase, event)
        break

      case 'conversation.analysis.completed':
        await handleAnalysisCompleted(supabase, event)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleConversationStarted(supabase: any, event: WebhookEvent) {
  const { conversation_id, agent_id, metadata } = event

  await supabase
    .from('elevenlabs_conversations')
    .insert({
      conversation_id,
      agent_id,
      user_id: metadata?.user_id,
      started_at: event.timestamp,
      metadata: metadata || {},
      status: 'active'
    })
}

async function handleConversationEnded(supabase: any, event: WebhookEvent) {
  const { conversation_id, data } = event

  await supabase
    .from('elevenlabs_conversations')
    .update({
      ended_at: event.timestamp,
      duration_seconds: data.duration,
      status: 'completed',
      analysis: data.analysis || {}
    })
    .eq('conversation_id', conversation_id)
}

async function handleToolCall(supabase: any, event: WebhookEvent) {
  const { conversation_id, agent_id, data } = event
  const toolCall: ToolCallEvent = data

  console.log('🛠️ Tool called:', toolCall.tool_name)

  // Handle knowledge retrieval tool
  if (toolCall.tool_name === 'retrieve_coaching_advice') {
    const result = await handleKnowledgeRetrieval(
      supabase,
      conversation_id,
      agent_id,
      toolCall.parameters.query
    )

    // Store tool call result
    await supabase
      .from('voice_chat_events')
      .insert({
        conversation_id,
        event_type: 'tool_call',
        event_data: {
          tool_name: toolCall.tool_name,
          parameters: toolCall.parameters,
          result: result,
          timestamp: event.timestamp
        }
      })

    return result
  }

  // Handle other tools...
  switch (toolCall.tool_name) {
    case 'search_user_history':
      // Search past conversations
      break
    case 'suggest_resources':
      // Suggest relevant resources
      break
    case 'track_progress':
      // Track goal progress
      break
  }
}

async function handleMessage(supabase: any, event: WebhookEvent) {
  const { conversation_id, data } = event
  const isUserMessage = event.type === 'message.received'

  await supabase
    .from('voice_chat_conversations')
    .insert({
      conversation_id,
      message: data.text,
      is_user: isUserMessage,
      timestamp: event.timestamp,
      metadata: data.metadata || {}
    })
}

async function handleAnalysisCompleted(supabase: any, event: WebhookEvent) {
  const { conversation_id, data } = event

  // Extract insights from analysis
  const insights = {
    summary: data.summary,
    topics: data.topics || [],
    sentiment: data.sentiment,
    action_items: data.action_items || [],
    goals_mentioned: extractGoals(data.transcript),
    coaching_areas: identifyCoachingAreas(data.transcript)
  }

  // Update conversation with analysis
  await supabase
    .from('elevenlabs_conversations')
    .update({
      analysis: data,
      insights: insights
    })
    .eq('conversation_id', conversation_id)

  // Create or update user goals based on conversation
  if (insights.goals_mentioned.length > 0) {
    const { data: conversation } = await supabase
      .from('elevenlabs_conversations')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .single()

    if (conversation?.user_id) {
      for (const goal of insights.goals_mentioned) {
        await supabase
          .from('user_goals')
          .upsert({
            user_id: conversation.user_id,
            title: goal.title,
            description: goal.description,
            category: goal.category,
            source: 'conversation',
            source_id: conversation_id
          })
      }
    }
  }
}

function extractGoals(transcript: string): any[] {
  // Simple goal extraction logic
  const goals = []
  const goalPatterns = [
    /I want to (.+?)(?:\.|,|$)/gi,
    /My goal is to (.+?)(?:\.|,|$)/gi,
    /I'd like to (.+?)(?:\.|,|$)/gi,
    /I need to (.+?)(?:\.|,|$)/gi
  ]

  for (const pattern of goalPatterns) {
    const matches = transcript.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        goals.push({
          title: match[1].trim(),
          description: `Mentioned in conversation: "${match[0]}"`,
          category: categorizeGoal(match[1])
        })
      }
    }
  }

  return goals
}

function categorizeGoal(goalText: string): string {
  const categories = {
    career: ['job', 'career', 'work', 'promotion', 'salary'],
    health: ['health', 'fitness', 'weight', 'exercise', 'diet'],
    personal: ['learn', 'skill', 'hobby', 'travel', 'relationship'],
    financial: ['save', 'money', 'invest', 'debt', 'budget']
  }

  const lowerText = goalText.toLowerCase()
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category
    }
  }

  return 'personal'
}

function identifyCoachingAreas(transcript: string): string[] {
  const areas = new Set<string>()
  const areaKeywords = {
    'career_development': ['career', 'job', 'promotion', 'skills'],
    'wellness': ['health', 'stress', 'balance', 'wellness'],
    'personal_growth': ['confidence', 'motivation', 'purpose', 'growth'],
    'relationships': ['relationship', 'communication', 'family', 'team']
  }

  const lowerTranscript = transcript.toLowerCase()
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
      areas.add(area)
    }
  }

  return Array.from(areas)
}

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  
  // ElevenLabs uses HMAC-SHA256 for webhook signatures
  // In production, verify the signature properly
  // For now, we'll do a simple check
  return signature.includes('sha256=')
}