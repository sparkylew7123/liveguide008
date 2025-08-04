'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface GraphCanvasGravityProps {
  nodes: any[];
  edges: any[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  onNodeHover?: (node: any) => void;
  onNodeRightClick?: (node: any) => void;
  className?: string;
}

export interface GraphCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  changeLayout: (layout: string) => void;
  searchNodes: (query: string) => void;
  exportGraph: () => string;
}

const GraphCanvasGravity = forwardRef<GraphCanvasRef, GraphCanvasGravityProps>(({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onNodeRightClick,
  className
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cyInstance, setCyInstance] = useState<any>(null);
  const [currentLayout, setCurrentLayout] = useState<string>('gravity');
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (cyInstance) {
        const zoom = cyInstance.zoom();
        cyInstance.zoom(Math.min(zoom * 1.2, 3));
      }
    },
    zoomOut: () => {
      if (cyInstance) {
        const zoom = cyInstance.zoom();
        cyInstance.zoom(Math.max(zoom / 1.2, 0.1));
      }
    },
    resetView: () => {
      if (cyInstance) {
        cyInstance.fit(50);
        cyInstance.center();
      }
    },
    changeLayout: (layout: string) => {
      if (cyInstance) {
        setCurrentLayout(layout);
        applyLayout(cyInstance, layout);
      }
    },
    searchNodes: (query: string) => {
      if (cyInstance && query.trim()) {
        const matchingNodes = cyInstance.nodes().filter((node: any) => {
          const data = node.data();
          return data.label?.toLowerCase().includes(query.toLowerCase()) ||
                 data.description?.toLowerCase().includes(query.toLowerCase());
        });
        
        if (matchingNodes.length > 0) {
          cyInstance.fit(matchingNodes, 50);
          // Highlight matching nodes temporarily
          matchingNodes.addClass('highlighted');
          setTimeout(() => {
            matchingNodes.removeClass('highlighted');
          }, 3000);
        }
      }
    },
    exportGraph: () => {
      if (cyInstance) {
        return cyInstance.png({ output: 'base64uri', bg: isDark ? '#1e293b' : '#f8fafc' });
      }
      return '';
    }
  }), [cyInstance, isDark]);

  // Apply different layout algorithms
  const applyLayout = (cy: any, layoutName: string) => {
    let layoutOptions;
    
    switch (layoutName) {
      case 'fcose':
        layoutOptions = {
          name: 'fcose',
          quality: 'default',
          randomize: false,
          animate: true,
          animationDuration: 1000,
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          packComponents: true,
          nodeRepulsion: (node: any) => 4500,
          idealEdgeLength: (edge: any) => 50,
          edgeElasticity: (edge: any) => 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500
        };
        break;
      case 'cola':
        layoutOptions = {
          name: 'cola',
          animate: true,
          animationDuration: 1000,
          refresh: 1,
          maxSimulationTime: 4000,
          ungrabifyWhileSimulating: false,
          fit: true,
          padding: 30,
          nodeDimensionsIncludeLabels: false,
          randomize: false,
          avoidOverlap: true,
          handleDisconnected: true,
          convergenceThreshold: 0.01,
          nodeSpacing: (node: any) => 10,
          edgeLength: 200,
          edgeSymDiffLength: undefined,
          edgeJaccardLength: undefined,
          unconstrIter: 30,
          userConstIter: 0,
          allConstIter: 30
        };
        break;
      case 'circle':
        layoutOptions = {
          name: 'circle',
          fit: true,
          padding: 30,
          boundingBox: undefined,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          spacingFactor: undefined,
          radius: undefined,
          startAngle: 3 / 2 * Math.PI,
          sweep: undefined,
          clockwise: true,
          sort: undefined,
          animate: true,
          animationDuration: 1000
        };
        break;
      case 'grid':
        layoutOptions = {
          name: 'grid',
          fit: true,
          padding: 30,
          boundingBox: undefined,
          avoidOverlap: true,
          avoidOverlapPadding: 10,
          nodeDimensionsIncludeLabels: false,
          spacingFactor: undefined,
          condense: false,
          rows: undefined,
          cols: undefined,
          position: (node: any) => ({ row: undefined, col: undefined }),
          sort: undefined,
          animate: true,
          animationDuration: 1000
        };
        break;
      case 'concentric':
        layoutOptions = {
          name: 'concentric',
          fit: true,
          padding: 30,
          startAngle: 3 / 2 * Math.PI,
          sweep: undefined,
          clockwise: true,
          equidistant: false,
          minNodeSpacing: 10,
          boundingBox: undefined,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          height: undefined,
          width: undefined,
          spacingFactor: undefined,
          concentric: (node: any) => {
            // Goals in center, then skills, emotions, sessions, accomplishments
            const typeRanking = {
              goal: 5,
              skill: 4,
              emotion: 3,
              session: 2,
              accomplishment: 1
            };
            return typeRanking[node.data('type') as keyof typeof typeRanking] || 1;
          },
          levelWidth: (nodes: any) => nodes.maxDegree() / 4,
          animate: true,
          animationDuration: 1000
        };
        break;
      default: // gravity (custom solar system layout)
        // Use the existing custom positioning logic
        return;
    }

    const layout = cy.layout(layoutOptions);
    layout.run();
  };

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

    // Dynamically import cytoscape and extensions
    Promise.all([
      import('cytoscape'),
      import('cytoscape-fcose'),
      import('cytoscape-cola')
    ]).then(([cytoscapeModule, fcoseModule, colaModule]) => {
      const cytoscape = cytoscapeModule.default;
      
      // Register layout extensions
      if (fcoseModule.default) {
        cytoscape.use(fcoseModule.default);
      }
      if (colaModule.default) {
        cytoscape.use(colaModule.default);
      }
      
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
              'font-weight': (ele: any) => {
                const status = ele.data('status');
                return status === 'curated' ? 'bold' : 'normal';
              },
              'text-wrap': 'wrap',
              'text-max-width': '120px',
              'border-width': (ele: any) => {
                const status = ele.data('status');
                return status === 'draft_verbal' ? 3 : 2;
              },
              'border-style': (ele: any) => {
                const status = ele.data('status');
                return status === 'draft_verbal' ? 'dashed' : 'solid';
              },
              'border-color': isDark ? '#1e293b' : '#e2e8f0',
              'transition-property': 'border-width, border-color, background-color',
              'transition-duration': '300ms',
              'transition-timing-function': 'ease-in-out',
              'cursor': 'pointer'
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
          },
          {
            selector: 'node.hovered',
            style: {
              'border-width': 4,
              'border-color': isDark ? '#60a5fa' : '#3b82f6',
              'z-index': 999
            }
          },
          {
            selector: 'edge.hovered',
            style: {
              'width': 3,
              'opacity': 0.8,
              'line-color': isDark ? '#60a5fa' : '#3b82f6',
              'target-arrow-color': isDark ? '#60a5fa' : '#3b82f6',
              'z-index': 999
            }
          },
          {
            selector: 'node.highlighted',
            style: {
              'border-width': 5,
              'border-color': isDark ? '#fbbf24' : '#f59e0b',
              'background-color': isDark ? '#fef3c7' : '#fef3c7',
              'z-index': 1000
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

      // Hover effects
      if (onNodeHover) {
        cy.on('mouseover', 'node', (evt: any) => {
          const node = evt.target;
          node.addClass('hovered');
          onNodeHover(node.data());
        });

        cy.on('mouseout', 'node', (evt: any) => {
          const node = evt.target;
          node.removeClass('hovered');
        });
      }

      // Right-click context menu
      if (onNodeRightClick) {
        cy.on('cxttap', 'node', (evt: any) => {
          evt.preventDefault();
          const node = evt.target;
          onNodeRightClick(node.data());
        });
      }

      // Edge hover effects
      cy.on('mouseover', 'edge', (evt: any) => {
        const edge = evt.target;
        edge.addClass('hovered');
      });

      cy.on('mouseout', 'edge', (evt: any) => {
        const edge = evt.target;
        edge.removeClass('hovered');
      });

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

      // Performance optimization: only animate if we have less than 50 nodes
      let animationFrame: number;
      const nodeData = new Map();
      const shouldAnimate = cy.nodes().length < 50;
      
      if (shouldAnimate) {
        // Store initial data for each node
        cy.nodes().forEach((node: any) => {
          const pos = node.position();
          nodeData.set(node.id(), { 
            x: pos.x, 
            y: pos.y,
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatPhase: Math.random() * Math.PI * 2,
            floatAmount: Math.min(10 + (node.data('importance') / 10), 15) // Cap movement
          });
        });
        
        // Wait a moment for the graph to stabilize
        setTimeout(() => {
          // Floating animation with performance throttling
          let lastFrame = 0;
          const animateFloat = (currentTime: number) => {
            // Throttle to 30fps instead of 60fps for better performance
            if (currentTime - lastFrame >= 33) {
              const time = currentTime * 0.0001; // Slower animation
              
              cy.nodes().forEach((node: any) => {
                if (!node.grabbed() && nodeData.has(node.id())) {
                  const data = nodeData.get(node.id());
                  
                  // Update position
                  node.position({
                    x: data.x + Math.sin(time * data.floatSpeed + data.floatPhase) * data.floatAmount,
                    y: data.y + Math.cos(time * data.floatSpeed * 0.7 + data.floatPhase) * data.floatAmount
                  });
                }
              });
              
              lastFrame = currentTime;
            }
            
            animationFrame = requestAnimationFrame(animateFloat);
          };
          
          // Start animation
          animationFrame = requestAnimationFrame(animateFloat);
          console.log('Floating animation started for', cy.nodes().length, 'nodes');
        }, 500);
      } else {
        console.log('Animation disabled for performance with', cy.nodes().length, 'nodes');
      }

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
  }, [nodes, edges, isDark, onNodeClick, onEdgeClick, onNodeHover, onNodeRightClick, currentLayout]);
  
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
});

GraphCanvasGravity.displayName = 'GraphCanvasGravity';

export default GraphCanvasGravity;