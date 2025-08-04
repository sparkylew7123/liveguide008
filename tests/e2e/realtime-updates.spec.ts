import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS, getTestUserId, createTestNode, createTestEdge } from './utils/auth';
import { waitForGraphLoad, getNodeCount, getEdgeCount, waitForNewNode } from './utils/graph';

test.describe('Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should receive real-time node creation updates', async ({ page, browser }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    // Open a second browser context to simulate another session
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    
    // Sign in with the same user in the second session
    await signInUser(secondPage, TEST_USERS.USER_1);
    await secondPage.goto('/dashboard');
    await waitForGraphLoad(secondPage);
    
    // Create a node in the second session
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const newNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Real-time Test Goal',
      description: 'This node should appear in real-time',
      status: 'draft_verbal'
    });
    
    // The first page should receive the real-time update
    await waitForNewNode(page, 'Real-time Test Goal', 10000);
    
    // Verify the node count increased
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 1);
    
    // Verify the second page also has the node
    await waitForNewNode(secondPage, 'Real-time Test Goal', 5000);
    const secondPageNodeCount = await getNodeCount(secondPage);
    expect(secondPageNodeCount).toBe(initialNodeCount + 1);
    
    await secondContext.close();
  });

  test('should receive real-time node update notifications', async ({ page, browser }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Create a node to update
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const testNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Node to Update',
      description: 'Original description'
    });
    
    // Wait for the node to appear
    await waitForNewNode(page, 'Node to Update', 10000);
    
    // Open second browser context
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    
    // Set up a listener for toast notifications
    const toastPromise = page.waitForSelector('.toast, [data-testid="toast"], .notification', { timeout: 10000 });
    
    // Update the node via API (simulating update from another session)
    const authToken = await secondPage.evaluate(() => {
      return 'dummy-token'; // We'll use direct API call instead
    });
    
    // Direct database update to trigger real-time event
    const { getTestSupabaseClient } = await import('./utils/auth');
    const supabase = getTestSupabaseClient();
    
    const { error } = await supabase
      .from('graph_nodes')
      .update({
        label: 'Updated Node Label',
        description: 'Updated description via real-time test'
      })
      .eq('id', testNode.id);
    
    expect(error).toBeNull();
    
    // The first page should receive a real-time update notification
    try {
      await toastPromise;
      console.log('Real-time update notification received');
    } catch (e) {
      console.log('No toast notification detected, checking for graph update directly');
    }
    
    // Verify the node label was updated in the graph
    await page.waitForFunction(
      (updatedLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return false;
        const node = cy.nodes().filter((n: any) => n.data('label') === updatedLabel);
        return node.length > 0;
      },
      'Updated Node Label',
      { timeout: 10000 }
    );
    
    await secondContext.close();
  });

  test('should receive real-time edge creation updates', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialEdgeCount = await getEdgeCount(page);
    
    // Get existing nodes to connect
    const nodes = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      return cy.nodes().map((node: any) => ({
        id: node.id(),
        type: node.data('type')
      }));
    });
    
    const goalNode = nodes.find((n: any) => n.type === 'goal');
    const skillNode = nodes.find((n: any) => n.type === 'skill');
    
    if (goalNode && skillNode) {
      // Create edge via direct database insertion to trigger real-time update
      const userId = await getTestUserId(TEST_USERS.USER_1.email);
      await createTestEdge(userId, {
        edge_type: 'test_connection',
        source_node_id: goalNode.id,
        target_node_id: skillNode.id,
        label: 'real-time edge'
      });
      
      // Wait for the edge to appear in real-time
      await page.waitForFunction(
        (expectedCount) => {
          const cy = (window as any).cy || (window as any).cytoscapeInstance;
          return cy && cy.edges().length >= expectedCount;
        },
        initialEdgeCount + 1,
        { timeout: 10000 }
      );
      
      const updatedEdgeCount = await getEdgeCount(page);
      expect(updatedEdgeCount).toBe(initialEdgeCount + 1);
    }
  });

  test('should handle multiple concurrent real-time updates', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    
    // Create multiple nodes rapidly to test real-time update handling
    const nodePromises = [];
    for (let i = 0; i < 5; i++) {
      nodePromises.push(
        createTestNode(userId, {
          node_type: 'goal',
          label: `Concurrent RT Goal ${i + 1}`,
          description: `Real-time goal ${i + 1}`,
          status: 'draft_verbal'
        })
      );
    }
    
    await Promise.all(nodePromises);
    
    // Wait for all nodes to appear in the graph
    await page.waitForFunction(
      (expectedCount) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        return cy && cy.nodes().length >= expectedCount;
      },
      initialNodeCount + 5,
      { timeout: 15000 }
    );
    
    const finalNodeCount = await getNodeCount(page);
    expect(finalNodeCount).toBe(initialNodeCount + 5);
    
    // Verify all nodes are present
    const nodes = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      return cy.nodes().map((node: any) => node.data('label'));
    });
    
    for (let i = 0; i < 5; i++) {
      expect(nodes).toContain(`Concurrent RT Goal ${i + 1}`);
    }
  });

  test('should handle real-time node deletion updates', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Create a node to delete
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const nodeToDelete = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Node for RT Deletion',
      description: 'This node will be deleted via real-time'
    });
    
    // Wait for the node to appear
    await waitForNewNode(page, 'Node for RT Deletion', 10000);
    
    const nodeCountBeforeDeletion = await getNodeCount(page);
    
    // Delete the node via direct database update (soft delete)
    const { getTestSupabaseClient } = await import('./utils/auth');
    const supabase = getTestSupabaseClient();
    
    const { error } = await supabase
      .from('graph_nodes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', nodeToDelete.id);
    
    expect(error).toBeNull();
    
    // Wait for the node to disappear from the graph
    await page.waitForFunction(
      (nodeLabel) => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (!cy) return true;
        const node = cy.nodes().filter((n: any) => n.data('label') === nodeLabel);
        return node.length === 0;
      },
      'Node for RT Deletion',
      { timeout: 10000 }
    );
    
    const nodeCountAfterDeletion = await getNodeCount(page);
    expect(nodeCountAfterDeletion).toBe(nodeCountBeforeDeletion - 1);
  });

  test('should maintain real-time connection after network interruption', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    // Simulate network interruption by going offline and back online
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    await page.context().setOffline(false);
    
    // Wait for reconnection
    await page.waitForTimeout(3000);
    
    // Create a node to test if real-time updates still work
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const newNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Post-Reconnection Node',
      description: 'Node created after network interruption'
    });
    
    // Should receive the real-time update
    await waitForNewNode(page, 'Post-Reconnection Node', 15000);
    
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 1);
  });

  test('should filter real-time updates based on user permissions', async ({ page, browser }) => {
    // Sign in as user 1
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const user1InitialCount = await getNodeCount(page);
    
    // Open second browser context with user 2
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await signInUser(secondPage, TEST_USERS.USER_2);
    await secondPage.goto('/dashboard');
    await waitForGraphLoad(secondPage);
    
    const user2InitialCount = await getNodeCount(secondPage);
    
    // Create a node for user 2
    const user2Id = await getTestUserId(TEST_USERS.USER_2.email);
    await createTestNode(user2Id, {
      node_type: 'goal',
      label: 'User 2 Private Goal',
      description: 'This should not appear for user 1'
    });
    
    // User 2 should see their new node
    await waitForNewNode(secondPage, 'User 2 Private Goal', 10000);
    const user2UpdatedCount = await getNodeCount(secondPage);
    expect(user2UpdatedCount).toBe(user2InitialCount + 1);
    
    // User 1 should NOT see user 2's node (wait and verify no change)
    await page.waitForTimeout(5000);
    const user1FinalCount = await getNodeCount(page);
    expect(user1FinalCount).toBe(user1InitialCount);
    
    // Verify user 1 doesn't have user 2's node
    const user1Nodes = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (!cy) return [];
      return cy.nodes().map((node: any) => node.data('label'));
    });
    
    expect(user1Nodes).not.toContain('User 2 Private Goal');
    
    await secondContext.close();
  });

  test('should handle real-time subscription cleanup on page navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Navigate away from the graph page
    await page.goto('/settings'); // or any other page
    await page.waitForTimeout(1000);
    
    // Navigate back to the graph
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Real-time updates should still work after navigation
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const initialNodeCount = await getNodeCount(page);
    
    await createTestNode(userId, {
      node_type: 'goal',
      label: 'Post-Navigation Node',
      description: 'Node created after page navigation'
    });
    
    await waitForNewNode(page, 'Post-Navigation Node', 10000);
    
    const updatedNodeCount = await getNodeCount(page);
    expect(updatedNodeCount).toBe(initialNodeCount + 1);
  });
});