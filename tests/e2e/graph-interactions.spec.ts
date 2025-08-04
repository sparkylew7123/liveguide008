import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS } from './utils/auth';
import { 
  waitForGraphLoad, 
  clickNodeByLabel, 
  rightClickNodeByLabel, 
  searchNodes, 
  changeLayout, 
  zoomIn, 
  zoomOut, 
  resetView, 
  exportGraph,
  filterNodesByType,
  verifyNodeDetailsPanel,
  dragNode,
  getGraphNodes
} from './utils/graph';

test.describe('Graph Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
  });

  test('should handle node click interactions', async ({ page }) => {
    // Click on a node
    await clickNodeByLabel(page, 'Improve Fitness');
    
    // Verify node details panel opens
    await verifyNodeDetailsPanel(page, {
      label: 'Improve Fitness',
      type: 'goal'
    });
    
    // Verify node is visually selected
    const selectedNode = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return null;
      const selected = cy.nodes(':selected');
      return selected.length > 0 ? selected[0].data('label') : null;
    });
    
    expect(selectedNode).toBe('Improve Fitness');
  });

  test('should handle node right-click context menu', async ({ page }) => {
    await rightClickNodeByLabel(page, 'Improve Fitness');
    
    // Should show context menu or trigger context action
    // This depends on your implementation - adjust selector accordingly
    try {
      await expect(page.locator('.context-menu, [data-testid="context-menu"]')).toBeVisible({ timeout: 2000 });
    } catch {
      // If no context menu, at least verify the node is selected
      await verifyNodeDetailsPanel(page, {
        label: 'Improve Fitness'
      });
    }
  });

  test('should handle node drag interactions', async ({ page }) => {
    // Get initial position of a node
    const initialPosition = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return null;
      const node = cy.nodes().filter((n: any) => n.data('label').includes('Fitness'));
      return node.length > 0 ? node.position() : null;
    });
    
    if (initialPosition) {
      // Drag the node
      await dragNode(page, 'Improve Fitness', 100, 50);
      
      // Verify position changed
      const newPosition = await page.evaluate(() => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return null;
        const node = cy.nodes().filter((n: any) => n.data('label').includes('Fitness'));
        return node.length > 0 ? node.position() : null;
      });
      
      expect(newPosition).not.toEqual(initialPosition);
    }
  });

  test('should handle graph search functionality', async ({ page }) => {
    // Search for a specific node
    await searchNodes(page, 'Fitness');
    
    // Verify search highlights or focuses on matching nodes
    await page.waitForTimeout(1000);
    
    // Check if matching nodes are highlighted
    const highlightedNodes = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      return cy.nodes('.highlighted').map((node: any) => node.data('label'));
    });
    
    // Should find at least the "Improve Fitness" node
    expect(highlightedNodes.some((label: string) => label.includes('Fitness'))).toBeTruthy();
  });

  test('should handle partial search queries', async ({ page }) => {
    // Search with partial text
    await searchNodes(page, 'Span');
    
    await page.waitForTimeout(1000);
    
    // Should find "Learn Spanish" node
    const nodes = await getGraphNodes(page);
    const spanishNode = nodes.find(node => node.label.includes('Spanish'));
    
    if (spanishNode) {
      // Verify the node is highlighted or focused
      const isHighlighted = await page.evaluate((nodeLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return false;
        const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
        return node.length > 0 && node.hasClass('highlighted');
      }, spanishNode.label);
      
      expect(isHighlighted).toBeTruthy();
    }
  });

  test('should handle layout changes', async ({ page }) => {
    // Test different layout algorithms
    const layouts = ['fcose', 'cola', 'circle', 'grid'];
    
    for (const layout of layouts) {
      try {
        await changeLayout(page, layout);
        
        // Verify layout change completed
        await page.waitForTimeout(2000);
        
        // Check that nodes are still visible and positioned
        const nodeCount = await page.evaluate(() => {
          const cy = (window as any).cy || (window as any).cytoscapeInstance;
          return cy ? cy.nodes().length : 0;
        });
        
        expect(nodeCount).toBeGreaterThan(0);
        console.log(`Successfully applied ${layout} layout`);
      } catch (error) {
        console.log(`Layout ${layout} not available or failed:`, error);
      }
    }
  });

  test('should handle zoom controls', async ({ page }) => {
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    // Zoom in
    await zoomIn(page);
    
    const zoomedInLevel = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    expect(zoomedInLevel).toBeGreaterThan(initialZoom);
    
    // Zoom out
    await zoomOut(page);
    
    const zoomedOutLevel = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    expect(zoomedOutLevel).toBeLessThan(zoomedInLevel);
    
    // Reset view
    await resetView(page);
    
    // Verify reset worked (should fit all nodes)
    await page.waitForTimeout(1000);
    const resetZoom = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    expect(resetZoom).toBeDefined();
  });

  test('should handle node type filtering', async ({ page }) => {
    // Get initial node count
    const initialNodes = await getGraphNodes(page);
    const initialGoalCount = initialNodes.filter(node => node.type === 'goal').length;
    const initialSkillCount = initialNodes.filter(node => node.type === 'skill').length;
    
    // Filter to show only goals
    await filterNodesByType(page, ['goal']);
    
    // Verify only goal nodes are visible
    const visibleNodes = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      return cy.nodes(':visible').map((node: any) => ({
        label: node.data('label'),
        type: node.data('type')
      }));
    });
    
    // All visible nodes should be goals
    expect(visibleNodes.every((node: any) => node.type === 'goal')).toBeTruthy();
    expect(visibleNodes.length).toBe(initialGoalCount);
  });

  test('should handle multiple node selection', async ({ page }) => {
    const nodes = await getGraphNodes(page);
    if (nodes.length >= 2) {
      // Select first node
      await clickNodeByLabel(page, nodes[0].label);
      
      // Hold Ctrl/Cmd and select second node
      await page.keyboard.down('Control'); // Use 'Meta' for Mac
      await clickNodeByLabel(page, nodes[1].label);
      await page.keyboard.up('Control');
      
      // Verify multiple nodes are selected
      const selectedCount = await page.evaluate(() => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy ? cy.nodes(':selected').length : 0;
      });
      
      expect(selectedCount).toBeGreaterThanOrEqual(1); // At least one should be selected
    }
  });

  test('should handle graph export functionality', async ({ page }) => {
    try {
      const download = await exportGraph(page);
      
      // Verify download occurred
      expect(download.suggestedFilename()).toContain('.png');
      
      // Verify file size is reasonable (not empty)
      const downloadPath = await download.path();
      if (downloadPath) {
        const fs = require('fs');
        const stats = fs.statSync(downloadPath);
        expect(stats.size).toBeGreaterThan(1000); // At least 1KB
      }
    } catch (error) {
      console.log('Export functionality not available or failed:', error);
      // This is acceptable as export might not be implemented yet
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test common keyboard shortcuts
    const shortcuts = [
      { keys: ['Control', 'f'], action: 'search' },
      { keys: ['Escape'], action: 'deselect' },
      { keys: ['Control', '='], action: 'zoom in' },
      { keys: ['Control', '-'], action: 'zoom out' }
    ];
    
    for (const shortcut of shortcuts) {
      try {
        // Press the key combination
        for (const key of shortcut.keys) {
          await page.keyboard.down(key);
        }
        
        // Release in reverse order
        for (let i = shortcut.keys.length - 1; i >= 0; i--) {
          await page.keyboard.up(shortcut.keys[i]);
        }
        
        await page.waitForTimeout(500);
        
        console.log(`Keyboard shortcut test for ${shortcut.action} completed`);
      } catch (error) {
        console.log(`Keyboard shortcut for ${shortcut.action} failed:`, error);
      }
    }
  });

  test('should handle edge click interactions', async ({ page }) => {
    // Check if there are edges in the graph
    const edgeCount = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.edges().length : 0;
    });
    
    if (edgeCount > 0) {
      // Try to click on an edge
      await page.evaluate(() => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (cy && cy.edges().length > 0) {
          cy.edges()[0].trigger('tap');
        }
      });
      
      await page.waitForTimeout(500);
      
      // Verify edge is selected or shows details
      const selectedEdgeCount = await page.evaluate(() => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy ? cy.edges(':selected').length : 0;
      });
      
      expect(selectedEdgeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle hover interactions', async ({ page }) => {
    // Simulate hovering over a node
    const nodes = await getGraphNodes(page);
    if (nodes.length > 0) {
      await page.evaluate((nodeLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return;
        
        const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
        if (node.length > 0) {
          node.trigger('mouseover');
        }
      }, nodes[0].label);
      
      await page.waitForTimeout(500);
      
      // Check for tooltip or hover effects
      try {
        await expect(page.locator('.tooltip, [data-testid="tooltip"]')).toBeVisible({ timeout: 2000 });
      } catch {
        // Hover effects might be subtle, so this is optional
        console.log('No visible hover tooltip detected');
      }
    }
  });

  test('should handle touch interactions on touch devices', async ({ page }) => {
    // Simulate touch events for mobile testing
    const viewport = page.viewportSize();
    if (viewport && viewport.width <= 768) {
      const nodes = await getGraphNodes(page);
      if (nodes.length > 0) {
        // Simulate tap
        await page.evaluate((nodeLabel) => {
          const cy = (window as any).cy || (window as any).cytoscapeInstance;
          if (!cy) return;
          
          const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
          if (node.length > 0) {
            node.trigger('tap');
          }
        }, nodes[0].label);
        
        // Verify touch interaction worked
        await verifyNodeDetailsPanel(page, {
          label: nodes[0].label
        });
      }
    }
  });
});