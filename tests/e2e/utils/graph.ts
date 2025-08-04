import { Page, expect, Locator } from '@playwright/test';

/**
 * Graph testing utilities for interacting with Cytoscape.js
 */

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  status?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

/**
 * Wait for the graph to load and be ready for interaction
 */
export async function waitForGraphLoad(page: Page, timeout = 30000) {
  // Wait for the graph container to be visible
  await expect(page.locator('[data-testid="graph-canvas"], .cytoscape-container, #graph-canvas')).toBeVisible({ timeout });
  
  // Wait for Cytoscape to initialize by checking for canvas element
  await page.waitForSelector('canvas', { timeout });
  
  // Wait for graph data to load
  await page.waitForFunction(
    () => {
      // Check if Cytoscape instance exists and has nodes
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy && cy.nodes && cy.nodes().length > 0;
    },
    { timeout }
  );
  
  // Give a moment for animations to complete
  await page.waitForTimeout(1000);
}

/**
 * Get the number of nodes in the graph
 */
export async function getNodeCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    return cy ? cy.nodes().length : 0;
  });
}

/**
 * Get the number of edges in the graph
 */
export async function getEdgeCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    return cy ? cy.edges().length : 0;
  });
}

/**
 * Get all nodes in the graph
 */
export async function getGraphNodes(page: Page): Promise<GraphNode[]> {
  return await page.evaluate(() => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) return [];
    
    return cy.nodes().map((node: any) => ({
      id: node.id(),
      label: node.data('label'),
      type: node.data('type'),
      description: node.data('description'),
      status: node.data('status')
    }));
  });
}

/**
 * Get all edges in the graph
 */
export async function getGraphEdges(page: Page): Promise<GraphEdge[]> {
  return await page.evaluate(() => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) return [];
    
    return cy.edges().map((edge: any) => ({
      id: edge.id(),
      source: edge.source().id(),
      target: edge.target().id(),
      type: edge.data('type'),
      label: edge.data('label')
    }));
  });
}

/**
 * Click on a node by its label
 */
export async function clickNodeByLabel(page: Page, label: string) {
  await page.evaluate((nodeLabel) => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) throw new Error('Cytoscape not initialized');
    
    const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
    if (node.length === 0) throw new Error(`Node with label "${nodeLabel}" not found`);
    
    node[0].trigger('tap');
  }, label);
  
  // Wait a moment for the click to be processed
  await page.waitForTimeout(500);
}

/**
 * Click on a node by its ID
 */
export async function clickNodeById(page: Page, nodeId: string) {
  await page.evaluate((id) => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) throw new Error('Cytoscape not initialized');
    
    const node = cy.getElementById(id);
    if (node.length === 0) throw new Error(`Node with ID "${id}" not found`);
    
    node.trigger('tap');
  }, nodeId);
  
  await page.waitForTimeout(500);
}

/**
 * Right-click on a node by its label
 */
export async function rightClickNodeByLabel(page: Page, label: string) {
  await page.evaluate((nodeLabel) => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) throw new Error('Cytoscape not initialized');
    
    const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
    if (node.length === 0) throw new Error(`Node with label "${nodeLabel}" not found`);
    
    node[0].trigger('cxttap'); // Context tap (right-click)
  }, label);
  
  await page.waitForTimeout(500);
}

/**
 * Search for nodes in the graph
 */
export async function searchNodes(page: Page, query: string) {
  // Find search input
  const searchInput = page.locator('input[placeholder*="search"], input[type="search"], [data-testid="graph-search"]');
  await searchInput.fill(query);
  await searchInput.press('Enter');
  
  // Wait for search results to be highlighted
  await page.waitForTimeout(1000);
}

/**
 * Change graph layout
 */
