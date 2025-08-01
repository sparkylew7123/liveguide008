'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface GraphCanvasGravityProps {
  nodes: any[];
  edges: any[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  className?: string;
}

export default function GraphCanvasGravity({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
  className
}: GraphCanvasGravityProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cyInstance, setCyInstance] = useState<any>(null);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  // Calculate node importance/size based on connections
  const calculateNodeImportance = (nodeId: string) => {
    const incomingEdges = edges.filter(e => (e.data || e).target === nodeId).length;
    const outgoingEdges = edges.filter(e => (e.data || e).source === nodeId).length;
    const totalConnections = incomingEdges + outgoingEdges;
    
    // Base size + connection bonus
    const baseSize = 40;
    const sizeBonus = totalConnections * 8;
    return Math.min(baseSize + sizeBonus, 100); // Cap at 100px
  };

  // Initialize Cytoscape with custom solar system layout
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Dynamically import cytoscape
    import('cytoscape').then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;
      
      // Group nodes by type
      const nodesByType = {
        goal: [],
        skill: [],
        session: [],
        emotion: [],
        accomplishment: []
      } as any;
      
      nodes.forEach(node => {
        const nodeData = node.data || node;
        const type = nodeData.type;
        if (nodesByType[type]) {
          nodesByType[type].push(nodeData);
        }
      });
      
      // Calculate positions for solar system layout
      const enhancedNodes = [];
      const centerX = 0;
      const centerY = 0;
      
      // Place goals at center
      nodesByType.goal.forEach((nodeData: any, index: number) => {
        const angle = (index / Math.max(nodesByType.goal.length, 1)) * 2 * Math.PI;
        const distance = nodesByType.goal.length > 1 ? 50 : 0; // If multiple goals, space them out
        enhancedNodes.push({
          group: 'nodes',
          data: {
            ...nodeData,
            importance: calculateNodeImportance(nodeData.id) || 60 // Default size if no edges
          },
          position: {
            x: centerX + distance * Math.cos(angle + Math.PI/4), // Offset angle for better spacing
            y: centerY + distance * Math.sin(angle + Math.PI/4)
          }
        });
      });
      
      // Place other node types in orbital rings
      const orbits = [
        { type: 'skill', radius: 150 },
        { type: 'session', radius: 250 },
        { type: 'emotion', radius: 350 },
        { type: 'accomplishment', radius: 450 }
      ];
      
      orbits.forEach(orbit => {
        const nodesOfType = nodesByType[orbit.type] || [];
        nodesOfType.forEach((nodeData: any, index: number) => {
          const angle = (index / nodesOfType.length) * 2 * Math.PI;
          enhancedNodes.push({
            group: 'nodes',
            data: {
              ...nodeData,
              importance: calculateNodeImportance(nodeData.id)
            },
            position: {
              x: centerX + orbit.radius * Math.cos(angle),
              y: centerY + orbit.radius * Math.sin(angle)
            }
          });
        });
      });
      
      // Create Cytoscape instance
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...enhancedNodes,
          ...edges.map(edge => ({
            group: 'edges',
            data: edge.data || edge
          }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              'width': 'data(importance)',
              'height': 'data(importance)',
              'background-color': '#3b82f6',
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': isDark ? '#ffffff' : '#111827',
              'font-size': (ele: any) => {
                const size = ele.data('importance');
                return Math.max(10, Math.min(16, size / 5)) + 'px';
              },
              'text-wrap': 'wrap',
              'text-max-width': '120px',
              'border-width': 2,
              'border-color': isDark ? '#1e293b' : '#e2e8f0',
              'transition-property': 'border-width, border-color',
              'transition-duration': '2s',
              'transition-timing-function': 'ease-in-out'
            }
          },
          {
            selector: 'node[type="goal"]',
            style: {
              'background-color': isDark ? '#fbbf24' : '#f59e0b', // Gold/yellow like sun
              'border-color': isDark ? '#d97706' : '#f97316',
              'border-width': 3,
              'z-index': 10
            }
          },
          {
            selector: 'node[type="skill"]',
            style: {
              'background-color': isDark ? '#059669' : '#10b981'
            }
          },
          {
            selector: 'node[type="emotion"]',
            style: {
              'background-color': isDark ? '#7c3aed' : '#8b5cf6'
            }
          },
          {
            selector: 'node[type="session"]',
            style: {
              'background-color': isDark ? '#ea580c' : '#f97316'
            }
          },
          {
            selector: 'node[type="accomplishment"]',
            style: {
              'background-color': isDark ? '#0891b2' : '#06b6d4'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': isDark ? '#4b5563' : '#d1d5db',
              'target-arrow-color': isDark ? '#4b5563' : '#d1d5db',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': isDark ? '#ffffff' : '#111827',
              'overlay-color': isDark ? '#ffffff' : '#111827',
              'overlay-padding': 10,
              'overlay-opacity': 0.1
            }
          },
          {
            selector: 'edge:selected',
            style: {
              'width': 4,
              'opacity': 1,
              'line-color': isDark ? '#ffffff' : '#111827',
              'target-arrow-color': isDark ? '#ffffff' : '#111827'
            }
          }
        ],
        layout: {
          name: 'preset' // Use preset layout since we're manually positioning nodes
        },
        minZoom: 0.3,
        maxZoom: 3,
        boxSelectionEnabled: false,
        autolock: false,
        autoungrabify: false,
        autounselectify: false,
        userZoomingEnabled: true,
        userPanningEnabled: true
      });

      // Event handlers
      if (onNodeClick) {
        cy.on('tap', 'node', (evt: any) => {
          const node = evt.target;
          onNodeClick(node.data());
        });
      }

      if (onEdgeClick) {
        cy.on('tap', 'edge', (evt: any) => {
          const edge = evt.target;
          onEdgeClick(edge.data());
        });
      }

      // Handle node dragging - update stored position when drag ends
      cy.on('dragfree', 'node', (evt: any) => {
        const node = evt.target;
        const newPos = node.position();
        if (nodeData.has(node.id())) {
          const data = nodeData.get(node.id());
          // Update the base position to the new dragged position
          data.x = newPos.x;
          data.y = newPos.y;
          console.log(`Node ${node.id()} dragged to new position:`, newPos);
        }
      });

      // Center and fit the graph
      cy.fit(50);
      cy.center();
      
      // Debug: Log what we have
      console.log('Graph initialized with', cy.nodes().length, 'nodes and', cy.edges().length, 'edges');

      // Add subtle floating animation
      let animationFrame: number;
      const nodeData = new Map();
      
      // Store initial data for each node
      cy.nodes().forEach((node: any) => {
        const pos = node.position();
        nodeData.set(node.id(), { 
          x: pos.x, 
          y: pos.y,
          floatSpeed: 0.5 + Math.random() * 0.5, // Variable speed per node
          floatPhase: Math.random() * Math.PI * 2,
          floatAmount: 10 + (node.data('importance') / 10) // Even more visible movement (10-20 pixels)
        });
      });
      
      // Wait a moment for the graph to stabilize
      setTimeout(() => {
        // Floating animation
        const animateFloat = () => {
          const time = Date.now() * 0.0002; // Faster animation
          
          cy.nodes().forEach((node: any) => {
            if (!node.grabbed() && nodeData.has(node.id())) {
              const data = nodeData.get(node.id());
              
              // Update position
              node.position({
                x: data.x + Math.sin(time * data.floatSpeed + data.floatPhase) * data.floatAmount,
                y: data.y + Math.cos(time * data.floatSpeed * 0.7 + data.floatPhase) * data.floatAmount
              });
              
              // Pulse effect on border
              const pulse = Math.sin(time * 0.5) * 0.5 + 0.5; // 0 to 1
              node.style('border-width', 2 + pulse * 2); // 2 to 4 pixels
            }
          });
          
          animationFrame = requestAnimationFrame(animateFloat);
        };
        
        // Start animation
        animateFloat();
        console.log('Floating animation started for', cy.nodes().length, 'nodes with positions:', 
          Array.from(nodeData.values()).map(d => ({ x: d.x, y: d.y })));
      }, 500); // Wait 500ms for layout to settle

      setCyInstance(cy);

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        cy.destroy();
      };
    }).catch(err => {
      console.error('Error loading cytoscape:', err);
    });
  }, [nodes, edges, isDark, onNodeClick, onEdgeClick]);
  
  // Update selected node styling when selectedNodeId changes
  useEffect(() => {
    if (cyInstance && selectedNodeId) {
      // Remove previous selection
      cyInstance.nodes().removeClass('selected');
      
      // Add selection to the current node
      const selectedNode = cyInstance.getElementById(selectedNodeId);
      if (selectedNode) {
        selectedNode.addClass('selected');
        
        // Update the container background with a lighter shade of the node color
        const nodeType = selectedNode.data('type');
        const bgColors = {
          goal: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          skill: isDark ? 'rgba(5, 150, 105, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          emotion: isDark ? 'rgba(124, 58, 237, 0.1)' : 'rgba(139, 92, 246, 0.1)',
          session: isDark ? 'rgba(234, 88, 12, 0.1)' : 'rgba(249, 115, 22, 0.1)',
          accomplishment: isDark ? 'rgba(8, 145, 178, 0.1)' : 'rgba(6, 182, 212, 0.1)'
        };
        
        if (containerRef.current) {
          const baseGradient = isDark 
            ? 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0a1f 100%)' 
            : 'radial-gradient(ellipse at center, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)';
          
          containerRef.current.style.background = nodeType && bgColors[nodeType as keyof typeof bgColors]
            ? `${baseGradient}, ${bgColors[nodeType as keyof typeof bgColors]}`
            : baseGradient;
        }
      }
    } else if (cyInstance) {
      // Clear selection if no node is selected
      cyInstance.nodes().removeClass('selected');
      
      // Reset background
      if (containerRef.current) {
        containerRef.current.style.background = isDark 
          ? 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0a1f 100%)' 
          : 'radial-gradient(ellipse at center, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)';
      }
    }
  }, [cyInstance, selectedNodeId, isDark]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "w-full h-full",
        "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        "dark:from-gray-950 dark:via-purple-950 dark:to-gray-950",
        "transition-colors duration-200",
        className
      )}
      style={{
        background: isDark 
          ? 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0a1f 100%)' 
          : 'radial-gradient(ellipse at center, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)'
      }}
    />
  );
}