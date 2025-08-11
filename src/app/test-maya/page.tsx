'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PhoneIcon, 
  MicrophoneIcon, 
  PhoneArrowDownLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneOffIcon } from '@heroicons/react/24/solid';
import { useElevenLabsConversation, formatMetadata, generateCallId } from '@/hooks/useElevenLabsConversation';
import { useRAGContext, RAGContextData } from '@/hooks/useRAGContext';
import { createEnhancedClient } from '@/utils/supabase/enhanced-client';
import { User } from '@supabase/supabase-js';
import MayaContextPanel from '@/components/maya/MayaContextPanel';

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8';

export default function TestMayaPage() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<string[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [ragContextData, setRAGContextData] = useState<RAGContextData | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [supabase] = useState(() => createEnhancedClient());

  // Fetch authenticated user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);
  
  // Initialize ElevenLabs conversation with authenticated user or fallback
  const userId = user?.id || 'anonymous-user';
  const userName = user?.email?.split('@')[0] || 'Anonymous User';
  
  // Handle RAG context updates
  const handleRAGContextUpdate = useCallback((contextData: RAGContextData) => {
    setRAGContextData(contextData);
  }, []);
  
  const conversation = useElevenLabsConversation(
    {
      agentId: AGENT_ID,
      userId: userId,
      customCallId: generateCallId(userId, 'maya_test'),
      metadata: formatMetadata({
        userId: userId,
        userName: userName,
        sessionType: 'test_maya_page',
        agentName: 'Maya',
        testMode: true,
        authenticated: !!user,
        timestamp: new Date().toISOString()
      }),
      ragContext: ragContextData?.context || undefined
    },
    {
      onConnect: () => {
        console.log('✅ Connected to Maya');
        setCallStatus('connected');
        setConversationMessages(prev => [...prev, '✅ Connected to Maya']);
      },
      onDisconnect: () => {
        console.log('👋 Disconnected from Maya');
        setCallStatus('ended');
        setIsCallActive(false);
        setConversationMessages(prev => [...prev, '👋 Conversation ended']);
      },
      onMessage: (message) => {
        console.log('💬 Message from Maya:', message);
        if (message.message) {
          setConversationMessages(prev => [...prev, `Maya: ${message.message}`]);
        }
      },
      onError: (error) => {
        console.error('❌ Error:', error);
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection failed';
        setConversationMessages(prev => [...prev, `❌ Error: ${errorMessage}`]);
        setCallStatus('ended');
        setIsCallActive(false);
      }
    },
    // Pass overrides as third parameter for custom first message
    {
      agent: {
        firstMessage: user 
          ? `Hello ${userName}! I'm Maya, your Chief Onboarding Officer. I can see you're authenticated and I'm ready to help you explore your goals and get the most out of LiveGuide. What would you like to work on today?`
          : "Hello! I'm Maya. I notice you're not logged in yet. While we can still chat, logging in will allow me to save your goals and insights to your personal knowledge graph. What brings you to LiveGuide today?",
        language: "en",
      },
      conversation: {
        textOnly: false,
      }
    }
  );

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    try {
      const response = await fetch('https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'Maya-Test-Page'
        },
        body: JSON.stringify({
          mode: 'health-check',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setWebhookStatus('connected');
      } else {
        setWebhookStatus('error');
      }
    } catch (error) {
      setWebhookStatus('error');
    }
  };

  const testWebhook = async () => {
    setIsTestingWebhook(true);
    const testPayload = {
      mode: 'direct',
      conversationId: `test-maya-${Date.now()}`,
      userId: userId,
      transcript: 'Test conversation from Maya test page. I want to improve my public speaking skills within 3 months.',
      analysis: {
        summary: 'User wants to improve public speaking skills',
        goals: [
          {
            text: 'improve public speaking skills',
            timescale: '3 months',
            title: 'Public Speaking Mastery'
          }
        ],
        insights: [
          {
            text: 'User shows motivation for professional development',
            title: 'Growth Mindset'
          }
        ]
      }
    };

    try {
      const response = await fetch('https://n8n-hatchdev.fly.dev/webhook/c389dc70-b6c9-4cd7-9520-bebe372c800a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'Maya-Test-Page'
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();
      setTestResults(prev => [{
        timestamp: new Date().toISOString(),
        success: response.ok,
        status: response.status,
        result
      }, ...prev.slice(0, 4)]);
    } catch (error) {
      setTestResults(prev => [{
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }, ...prev.slice(0, 4)]);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const startCall = useCallback(async () => {
    try {
      setCallStatus('connecting');
      setIsCallActive(true);
      setConversationMessages([]);
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
      
      // Start the actual ElevenLabs conversation
      // The hook handles authentication internally
      await conversation.startSession();
      
      setConversationMessages(prev => [...prev, '🎤 Starting conversation with Maya...']);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      const errorMessage = error?.message || 'Connection failed';
      setConversationMessages(prev => [...prev, `❌ Failed to start: ${errorMessage}`]);
      setCallStatus('ended');
      setIsCallActive(false);
    }
  }, [conversation]);

  const endCall = useCallback(async () => {
    try {
      await conversation.endSession();
      setCallStatus('ended');
      setIsCallActive(false);
      setTimeout(() => {
        setCallStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [conversation]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: The ElevenLabs SDK doesn't directly support muting, 
    // you'd need to manipulate the audio stream
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Maya Integration Test
          </h1>
          <p className="text-gray-600">Test the ElevenLabs Agent → N8N → LiveGuide integration</p>
        </div>

        {/* Authentication Status Alert */}
        {!user && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You're not authenticated. Maya can still chat with you, but your goals and insights won't be saved.
              <Button 
                variant="link" 
                className="ml-2 p-0 h-auto text-yellow-800 underline"
                onClick={() => window.location.href = '/auth/login'}
              >
                Login to save your progress
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">Maya</span>
                <Badge variant="outline" className="bg-green-50">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">ID: {AGENT_ID.slice(0, 12)}...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Webhook Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">N8N</span>
                <Badge 
                  variant="outline" 
                  className={webhookStatus === 'connected' ? 'bg-green-50' : webhookStatus === 'error' ? 'bg-red-50' : 'bg-yellow-50'}
                >
                  {webhookStatus === 'checking' && <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />}
                  {webhookStatus === 'connected' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                  {webhookStatus === 'error' && <XCircleIcon className="w-3 h-3 mr-1" />}
                  {webhookStatus}
                </Badge>
              </div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs" 
                onClick={checkWebhookStatus}
              >
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">User Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Status:</p>
                    <p className="text-sm font-semibold">
                      {user ? 'Authenticated' : 'Anonymous'}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={user ? "bg-green-50 text-green-700" : "bg-gray-50"}
                  >
                    {user ? 'Logged In' : 'Guest'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Username:</p>
                  <p className="text-sm font-semibold">{userName}</p>
                </div>
                {user ? (
                  <div>
                    <p className="text-xs text-gray-500">Email:</p>
                    <p className="text-sm truncate">{user.email}</p>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => window.location.href = '/auth/login'}
                  >
                    Login to Save Progress
                  </Button>
                )}
                <div>
                  <p className="text-xs text-gray-500">User ID:</p>
                  <p className="text-xs font-mono bg-gray-100 p-1 rounded break-all">{userId}</p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-xs">
                  Passed to ElevenLabs
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Tabs defaultValue="voice" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="voice">Voice Chat</TabsTrigger>
                <TabsTrigger value="webhook">Webhook Test</TabsTrigger>
                <TabsTrigger value="embed">Embed Widget</TabsTrigger>
              </TabsList>

          {/* Voice Chat Tab */}
          <TabsContent value="voice">
            <Card>
              <CardHeader>
                <CardTitle>Voice Conversation with Maya</CardTitle>
                <CardDescription>
                  Start a voice conversation to test the full integration flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Call Interface */}
                <div className="flex flex-col items-center space-y-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">M</span>
                    </div>
                    {callStatus === 'connected' && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-25" />
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      {callStatus === 'idle' && 'Ready to connect'}
                      {callStatus === 'connecting' && 'Connecting to Maya...'}
                      {callStatus === 'connected' && 'Connected - Speak now'}
                      {callStatus === 'ended' && 'Call ended'}
                    </p>
                    {callStatus === 'connected' && (
                      <p className="text-sm text-gray-500">Maya is listening... Speak naturally!</p>
                    )}
                  </div>
                  
                  {/* Conversation Messages */}
                  {conversationMessages.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                      {conversationMessages.slice(-5).map((message, index) => (
                        <div key={index} className="text-sm text-gray-700 mb-2">
                          {message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex gap-4">
                    {!isCallActive ? (
                      <Button
                        size="lg"
                        onClick={startCall}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <PhoneIcon className="w-5 h-5 mr-2" />
                        Start Call
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="lg"
                          variant={isMuted ? "destructive" : "secondary"}
                          onClick={toggleMute}
                        >
                          {isMuted ? <MicrophoneOffIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                        </Button>
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={endCall}
                        >
                          <PhoneArrowDownLeftIcon className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-blue-600" />
                    How to test REAL voice conversation:
                  </h4>
                  <ol className="text-sm space-y-1 ml-6">
                    <li>1. Click "Start Call" to connect with Maya (will request microphone)</li>
                    <li>2. Allow microphone access when prompted</li>
                    <li>3. Speak naturally - share goals and concerns</li>
                    <li>4. Maya will respond with voice and extract data</li>
                    <li>5. End call when done - webhook will process data</li>
                    <li>6. Check LiveGuide graph for new nodes</li>
                  </ol>
                  <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                    ✅ This uses the ACTUAL ElevenLabs voice API - you will hear Maya speak!
                  </div>
                  <div className="mt-3 p-2 bg-gray-100 rounded">
                    <p className="text-xs font-semibold mb-1">Data being sent to ElevenLabs:</p>
                    <ul className="text-xs space-y-1 text-gray-600">
                      <li>• <span className="font-mono">user_id (URL param):</span> {userId}</li>
                      <li>• <span className="font-mono">metadata.userId:</span> {userId}</li>
                      <li>• <span className="font-mono">metadata.userName:</span> {userName}</li>
                      <li>• <span className="font-mono">metadata.authenticated:</span> {user ? 'true' : 'false'}</li>
                      <li>• <span className="font-mono">agent_id:</span> {AGENT_ID.slice(0, 20)}...</li>
                      <li>• <span className="font-mono">sessionType:</span> test_maya_page</li>
                      {ragContextData && (
                        <li>• <span className="font-mono">RAG Context:</span> {ragContextData.tokenCount} tokens</li>
                      )}
                    </ul>
                  </div>
                  
                  {/* RAG Context Status */}
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <h4 className="font-medium mb-2 flex items-center text-xs">
                      <InformationCircleIcon className="w-3 h-3 mr-1 text-blue-600" />
                      RAG Context Integration:
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Knowledge Available:</span>
                        <Badge variant={ragContextData ? "default" : "secondary"} className="text-xs px-1 py-0">
                          {ragContextData ? 'Loaded' : 'Loading...'}
                        </Badge>
                      </div>
                      {ragContextData && (
                        <>
                          <div className="flex justify-between">
                            <span>Goals:</span>
                            <span className="font-mono">{ragContextData.relevantGoals?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Insights:</span>
                            <span className="font-mono">{ragContextData.relevantInsights?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Knowledge Chunks:</span>
                            <span className="font-mono">{ragContextData.knowledgeChunks?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Context Size:</span>
                            <span className="font-mono">{ragContextData.tokenCount} tokens</span>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      ✨ Maya now has access to your personal knowledge graph and similar user patterns!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhook Test Tab */}
          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle>Direct Webhook Testing</CardTitle>
                <CardDescription>
                  Send test payloads directly to the N8N webhook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={testWebhook}
                  disabled={isTestingWebhook}
                  className="w-full"
                >
                  {isTestingWebhook ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Send Test Payload
                    </>
                  )}
                </Button>

                {/* Test Results */}
                {testResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Recent Test Results:</h4>
                    {testResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">
                              {result.success ? '✅ Success' : '❌ Failed'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {result.result && (
                            <Badge variant="outline">
                              {result.result.toolsExecuted || 0} tools executed
                            </Badge>
                          )}
                        </div>
                        {result.result && result.result.results && (
                          <div className="mt-2 text-xs">
                            <p>Nodes created: {result.result.results.filter(r => r.success).length}</p>
                          </div>
                        )}
                        {result.error && (
                          <p className="mt-2 text-xs text-red-600">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Embed Widget Tab */}
          <TabsContent value="embed">
            <Card>
              <CardHeader>
                <CardTitle>ElevenLabs Widget</CardTitle>
                <CardDescription>
                  Full embedded widget for production testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Widget Options:</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`https://elevenlabs.io/conversational-ai/embed/${AGENT_ID}/widget`, '_blank')}
                      >
                        Open Widget in New Tab
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`https://elevenlabs.io/app/conversational-ai/agents/agent/${AGENT_ID}`, '_blank')}
                      >
                        View Agent Dashboard
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <iframe
                      src={`https://elevenlabs.io/conversational-ai/embed/${AGENT_ID}/widget`}
                      className="w-full h-[600px] rounded-lg"
                      allow="microphone"
                      title="Maya - ElevenLabs Agent"
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm">
                      <strong>Tip:</strong> The widget above should allow you to interact with Maya directly. 
                      Make sure to allow microphone access when prompted.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </div>
          
          {/* Maya Context Panel */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <MayaContextPanel
                userId={userId}
                agentId={AGENT_ID}
                conversationId={generateCallId(userId, 'maya_test')}
                isConversationActive={isCallActive}
                onContextUpdate={handleRAGContextUpdate}
                className="h-fit"
              />
            </div>
          </div>
        </div>

        {/* Integration Flow Diagram */}
        <Card>
          <CardHeader>
            <CardTitle>Maya + RAG Integration Flow</CardTitle>
            <CardDescription>
              Enhanced conversation flow with real-time knowledge context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversation Flow */}
              <div>
                <h4 className="font-medium mb-4">Real-Time Conversation</h4>
                <div className="flex items-center justify-between space-x-2 overflow-x-auto py-4">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                      <MicrophoneIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-center">Voice Input</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                      <span className="text-xs font-bold text-orange-600">RAG</span>
                    </div>
                    <p className="text-xs text-center">Context</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                      <span className="text-sm font-bold text-pink-600">M</span>
                    </div>
                    <p className="text-xs text-center">Maya Agent</p>
                  </div>
                </div>
              </div>
              
              {/* Data Processing Flow */}
              <div>
                <h4 className="font-medium mb-4">Data Processing Pipeline</h4>
                <div className="flex items-center justify-between space-x-2 overflow-x-auto py-4">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <span className="text-xs font-bold text-blue-600">N8N</span>
                    </div>
                    <p className="text-xs text-center">Webhook</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <span className="text-xs font-bold text-green-600">MCP</span>
                    </div>
                    <p className="text-xs text-center">MCP Server</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                      <span className="text-xs font-bold text-indigo-600">DB</span>
                    </div>
                    <p className="text-xs text-center">Graph Nodes</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* RAG Features */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm">Personal Context</h5>
                <p className="text-xs text-gray-600 mt-1">User goals, insights, and progress</p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm">Knowledge Base</h5>
                <p className="text-xs text-gray-600 mt-1">Relevant documents and resources</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm">Similar Patterns</h5>
                <p className="text-xs text-gray-600 mt-1">Anonymous user success patterns</p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg">
                <h5 className="font-medium text-sm">Real-Time Updates</h5>
                <p className="text-xs text-gray-600 mt-1">Dynamic context during conversation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}