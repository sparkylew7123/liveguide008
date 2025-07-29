import { CreateMessageRequest, MessagePriority } from '@/types/inbox'

const API_BASE = '/api/inbox'

export class InboxService {
  /**
   * Create a new message in the user's inbox
   * This would typically be called from coaching session handlers or background jobs
   */
  static async createMessage(message: CreateMessageRequest): Promise<{ messageId: string }> {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error('Failed to create message')
    }

    return response.json()
  }

  /**
   * Create a goal achievement message
   */
  static async createGoalAchievementMessage({
    userId,
    goalNodeId,
    goalTitle,
    coachName,
    coachAgentId,
  }: {
    userId: string
    goalNodeId: string
    goalTitle: string
    coachName: string
    coachAgentId: string
  }) {
    return this.createMessage({
      user_id: userId,
      subject: `🎉 Congratulations! You've achieved "${goalTitle}"`,
      content: `Amazing work! You've successfully completed your goal: "${goalTitle}". This is a significant milestone in your journey. Take a moment to celebrate this achievement and reflect on how far you've come. What's your next goal going to be?`,
      sender_agent_id: coachAgentId,
      sender_name: coachName,
      category: 'achievement',
      priority: 'high',
      goal_node_id: goalNodeId,
      tags: ['achievement', 'goal-completed'],
    })
  }

  /**
   * Create a session summary message
   */
  static async createSessionSummaryMessage({
    userId,
    sessionNodeId,
    goalNodeId,
    coachName,
    coachAgentId,
    keyInsights,
    actionItems,
  }: {
    userId: string
    sessionNodeId: string
    goalNodeId?: string
    coachName: string
    coachAgentId: string
    keyInsights: string[]
    actionItems: string[]
  }) {
    const content = `
Here's a summary of our coaching session:

**Key Insights:**
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

**Action Items:**
${actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Keep up the great work! I'm here whenever you need support.
    `.trim()

    return this.createMessage({
      user_id: userId,
      subject: 'Session Summary & Action Items',
      content,
      sender_agent_id: coachAgentId,
      sender_name: coachName,
      category: 'feedback',
      priority: 'normal',
      session_node_id: sessionNodeId,
      goal_node_id: goalNodeId,
      tags: ['session-summary', 'action-items'],
    })
  }

  /**
   * Create a reminder message
   */
  static async createReminderMessage({
    userId,
    subject,
    content,
    coachName,
    coachAgentId,
    priority = 'normal',
    expiresAt,
  }: {
    userId: string
    subject: string
    content: string
    coachName: string
    coachAgentId: string
    priority?: MessagePriority
    expiresAt?: Date
  }) {
    return this.createMessage({
      user_id: userId,
      subject: `⏰ Reminder: ${subject}`,
      content,
      sender_agent_id: coachAgentId,
      sender_name: coachName,
      category: 'reminder',
      priority,
      expires_at: expiresAt?.toISOString(),
      tags: ['reminder'],
    })
  }

  /**
   * Create a motivational message
   */
  static async createMotivationalMessage({
    userId,
    content,
    coachName,
    coachAgentId,
    goalNodeId,
  }: {
    userId: string
    content: string
    coachName: string
    coachAgentId: string
    goalNodeId?: string
  }) {
    return this.createMessage({
      user_id: userId,
      subject: '💪 Daily Motivation',
      content,
      sender_agent_id: coachAgentId,
      sender_name: coachName,
      category: 'motivation',
      priority: 'low',
      goal_node_id: goalNodeId,
      tags: ['motivation', 'daily'],
    })
  }

  /**
   * Create a message with attachments (e.g., resources, documents)
   */
  static async createResourceMessage({
    userId,
    subject,
    content,
    coachName,
    coachAgentId,
    attachments,
  }: {
    userId: string
    subject: string
    content: string
    coachName: string
    coachAgentId: string
    attachments: Array<{
      type: 'document' | 'link' | 'video'
      name: string
      url: string
      description?: string
    }>
  }) {
    return this.createMessage({
      user_id: userId,
      subject: `📚 ${subject}`,
      content,
      sender_agent_id: coachAgentId,
      sender_name: coachName,
      category: 'tip',
      priority: 'normal',
      tags: ['resources', 'learning'],
      attachments: attachments.map(att => ({
        type: att.type,
        name: att.name,
        url: att.url,
        description: att.description,
      })),
    })
  }
}