import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Define sample messages with real avatar URLs from agent_personae table
    const sampleMessages = [
      {
        user_id: user.id,
        subject: 'Welcome to Your Coaching Journey!',
        content: `Hi there! I'm Celeste, and I'm thrilled to be part of your personal growth journey. Our AI coaching platform is designed to help you achieve your goals through personalized guidance and support.

Here's what you can expect:
- Regular check-ins to track your progress
- Personalized action plans tailored to your goals
- Motivational support when you need it most
- Resources and tools to accelerate your growth

I'm here to support you every step of the way. Let's make amazing things happen together!`,
        preview: 'Welcome! I\'m excited to help you achieve your goals...',
        sender_agent_id: 'celeste-001',
        sender_name: 'Celeste',
        sender_avatar_url: 'https://res.cloudinary.com/dlq71ih0t/video/upload/v1753359693/ama_lobby.mp4',
        category: 'welcome',
        priority: 'high',
        message_type: 'welcome',
        metadata: {
          first_message: true,
          coach_specialty: 'Life Coaching'
        },
        tags: ['welcome', 'onboarding', 'getting-started']
      },
      {
        user_id: user.id,
        subject: 'Your Goal Progress Update',
        content: `Great progress on your recent goals! I've been tracking your journey and I'm impressed with your dedication.

**This Week's Highlights:**
- Completed 3 out of 4 scheduled sessions
- Made significant progress on your primary goal
- Maintained consistency with daily practices

**Areas for Focus:**
- Let's work on breaking down your larger goals into smaller, actionable steps
- Consider setting up accountability check-ins
- Remember to celebrate your wins, no matter how small!

Keep up the fantastic work! Your commitment is truly inspiring.`,
        preview: 'Great progress on your recent goals! Let\'s review...',
        sender_agent_id: 'vic-001',
        sender_name: 'Vic',
        sender_avatar_url: 'https://res.cloudinary.com/dlq71ih0t/video/upload/v1753437450/Vic_lobby_y7hqwn.mp4',
        category: 'goal_update',
        priority: 'normal',
        message_type: 'progress_update',
        metadata: {
          week_number: 1,
          completion_rate: 75
        },
        tags: ['progress', 'goals', 'weekly-update']
      },
      {
        user_id: user.id,
        subject: 'Mindfulness Exercise for Today',
        content: `Hello! I wanted to share a powerful mindfulness exercise that can help you stay centered throughout your day.

**5-Minute Breathing Space:**
1. **Awareness** (1 minute): Notice what's here right now - thoughts, feelings, sensations
2. **Gathering** (3 minutes): Focus on your breath, letting it anchor you
3. **Expanding** (1 minute): Widen awareness to your whole body and surroundings

This practice is perfect for:
- Before important meetings or decisions
- When feeling overwhelmed or stressed
- As a daily reset button

Try it out and let me know how it goes in our next session. Remember, consistency is key - even 5 minutes daily can make a significant difference!`,
        preview: 'A powerful 5-minute mindfulness exercise for your day...',
        sender_agent_id: 'elena-001',
        sender_name: 'Elena',
        sender_avatar_url: 'https://res.cloudinary.com/dlq71ih0t/video/upload/v1753377798/linda_lobby.mp4',
        category: 'tip',
        priority: 'normal',
        message_type: 'resource',
        metadata: {
          exercise_duration: 5,
          difficulty: 'beginner'
        },
        tags: ['mindfulness', 'exercise', 'daily-practice']
      },
      {
        user_id: user.id,
        subject: '🎉 Achievement Unlocked!',
        content: `Congratulations! You've just completed your 7-day consistency streak! 🎊

This is a significant milestone that shows your commitment to personal growth. Research shows that consistency is one of the strongest predictors of long-term success.

**What This Means:**
- You're building powerful habits
- Your dedication is paying off
- You're 7 days closer to your goals

**Your Reward:**
- New achievement badge in your profile
- Bonus coaching session available
- Access to advanced goal-setting tools

Keep this momentum going! The next milestone is your 14-day streak. I believe in you!`,
        preview: 'Congratulations on your 7-day streak! This is huge...',
        sender_agent_id: 'celeste-001',
        sender_name: 'Celeste',
        sender_avatar_url: 'https://res.cloudinary.com/dlq71ih0t/video/upload/v1753359693/ama_lobby.mp4',
        category: 'achievement',
        priority: 'high',
        message_type: 'achievement',
        metadata: {
          achievement_type: '7_day_streak',
          reward_unlocked: true
        },
        tags: ['achievement', 'milestone', 'celebration']
      },
      {
        user_id: user.id,
        subject: 'Session Reminder: Tomorrow at 3 PM',
        content: `Hi! Just a friendly reminder about our coaching session scheduled for tomorrow at 3:00 PM.

**Session Focus:** Career Development Strategies

**Please Prepare:**
- Your updated goals list
- Any challenges you've faced this week
- Questions about your career path

**Session Link:** Will be sent 15 minutes before the session

Looking forward to our conversation! If you need to reschedule, please let me know at least 2 hours in advance.`,
        preview: 'Reminder: Coaching session tomorrow at 3 PM...',
        sender_agent_id: 'vic-001',
        sender_name: 'Vic',
        sender_avatar_url: 'https://res.cloudinary.com/dlq71ih0t/video/upload/v1753437450/Vic_lobby_y7hqwn.mp4',
        category: 'reminder',
        priority: 'urgent',
        message_type: 'reminder',
        metadata: {
          session_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          session_type: 'career_coaching'
        },
        tags: ['reminder', 'session', 'urgent']
      }
    ]

    // Create admin client for inserting messages
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Insert messages with some having attachments
    const messagePromises = sampleMessages.map(async (message, index) => {
      const { data: insertedMessage, error: messageError } = await adminClient
        .from('inbox_messages')
        .insert({
          ...message,
          created_at: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(), // Stagger creation times
        })
        .select()
        .single()

      if (messageError) {
        console.error('Error inserting message:', messageError)
        return null
      }

      // Add attachments for some messages
      if (index === 2) { // Mindfulness exercise
        await adminClient.from('message_attachments').insert({
          message_id: insertedMessage.id,
          attachment_type: 'audio',
          title: 'Guided Breathing Exercise',
          url: 'https://example.com/breathing-exercise.mp3',
          duration_seconds: 300,
          metadata: { type: 'guided_meditation' }
        })
      } else if (index === 1) { // Progress update
        await adminClient.from('message_attachments').insert({
          message_id: insertedMessage.id,
          attachment_type: 'mindmap',
          title: 'Your Goal Progress Visualization',
          url: 'https://example.com/goal-mindmap.html',
          metadata: { interactive: true }
        })
      }

      return insertedMessage
    })

    const messages = await Promise.all(messagePromises)
    const successfulMessages = messages.filter(m => m !== null)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesCreated: successfulMessages.length,
        messages: successfulMessages 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})