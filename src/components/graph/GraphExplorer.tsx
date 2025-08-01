'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import GraphCanvas from './GraphCanvas';
import NodeDetailsPanel from './NodeDetailsPanel';
import GraphToolbar from './GraphToolbar';
import { Core } from 'cytoscape';
import { cn } from '@/lib/utils';

interface GraphExplorerProps {
  userId: string;
  className?: string;
}

export default function GraphExplorer({ userId, className }: GraphExplorerProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nodeTypeFilters, setNodeTypeFilters] = useState<string[]>([
    'goal', 'skill', 'emotion', 'session', 'accomplishment', 'insight'
  ]);
  
  const cyRef = useRef<Core | null>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    console.log('fetchGraphData called');
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showToast('Please sign in to view your graph', 'error');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-graph-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeTypes: nodeTypeFilters,
          includeDeleted: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }

      const result = await response.json();
      console.log('Graph data received:', result);
      console.log('Nodes:', result.data.nodes);
      console.log('Edges:', result.data.edges);
      setNodes(result.data.nodes);
      setEdges(result.data.edges);
      
    } catch (error) {
      console.error('Error fetching graph data:', error);
      showToast('Failed to load graph data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, nodeTypeFilters]);

  // Set up real-time subscriptions
  useEffect(() => {
    const nodesChannel = supabase
      .channel('graph-nodes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'graph_nodes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Node change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setNodes(prev => [...prev, {
              data: {
                id: payload.new.id,
                label: payload.new.label,
                type: payload.new.node_type,
                description: payload.new.description,
                properties: payload.new.properties,
                status: payload.new.status
              }
            }]);
            showToast('New node added to your graph', 'info');
          } else if (payload.eventType === 'UPDATE') {
            setNodes(prev => prev.map(node => 
              node.data.id === payload.new.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      label: payload.new.label,
                      description: payload.new.description,
                      properties: payload.new.properties,
                      status: payload.new.status
                    }
                  }
                : node
            ));
            
            if (selectedNode?.id === payload.new.id) {
              setSelectedNode({
                ...selectedNode,
                label: payload.new.label,
                description: payload.new.description,
                properties: payload.new.properties,
                status: payload.new.status
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setNodes(prev => prev.filter(node => node.data.id !== payload.old.id));
            if (selectedNode?.id === payload.old.id) {
              setSelectedNode(null);
            }
          }
        }
      )
      .subscribe();

    const edgesChannel = supabase
      .channel('graph-edges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'graph_edges',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Edge change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setEdges(prev => [...prev, {
              data: {
                id: payload.new.id,
                source: payload.new.source_node_id,
                target: payload.new.target_node_id,
                type: payload.new.edge_type,
                label: payload.new.label,
                properties: payload.new.properties
              }
            }]);
          } else if (payload.eventType === 'UPDATE') {
            setEdges(prev => prev.map(edge => 
              edge.data.id === payload.new.id
                ? {
                    ...edge,
                    data: {
                      ...edge.data,
                      label: payload.new.label,
                      properties: payload.new.properties
                    }
                  }
                : edge
            ));
          } else if (payload.eventType === 'DELETE') {
            setEdges(prev => prev.filter(edge => edge.data.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nodesChannel);
      supabase.removeChannel(edgesChannel);
    };
  }, [userId, supabase, showToast, selectedNode]);

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Graph operations
  const handleNodeUpdate = async (nodeId: string, updates: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/graph-operations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_node',
          data: { nodeId, updates }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update node');
      }

      showToast('Node updated successfully', 'success');
    } catch (error) {
      console.error('Error updating node:', error);
      showToast('Failed to update node', 'error');
    }
  };

  const handleNodeDelete = async (nodeId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/graph-operations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'delete_node',
          data: { nodeId }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete node');
      }

      showToast('Node deleted successfully', 'success');
      setSelectedNode(null);
    } catch (error) {
      console.error('Error deleting node:', error);
      showToast('Failed to delete node', 'error');
    }
  };

  const handleAddNode = () => {
    // TODO: Implement node creation modal
    showToast('Node creation coming soon!', 'info');
  };

  const handleCreateEdge = (sourceNodeId: string) => {
    // TODO: Implement edge creation flow
    showToast('Edge creation coming soon!', 'info');
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    showToast(`Searching for: ${query}`, 'info');
  };

  const handleLayoutChange = (layout: string) => {
    // TODO: Apply new layout to cytoscape instance
    showToast(`Switching to ${layout} layout`, 'info');
  };

  const handleExport = () => {
    // TODO: Implement graph export
    showToast('Export feature coming soon!', 'info');
  };

  // Zoom controls
  const handleZoomIn = () => {
    // TODO: Implement zoom in
    showToast('Zoom in', 'info');
  };

  const handleZoomOut = () => {
    // TODO: Implement zoom out
    showToast('Zoom out', 'info');
  };

  const handleResetView = () => {
    // TODO: Implement reset view
    showToast('View reset', 'info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        onNodeClick={setSelectedNode}
        onNodeDoubleClick={handleAddNode}
        className="absolute inset-0"
      />
      
      <GraphToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onAddNode={handleAddNode}
        onSearch={handleSearch}
        onLayoutChange={handleLayoutChange}
        onExport={handleExport}
        nodeTypeFilters={nodeTypeFilters}
        onNodeTypeFilterChange={setNodeTypeFilters}
      />
      
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-96 shadow-lg">
          <NodeDetailsPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
            onCreateEdge={handleCreateEdge}
          />
        </div>
      )}
    </div>
  );
}