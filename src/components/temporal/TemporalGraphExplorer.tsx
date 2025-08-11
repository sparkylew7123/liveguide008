import React, { useState, useCallback } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useTemporalGraph } from '@/hooks/useTemporalGraph';
import { TimelineController } from './TimelineController';
import { TemporalGraphCanvas } from './TemporalGraphCanvas';
import { NodeEvolutionPanel } from './NodeEvolutionPanel';
import { SessionNavigator } from './SessionNavigator';
import { TemporalNode } from '@/types/temporal';
import { 
  ArrowPathIcon,
  ExclamationCircleIcon,
  ClockIcon,
  RectangleStackIcon 
} from '@heroicons/react/24/outline';

interface TemporalGraphExplorerProps {
  className?: string;
}

export function TemporalGraphExplorer({ className = '' }: TemporalGraphExplorerProps) {
  const user = useUser();
  const [selectedNode, setSelectedNode] = useState<TemporalNode | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const {
    timelineState,
    sessions,
    temporalNodes,
    temporalEdges,
    loading,
    error,
    setCurrentTime,
    togglePlayPause,
    setPlaybackSpeed,
    selectSession,
    getNodeEvolution,
    currentSession
  } = useTemporalGraph({
    userId: user?.id || '',
    autoPlay: false,
    initialSpeed: 1
  });

  const handleNodeClick = useCallback((node: TemporalNode) => {
    setSelectedNode(node);
    if (node.node_type === 'session') {
      selectSession(node as any);
    }
  }, [selectSession]);

  const handleNodeRightClick = useCallback((node: TemporalNode, event: MouseEvent) => {
    event.preventDefault();
    setSelectedNode(node);
    setShowEvolution(true);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please sign in to view your graph</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-destructive">
          <ExclamationCircleIcon className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Top Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Temporal Graph Explorer
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              showSessions 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <RectangleStackIcon className="w-4 h-4 mr-1 inline" />
            Sessions
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {/* Graph Canvas */}
        <TemporalGraphCanvas
          nodes={temporalNodes}
          edges={temporalEdges}
          currentTime={timelineState.currentTime}
          selectedNodeId={selectedNode?.id}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
        />

        {/* Current Session Indicator */}
        {currentSession && (
          <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-lg border rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium">{currentSession.label}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {currentSession.properties?.summary || 'No summary available'}
            </div>
          </div>
        )}

        {/* Node Info */}
        {selectedNode && !showEvolution && (
          <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-lg border rounded-lg p-4 shadow-lg max-w-sm">
            <h3 className="font-medium mb-2">{selectedNode.label}</h3>
            {selectedNode.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {selectedNode.description}
              </p>
            )}
            <div className="text-xs space-y-1">
              <div>Type: <span className="text-muted-foreground">{selectedNode.node_type}</span></div>
              <div>Status: <span className="text-muted-foreground">{selectedNode.status || 'N/A'}</span></div>
              <div>First seen: <span className="text-muted-foreground">
                {new Date(selectedNode.first_mentioned_at || selectedNode.created_at).toLocaleDateString()}
              </span></div>
              <div>Last discussed: <span className="text-muted-foreground">
                {new Date(selectedNode.last_discussed_at || selectedNode.updated_at).toLocaleDateString()}
              </span></div>
            </div>
            <button
              onClick={() => setShowEvolution(true)}
              className="mt-3 text-xs text-primary hover:underline"
            >
              View evolution →
            </button>
          </div>
        )}
      </div>

      {/* Timeline Controller */}
      <div className="p-4 border-t">
        <TimelineController
          sessions={sessions}
          currentTime={timelineState.currentTime}
          isPlaying={timelineState.isPlaying}
          playbackSpeed={timelineState.playbackSpeed}
          onTimeChange={setCurrentTime}
          onPlayPause={togglePlayPause}
          onSpeedChange={setPlaybackSpeed}
          onSessionSelect={selectSession}
        />
      </div>

      {/* Side Panels */}
      {showSessions && (
        <div className="absolute top-16 right-4 w-80 max-h-[60vh] overflow-y-auto">
          <SessionNavigator
            sessions={sessions}
            currentSession={currentSession || null}
            onSessionSelect={(session) => {
              selectSession(session);
              setShowSessions(false);
            }}
            onClose={() => setShowSessions(false)}
          />
        </div>
      )}

      {showEvolution && selectedNode && (
        <div className="absolute top-16 right-4 w-96 max-h-[70vh] overflow-y-auto">
          <NodeEvolutionPanel
            node={selectedNode}
            sessions={sessions}
            onClose={() => setShowEvolution(false)}
            getNodeEvolution={getNodeEvolution}
          />
        </div>
      )}
    </div>
  );
}