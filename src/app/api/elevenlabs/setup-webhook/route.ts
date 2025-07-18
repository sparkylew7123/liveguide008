import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsWebhookManager } from '@/lib/elevenlabs-webhook';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const manager = new ElevenLabsWebhookManager(apiKey);
    const webhookUrl = ElevenLabsWebhookManager.getWebhookUrl();
    
    console.log('🔗 Setting up webhook URL:', webhookUrl);
    
    // First, list existing webhooks to avoid duplicates
    const existingWebhooks = await manager.listWebhooks();
    const existingWebhook = existingWebhooks.find(webhook => 
      webhook.url === webhookUrl
    );
    
    if (existingWebhook) {
      console.log('✅ Webhook already exists:', existingWebhook.id);
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook already registered',
        webhook: existingWebhook
      });
    }
    
    // Register new webhook
    const success = await manager.registerWebhook({
      url: webhookUrl,
      events: [
        'conversation_started',
        'conversation_ended',
        'message_received',
        'message_sent',
        'error'
      ],
      secret: process.env.ELEVENLABS_WEBHOOK_SECRET
    });
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook registered successfully',
        url: webhookUrl
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to register webhook' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Webhook setup error:', error);
    return NextResponse.json(
      { error: 'Webhook setup failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const manager = new ElevenLabsWebhookManager(apiKey);
    const webhooks = await manager.listWebhooks();
    const webhookUrl = ElevenLabsWebhookManager.getWebhookUrl();
    
    return NextResponse.json({
      webhooks,
      expectedUrl: webhookUrl,
      isConfigured: webhooks.some(webhook => webhook.url === webhookUrl)
    });
    
  } catch (error) {
    console.error('❌ Error listing webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID required' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const manager = new ElevenLabsWebhookManager(apiKey);
    const success = await manager.deleteWebhook(webhookId);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook deleted successfully' 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}