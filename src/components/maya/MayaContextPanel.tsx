'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ChartBarIcon,
  LightBulbIcon,
  FlagIcon as TargetIcon,
  BookOpenIcon,
  UsersIcon,
  ArrowPathIcon as RefreshCCWIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useRAGContext, RAGContextData } from '@/hooks/useRAGContext';

interface MayaContextPanelProps {
  userId: string;
  agentId?: string;
  conversationId?: string;
  isConversationActive?: boolean;
  onContextUpdate?: (context: RAGContextData) => void;
  className?: string;
}

interface ContextStatsProps {
  stats: {
    tokenCount: number;
    truncated: boolean;
    goalsCount: number;
    insightsCount: number;
    knowledgeChunksCount: number;
    hasSimilarPatterns: boolean;
  };
  cacheAge: number;
  isStale: boolean;
  lastUpdated?: string;
}

const ContextStats: React.FC<ContextStatsProps> = ({ 
  stats, 
  cacheAge, 
  isStale, 
  lastUpdated 
}) => (
  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Context Size:</span>
        <span className="font-mono">{stats.tokenCount} tokens</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Cache Age:</span>
        <span className={`font-mono ${isStale ? 'text-amber-600' : 'text-green-600'}`}>
          {Math.round(cacheAge)}s
        </span>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Status:</span>
        <Badge 
          variant={isStale ? "secondary" : "default"}
          className="text-xs px-1 py-0"
        >
          {isStale ? 'Stale' : 'Fresh'}
        </Badge>
      </div>
      {stats.truncated && (
        <div className="flex justify-between text-xs">
          <span className="text-amber-600">Truncated</span>
          <ExclamationTriangleIcon className="w-3 h-3 text-amber-600" />
        </div>
      )}
    </div>
    <div className="col-span-2">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="text-xs">
          <div className="font-semibold text-blue-600">{stats.goalsCount}</div>
          <div className="text-gray-500">Goals</div>
        </div>
        <div className="text-xs">
          <div className="font-semibold text-green-600">{stats.insightsCount}</div>
          <div className="text-gray-500">Insights</div>
        </div>
        <div className="text-xs">
          <div className="font-semibold text-purple-600">{stats.knowledgeChunksCount}</div>
          <div className="text-gray-500">Knowledge</div>
        </div>
        <div className="text-xs">
          <div className="font-semibold text-orange-600">
            {stats.hasSimilarPatterns ? '✓' : '–'}
          </div>
          <div className="text-gray-500">Patterns</div>
        </div>
      </div>
    </div>
    {lastUpdated && (
      <div className="col-span-2 text-xs text-gray-500 border-t pt-2">
        Updated: {new Date(lastUpdated).toLocaleTimeString()}
      </div>
    )}
  </div>
);

