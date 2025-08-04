import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS, getTestUserId, createTestNode, createTestEdge } from './utils/auth';
import { waitForGraphLoad, getNodeCount, getEdgeCount, getGraphNodes, clickNodeByLabel } from './utils/graph';

test.describe('Node Creation and Edge Relationships', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should create nodes via graph-operations edge function', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    // Get auth token
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Create a new goal node via edge function
    const createNodeResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_node',
        data: {
          node_type: 'goal',
          label: 'New E2E Test Goal',
          description: 'Created via edge function during E2E test',
          status: 'draft_verbal',
          properties: { priority: 'high', test: true }
        }
      }
    });
    
    expect(createNodeResponse.ok()).toBeTruthy();
    const responseData = await createNodeResponse.json();
    expect(responseData.data.id).toBeDefined();
    
    // Wait for the new node to appear in the graph
    await page.waitForFunction(
      (expectedCount) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy && cy.nodes().length >= expectedCount;
      },
      initialNodeCount + 1,
      { timeout: 10000 }
    );
    
    // Verify the node appears in the graph
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 1);
    
    const nodes = await getGraphNodes(page);
    const newNode = nodes.find(node => node.label === 'New E2E Test Goal');
    expect(newNode).toBeDefined();
    expect(newNode!.type).toBe('goal');
    expect(newNode!.status).toBe('draft_verbal');
  });

  test('should create different types of nodes', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    const nodeTypes = [
      { type: 'skill', label: 'Test Skill', description: 'A skill node' },
      { type: 'emotion', label: 'Test Emotion', description: 'An emotion node' },
      { type: 'accomplishment', label: 'Test Achievement', description: 'An accomplishment node' }
    ];
    
    const createdNodes = [];
    
    for (const nodeData of nodeTypes) {
      const response = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          operation: 'create_node',
          data: {
            node_type: nodeData.type,
            label: nodeData.label,
            description: nodeData.description,
            status: 'draft_verbal'
          }
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();
      createdNodes.push(responseData.data);
    }
    
    // Wait for all nodes to appear
    await page.waitForTimeout(3000);
    
    // Verify all node types are in the graph
    const nodes = await getGraphNodes(page);
    for (const nodeData of nodeTypes) {
      const foundNode = nodes.find(node => node.label === nodeData.label);
      expect(foundNode).toBeDefined();
      expect(foundNode!.type).toBe(nodeData.type);
    }
  });

  test('should create edges between nodes', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialEdgeCount = await getEdgeCount(page);
    
    // Get existing nodes to connect
    const nodes = await getGraphNodes(page);
    const goalNode = nodes.find(node => node.type === 'goal');
    const skillNode = nodes.find(node => node.type === 'skill');
    
    expect(goalNode).toBeDefined();
    expect(skillNode).toBeDefined();
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Create an edge between the nodes
    const createEdgeResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_edge',
        data: {
          edge_type: 'requires',
          source_node_id: goalNode!.id,
          target_node_id: skillNode!.id,
          label: 'requires skill',
          weight: 0.8,
          properties: { test: true }
        }
      }
    });
    
    expect(createEdgeResponse.ok()).toBeTruthy();
    
    // Wait for the edge to appear
    await page.waitForFunction(
      (expectedCount) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy && cy.edges().length >= expectedCount;
      },
      initialEdgeCount + 1,
      { timeout: 10000 }
    );
    
    // Verify the edge exists in the graph
    const updatedEdgeCount = await getEdgeCount(page);
    expect(updatedEdgeCount).toBe(initialEdgeCount + 1);
    
    // Verify edge connects the correct nodes
    const edges = await page.evaluate(() => {
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
    
    const newEdge = edges.find((edge: any) => 
      edge.source === goalNode!.id && edge.target === skillNode!.id && edge.type === 'requires'
    );
    expect(newEdge).toBeDefined();
  });

  test('should delete nodes and clean up edges', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Create a node to delete
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const testNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Node to Delete',
      description: 'This node will be deleted in the test'
    });
    
    // Wait for the node to appear
    await page.waitForFunction(
      (nodeLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return false;
        const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
        return node.length > 0;
      },
      'Node to Delete',
      { timeout: 10000 }
    );
    
    const initialNodeCount = await getNodeCount(page);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Delete the node
    const deleteResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'delete_node',
        data: {
          nodeId: testNode.id
        }
      }
    });
    
    expect(deleteResponse.ok()).toBeTruthy();
    
    // Wait for the node to disappear
    await page.waitForFunction(
      (nodeLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return true;
        const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
        return node.length === 0;
      },
      'Node to Delete',
      { timeout: 10000 }
    );
    
    // Verify the node is gone
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount - 1);
    
    const nodes = await getGraphNodes(page);
    expect(nodes.find(node => node.label === 'Node to Delete')).toBeUndefined();
  });

  test('should update node status from draft to curated', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Find a draft node
    const nodes = await getGraphNodes(page);
    const draftNode = nodes.find(node => node.status === 'draft_verbal');
    expect(draftNode).toBeDefined();
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Update node status to curated
    const updateResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'update_status',
        data: {
          nodeId: draftNode!.id,
          status: 'curated'
        }
      }
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    
    // Wait for the status update to be reflected
    await page.waitForTimeout(2000);
    
    // Click on the node and verify the status changed
    await clickNodeByLabel(page, draftNode!.label);
    
    // Check that the node details show the updated status
    const detailsPanel = page.locator('[data-testid="node-details"]');
    await expect(detailsPanel).toBeVisible();
    await expect(detailsPanel.locator('text=curated')).toBeVisible();
  });

  test('should handle edge creation validation', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Try to create an edge with invalid node IDs
    const invalidEdgeResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_edge',
        data: {
          edge_type: 'requires',
          source_node_id: 'invalid-id-1',
          target_node_id: 'invalid-id-2',
          label: 'invalid edge'
        }
      }
    });
    
    expect(invalidEdgeResponse.ok()).toBeFalsy();
    const errorResponse = await invalidEdgeResponse.json();
    expect(errorResponse.error).toBeDefined();
  });

  test('should handle concurrent node creation', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Create multiple nodes concurrently
    const createPromises = [];
    for (let i = 0; i < 3; i++) {
      createPromises.push(
        request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            operation: 'create_node',
            data: {
              node_type: 'goal',
              label: `Concurrent Goal ${i + 1}`,
              description: `Goal created concurrently ${i + 1}`,
              status: 'draft_verbal'
            }
          }
        })
      );
    }
    
    const responses = await Promise.all(createPromises);
    
    // All requests should succeed
    for (const response of responses) {
      expect(response.ok()).toBeTruthy();
    }
    
    // Wait for all nodes to appear
    await page.waitForFunction(
      (expectedCount) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy && cy.nodes().length >= expectedCount;
      },
      initialNodeCount + 3,
      { timeout: 15000 }
    );
    
    // Verify all nodes are present
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 3);
    
    const nodes = await getGraphNodes(page);
    for (let i = 0; i < 3; i++) {
      expect(nodes.some(node => node.label === `Concurrent Goal ${i + 1}`)).toBeTruthy();
    }
  });
});