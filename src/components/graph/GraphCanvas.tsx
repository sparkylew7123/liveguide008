'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular, EventObject } from 'cytoscape';
// @ts-ignore - No types available for layout extensions
import cola from 'cytoscape-cola';
// @ts-ignore - No types available for layout extensions
import fcose from 'cytoscape-fcose';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Register layout extensions
if (typeof window !== 'undefined' && typeof cytoscape !== 'undefined') {
  cytoscape.use(cola);
  cytoscape.use(fcose);
}

interface GraphCanvasProps {
  nodes: any[];
  edges: any[];
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  onNodeDoubleClick?: (node: any) => void;
  onContextMenu?: (element: any, position: { x: number; y: number }) => void;
  onGraphChange?: (elements: any[]) => void;
  className?: string;
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onNodeDoubleClick,
  onContextMenu,
  onGraphChange,
  className
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { theme, systemTheme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  // Get node color based on type and theme
  const getNodeColor = useCallback((nodeType: string) => {
    const colors = {
      goal: isDark ? '#2563eb' : '#3b82f6',
      skill: isDark ? '#059669' : '#10b981',
      emotion: isDark ? '#7c3aed' : '#8b5cf6',
      session: isDark ? '#ea580c' : '#f97316',
      accomplishment: isDark ? '#d97706' : '#f59e0b',
      insight: isDark ? '#0891b2' : '#06b6d4'
    };
    return colors[nodeType as keyof typeof colors] || (isDark ? '#6b7280' : '#9ca3af');
  }, [isDark]);

  // Get edge color based on type and theme
  const getEdgeColor = useCallback((edgeType: string) => {
    const colors = {
      works_on: isDark ? '#60a5fa' : '#2563eb',
      has_skill: isDark ? '#34d399' : '#059669',
      derived_from: isDark ? '#22d3ee' : '#0891b2',
      feels: isDark ? '#a78bfa' : '#7c3aed',
      achieves: isDark ? '#fbbf24' : '#d97706'
    };
    return colors[edgeType as keyof typeof colors] || (isDark ? '#4b5563' : '#d1d5db');
  }, [isDark]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        // Node styles
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => getNodeColor(ele.data('type')),
            'border-color': (ele: any) => getNodeColor(ele.data('type')),
            'border-width': 2,
            'border-style': (ele: any) => ele.data('status') === 'draft_verbal' ? 'dashed' : 'solid',
            'opacity': (ele: any) => ele.data('status') === 'draft_verbal' ? 0.7 : 1,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': isDark ? '#ffffff' : '#111827',
            'font-size': '12px',
            'font-weight': '600',
            'width': (ele: any) => {
              const degree = ele.degree();
              if (degree > 5) return 64;
              if (degree > 2) return 48;
              return 32;
            },
            'height': (ele: any) => {
              const degree = ele.degree();
              if (degree > 5) return 64;
              if (degree > 2) return 48;
              return 32;
            },
            'text-wrap': 'wrap',
            'text-max-width': '80px'
          }
        },
        // Edge styles
        {
          selector: 'edge',
          style: {
            'line-color': (ele: any) => getEdgeColor(ele.data('type')),
            'target-arrow-color': (ele: any) => getEdgeColor(ele.data('type')),
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'width': (ele: any) => {
              const weight = ele.data('weight') || 1;
              return 2 * weight;
            },
            'line-style': (ele: any) => {
              const type = ele.data('type');
              return type === 'derived_from' ? 'dashed' : 'solid';
            },
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-background-color': isDark ? '#111827' : '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px'
          }
        },
        // Selected state
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': isDark ? '#ffffff' : '#111827'
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': isDark ? '#ffffff' : '#111827',
            'target-arrow-color': isDark ? '#ffffff' : '#111827',
            'width': 4
          }
        },
        // Hover state
        {
          selector: 'node:hover',
          style: {
            'overlay-color': isDark ? '#ffffff' : '#111827',
            'overlay-padding': 8,
            'overlay-opacity': 0.1
          }
        }
      ],
      layout: {
        name: 'fcose',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        randomize: true,
        nodeSeparation: 75
      },
      // Interaction options
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: true,
      selectionType: 'single',
      touchTapThreshold: 8,
      desktopTapThreshold: 4,
      autolock: false,
      autoungrabify: false,
      autounselectify: false
    });

    // Event handlers
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      if (onNodeClick) {
        onNodeClick(node.data());
      }
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      if (onEdgeClick) {
        onEdgeClick(edge.data());
      }
    });

    cy.on('dblclick', 'node', (evt: EventObject) => {
      const node = evt.target;
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.data());
      }
    });

    cy.on('cxttap', (evt: EventObject) => {
      evt.preventDefault();
      if (onContextMenu && evt.target !== cy) {
        const element = evt.target;
        const position = evt.renderedPosition || evt.position;
        onContextMenu(element.data(), { x: position.x, y: position.y });
      }
    });

    // Track graph changes
    cy.on('add remove data', () => {
      if (onGraphChange) {
        const elements = cy.elements().map(ele => ({
          group: ele.group(),
          data: ele.data(),
          position: ele.position()
        }));
        onGraphChange(elements);
      }
    });

    cyRef.current = cy;
    setIsInitialized(true);

    return () => {
      cy.destroy();
    };
  }, [isDark, onNodeClick, onEdgeClick, onNodeDoubleClick, onContextMenu, onGraphChange, getNodeColor, getEdgeColor, isInitialized]);

  // Update elements when props change
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return;

    const cy = cyRef.current;
    
    // Update elements
    cy.elements().remove();
    cy.add([
      ...nodes.map(node => ({ group: 'nodes', ...node })),
      ...edges.map(edge => ({ group: 'edges', ...edge }))
    ]);

    // Re-run layout if we have elements
    if (nodes.length > 0) {
      cy.layout({
        name: 'fcose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45
      }).run();
    }
  }, [nodes, edges, isInitialized]);

  // Update styles when theme changes
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return;

    const cy = cyRef.current;
    
    // Update node colors
    cy.nodes().forEach((node: NodeSingular) => {
      node.style({
        'background-color': getNodeColor(node.data('type')),
        'border-color': getNodeColor(node.data('type')),
        'color': isDark ? '#ffffff' : '#111827'
      });
    });

    // Update edge colors
    cy.edges().forEach((edge: EdgeSingular) => {
      edge.style({
        'line-color': getEdgeColor(edge.data('type')),
        'target-arrow-color': getEdgeColor(edge.data('type')),
        'text-background-color': isDark ? '#111827' : '#ffffff'
      });
    });
  }, [isDark, getNodeColor, getEdgeColor, isInitialized]);

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