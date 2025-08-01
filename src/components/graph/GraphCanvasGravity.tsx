'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface GraphCanvasGravityProps {
  nodes: any[];
  edges: any[];
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  className?: string;
}

export default function GraphCanvasGravity({
  nodes,
  edges,
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

  // Get orbital distance based on node type (goals at center, others radiate out)
  const getOrbitalDistance = (nodeType: string) => {
    const distances = {
      'goal': 0,           // Center (sun)
      'skill': 150,        // First orbit
      'session': 250,      // Second orbit
      'emotion': 300,      // Third orbit
      'accomplishment': 350 // Outer orbit
    };
    return distances[nodeType as keyof typeof distances] || 400;
  };

  // Initialize Cytoscape with gravity simulation
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Dynamically import cytoscape and extensions
    Promise.all([
      import('cytoscape'),
      import('cytoscape-cola'),
      import('cytoscape-fcose')
    ]).then(([cytoscapeModule, colaModule, fcoseModule]) => {
      const cytoscape = cytoscapeModule.default;
      const cola = colaModule.default;
      const fcose = fcoseModule.default;
      
      // Register extensions
      cytoscape.use(cola);
      cytoscape.use(fcose);
      
      // Enhanced nodes with size and initial positions
      const enhancedNodes = nodes.map((node, index) => {
        const nodeData = node.data || node;
        const importance = calculateNodeImportance(nodeData.id);
        const orbitalDistance = getOrbitalDistance(nodeData.type);
        
        // Calculate initial position in a circular pattern
        const angle = (index / nodes.length) * 2 * Math.PI;
        const x = orbitalDistance * Math.cos(angle);
        const y = orbitalDistance * Math.sin(angle);
        
        return {
          group: 'nodes',
          data: {
            ...nodeData,
            importance,
            orbitalDistance
          },
          position: { x, y }
        };
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
              'transition-property': 'background-color, border-color',
              'transition-duration': '0.3s',
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
              'opacity': 0.6,
              'transition-property': 'opacity, width',
              'transition-duration': '0.3s'
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
          },
          {
            selector: 'node.hover',
            style: {
              'overlay-color': isDark ? '#ffffff' : '#111827',
              'overlay-padding': 15,
              'overlay-opacity': 0.15
            }
          },
          {
            selector: 'edge.hover',
            style: {
              'width': 3,
              'opacity': 0.8
            }
          }
        ],
        layout: {
          name: 'fcose',
          quality: 'proof',
          animate: true,
          animationDuration: 2000,
          animationEasing: 'ease-out',
          nodeRepulsion: (node: any) => {
            // Stronger repulsion for larger nodes
            return 4500 + (node.data('importance') * 50);
          },
          idealEdgeLength: (edge: any) => {
            // Adjust edge length based on node types
            const sourceType = cy.getElementById(edge.data('source')).data('type');
            const targetType = cy.getElementById(edge.data('target')).data('type');
            
            if (sourceType === 'goal' || targetType === 'goal') {
              return 120; // Shorter edges to/from goals
            }
            return 180; // Default edge length
          },
          edgeElasticity: (edge: any) => {
            // More elastic edges for outer nodes
            const sourceType = cy.getElementById(edge.data('source')).data('type');
            const targetType = cy.getElementById(edge.data('target')).data('type');
            
            if (sourceType === 'accomplishment' || targetType === 'accomplishment') {
              return 0.8;
            }
            return 0.45;
          },
          gravity: 0.8, // Pull towards center
          gravityRange: 1.0,
          gravityCompound: 1.0,
          gravityRangeCompound: 1.5,
          initialEnergyOnIncremental: 0.5,
          nestingFactor: 0.1,
          numIter: 5000,
          tile: false,
          randomize: false, // Use our initial positions
          nodeSeparation: 75,
          // Center goals in the viewport
          fixedNodeConstraint: nodes
            .filter(n => (n.data || n).type === 'goal')
            .map(n => ({
              nodeId: (n.data || n).id,
              position: { x: 0, y: 0 }
            }))
        },
        minZoom: 0.3,
        maxZoom: 3,
        wheelSensitivity: 0.1,
        boxSelectionEnabled: false,
        autolock: false,
        autoungrabify: false,
        autounselectify: false,
        userZoomingEnabled: true,
        userPanningEnabled: true
      });

      // Add hover effects
      cy.on('mouseover', 'node', (evt: any) => {
        evt.target.addClass('hover');
      });

      cy.on('mouseout', 'node', (evt: any) => {
        evt.target.removeClass('hover');
      });

      cy.on('mouseover', 'edge', (evt: any) => {
        evt.target.addClass('hover');
      });

      cy.on('mouseout', 'edge', (evt: any) => {
        evt.target.removeClass('hover');
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

      // Center and fit the graph
      cy.fit(50);
      cy.center();

      // Store original positions and add subtle floating animation
      let animationFrame: number;
      const nodePositions = new Map();
      
      // Wait for layout to finish, then store positions
      cy.on('layoutstop', () => {
        cy.nodes().forEach((node: any) => {
          const pos = node.position();
          nodePositions.set(node.id(), { 
            x: pos.x, 
            y: pos.y,
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatPhase: Math.random() * Math.PI * 2
          });
        });
        
        // Start floating animation
        const animateFloat = () => {
          const time = Date.now() * 0.00002; // Very slow time progression
          
          cy.nodes().forEach((node: any) => {
            if (!node.grabbed() && nodePositions.has(node.id())) {
              const basePos = nodePositions.get(node.id());
              const floatAmount = 2 + (node.data('importance') / 50); // Subtle float amount
              
              node.position({
                x: basePos.x + Math.sin(time * basePos.floatSpeed + basePos.floatPhase) * floatAmount * 0.3,
                y: basePos.y + Math.cos(time * basePos.floatSpeed * 0.8 + basePos.floatPhase) * floatAmount
              });
            }
          });
          
          animationFrame = requestAnimationFrame(animateFloat);
        };
        
        // Start animation after a delay
        setTimeout(() => {
          animateFloat();
        }, 500);
      });

      setCyInstance(cy);

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        cy.destroy();
      };
    }).catch(err => {
      console.error('Error loading cytoscape:', err);
      // Fallback to simple canvas if extensions fail
      import('cytoscape').then((cytoscapeModule) => {
        const cytoscape = cytoscapeModule.default;
        
        const cy = cytoscape({
          container: containerRef.current,
          elements: [
            ...nodes.map(node => ({
              group: 'nodes',
              data: {
                ...(node.data || node),
                importance: calculateNodeImportance((node.data || node).id)
              }
            })),
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
                'font-size': '12px',
                'text-wrap': 'wrap',
                'text-max-width': '80px'
              }
            },
            {
              selector: 'node[type="goal"]',
              style: {
                'background-color': isDark ? '#fbbf24' : '#f59e0b'
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
                'line-color': isDark ? '#6b7280' : '#9ca3af',
                'target-arrow-color': isDark ? '#6b7280' : '#9ca3af',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
              }
            }
          ],
          layout: {
            name: 'grid',
            rows: Math.ceil(Math.sqrt(nodes.length)),
            cols: Math.ceil(Math.sqrt(nodes.length))
          }
        });
        
        if (onNodeClick) {
          cy.on('tap', 'node', (evt: any) => {
            onNodeClick(evt.target.data());
          });
        }
        
        setCyInstance(cy);
      });
    });
  }, [nodes, edges, isDark, onNodeClick, onEdgeClick]);

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