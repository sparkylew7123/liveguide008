'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TemporalGraphCanvas } from './TemporalGraphCanvas';
import { TemporalNode, TemporalEdge } from '@/types/temporal';
import { Button } from '@/components/ui/button';

// Sample data generator for testing
const generateTestData = (nodeCount: number = 20) => {
  const now = new Date();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const nodes: TemporalNode[] = Array.from({ length: nodeCount }, (_, i) => {
    const createdAt = new Date(now.getTime() - Math.random() * 7 * day);
    const age = now.getTime() - createdAt.getTime();
    const hoursAge = age / hour;

    return {
      id: `node-${i}`,
      user_id: 'test-user',
      node_type: ['goal', 'emotion', 'skill', 'strength', 'value', 'session'][Math.floor(Math.random() * 6)],
      label: `Node ${i}`,
      description: `Test node ${i} description`,
      status: Math.random() > 0.7 ? 'draft_verbal' : 'curated',
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      age,
      isNew: hoursAge < 1,
      isRecent: hoursAge < 24,
      visibility: Math.max(0.3, 1 - (hoursAge / 168))
    };
  });

  // Generate edges with realistic connections
  const edges: TemporalEdge[] = [];
  for (let i = 0; i < Math.min(nodeCount * 1.5, 30); i++) {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    let targetIdx = Math.floor(Math.random() * nodeCount);
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * nodeCount);
    }

    const createdAt = new Date(now.getTime() - Math.random() * 5 * day);
    const age = now.getTime() - createdAt.getTime();

    edges.push({
      id: `edge-${i}`,
      edge_type: 'connection',
      source_id: nodes[sourceIdx].id,
      target_id: nodes[targetIdx].id,
      label: `Edge ${i}`,
      weight: Math.random(),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      age,
      isNew: age < hour,
      currentStrength: Math.random()
    });
  }

  return { nodes, edges };
};

export function TemporalGraphTest() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [nodeCount, setNodeCount] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate test data
  const { nodes, edges } = useMemo(() => generateTestData(nodeCount), [nodeCount]);

  // Time simulation for testing temporal effects
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => new Date(prev.getTime() + 60 * 60 * 1000)); // Advance by 1 hour
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleNodeClick = (node: TemporalNode) => {
    setSelectedNodeId(node.id);
    console.log('Node clicked:', node);
  };

  const handleNodeRightClick = (node: TemporalNode, event: MouseEvent) => {
    event.preventDefault();
    console.log('Node right-clicked:', node);
  };

  const resetTime = () => {
    setCurrentTime(new Date());
    setIsPlaying(false);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Test Controls */}
      <div className="flex-none p-4 border-b bg-background">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Nodes:</label>
            <select 
              value={nodeCount} 
              onChange={(e) => setNodeCount(Number(e.target.value))}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value={10}>10 nodes</option>
              <option value={20}>20 nodes</option>
              <option value={50}>50 nodes</option>
              <option value={100}>100 nodes</option>
              <option value={200}>200 nodes</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
            >
              {isPlaying ? 'Pause Time' : 'Play Time'}
            </Button>
            <Button onClick={resetTime} variant="outline" size="sm">
              Reset Time
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Current Time: {currentTime.toLocaleTimeString()}
          </div>

          {selectedNodeId && (
            <div className="text-sm text-blue-600">
              Selected: {selectedNodeId}
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Test Features: Floating animation, temporal effects, performance scaling, hover feedback
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <TemporalGraphCanvas
          nodes={nodes}
          edges={edges}
          currentTime={currentTime}
          selectedNodeId={selectedNodeId}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
        />
      </div>

      {/* Performance Info */}
      <div className="flex-none p-2 border-t bg-muted/30 text-xs">
        <div className="flex justify-between items-center">
          <span>Nodes: {nodes.length} | Edges: {edges.length}</span>
          <span>
            Performance Mode: {nodeCount <= 100 ? 'High' : nodeCount <= 200 ? 'Medium' : 'Low'}
          </span>
          <span>
            Animation: {isPlaying ? 'Time Playing' : 'Static'} | 
            Floating: {nodeCount < 200 ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}