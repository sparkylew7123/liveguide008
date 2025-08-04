import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS, getTestUserId, createTestNode } from './utils/auth';
import { waitForGraphLoad, getNodeCount, getGraphNodes, clickNodeByLabel, verifyNodeDetailsPanel } from './utils/graph';

test.describe('Graph Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should load graph data from database and display in frontend', async ({ page }) => {
    // Navigate to graph page (adjust URL based on your routing)
    await page.goto('/dashboard'); // or wherever the graph is displayed
    
    // Wait for graph to load
    await waitForGraphLoad(page);
    
    // Verify we have nodes loaded from the database
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThan(0);
    
    // Get all nodes and verify they contain expected test data
    const nodes = await getGraphNodes(page);
    
    // Should have the test nodes we created in setup
    expect(nodes.some(node => node.label === 'Improve Fitness')).toBeTruthy();
    expect(nodes.some(node => node.label === 'Learn Spanish')).toBeTruthy();
    expect(nodes.some(node => node.type === 'goal')).toBeTruthy();
    expect(nodes.some(node => node.type === 'skill')).toBeTruthy();
    
    // Verify different node types are present
    const nodeTypes = new Set(nodes.map(node => node.type));
    expect(nodeTypes.has('goal')).toBeTruthy();
    expect(nodeTypes.has('skill')).toBeTruthy();
    expect(nodeTypes.has('emotion')).toBeTruthy();
  });

  test('should display node details when clicked', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Click on a specific node
    await clickNodeByLabel(page, 'Improve Fitness');
    
    // Verify node details panel appears with correct information
    await verifyNodeDetailsPanel(page, {
      label: 'Improve Fitness',
      type: 'goal',
      description: 'Get in better shape and build healthy habits'
    });
  });

  test('should create new node via API and display in graph', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    // Get user ID for API call
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    
    // Create a new node directly via API (simulating backend creation)
    const newNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Test Goal from API',
      description: 'This goal was created via API during E2E test',
      status: 'draft_verbal'
    });
    
    // Wait for real-time update to appear in the graph
    await page.waitForFunction(
      (expectedCount) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy && cy.nodes().length >= expectedCount;
      },
      initialNodeCount + 1,
      { timeout: 10000 }
    );
    
    // Verify the new node count
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 1);
    
    // Verify the new node is visible in the graph
    const nodes = await getGraphNodes(page);
    expect(nodes.some(node => node.label === 'Test Goal from API')).toBeTruthy();
    
    // Click on the new node to verify it's interactive
    await clickNodeByLabel(page, 'Test Goal from API');
    await verifyNodeDetailsPanel(page, {
      label: 'Test Goal from API',
      type: 'goal'
    });
  });

  test('should update node via edge function and reflect changes', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Find an existing node to update
    const nodes = await getGraphNodes(page);
    const nodeToUpdate = nodes.find(node => node.type === 'goal');
    expect(nodeToUpdate).toBeDefined();
    
    // Get auth token for API call
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Update node via graph-operations edge function
    const updateResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'update_node',
        data: {
          nodeId: nodeToUpdate!.id,
          updates: {
            label: 'Updated Goal Label',
            description: 'This description was updated via E2E test'
          }
        }
      }
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    
    // Wait for real-time update to appear
    await page.waitForFunction(
      (updatedLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return false;
        
        const node = cy.nodes().filter((n: any) => n.data('label') === updatedLabel);
        return node.length > 0;
      },
      'Updated Goal Label',
      { timeout: 5000 }
    );
    
    // Verify the update is reflected in the graph
    const updatedNodes = await getGraphNodes(page);
    expect(updatedNodes.some(node => node.label === 'Updated Goal Label')).toBeTruthy();
  });

  test('should handle graph data for different node statuses', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const nodes = await getGraphNodes(page);
    
    // Verify we have nodes with different statuses
    expect(nodes.some(node => node.status === 'draft_verbal')).toBeTruthy();
    expect(nodes.some(node => node.status === 'curated')).toBeTruthy();
    
    // Draft nodes should be visually distinct (this would need custom styling)
    const draftNode = nodes.find(node => node.status === 'draft_verbal');
    const curatedNode = nodes.find(node => node.status === 'curated');
    
    if (draftNode && curatedNode) {
      // Click each and verify details show correct status
      await clickNodeByLabel(page, draftNode.label);
      await expect(page.locator('[data-testid="node-details"]:has-text("draft_verbal")')).toBeVisible();
      
      await clickNodeByLabel(page, curatedNode.label);
      await expect(page.locator('[data-testid="node-details"]:has-text("curated")')).toBeVisible();
    }
  });

  test('should display edges between connected nodes', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Verify we have edges in the graph
    const edgeCount = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.edges().length : 0;
    });
    
    expect(edgeCount).toBeGreaterThan(0);
    
    // Get edge information
    const edges = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      
      return cy.edges().map((edge: any) => ({
        id: edge.id(),
        source: edge.source().data('label'),
        target: edge.target().data('label'),
        type: edge.data('type')
      }));
    });
    
    // Verify we have expected edge types
    const edgeTypes = new Set(edges.map((edge: any) => edge.type));
    expect(edgeTypes.size).toBeGreaterThan(0);
    
    console.log('Found edges:', edges);
    console.log('Edge types:', Array.from(edgeTypes));
  });

  test('should handle empty graph state gracefully', async ({ page }) => {
    // Sign in as user 2 who has minimal data
    await signInUser(page, TEST_USERS.USER_2);
    
    await page.goto('/dashboard');
    
    // Should show empty state or minimal graph
    await page.waitForLoadState('networkidle');
    
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeLessThanOrEqual(1); // User 2 has only one test node
    
    // Should not crash or show errors
    await expect(page.locator('.error, [data-testid="error"]')).not.toBeVisible();
  });
});