export async function changeLayout(page: Page, layoutName: string) {
  // Look for layout selector/dropdown
  const layoutSelector = page.locator('[data-testid="layout-selector"], select[name="layout"]');
  
  if (await layoutSelector.isVisible()) {
    await layoutSelector.selectOption(layoutName);
  } else {
    // Try clicking layout button
    await page.click(`[data-testid="layout-${layoutName}"], button:has-text("${layoutName}")`);
  }
  
  // Wait for layout animation to complete
  await page.waitForTimeout(2000);
}

/**
 * Zoom in on the graph
 */
export async function zoomIn(page: Page) {
  await page.click('[data-testid="zoom-in"], button[aria-label="Zoom in"]');
  await page.waitForTimeout(500);
}

/**
 * Zoom out on the graph
 */
export async function zoomOut(page: Page) {
  await page.click('[data-testid="zoom-out"], button[aria-label="Zoom out"]');
  await page.waitForTimeout(500);
}

/**
 * Reset graph view
 */
export async function resetView(page: Page) {
  await page.click('[data-testid="reset-view"], button[aria-label="Reset view"]');
  await page.waitForTimeout(1000);
}

/**
 * Export graph
 */
export async function exportGraph(page: Page) {
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="export-graph"], button[aria-label="Export graph"]');
  const download = await downloadPromise;
  return download;
}

/**
 * Filter nodes by type
 */
export async function filterNodesByType(page: Page, nodeTypes: string[]) {
  // Find filter controls
  for (const nodeType of nodeTypes) {
    const checkbox = page.locator(`input[type="checkbox"][value="${nodeType}"]`);
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
  }
  
  // Wait for filter to apply
  await page.waitForTimeout(1000);
}

/**
 * Verify node details panel is visible and contains expected data
 */
export async function verifyNodeDetailsPanel(page: Page, expectedData: Partial<GraphNode>) {
  const panel = page.locator('[data-testid="node-details"], .node-details-panel');
  await expect(panel).toBeVisible();
  
  if (expectedData.label) {
    await expect(panel.locator('text=' + expectedData.label)).toBeVisible();
  }
  
  if (expectedData.type) {
    await expect(panel.locator('text=' + expectedData.type)).toBeVisible();
  }
  
  if (expectedData.description) {
    await expect(panel.locator('text=' + expectedData.description)).toBeVisible();
  }
}

/**
 * Verify graph is responsive on mobile
 */
export async function verifyMobileResponsive(page: Page) {
  // Check that graph container adapts to mobile viewport
  const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
  await expect(graphContainer).toBeVisible();
  
  // Verify touch interactions work
  const nodeCount = await getNodeCount(page);
  if (nodeCount > 0) {
    const nodes = await getGraphNodes(page);
    if (nodes.length > 0) {
      // Try to tap a node
      await clickNodeByLabel(page, nodes[0].label);
      // Verify details panel opens
      await expect(page.locator('[data-testid="node-details"]')).toBeVisible();
    }
  }
}

/**
 * Wait for real-time update to appear
 */
export async function waitForNewNode(page: Page, nodeLabel: string, timeout = 10000) {
  await page.waitForFunction(
    (label) => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return false;
      
      const node = cy.nodes().filter((n: any) => n.data('label') === label);
      return node.length > 0;
    },
    nodeLabel,
    { timeout }
  );
}

/**
 * Simulate drag and drop of a node
 */
export async function dragNode(page: Page, nodeLabel: string, deltaX: number, deltaY: number) {
  await page.evaluate(({ label, dx, dy }) => {
    const cy = (window as any).cy || (window as any).cytoscapeInstance;
    if (!cy) throw new Error('Cytoscape not initialized');
    
    const node = cy.nodes().filter((n: any) => n.data('label') === label);
    if (node.length === 0) throw new Error(`Node with label "${label}" not found`);
    
    const currentPos = node.position();
    node.position({
      x: currentPos.x + dx,
      y: currentPos.y + dy
    });
  }, { label: nodeLabel, dx: deltaX, dy: deltaY });
  
  await page.waitForTimeout(500);
}