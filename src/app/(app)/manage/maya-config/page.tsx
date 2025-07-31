'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  Mic, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Code,
  Eye,
  EyeOff,
  RefreshCw,
  Terminal
} from 'lucide-react';

export default function MayaConfigPage() {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configStatus, setConfigStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [agentDetails] = useState({
    name: "Maya - LiveGuide Onboarding Specialist",
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'Not configured',
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || 'Not configured',
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    voiceName: "Sarah - warm, friendly voice"
  });

  const configFeatures = [
    {
      icon: <Bot className="w-5 h-5" />,
      title: "Intelligent Onboarding",
      description: "Maya guides users through personalized goal discovery"
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Natural Conversations",
      description: "Engaging dialogue that feels authentic and supportive"
    },
    {
      icon: <Mic className="w-5 h-5" />,
      title: "Voice-First Experience",
      description: "Warm, friendly voice optimized for coaching conversations"
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: "Adaptive Coaching",
      description: "Discovers user preferences for personalized support"
    }
  ];

  const promptHighlights = [
    {
      category: "Goal Discovery",
      items: ["Personal Growth", "Professional Development", "Health & Wellness", "Relationships"]
    },
    {
      category: "Coaching Style Assessment",
      items: ["Energy Level", "Information Processing", "Decision Making", "Structure Preference"]
    },
    {
      category: "Conversation Approach",
      items: ["Active Listening", "Natural Flow", "Encouraging Tone", "Flexible Focus"]
    }
  ];

  const runConfiguration = async () => {
    setIsConfiguring(true);
    setConfigStatus('running');
    setLogs([]);

    try {
      const response = await fetch('/api/manage/configure-maya', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Configuration failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.log) {
              setLogs(prev => [...prev, data.log]);
            }
            if (data.status) {
              setConfigStatus(data.status);
            }
          } catch {
            // Not JSON, just add as log
            if (line.trim()) {
              setLogs(prev => [...prev, line]);
            }
          }
        }
      }

      setConfigStatus('success');
    } catch (error) {
      console.error('Configuration error:', error);
      setConfigStatus('error');
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setIsConfiguring(false);
    }
  };

  const getStatusIcon = () => {
    switch (configStatus) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Settings className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            Maya Agent Configuration
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Configure and manage the AI-powered onboarding specialist for LiveGuide
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Configuration</CardTitle>
                <CardDescription>Current Maya agent settings and credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Agent Name</label>
                    <p className="mt-1 text-sm text-gray-900">{agentDetails.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Voice Profile</label>
                    <p className="mt-1 text-sm text-gray-900">{agentDetails.voiceName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Agent ID</label>
                    <p className="mt-1 text-sm font-mono text-gray-900">{agentDetails.agentId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">API Key</label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-mono text-gray-900">
                        {showApiKey 
                          ? agentDetails.apiKey 
                          : agentDetails.apiKey.substring(0, 20) + '...'}
                      </p>
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={runConfiguration}
                    disabled={isConfiguring}
                    className="w-full md:w-auto"
                  >
                    {isConfiguring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Configuring...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Run Configuration Script
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card>
              <CardHeader>
                <CardTitle>Maya&apos;s Capabilities</CardTitle>
                <CardDescription>Key features configured by the script</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {configFeatures.map((feature, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 text-blue-600">{feature.icon}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">{feature.title}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prompt Highlights */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Framework</CardTitle>
                <CardDescription>Maya&apos;s programmed expertise areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promptHighlights.map((section, index) => (
                    <div key={index}>
                      <h4 className="font-medium text-gray-900 mb-2">{section.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((item, itemIndex) => (
                          <Badge key={itemIndex} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Logs */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Configuration Logs
                  </span>
                  {getStatusIcon()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-sm font-mono">
                      Click &quot;Run Configuration Script&quot; to see logs...
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <p key={index} className="text-green-400 text-sm font-mono">
                          {log}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Script Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Configuration Script Overview
            </CardTitle>
            <CardDescription>
              The script located at /scripts/configure-maya-agent.js performs the following actions:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-4">
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">1.</span>
                  <span>Loads environment variables from .env.local</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">2.</span>
                  <span>Validates ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">3.</span>
                  <span>Updates Maya agent with comprehensive onboarding prompt and conversation settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">4.</span>
                  <span>Configures voice settings (Sarah voice with optimized streaming)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">5.</span>
                  <span>Sets up system tools including end_call functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">6.</span>
                  <span>Verifies the configuration was applied successfully</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}