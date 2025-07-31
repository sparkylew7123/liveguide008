import { createClient } from '@/utils/supabase/client';

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

export class ElevenLabsWebhookManager {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Register webhook with ElevenLabs
   */
  async registerWebhook(config: WebhookConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          url: config.url,
          events: config.events,
          secret: config.secret
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to register webhook:', error);
        return false;
      }

      const result = await response.json();
      console.log('✅ Webhook registered successfully:', result);
      return true;
    } catch (error) {
      console.error('Error registering webhook:', error);
      return false;
    }
  }

  /**
   * List existing webhooks
   */
  async listWebhooks(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to list webhooks');
      }

      const result = await response.json();
      return result.webhooks || [];
    } catch (error) {
      console.error('Error listing webhooks:', error);
      return [];
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }

  /**
   * Get webhook URL for current environment (Supabase Edge Function)
   */
  static getWebhookUrl(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }
    
    return `${supabaseUrl}/functions/v1/elevenlabs-webhook`;
  }

  /**
   * Initialize webhook for conversation tracking
   */
  static async initializeWebhook(): Promise<boolean> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY not found in environment variables');
      return false;
    }

    const manager = new ElevenLabsWebhookManager(apiKey);
    const webhookUrl = this.getWebhookUrl();
    
    console.log('🔗 Registering webhook URL:', webhookUrl);
    
    // Register webhook for conversation events
    const success = await manager.registerWebhook({
      url: webhookUrl,
      events: [
        'conversation_started',
        'conversation_ended',
        'message_received',
        'message_sent',
        'error'
      ],
      secret: process.env.ELEVENLABS_WEBHOOK_SECRET || ''
    });

    return success;
  }
}

/**
 * Enhanced conversation starter with webhook context
 */
export interface ConversationContext {
  userId: string;
  sessionType: 'goal_discovery' | 'coaching_style_discovery' | 'general';
  selectedGoals?: string[];
  userName?: string;
  onboardingPhase?: string;
}

export function enhanceConversationSession(
  sessionConfig: any,
  context: ConversationContext
): any {
  return {
    ...sessionConfig,
    metadata: {
      ...sessionConfig.metadata,
      userId: context.userId,
      sessionType: context.sessionType,
      selectedGoals: context.selectedGoals,
      userName: context.userName,
      onboardingPhase: context.onboardingPhase,
      webhookEnabled: true,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Get conversation data from webhook storage
 */
export async function getConversationData(conversationId: string) {
  const supabase = createClient();
  
  // Get conversation record
  const { data: conversation, error: conversationError } = await supabase
    .from('elevenlabs_conversations')
    .select('*')
    .eq('conversation_id', conversationId)
    .single();
  
  if (conversationError) {
    console.error('Failed to fetch conversation:', conversationError);
    return null;
  }
  
  // Get all messages
  const { data: messages, error: messagesError } = await supabase
    .from('voice_chat_conversations')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });
  
  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    return { ...conversation, messages: [] };
  }
  
  return {
    ...conversation,
    messages: messages || []
  };
}

/**
 * Get user's onboarding conversation data
 */
export async function getUserOnboardingConversations(userId: string) {
  const supabase = createClient();
  
  const { data: conversations, error } = await supabase
    .from('elevenlabs_conversations')
    .select('*')
    .eq('user_id', userId)
    .in('metadata->sessionType', ['goal_discovery', 'coaching_style_discovery'])
    .order('started_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch onboarding conversations:', error);
    return [];
  }
  
  return conversations || [];
}