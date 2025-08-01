'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface GraphCanvasSimpleProps {
  nodes: any[];
  edges: any[];
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  className?: string;
}

export default function GraphCanvasSimple({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  className
}: GraphCanvasSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cyInstance, setCyInstance] = useState<any>(null);
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Dynamically import cytoscape
    import('cytoscape').then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;
      
      // Create Cytoscape instance
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map(node => ({
            group: 'nodes',
            data: node.data || node,
            position: node.position
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
              'background-color': '#3b82f6',
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': isDark ? '#ffffff' : '#111827',
              'font-size': '12px',
              'width': 40,
              'height': 40,
              'text-wrap': 'wrap',
              'text-max-width': '80px'
            }
          },
          {
            selector: 'node[type="goal"]',
            style: {
              'background-color': isDark ? '#2563eb' : '#3b82f6'
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
              'background-color': isDark ? '#d97706' : '#f59e0b'
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
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': isDark ? '#ffffff' : '#111827'
            }
          }
        ],
        layout: {
          name: 'grid',
          rows: Math.ceil(Math.sqrt(nodes.length)),
          cols: Math.ceil(Math.sqrt(nodes.length))
        },
        minZoom: 0.3,
        maxZoom: 3,
        boxSelectionEnabled: false,
        autolock: false,
        autoungrabify: false,
        autounselectify: false
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

      setCyInstance(cy);

      // Try to load layout extensions
      Promise.all([
        import('cytoscape-cola'),
        import('cytoscape-fcose')
      ]).then(([colaModule, fcoseModule]) => {
        try {
          const cola = colaModule.default;
          const fcose = fcoseModule.default;
          
          // Register extensions if not already registered
          if (!cy.prototype.fcose) {
            cytoscape.use(fcose);
          }
          if (!cy.prototype.cola) {
            cytoscape.use(cola);
          }
          
          // Re-run layout with better algorithm
          cy.layout({
            name: 'fcose',
            animate: true,
            animationDuration: 500,
            nodeRepulsion: 4500,
            idealEdgeLength: 80,
            edgeElasticity: 0.45,
            nestingFactor: 0.1,
            gravity: 0.25,
            numIter: 2500,
            tile: true,
            randomize: true
          }).run();
        } catch (err) {
          console.warn('Could not load layout extensions, using grid layout', err);
        }
      }).catch(err => {
        console.warn('Could not load layout extensions, using grid layout', err);
      });
    }).catch(err => {
      console.error('Error loading cytoscape:', err);
    });

    return () => {
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [nodes, edges, isDark, onNodeClick, onEdgeClick]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "w-full h-full",
        "bg-white dark:bg-gray-900",
        "transition-colors duration-200",
        className
      )}
    />
  );
}