import React, { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, ElementDefinition, NodeSingular, EdgeSingular } from 'cytoscape';
import type { Stylesheet } from 'cytoscape';
import { TemporalNode, TemporalEdge, GraphEvent } from '@/types/temporal';
import { useTheme } from 'next-themes';

interface TemporalGraphCanvasProps {
  nodes: TemporalNode[];
  edges: TemporalEdge[];
  currentTime: Date;
  selectedNodeId?: string;
  onNodeClick?: (node: TemporalNode) => void;
  onNodeRightClick?: (node: TemporalNode, event: MouseEvent) => void;
}

export function TemporalGraphCanvas({
  nodes,
  edges,
  currentTime,
  selectedNodeId,
  onNodeClick,
  onNodeRightClick,
  events = []
}: TemporalGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const floatingDataRef = useRef<Map<string, { baseX: number; baseY: number; phase: number; amplitude: number; xFreq?: number; yFreq?: number }>>(new Map());
  const { theme } = useTheme();
  const isInitializedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false); // Disabled for timeline layout
  
  // Stable position cache - persists node positions across timeline changes
  const nodePositionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Activity tracking for glow effects
  const nodeActivityRef = useRef<Map<string, { lastActivity: number; intensity: number; decayTimeout?: NodeJS.Timeout }>>(new Map());
  const glowDecayDuration = 3000; // 3 seconds decay
  
  // Time range for the timeline (30 days ago to now)
  const timeRangeStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timeRangeEnd = new Date();

  // Performance throttling for animations
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    // Adjust performance based on node count
    if (nodes.length > 200) {
      setPerformanceMode('low');
    } else if (nodes.length > 100) {
      setPerformanceMode('medium');
    } else {
      setPerformanceMode('high');
    }
  }, [nodes.length]);

  // Generate temporal styles with enhanced hover and transition effects
  const getTemporalStyles = useCallback((): Stylesheet[] => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const backgroundColor = isDark ? '#020817' : '#ffffff';
    const mutedColor = isDark ? '#64748b' : '#94a3b8';
    const hoverColor = isDark ? '#60a5fa' : '#3b82f6';
    const selectedColor = '#8b5cf6';

    return [
      // Base node styles - all circles with colored borders
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': backgroundColor,
          'color': textColor,
          'font-size': '10px',
          'font-weight': '400',
          'shape': 'ellipse',  // All nodes are circles
          'width': 80, // Standard size for all regular nodes
          'height': 80,
          'opacity': 1, // Always 100% opacity
          'border-width': 4,
          'border-color': mutedColor,
          'border-style': 'solid',
          'text-opacity': 1, // Always 100% opacity
          'text-wrap': 'ellipsis',
          'text-max-width': '70px',
          'text-overflow-wrap': 'anywhere',
          'text-justification': 'center',
          'transition-property': 'opacity, border-width, border-color, background-color',
          'transition-duration': performanceMode === 'high' ? '0.3s' : '0.1s',
          'transition-timing-function': 'ease-out',
          'z-index': 'data(zIndex)',
          'overlay-opacity': 0,
          'overlay-color': 'transparent'
        }
      },

      // Hover effects for better interaction feedback
      {
        selector: 'node:active',
        style: {
          'overlay-opacity': 0.2,
          'overlay-color': hoverColor,
          'overlay-padding': '4px',
          'border-width': 3,
          'border-color': hoverColor
        }
      },
      
      // New nodes with pulsing animation
      {
        selector: 'node[?isNew]',
        style: {
          'border-width': 4,
          'border-color': '#f59e0b',
          'z-index': 100
        }
      },

      // Recent nodes with subtle glow
      {
        selector: 'node[?isRecent]',
        style: {
          'border-width': 3,
          'border-color': '#3b82f6',
          'z-index': 75
        }
      },

      // Activity glow effect - Visible but controlled
      {
        selector: 'node[glowIntensity > 0]',
        style: {
          // Moderate glow effect
          'overlay-opacity': 'mapData(glowIntensity, 0, 1, 0.3, 0.8)', // Semi-transparent
          'overlay-color': '#60a5fa', // Bright blue
          'overlay-padding': 'mapData(glowIntensity, 0, 1, 10, 30)', // Moderate glow radius
          'overlay-shape': 'ellipse',
          // Enhanced border
          'border-width': 'mapData(glowIntensity, 0, 1, 4, 8)', // Visible but not huge
          'border-color': '#3b82f6', // Bright blue border
          'border-opacity': 1,
          // Slight size increase
          'width': 'mapData(glowIntensity, 0, 1, 80, 100)', // 25% larger
          'height': 'mapData(glowIntensity, 0, 1, 80, 100)',
          'z-index': 'mapData(glowIntensity, 0, 1, 100, 1000)',
          // Brightened background
          'background-blacken': 'mapData(glowIntensity, 0, 1, 0, -0.4)', // Brighter
          // Subtle shadow
          'shadow-blur': 'mapData(glowIntensity, 0, 1, 0, 15)',
          'shadow-color': '#3b82f6',
          'shadow-opacity': 'mapData(glowIntensity, 0, 1, 0, 0.6)',
          'shadow-offset-x': 0,
          'shadow-offset-y': 0,
          // Enhanced text
          'font-weight': 'bold',
          'text-outline-color': '#3b82f6',
          'text-outline-width': 'mapData(glowIntensity, 0, 1, 0, 1.5)'
        }
      },

      // Selected node with enhanced visual feedback
      {
        selector: 'node:selected',
        style: {
          'border-width': 5,
          'border-color': selectedColor,
          'z-index': 200,
          'overlay-opacity': 0.1,
          'overlay-color': selectedColor
        }
      },

      // Session nodes - blue border
      {
        selector: 'node[node_type = "session"]',
        style: {
          'border-color': '#3b82f6',
          'border-width': 4,
          'font-weight': '500'
        }
      },

      // Goal nodes - purple border, much larger with double line
      {
        selector: 'node[node_type = "goal"]',
        style: {
          'width': 140,
          'height': 140,
          'border-color': '#8b5cf6',
          'border-width': 6,
          'border-style': 'double',
          'font-size': '12px',
          'font-weight': '600',
          'text-max-width': '120px'
        }
      },

      // Emotion nodes - pink/red border with pie chart
      {
        selector: 'node[node_type = "emotion"]',
        style: {
          'border-color': '#ec4899',
          'border-width': 3,
          'width': 70,
          'height': 70,
          'font-size': '9px',
          'text-wrap': 'wrap',
          'text-max-width': '60px',
          'line-height': 1.2,
          // Pie chart settings
          'pie-size': '90%', // Pie chart takes up 90% of node
          'pie-1-background-color': '#fce7f3', // Light pink (lighter version of #ec4899)
          'pie-1-background-size': 'data(emotionPercentage)', // Use data attribute for percentage
          'pie-2-background-color': backgroundColor, // Rest of the pie
          'pie-2-background-size': (ele: any) => {
            const percentage = ele.data('emotionPercentage') || 0;
            return 100 - percentage;
          }
        }
      },

      // Skill nodes - green border with dashed style
      {
        selector: 'node[node_type = "skill"]',
        style: {
          'border-color': '#10b981',
          'border-width': 4,
          'border-style': 'dashed'
        }
      },

      // Strength nodes - orange border
      {
        selector: 'node[node_type = "strength"]',
        style: {
          'border-color': '#f97316',
          'border-width': 4
        }
      },

      // Value nodes - yellow/amber border with dotted style
      {
        selector: 'node[node_type = "value"]',
        style: {
          'border-color': '#f59e0b',
          'border-width': 4,
          'border-style': 'dotted'
        }
      },

      // Accomplishment nodes - teal border
      {
        selector: 'node[node_type = "accomplishment"]',
        style: {
          'border-color': '#14b8a6',
          'border-width': 5,
          'font-weight': '500'
        }
      },

      // Enhanced edge styles with smooth transitions
      {
        selector: 'edge',
        style: {
          'width': 'mapData(currentStrength, 0, 1, 1.5, 5)',
          'line-color': 'data(edgeColor)',
          'target-arrow-color': 'data(edgeColor)',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.5,
          'curve-style': 'bezier',
          'control-point-step-size': 80,
          'opacity': 1, // Always 100% opacity
          'label': 'data(label)',
          'font-size': '8px',
          'font-weight': '400',
          'text-rotation': 'autorotate',
          'text-margin-y': -10,
          'text-background-color': backgroundColor,
          'text-background-opacity': 0.9,
          'text-background-padding': '2px',
          'text-background-shape': 'roundrectangle',
          'color': textColor,
          'transition-property': 'opacity, width, line-color, target-arrow-color',
          'transition-duration': performanceMode === 'high' ? '0.2s' : '0.1s',
          'z-index': 10
        }
      },

      // Edge hover effects
      {
        selector: 'edge:active',
        style: {
          'line-color': hoverColor,
          'target-arrow-color': hoverColor,
          'width': 'mapData(currentStrength, 0, 1, 3, 7)',
          'z-index': 50
        }
      },

      // Pop-in animation for newly appearing nodes
      {
        selector: 'node[isPoppingIn]',
        style: {
          'width': 120,
          'height': 120,
          'border-width': 8,
          'opacity': 1,
          'z-index': 300,
          'transition-property': 'width, height, border-width',
          'transition-duration': '0.3s',
          'transition-timing-function': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // Elastic easing
        }
      },

      // Enhanced pop effect for goal nodes
      {
        selector: 'node[node_type = "goal"][isPoppingIn]',
        style: {
          'width': 180,
          'height': 180,
          'border-width': 10,
          'z-index': 400
        }
      },

      // New edges with animated dashing
      {
        selector: 'edge[?isNew]',
        style: {
          'line-color': '#f59e0b',
          'target-arrow-color': '#f59e0b',
          'width': 'mapData(currentStrength, 0, 1, 3, 6)',
          'opacity': 1,
          'line-style': 'dashed',
          'line-dash-pattern': [10, 5],
          'z-index': 90
        }
      },
      
      // Selected edges with enhanced visibility
      {
        selector: 'edge:selected',
        style: {
          'line-color': selectedColor,
          'target-arrow-color': selectedColor,
          'width': 'mapData(currentStrength, 0, 1, 4, 8)',
          'z-index': 150,
          'opacity': 1
        }
      }
    ];
  }, [theme, performanceMode]);

  // Enhanced color system with better contrast and accessibility
  const getNodeColor = useCallback((node: TemporalNode): string => {
    const isDark = theme === 'dark';
    const typeColors: Record<string, { light: string; dark: string }> = {
      goal: { light: '#10b981', dark: '#34d399' },
      emotion: { light: '#f59e0b', dark: '#fbbf24' },
      skill: { light: '#3b82f6', dark: '#60a5fa' },
      strength: { light: '#8b5cf6', dark: '#a78bfa' },
      value: { light: '#ec4899', dark: '#f472b6' },
      session: { light: '#8b5cf6', dark: '#a78bfa' },
      default: { light: '#6b7280', dark: '#9ca3af' }
    };

    const colorSet = typeColors[node.node_type] || typeColors.default;
    return isDark ? colorSet.dark : colorSet.light;
  }, [theme]);

  // Get enhanced border color for nodes
  const getBorderColor = useCallback((node: TemporalNode): string => {
    const isDark = theme === 'dark';
    const baseColor = getNodeColor(node);
    
    if (node.status === 'draft_verbal') {
      return isDark ? '#64748b' : '#94a3b8';
    }
    
    return baseColor;
  }, [theme, getNodeColor]);

  // Enhanced edge color system
  const getEdgeColor = useCallback((edge: TemporalEdge): string => {
    const isDark = theme === 'dark';
    const age = edge.age || 0;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const ageRatio = Math.min(age / maxAge, 1);
    
    // Color fades from vibrant to muted as edge ages
    if (isDark) {
      const r = Math.floor(100 + (156 - 100) * (1 - ageRatio));
      const g = Math.floor(116 + (163 - 116) * (1 - ageRatio));
      const b = Math.floor(139 + (177 - 139) * (1 - ageRatio));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const r = Math.floor(75 + (148 - 75) * (1 - ageRatio));
      const g = Math.floor(85 + (163 - 85) * (1 - ageRatio));
      const b = Math.floor(99 + (184 - 99) * (1 - ageRatio));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }, [theme]);

  // Memoize the conversion to prevent unnecessary recalculations
  const getCytoscapeElements = useCallback((): ElementDefinition[] => {
    const nodeElements: ElementDefinition[] = nodes.map((node, index) => {
      const visibility = node.visibility || 1;
      const zIndex = node.isNew ? 100 : node.isRecent ? 75 : Math.floor(visibility * 50);
      const scale = (node.visibility || 1) < 0.3 ? 0.6 : 1; // Default scale based on visibility
      
      // Generate emotion percentage for emotion nodes
      let emotionPercentage = 0;
      let displayLabel = node.label;
      if (node.node_type === 'emotion') {
        // Demo: Assign specific percentages to test emotion nodes
        const emotionPercentages: Record<string, number> = {
          'Excited': 85,
          'Focused': 70,
          'Anxious': 45,
          'Determined': 90,
          'Triumphant': 95
        };
        emotionPercentage = emotionPercentages[node.label] || 
                           node.properties?.percentage || 
                           node.properties?.intensity || 
                           Math.floor(Math.random() * 40 + 60); // Demo: 60-100%
        // Add percentage to label
        displayLabel = `${node.label}\n${emotionPercentage}%`;
      }
      
      return {
        group: 'nodes',
        data: {
          ...node,
          id: node.id,
          label: displayLabel,
          color: getNodeColor(node),
          borderColor: getBorderColor(node),
          visibility,
          scale,
          zIndex,
          isNew: node.isNew,
          isRecent: node.isRecent,
          node_type: node.node_type,
          status: node.status,
          degree: 0, // Will be calculated after edges are added
          isPoppingIn: false, // Will be set for newly appearing nodes
          emotionPercentage, // Percentage value for pie chart
          glowIntensity: 0, // Initial glow intensity
          glowColor: '#60a5fa' // Bright blue glow
        },
        position: (() => {
          // Calculate timeline-based X position
          const nodeTime = new Date(node.created_at).getTime();
          const timeRange = timeRangeEnd.getTime() - timeRangeStart.getTime();
          
          // Map time to X position (left = past, right = current)
          // Position nodes based on their creation time
          const timeProgress = (nodeTime - timeRangeStart.getTime()) / timeRange;
          
          // Calculate viewport offset based on current time
          // As time progresses, shift all nodes to the left
          const currentProgress = (currentTime.getTime() - timeRangeStart.getTime()) / timeRange;
          const viewportShift = currentProgress * 1200; // Shift left as time advances
          
          // Base X position: spread nodes across 1200px, then shift based on current time
          const baseX = (timeProgress * 1200) - viewportShift;
          
          // Check if we have a cached Y position
          let yPosition: number;
          const cachedPos = nodePositionCacheRef.current.get(node.id);
          
          if (cachedPos) {
            yPosition = cachedPos.y;
          } else {
            // Generate Y position based on node type for vertical separation
            const typeOffsets: Record<string, number> = {
              'session': -150,
              'goal': -75,
              'emotion': 0,
              'skill': 75,
              'accomplishment': 150
            };
            
            const baseY = typeOffsets[node.node_type] || 0;
            // Add some random variation to prevent perfect alignment
            yPosition = baseY + (Math.random() * 60 - 30);
          }
          
          const position = { x: baseX, y: yPosition };
          
          // Only cache Y position, X is dynamic based on timeline
          nodePositionCacheRef.current.set(node.id, { x: baseX, y: yPosition });
          
          return position;
        })()
      };
    });

    // Create a set of node IDs for quick lookup and degree calculation
    const nodeIds = new Set(nodes.map(n => n.id));
    const nodeDegrees = new Map<string, number>();

    // Initialize degree counts
    nodeIds.forEach(id => nodeDegrees.set(id, 0));

    // Only include edges where both source and target nodes exist
    const validEdges = edges.filter(edge => {
      const hasSource = nodeIds.has(edge.source_id);
      const hasTarget = nodeIds.has(edge.target_id);
      
      if (!hasSource || !hasTarget) {
        return false;
      }
      
      // Check if edge should be visible based on timeline
      const edgeTime = new Date(edge.created_at || edge.discovered_at).getTime();
      const isVisible = edgeTime <= currentTime.getTime();
      
      if (!isVisible) {
        return false; // Don't render future edges
      }
      
      // Count degrees
      nodeDegrees.set(edge.source_id, (nodeDegrees.get(edge.source_id) || 0) + 1);
      nodeDegrees.set(edge.target_id, (nodeDegrees.get(edge.target_id) || 0) + 1);
      
      return true;
    });

    // Update node elements with degree information
    nodeElements.forEach(nodeElement => {
      nodeElement.data.degree = nodeDegrees.get(nodeElement.data.id as string) || 0;
    });

    const edgeElements: ElementDefinition[] = validEdges.map(edge => ({
      group: 'edges',
      data: {
        ...edge,
        id: edge.id,
        source: edge.source_id,
        target: edge.target_id,
        label: edge.label || '',
        edgeColor: getEdgeColor(edge),
        currentStrength: edge.currentStrength || edge.weight || 1,
        age: edge.age || 0,
        isNew: edge.isNew,
        edge_type: edge.edge_type
      }
    }));

    return [...nodeElements, ...edgeElements];
  }, [nodes, edges, theme, performanceMode, currentTime, timeRangeStart, timeRangeEnd, getNodeColor, getBorderColor, getEdgeColor]); // Include all dependencies

  // Disabled floating animation for timeline layout
  const initializeFloatingAnimation = useCallback(() => {
    // Floating animation disabled for timeline layout to maintain horizontal positions
    return;
  }, [performanceMode, isAnimating]);

  // Initialize Cytoscape with optimized settings
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;
    
    console.log('[TemporalGraphCanvas] Initializing Cytoscape - this should only happen once');

    // Dynamically import cytoscape to reduce bundle size
    import('cytoscape').then(async (cytoscapeModule) => {
      const cytoscapeLib = cytoscapeModule.default || cytoscapeModule;
      
      try {
        // Try to load advanced layout algorithms
        const [colaModule, fcoseModule] = await Promise.all([
          import('cytoscape-cola').catch(() => null),
          import('cytoscape-fcose').catch(() => null)
        ]);

        if (colaModule) cytoscapeLib.use(colaModule.default);
        if (fcoseModule) cytoscapeLib.use(fcoseModule.default);

        const layoutName = fcoseModule ? 'fcose' : colaModule ? 'cola' : 'cose';
        console.log('[TemporalGraphCanvas] Using layout:', layoutName);
        
        const elements = getCytoscapeElements();
        console.log('[TemporalGraphCanvas] Initializing with elements:', {
          nodes: elements.filter(e => e.group === 'nodes').length,
          edges: elements.filter(e => e.group === 'edges').length,
          firstNode: elements.find(e => e.group === 'nodes')
        });
        
        const cy = cytoscapeLib({
          container: containerRef.current,
          elements,
          style: getTemporalStyles(),
          layout: {
            name: layoutName,
            animate: true,
            animationDuration: performanceMode === 'high' ? 1200 : 800,
            animationEasing: 'ease-out',
            // Timeline-based horizontal layout
            ...(layoutName === 'fcose' ? {
              nodeRepulsion: 1000, // Lower repulsion for timeline layout
              idealEdgeLength: 100, // Standard edge length
              edgeElasticity: 0.45, // Lower elasticity for stable positions
              nestingFactor: 0.1, // Less hierarchy influence
              gravity: 0.1, // Minimal gravity - let timeline positions dominate
              gravityRangeCompound: 0.5,
              gravityCompound: 0.1,
              gravityRange: 1.0, // Reduced gravity range
              initialEnergyOnIncremental: 0.3, // Lower energy for gentle adjustments
              numIter: 1000, // Fewer iterations needed
              tile: false, // No tiling for timeline
              spacingFactor: 1.5, // More spacing
              nodeSeparation: 80, // Good separation
              uniformNodeDimensions: false,
              packComponents: false,
              componentPacking: false,
              samplingType: true,
              sampleSize: 25,
              quality: 'default',
              centerGraph: false, // Don't center - use timeline positions
              step: 'all',
              // Animation parameters
              animate: 'during',
              animationThreshold: 250,
              refresh: 20,
              fit: false, // Don't auto-fit
              padding: 50,
              randomize: false,
              // Preserve timeline positions
              nodeOverlap: 40,
              idealInterClusterEdgeLengthCoefficient: 1.5,
              allowNodesInsideCircle: true
            } : layoutName === 'cola' ? {
              nodeSpacing: 80,
              edgeLengthVal: 120,
              randomize: false,
              maxSimulationTime: 3000,
              unconstrIter: 50,
              userConstIter: 30,
              allConstIter: 20,
              handleDisconnected: true,
              avoidOverlap: true,
              centerGraph: true
            } : {
              nodeRepulsion: 6000,
              idealEdgeLength: 120,
              edgeElasticity: 200,
              nestingFactor: 10,
              gravity: 80, // Very strong gravity
              numIter: 3000,
              initialTemp: 200,
              coolingFactor: 0.95, // Slower cooling for gentle settling
              minTemp: 0.5,
              componentSpacing: 100,
              nodeOverlap: 30,
              padding: 60
            })
          } as any,
          // Optimized viewport settings
          minZoom: 0.1,
          maxZoom: 5,
          wheelSensitivity: 0.1,
          pixelRatio: 'auto',
          textureOnViewport: performanceMode !== 'high',
          motionBlur: performanceMode === 'high',
          motionBlurOpacity: 0.2,
          desktopTapThreshold: 4,
          touchTapThreshold: 8,
          selectionType: 'single',
          boxSelectionEnabled: false,
          autoungrabify: false,
          autounselectify: false
        });

        // Enhanced event handlers with debouncing
        let tapTimeout: NodeJS.Timeout;

        cy.on('tap', 'node', (evt) => {
          clearTimeout(tapTimeout);
          tapTimeout = setTimeout(() => {
            const node = evt.target;
            const nodeData = node.data() as TemporalNode;
            onNodeClick?.(nodeData);
          }, 50);
        });

        cy.on('cxttap', 'node', (evt) => {
          evt.preventDefault();
          const node = evt.target;
          const nodeData = node.data() as TemporalNode;
          const originalEvent = evt.originalEvent as MouseEvent;
          onNodeRightClick?.(nodeData, originalEvent);
        });

        // Mouse interaction effects
        cy.on('mouseover', 'node', (evt) => {
          const node = evt.target;
          node.addClass('hover');
          node.connectedEdges().addClass('hover');
        });

        cy.on('mouseout', 'node', (evt) => {
          const node = evt.target;
          node.removeClass('hover');
          node.connectedEdges().removeClass('hover');
        });

        // Update base positions when nodes are dragged
        cy.on('dragfree', 'node', (evt) => {
          const node = evt.target;
          const pos = node.position();
          
          // Update position cache for stable positions
          nodePositionCacheRef.current.set(node.id(), { x: pos.x, y: pos.y });
          
          // Update floating data
          floatingDataRef.current.set(node.id(), {
            ...floatingDataRef.current.get(node.id()),
            baseX: pos.x,
            baseY: pos.y
          } as any);
        });

        // Fit viewport after layout
        cy.one('layoutstop', () => {
          console.log('[TemporalGraphCanvas] Layout completed, nodes:', nodes.length);
          
          // Update position cache with layout-determined positions
          cy.nodes().forEach((node) => {
            const pos = node.position();
            nodePositionCacheRef.current.set(node.id(), { x: pos.x, y: pos.y });
          });
          
          if (nodes.length > 0) {
            cy.fit(undefined, 60);
          }
          initializeFloatingAnimation();
        });

        cyRef.current = cy;
        isInitializedRef.current = true;
        
        // Run the layout explicitly
        console.log('[TemporalGraphCanvas] Running layout...');
        cy.layout({
          name: layoutName,
          animate: true,
          animationDuration: performanceMode === 'high' ? 1200 : 800,
          animationEasing: 'ease-out',
          // Same timeline-based layout as initial
          ...(layoutName === 'fcose' ? {
            nodeRepulsion: 1000,
            idealEdgeLength: 100,
            edgeElasticity: 0.45,
            nestingFactor: 0.1,
            gravity: 0.1,
            gravityRangeCompound: 0.5,
            gravityCompound: 0.1,
            gravityRange: 1.0,
            initialEnergyOnIncremental: 0.3,
            numIter: 1000,
            tile: false,
            spacingFactor: 1.5,
            nodeSeparation: 80,
            uniformNodeDimensions: false,
            packComponents: false,
            componentPacking: false,
            samplingType: true,
            sampleSize: 25,
            quality: 'default',
            centerGraph: false,
            step: 'all',
            animate: 'during',
            animationThreshold: 250,
            refresh: 20,
            fit: false,
            padding: 50,
            randomize: false,
            nodeOverlap: 40,
            idealInterClusterEdgeLengthCoefficient: 1.5
          } : layoutName === 'cola' ? {
            nodeSpacing: 80,
            edgeLengthVal: 120,
            randomize: false,
            maxSimulationTime: 3000,
            unconstrIter: 50,
            userConstIter: 30,
            allConstIter: 20,
            handleDisconnected: true,
            avoidOverlap: true,
            centerGraph: true
          } : {
            nodeRepulsion: 6000,
            idealEdgeLength: 120,
            edgeElasticity: 200,
            nestingFactor: 10,
            gravity: 80,
            numIter: 3000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 0.5,
            componentSpacing: 100,
            nodeOverlap: 30,
            padding: 60
          })
        } as any).run();

      } catch (error) {
        console.error('Error initializing Cytoscape:', error);
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cyRef.current?.destroy();
      cyRef.current = null;
      isInitializedRef.current = false; // Reset the ref on cleanup
    };
  }, []); // Empty dependency array - only run once on mount

  // Optimized batch updates when data changes with memoization
  const elementsRef = useRef<ElementDefinition[]>([]);
  const lastUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current) return;

    const now = Date.now();
    // Throttle updates to prevent excessive re-rendering
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;

    const elements = getCytoscapeElements();
    const currentElements = cyRef.current.elements();
    
    // Compare with previous elements to avoid unnecessary updates
    const elementsChanged = elements.length !== elementsRef.current.length ||
      elements.some((el, i) => {
        const prev = elementsRef.current[i];
        return !prev || el.data.id !== prev.data.id || 
               JSON.stringify(el.data) !== JSON.stringify(prev.data);
      });
      
    if (!elementsChanged) return;
    elementsRef.current = elements;
    
    let needsLayout = false;
    const addedNodes: string[] = [];
    const removedCount = currentElements.length - elements.length;
    
    // Skip updates if no meaningful changes
    if (elements.length === currentElements.length && removedCount === 0) {
      // Quick check for data changes
      let hasDataChanges = false;
      for (const element of elements) {
        const existing = cyRef.current.getElementById(element.data.id as string);
        if (existing.length === 0 || existing.data('visibility') !== element.data.visibility) {
          hasDataChanges = true;
          break;
        }
      }
      if (!hasDataChanges) return;
    }

    cyRef.current.batch(() => {
      // Build sets for efficient lookups
      const newElementIds = new Set(elements.map(e => e.data.id));

      // Remove elements that no longer exist
      currentElements.forEach(ele => {
        if (!newElementIds.has(ele.id())) {
          floatingDataRef.current.delete(ele.id());
          ele.remove();
          needsLayout = true;
        }
      });

      // Add or update elements
      elements.forEach(element => {
        const existingEle = cyRef.current!.getElementById(element.data.id as string);
        
        if (existingEle.length > 0) {
          // Update existing element data efficiently
          const currentData = existingEle.data();
          const hasChanged = Object.keys(element.data).some(key => 
            currentData[key] !== element.data[key]
          );
          
          if (hasChanged) {
            existingEle.data(element.data);
          }
        } else {
          // Add new element
          const newEle = cyRef.current!.add(element);
          
          // Only trigger layout if this is a truly new node without cached position
          if (element.group === 'nodes') {
            const hasCachedPosition = nodePositionCacheRef.current.has(element.data.id as string);
            if (!hasCachedPosition) {
              needsLayout = true;
              addedNodes.push(element.data.id as string);
              
              // For timeline layout, new nodes should appear from the right
              const viewport = cyRef.current!.extent();
              const rightEdgeX = viewport.x2 + 100; // Start off-screen to the right
              
              // Use the element's position data which already has proper Y coordinate
              const targetPos = element.position!;
              
              // Start from right edge
              newEle.position({
                x: rightEdgeX,
                y: targetPos.y
              });
              
              // Trigger pop effect
              newEle.data('isPoppingIn', true);
              
              // Animate to final timeline position
              newEle.animate({
                position: targetPos
              }, {
                duration: 600,
                easing: 'ease-out'
              });
              
              // Remove pop effect after animation
              setTimeout(() => {
                if (cyRef.current) {
                  const node = cyRef.current.getElementById(element.data.id as string);
                  if (node.length > 0) {
                    node.data('isPoppingIn', false);
                  }
                }
              }, 600);
              
              // Apply horizontal push to nodes in the same lane
              const nearbyNodes = cyRef.current!.nodes().filter((n) => {
                if (n.id() === newEle.id()) return false;
                const pos = n.position();
                // Check if in same horizontal lane (similar Y position)
                const yDiff = Math.abs(pos.y - targetPos.y);
                const xDiff = targetPos.x - pos.x;
                return yDiff < 50 && xDiff < 100 && xDiff > -50; // Nodes in same lane, nearby on timeline
              });
              
              nearbyNodes.forEach((nearNode) => {
                const pos = nearNode.position();
                // Push nodes slightly to the left to make room
                nearNode.animate({
                  position: {
                    x: pos.x - 30,
                    y: pos.y
                  }
                }, {
                  duration: 400,
                  easing: 'ease-out'
                });
              });
            }
            
            // Initialize floating data for nodes
            if (performanceMode !== 'low') {
              const pos = newEle.position();
              floatingDataRef.current.set(element.data.id as string, {
                baseX: pos.x,
                baseY: pos.y,
                phase: Math.random() * Math.PI * 2,
                amplitude: 0.05
              });
            }
          } else {
            // Always need layout for new edges
            needsLayout = true;
          }
        }
      });
    });

    // Smart layout decisions based on changes
    if (needsLayout && addedNodes.length > 0) {
      const shouldAnimate = elements.length < 50 && performanceMode !== 'low';
      const layoutDuration = performanceMode === 'high' ? 800 : 400;
      
      // For timeline layout, we don't need physics-based repositioning
      // Just update positions based on timeline
      if (needsLayout && addedNodes.length > 0) {
        // Use preset layout to maintain timeline positions
        cyRef.current.layout({
          name: 'preset',
          animate: shouldAnimate,
          animationDuration: layoutDuration,
          animationEasing: 'ease-out',
          fit: false, // Never auto-fit for timeline
          padding: 50,
          positions: (node: any) => {
            // Use the position already calculated in getCytoscapeElements
            return node.position();
          }
        } as any).run();
        
        // Update position cache after layout completes
        cyRef.current.one('layoutstop', () => {
          cyRef.current!.nodes().forEach((node) => {
            const pos = node.position();
            nodePositionCacheRef.current.set(node.id(), { x: pos.x, y: pos.y });
          });
          
          // Pan to show current time at right edge of viewport
          if (addedNodes.length > 0) {
            const viewport = cyRef.current!.extent();
            const viewportWidth = viewport.x2 - viewport.x1;
            const currentTimeNode = cyRef.current!.nodes().max((node) => {
              const nodeData = node.data() as TemporalNode;
              return new Date(nodeData.created_at).getTime();
            });
            
            if (currentTimeNode && currentTimeNode.value) {
              const rightmostX = currentTimeNode.value.position().x;
              const panX = rightmostX - viewportWidth + 100; // Keep some padding
              
              cyRef.current!.animate({
                pan: { x: -panX, y: cyRef.current!.pan().y }
              }, {
                duration: 600,
                easing: 'ease-out'
              });
            }
          }
        });
      }

      // Restart floating animation if new nodes were added
      if (addedNodes.length > 0 && performanceMode !== 'low') {
        setTimeout(() => {
          initializeFloatingAnimation();
        }, layoutDuration + 100);
      }
    }
  }, [nodes, edges]); // Minimal dependencies to prevent loops

  // Update selected node with smooth transitions
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current) return;

    cyRef.current.elements().unselect();
    if (selectedNodeId) {
      const selectedNode = cyRef.current.getElementById(selectedNodeId);
      if (selectedNode.length > 0) {
        selectedNode.select();
        
        // Smoothly animate to selected node if it's not visible
        const bb = selectedNode.boundingBox();
        const viewport = cyRef.current.extent();
        const margin = 100;
        
        if (bb.x1 < viewport.x1 + margin || bb.x2 > viewport.x2 - margin ||
            bb.y1 < viewport.y1 + margin || bb.y2 > viewport.y2 - margin) {
          cyRef.current.animate({
            center: { eles: selectedNode },
            zoom: Math.min(cyRef.current.zoom(), 2)
          }, {
            duration: performanceMode === 'high' ? 500 : 250,
            easing: 'ease-out'
          });
        }
      }
    }
  }, [selectedNodeId, performanceMode]);

  // Enhanced temporal effects with smooth transitions and enter/exit animations
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current) return;

    let intervalId: NodeJS.Timeout;
    let isRunning = false;

    const updateTemporalData = () => {
      if (isRunning || !cyRef.current) return;
      isRunning = true;

      try {
        cyRef.current.batch(() => {
          cyRef.current!.nodes().forEach(node => {
            const nodeData = node.data() as TemporalNode;
            const createdAt = new Date(nodeData.created_at);
            const age = currentTime.getTime() - createdAt.getTime();
            const hoursSinceCreation = age / (1000 * 60 * 60);
            
            let visibility = 1;
            let pulseIntensity = 0;
            let scale = 1;
            
            if (createdAt > currentTime) {
              // Future node - ghost effect with smaller scale
              visibility = 0.15;
              scale = 0.6;
            } else if (age < 0) {
              // Node hasn't appeared yet
              visibility = 0;
              scale = 0.1;
            } else {
              // Calculate visibility based on age with smoother transitions
              const weekInHours = 168;
              const dayInHours = 24;
              
              if (hoursSinceCreation < 1) {
                // New nodes: animate entrance with scaling effect
                visibility = Math.min(1, hoursSinceCreation);
                scale = 0.5 + (hoursSinceCreation * 0.5);
                pulseIntensity = 1 - (hoursSinceCreation / 1);
              } else if (hoursSinceCreation < dayInHours) {
                // Recent nodes: full visibility with subtle pulsing
                visibility = 1;
                scale = 1;
                pulseIntensity = Math.max(0, 0.3 - (hoursSinceCreation - 1) / (dayInHours - 1) * 0.3);
              } else {
                // Older nodes: gradual fade out
                visibility = Math.max(0.2, 1 - (hoursSinceCreation - dayInHours) / (weekInHours - dayInHours) * 0.6);
                scale = Math.max(0.7, 1 - (hoursSinceCreation - dayInHours) / (weekInHours - dayInHours) * 0.3);
              }
            }

            // Update node data with smooth transitions
            const currentVisibility = node.data('visibility') || 1;
            const currentScale = node.data('scale') || 1;
            
            if (Math.abs(currentVisibility - visibility) > 0.01) {
              node.data('visibility', visibility);
              
              // Animate visibility changes
              if (performanceMode === 'high') {
                node.animate({
                  style: { opacity: visibility },
                  duration: 300,
                  easing: 'ease-out'
                });
              }
            }
            
            if (Math.abs(currentScale - scale) > 0.01) {
              node.data('scale', scale);
              
              // Animate scaling changes for dramatic effect
              if (performanceMode === 'high') {
                const size = 64 * scale; // Base size times scale
                node.animate({
                  style: { 
                    width: size,
                    height: size
                  },
                  duration: 500,
                  easing: 'ease-out'
                });
              }
            }
            
            node.data('isNew', hoursSinceCreation < 1);
            node.data('isRecent', hoursSinceCreation < 24);
            node.data('age', age);
            node.data('pulseIntensity', pulseIntensity);
            
            // Update floating animation parameters based on node state
            const floatingData = floatingDataRef.current.get(node.id());
            if (floatingData && nodeData.isNew !== floatingData.amplitude > 5) {
              const baseAmplitude = nodeData.isNew ? 0.2 : nodeData.isRecent ? 0.1 : 0.05;
              floatingDataRef.current.set(node.id(), {
                ...floatingData,
                amplitude: baseAmplitude
              });
            }
          });

          cyRef.current!.edges().forEach(edge => {
            const edgeData = edge.data() as TemporalEdge;
            const createdAt = new Date(edgeData.created_at || edgeData.discovered_at || edgeData.created_at);
            const age = currentTime.getTime() - createdAt.getTime();
            const hoursAge = age / (1000 * 60 * 60);
            
            let edgeVisibility = 1;
            
            if (age < 0) {
              // Edge hasn't appeared yet
              edgeVisibility = 0;
            } else if (hoursAge < 1) {
              // New edges: animate entrance
              edgeVisibility = Math.min(1, hoursAge);
            } else {
              // Calculate edge visibility based on age
              const weekInHours = 168;
              edgeVisibility = Math.max(0.3, 1 - (hoursAge / weekInHours) * 0.5);
            }
            
            edge.data('age', age);
            edge.data('isNew', hoursAge < 1);
            edge.data('visibility', edgeVisibility);
            
            // Update edge color and opacity based on age
            const newColor = getEdgeColor(edgeData);
            if (edge.data('edgeColor') !== newColor) {
              edge.data('edgeColor', newColor);
              
              // Animate edge appearance/changes
              if (performanceMode === 'high' && Math.abs(edge.style('opacity') - edgeVisibility) > 0.1) {
                edge.animate({
                  style: { 
                    opacity: edgeVisibility,
                    'line-color': newColor,
                    'target-arrow-color': newColor
                  },
                  duration: 400,
                  easing: 'ease-out'
                });
              }
            }
          });
        });
      } finally {
        isRunning = false;
      }
    };

    // Performance-optimized update intervals with dynamic adjustment
    const throttleInterval = performanceMode === 'high' ? 
      (nodes.length > 50 ? 1500 : 1000) : 
      (nodes.length > 50 ? 5000 : 3000);
    
    // Start the interval, but don't run immediately to prevent initial loop
    intervalId = setInterval(updateTemporalData, throttleInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTime, getEdgeColor, performanceMode, nodes.length]); // Added currentTime back but with proper safeguards

  // Animation control based on user interaction
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAnimating(!document.hidden);
    };

    const handleFocus = () => setIsAnimating(true);
    const handleBlur = () => setIsAnimating(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Track node activity and update glow effects
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current) return;

    // Check for node activity based on events and session mentions
    const checkNodeActivity = () => {
      const currentTimeMs = currentTime.getTime();
      const activityWindow = 10000; // 10 second window for activity detection
      
      // Build activity map from recent events and session mentions
      const nodeActivityMap = new Map<string, number>(); // nodeId -> activity count
      
      // Count events
      events.forEach(event => {
        const eventTime = new Date(event.created_at).getTime();
        if (eventTime <= currentTimeMs && eventTime > currentTimeMs - activityWindow) {
          if (event.node_id && (event.event_type === 'node_updated' || event.event_type === 'progress_changed')) {
            nodeActivityMap.set(event.node_id, (nodeActivityMap.get(event.node_id) || 0) + 1);
          }
        }
      });
      
      // Debug: Log activity detection
      if (nodeActivityMap.size > 0) {
        console.log('[Activity] Detected activity:', nodeActivityMap);
      }
      
      // Count session mentions from nodes
      nodes.forEach(node => {
        if (node.session_mentions) {
          node.session_mentions.forEach(mention => {
            const mentionTime = new Date(mention.timestamp).getTime();
            if (mentionTime <= currentTimeMs && mentionTime > currentTimeMs - activityWindow) {
              nodeActivityMap.set(node.id, (nodeActivityMap.get(node.id) || 0) + 1);
            }
          });
        }
        
        // TEMPORARY: Enhanced simulation for testing glow effects
        const nodeCreatedTime = new Date(node.created_at).getTime();
        const timeSinceCreation = currentTimeMs - nodeCreatedTime;
        
        // Simulation for testing - activity on recent nodes
        // If node was created recently, simulate activity
        if (timeSinceCreation > 0 && timeSinceCreation < 180000) { // 3 minutes
          // Activity based on how recent the node is
          let activityLevel = 0;
          
          if (timeSinceCreation < 30000) { // First 30 seconds - high activity
            activityLevel = 2 + Math.floor(Math.random() * 2); // 2-3
          } else if (timeSinceCreation < 90000) { // 30s-1.5min - medium activity
            activityLevel = 1 + Math.floor(Math.random() * 2); // 1-2
          } else { // 1.5-3min - occasional activity
            activityLevel = Math.random() < 0.3 ? 1 : 0; // 30% chance of activity
          }
          
          // Extra activity for emotion and session nodes
          if ((node.node_type === 'emotion' || node.node_type === 'session') && activityLevel > 0) {
            activityLevel += 1;
          }
          
          if (activityLevel > 0) {
            nodeActivityMap.set(node.id, (nodeActivityMap.get(node.id) || 0) + activityLevel);
            console.log(`[SimulatedActivity] Node ${node.label} (${node.id}) type:${node.node_type} has activity level ${activityLevel}, timeSinceCreation: ${(timeSinceCreation/1000).toFixed(1)}s`);
          }
        }
      });
      
      // Update glow effects
      cyRef.current.batch(() => {
        // First, handle decay for all nodes
        cyRef.current.nodes().forEach(node => {
          const nodeId = node.id();
          const activity = nodeActivityRef.current.get(nodeId);
          
          if (activity && activity.intensity > 0) {
            const timeSinceActivity = Date.now() - activity.lastActivity;
            if (timeSinceActivity < glowDecayDuration) {
              // Calculate decay
              const decayProgress = timeSinceActivity / glowDecayDuration;
              const newIntensity = activity.intensity * (1 - decayProgress);
              node.data('glowIntensity', Math.max(0, newIntensity));
              
              if (newIntensity < 0.01) {
                // Remove activity tracking when fully decayed
                nodeActivityRef.current.delete(nodeId);
                node.data('glowIntensity', 0);
              }
            } else {
              // Fully decayed
              nodeActivityRef.current.delete(nodeId);
              node.data('glowIntensity', 0);
            }
          }
        });
        
        // Then, add new activity
        nodeActivityMap.forEach((activityCount, nodeId) => {
          const cyNode = cyRef.current!.getElementById(nodeId);
          if (cyNode.length > 0) {
            // Calculate intensity based on activity count
            const intensity = Math.min(0.8, activityCount * 0.2); // Max 80% opacity
            
            // Only update if intensity increased
            const currentIntensity = cyNode.data('glowIntensity') || 0;
            if (intensity > currentIntensity) {
              console.log(`[Glow] Setting glow for node ${nodeId}: intensity=${intensity}`);
              cyNode.data('glowIntensity', intensity);
              
              // Update activity tracking
              const existingActivity = nodeActivityRef.current.get(nodeId);
              if (existingActivity?.decayTimeout) {
                clearTimeout(existingActivity.decayTimeout);
              }
              
              nodeActivityRef.current.set(nodeId, {
                lastActivity: Date.now(),
                intensity,
                decayTimeout: undefined // Will start decay when activity stops
              });
            }
          }
        });
      });
    };
    
    // Run activity check regularly
    const intervalId = setInterval(checkNodeActivity, 50); // Check every 50ms for smooth updates
    
    return () => {
      clearInterval(intervalId);
      // Clear all decay timeouts
      nodeActivityRef.current.forEach(activity => {
        if (activity.decayTimeout) {
          clearTimeout(activity.decayTimeout);
        }
      });
    };
  }, [nodes, events, currentTime, glowDecayDuration]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-background transition-colors duration-200"
      style={{ position: 'relative' }}
    />
  );
}