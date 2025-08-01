'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import GraphCanvasGravity from './GraphCanvasGravity';
import DraggableNodeDetails from './DraggableNodeDetails';
import GraphToolbar from './GraphToolbar';
import { cn } from '@/lib/utils';

interface GraphExplorerProps {
  userId: string;
  selectedSessionId?: string | null;
  className?: string;
}

export default function GraphExplorer({ userId, selectedSessionId, className }: GraphExplorerProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nodeTypeFilters, setNodeTypeFilters] = useState<string[]>([
    'goal', 'skill', 'emotion', 'session', 'accomplishment'
  ]);
  
  const supabase = createClient();
  const { showToast } = useToast();

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    console.log('fetchGraphData called');
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToast('Please sign in to view your graph', 'error');
        return;
      }

      // Direct database queries like the working test pages
      let nodesQuery = supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (nodeTypeFilters.length > 0) {
        nodesQuery = nodesQuery.in('node_type', nodeTypeFilters);
      }

      let { data: nodes, error: nodesError } = await nodesQuery;

      let { data: edges, error: edgesError } = await supabase
        .from('graph_edges')
        .select('*')
        .eq('user_id', user.id)
        .is('valid_to', null);
        
      // If a session is selected, filter to show only nodes and edges related to that session
      if (selectedSessionId && nodes && edges) {
        // Get all nodes connected to the session
        const sessionEdges = edges.filter(e => 
          e.source_node_id === selectedSessionId || e.target_node_id === selectedSessionId
        );
        
        const connectedNodeIds = new Set([selectedSessionId]);
        sessionEdges.forEach(e => {
          connectedNodeIds.add(e.source_node_id);
          connectedNodeIds.add(e.target_node_id);
        });
        
        // Filter nodes to only include the session and connected nodes
        nodes = nodes.filter(n => connectedNodeIds.has(n.id));
        
        // Filter edges to only include those between the filtered nodes
        edges = edges.filter(e => 
          connectedNodeIds.has(e.source_node_id) && connectedNodeIds.has(e.target_node_id)
        );
      }

      if (nodesError) throw nodesError;
      if (edgesError) throw edgesError;

      // Transform to Cytoscape format
      const cytoscapeNodes = (nodes || []).map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.node_type,
          description: node.description,
          properties: node.properties,
          status: node.status
        }
      }));

      const cytoscapeEdges = (edges || []).map(edge => ({
        data: {
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          type: edge.edge_type,
          label: edge.label,
          weight: edge.weight,
          properties: edge.properties
        }
      }));

      console.log('Graph data transformed:', { nodes: cytoscapeNodes, edges: cytoscapeEdges });
      setNodes(cytoscapeNodes);
      setEdges(cytoscapeEdges);
      
      // Auto-select first goal node if no node is selected
      if (!selectedNode && cytoscapeNodes.length > 0) {
        const firstGoal = cytoscapeNodes.find(n => n.data.type === 'goal');
        if (firstGoal) {
          setSelectedNode(firstGoal.data);
        }
      }
      
    } catch (error) {
      console.error('Error fetching graph data:', error);
      showToast('Failed to load graph data', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, nodeTypeFilters, selectedSessionId]);

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
            setNodes(prev => {
              // Check if node already exists to prevent duplicates
              const exists = prev.some(node => node.data.id === payload.new.id);
              if (exists) {
                console.log('Node already exists, skipping insert:', payload.new.id);
                return prev;
              }
              
              return [...prev, {
                data: {
                  id: payload.new.id,
                  label: payload.new.label,
                  type: payload.new.node_type,
                  description: payload.new.description,
                  properties: payload.new.properties,
                  status: payload.new.status
                }
              }];
            });
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
            setEdges(prev => {
              // Check if edge already exists to prevent duplicates
              const exists = prev.some(edge => edge.data.id === payload.new.id);
              if (exists) {
                console.log('Edge already exists, skipping insert:', payload.new.id);
                return prev;
              }
              
              return [...prev, {
                data: {
                  id: payload.new.id,
                  source: payload.new.source_node_id,
                  target: payload.new.target_node_id,
                  type: payload.new.edge_type,
                  label: payload.new.label,
                  properties: payload.new.properties
                }
              }];
            });
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
      <GraphCanvasGravity
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNode?.id}
        onNodeClick={setSelectedNode}
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
        <DraggableNodeDetails
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onCreateEdge={handleCreateEdge}
        />
      )}
    </div>
  );
}