'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMayaRAGIntegration } from '@/hooks/useMayaRAGIntegration';
import { InformationCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface MayaRAGExampleProps {
  userId: string;
  className?: string;
}

/**
 * Example component showing how to use the integrated Maya RAG system
 * This demonstrates the complete integration pattern for other developers
 */
export const MayaRAGExample: React.FC<MayaRAGExampleProps> = ({
  userId,
  className = ""
}) => {
  const mayaRAG = useMayaRAGIntegration({
    userId,
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8',
    sessionType: 'example_integration',
    metadata: {
      component: 'MayaRAGExample',
      version: '1.0.0'
    },
    autoUpdateContext: true,
    conversationUpdateInterval: 30
  });

  const handleStartConversation = async () => {
    try {
      await mayaRAG.startSession();
    } catch (error) {
      console.error('Failed to start Maya conversation:', error);
    }
  };

  const handleEndConversation = async () => {
    try {
      await mayaRAG.endSession();
    } catch (error) {
      console.error('Failed to end Maya conversation:', error);
    }
  };

  const handleQuickQuery = async (query: string) => {
    await mayaRAG.updateContextWithQuery(query);
  };

  const conversationInsights = mayaRAG.getConversationInsights();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            Maya RAG Integration Example
          </CardTitle>
          <CardDescription>
            Demonstration of the complete Maya + RAG integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">RAG Context Status</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ready:</span>
                  <Badge variant={mayaRAG.isReady ? "default" : "secondary"}>
                    {mayaRAG.isReady ? 'Yes' : 'Loading...'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Goals:</span>
                  <span className="font-mono text-sm">{mayaRAG.getRelevantGoals().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Insights:</span>
                  <span className="font-mono text-sm">{mayaRAG.getRelevantInsights().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Knowledge:</span>
                  <span className="font-mono text-sm">{mayaRAG.getKnowledgeChunks().length}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Conversation Status</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Connected:</span>
                  <Badge variant={mayaRAG.hasActiveConversation ? "default" : "secondary"}>
                    {mayaRAG.hasActiveConversation ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Messages:</span>
                  <span className="font-mono text-sm">{mayaRAG.conversationState.messages.length}</span>
                </div>
                {conversationInsights && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Topics:</span>
                      <span className="font-mono text-sm">{conversationInsights.identifiedTopics.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="font-mono text-sm">
                        {Math.round(conversationInsights.conversationDuration / 1000)}s
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!mayaRAG.hasActiveConversation ? (
              <Button 
                onClick={handleStartConversation}
                disabled={!mayaRAG.isReady || mayaRAG.conversationState.isConnecting}
              >
                {mayaRAG.conversationState.isConnecting ? 'Connecting...' : 'Start Maya Session'}
              </Button>
            ) : (
              <Button 
                onClick={handleEndConversation}
                variant="destructive"
              >
                End Session
              </Button>
            )}
            
            <Button 
              onClick={mayaRAG.refreshContext}
              variant="outline"
              disabled={mayaRAG.ragContextState.isLoading}
            >
              Refresh Context
            </Button>
          </div>

          {/* Quick Query Buttons */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Context Updates</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'What are my current goals?',
                'Show me recent insights',
                'What should I focus on?',
                'Help me with goal planning'
              ].map((query) => (
                <Button
                  key={query}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuery(query)}
                  disabled={mayaRAG.ragContextState.isLoading}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>

          {/* Errors */}
          {(mayaRAG.ragContextState.error || mayaRAG.conversationState.error) && (
            <Alert className="bg-red-50 border-red-200">
              <InformationCircleIcon className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {mayaRAG.ragContextState.error || mayaRAG.conversationState.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Context Preview */}
      {mayaRAG.ragContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current RAG Context</CardTitle>
            <CardDescription>
              Knowledge context that Maya has access to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Context Stats */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-semibold text-blue-600">{mayaRAG.contextStats.goalsCount}</div>
                  <div className="text-xs text-gray-500">Goals</div>
                </div>
                <div>
                  <div className="font-semibold text-green-600">{mayaRAG.contextStats.insightsCount}</div>
                  <div className="text-xs text-gray-500">Insights</div>
                </div>
                <div>
                  <div className="font-semibold text-purple-600">{mayaRAG.contextStats.knowledgeChunksCount}</div>
                  <div className="text-xs text-gray-500">Knowledge</div>
                </div>
                <div>
                  <div className="font-semibold text-orange-600">{mayaRAG.contextStats.tokenCount}</div>
                  <div className="text-xs text-gray-500">Tokens</div>
                </div>
              </div>

              {/* Context Summary Preview */}
              {mayaRAG.ragContext.userSummary && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm mb-1">User Summary</h5>
                  <p className="text-sm text-gray-700">
                    {mayaRAG.ragContext.userSummary.length > 200 
                      ? `${mayaRAG.ragContext.userSummary.substring(0, 200)}...` 
                      : mayaRAG.ragContext.userSummary
                    }
                  </p>
                </div>
              )}

              {/* Similar Patterns Preview */}
              {mayaRAG.getSimilarPatterns() && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h5 className="font-medium text-sm mb-1">Similar User Patterns</h5>
                  <p className="text-sm text-gray-700">
                    {mayaRAG.getSimilarPatterns()!.pattern_summary}
                  </p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span>Similar goals: {mayaRAG.getSimilarPatterns()!.similar_goals_count}</span>
                    <span>Avg completion: {Math.round(mayaRAG.getSimilarPatterns()!.avg_completion_rate * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation History */}
      {mayaRAG.conversationState.messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Conversation</CardTitle>
            <CardDescription>
              Last {Math.min(5, mayaRAG.conversationState.messages.length)} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mayaRAG.conversationState.messages.slice(-5).map((message) => (
                <div 
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.sender === 'maya' 
                      ? 'bg-purple-50 border-l-4 border-purple-400' 
                      : 'bg-blue-50 border-l-4 border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className="text-xs">
                      {message.sender === 'maya' ? 'Maya' : 'User'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    {message.text.length > 200 
                      ? `${message.text.substring(0, 200)}...`
                      : message.text
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration Guide</CardTitle>
          <CardDescription>
            How to use this Maya RAG integration in your components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">1. Import the hook</h5>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {`import { useMayaRAGIntegration } from '@/hooks/useMayaRAGIntegration';`}
              </code>
            </div>
            
            <div>
              <h5 className="font-medium text-sm mb-2">2. Initialize with user context</h5>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {`const mayaRAG = useMayaRAGIntegration({
  userId: 'user-id',
  agentId: 'elevenlabs-agent-id',
  sessionType: 'your-session-type',
  autoUpdateContext: true
});`}
              </code>
            </div>
            
            <div>
              <h5 className="font-medium text-sm mb-2">3. Start conversation with context</h5>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {`await mayaRAG.startSession();`}
              </code>
            </div>
            
            <div>
              <h5 className="font-medium text-sm mb-2">4. Access integrated data</h5>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {`const goals = mayaRAG.getRelevantGoals();
const insights = mayaRAG.getRelevantInsights();
const knowledge = mayaRAG.getKnowledgeChunks();`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MayaRAGExample;