const MayaContextPanel: React.FC<MayaContextPanelProps> = ({
  userId,
  agentId,
  conversationId,
  isConversationActive = false,
  onContextUpdate,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const ragContext = useRAGContext({
    userId,
    agentId,
    conversationId,
    maxTokens: 12000,
    includeKnowledgeBase: true,
    includeSimilarPatterns: true,
    autoRefreshInterval: isConversationActive ? 30 : 0, // Auto-refresh during conversation
    cacheTtl: 60
  });

  // Notify parent when context updates
  useEffect(() => {
    if (ragContext.data && onContextUpdate) {
      onContextUpdate(ragContext.data);
    }
  }, [ragContext.data, onContextUpdate]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await ragContext.searchKnowledge({ query: searchQuery });
    setSearchQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const contextStats = ragContext.getContextStats();
  const relevantGoals = ragContext.getRelevantGoals();
  const relevantInsights = ragContext.getRelevantInsights();
  const knowledgeChunks = ragContext.getKnowledgeChunks();
  const similarPatterns = ragContext.getSimilarPatterns();

  if (!ragContext.isInitialized && ragContext.isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCCWIcon className="w-5 h-5 animate-spin" />
            Maya's Context
          </CardTitle>
          <CardDescription>Initializing knowledge context...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto animate-pulse" />
              <p className="text-sm text-gray-600">Loading your personalized context...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              Maya's Context
            </CardTitle>
            <CardDescription>
              Real-time knowledge context for personalized coaching
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isConversationActive && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Live
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={ragContext.refreshContext}
              disabled={ragContext.isLoading}
            >
              {ragContext.isLoading ? (
                <RefreshCCWIcon className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCCWIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Context Stats */}
        {ragContext.hasData && (
          <ContextStats
            stats={contextStats}
            cacheAge={ragContext.cacheAge}
            isStale={ragContext.isStale}
            lastUpdated={ragContext.data?.lastUpdated}
          />
        )}

        {/* Error Display */}
        {ragContext.hasError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">{ragContext.error}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Interface */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search Maya's knowledge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-sm px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Button 
              onClick={handleSearch} 
              disabled={!searchQuery.trim() || ragContext.isLoading}
              size="sm"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Context Tabs */}
        {ragContext.hasData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="text-xs">
                <ChartBarIcon className="w-4 h-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs">
                <TargetIcon className="w-4 h-4 mr-1" />
                Goals ({relevantGoals.length})
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <LightBulbIcon className="w-4 h-4 mr-1" />
                Insights ({relevantInsights.length})
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="text-xs">
                <BookOpenIcon className="w-4 h-4 mr-1" />
                Knowledge ({knowledgeChunks.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-3">
                {ragContext.data?.userSummary && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">User Summary</h4>
                    <p className="text-sm text-gray-700">{ragContext.data.userSummary}</p>
                  </div>
                )}

                {similarPatterns && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UsersIcon className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-sm">Similar User Patterns</h4>
                    </div>
                    <div className="space-y-2 text-xs">
                      <p>{similarPatterns.pattern_summary}</p>
                      <div className="flex justify-between">
                        <span>Similar goals: {similarPatterns.similar_goals_count}</span>
                        <span>Avg completion: {Math.round(similarPatterns.avg_completion_rate * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Goals</span>
                      <Badge variant="outline">{relevantGoals.length}</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Recent Insights</span>
                      <Badge variant="outline">{relevantInsights.length}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {relevantGoals.map((goal, idx) => (
                    <div key={goal.id || idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{goal.label}</h4>
                        <Badge variant="outline" className="text-xs">
                          {goal.status || 'active'}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-gray-600 mb-2">
                          {goal.description.substring(0, 150)}
                          {goal.description.length > 150 && '...'}
                        </p>
                      )}
                      {goal.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{Math.round(goal.progress * 100)}%</span>
                          </div>
                          <Progress value={goal.progress * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                  {relevantGoals.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No relevant goals found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {relevantInsights.map((insight, idx) => (
                    <div key={insight.id || idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{insight.label}</h4>
                        {insight.similarity && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(insight.similarity * 100)}% match
                          </Badge>
                        )}
                      </div>
                      {insight.description && (
                        <p className="text-xs text-gray-600">
                          {insight.description.substring(0, 200)}
                          {insight.description.length > 200 && '...'}
                        </p>
                      )}
                      {insight.created_at && (
                        <div className="flex items-center gap-1 mt-2">
                          <ClockIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {relevantInsights.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No relevant insights found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Knowledge Tab */}
            <TabsContent value="knowledge">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {knowledgeChunks.map((chunk, idx) => (
                    <div key={chunk.id || idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{chunk.document_title}</h4>
                          {chunk.similarity && (
                            <span className="text-xs text-gray-500">
                              {Math.round(chunk.similarity * 100)}% relevant
                            </span>
                          )}
                        </div>
                        <BookOpenIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-600">
                        {chunk.content.substring(0, 200)}
                        {chunk.content.length > 200 && '...'}
                      </p>
                    </div>
                  ))}
                  {knowledgeChunks.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No knowledge chunks found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* Status Footer */}
        <Separator />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            {ragContext.isLoading ? (
              <RefreshCCWIcon className="w-3 h-3 animate-spin" />
            ) : ragContext.hasError ? (
              <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
            ) : (
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
            )}
            <span>
              {ragContext.isLoading 
                ? 'Updating...' 
                : ragContext.hasError 
                  ? 'Error' 
                  : 'Ready'
              }
            </span>
          </div>
          {isConversationActive && (
            <div className="flex items-center gap-1">
              <InformationCircleIcon className="w-3 h-3" />
              <span>Auto-refreshing every 30s</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MayaContextPanel;