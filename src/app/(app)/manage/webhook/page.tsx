'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Webhook } from 'lucide-react';

interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  created_at: string;
}

export default function WebhookAdminPage() {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [expectedUrl, setExpectedUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/elevenlabs/setup-webhook');
      const data = await response.json();
      
      if (response.ok) {
        setWebhooks(data.webhooks || []);
        setExpectedUrl(data.expectedUrl || '');
        setIsConfigured(data.isConfigured || false);
      } else {
        console.error('Failed to fetch webhooks:', data.error);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/elevenlabs/setup-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Webhook registered successfully!');
        await fetchWebhooks();
      } else {
        alert(`Failed to register webhook: ${data.error}`);
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
      alert('Failed to register webhook');
    } finally {
      setProcessing(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/elevenlabs/setup-webhook?id=${webhookId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Webhook deleted successfully!');
        await fetchWebhooks();
      } else {
        alert(`Failed to delete webhook: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Failed to delete webhook');
    } finally {
      setProcessing(false);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/elevenlabs/webhook', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Webhook endpoint is working! Response: ${JSON.stringify(data)}`);
      } else {
        alert('Webhook endpoint test failed');
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Failed to test webhook endpoint');
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading webhook configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ElevenLabs Webhook Admin
          </h1>
          <p className="text-gray-600">
            Manage ElevenLabs webhook configuration for voice conversation tracking
          </p>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Supabase Edge Function:</strong> Webhook is hosted as a Supabase Edge Function for optimal performance and direct database access.
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Configuration Status:</span>
                <Badge variant={isConfigured ? 'default' : 'destructive'}>
                  {isConfigured ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Expected URL:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {expectedUrl}
                </code>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Registered Webhooks:</span>
                <Badge variant="secondary">
                  {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Manage your ElevenLabs webhook configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={setupWebhook}
                disabled={processing || isConfigured}
                className="flex items-center gap-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isConfigured ? 'Webhook Configured' : 'Setup Webhook'}
              </Button>
              
              <Button
                onClick={testWebhook}
                variant="outline"
                disabled={processing}
              >
                Test Webhook Endpoint
              </Button>
              
              <Button
                onClick={fetchWebhooks}
                variant="outline"
                disabled={processing}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook List */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Webhooks</CardTitle>
            <CardDescription>
              List of all webhooks registered with ElevenLabs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No webhooks configured</p>
                <p className="text-sm text-gray-400 mt-2">
                  Click &quot;Setup Webhook&quot; to register your first webhook
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {webhook.url}
                          </code>
                          <Badge
                            variant={webhook.status === 'active' ? 'default' : 'secondary'}
                          >
                            {webhook.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-2">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          Created: {new Date(webhook.created_at).toLocaleString()}
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => deleteWebhook(webhook.id)}
                        variant="destructive"
                        size="sm"
                        disabled={processing}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Environment Variables</h4>
                <p className="text-gray-600 mb-2">
                  Ensure these environment variables are set:
                </p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  ELEVENLABS_API_KEY=your_api_key_here<br />
                  ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret (optional)
                </code>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Deploy Edge Function</h4>
                <p className="text-gray-600 mb-2">
                  Deploy the webhook Edge Function to Supabase:
                </p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  npx supabase functions deploy elevenlabs-webhook --no-verify-jwt
                </code>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Webhook URL</h4>
                <p className="text-gray-600 mb-2">
                  The webhook will be registered at:
                </p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {expectedUrl}
                </code>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">4. Events</h4>
                <p className="text-gray-600 mb-2">
                  The webhook will listen for these events:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>conversation_started</li>
                  <li>conversation_ended</li>
                  <li>message_received</li>
                  <li>message_sent</li>
                  <li>error</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}