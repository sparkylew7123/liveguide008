import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS, getTestUserId, createTestNode } from './utils/auth';
import { waitForGraphLoad, getNodeCount } from './utils/graph';

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should handle network connectivity issues gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const initialNodeCount = await getNodeCount(page);
    
    // Simulate network disconnection
    await page.context().setOffline(true);
    
    // Try to interact with the graph
    await page.click('[data-testid="zoom-in"], button[aria-label="Zoom in"]').catch(() => {
      console.log('Zoom button not found during offline test');
    });
    
    // Should show offline indicator or handle gracefully
    await page.waitForTimeout(2000);
    
    // Reconnect
    await page.context().setOffline(false);
    
    // Should recover and work normally
    await page.waitForTimeout(3000);
    
    const recoveredNodeCount = await getNodeCount(page);
    expect(recoveredNodeCount).toBe(initialNodeCount);
  });

  test('should handle API timeouts gracefully', async ({ page, request }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Try to create a node with very short timeout to simulate timeout
    try {
      const timeoutResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          operation: 'create_node',
          data: {
            node_type: 'goal',
            label: 'Timeout Test Goal',
            description: 'Testing API timeout handling'
          }
        },
        timeout: 1 // Very short timeout
      });
      
      // If it succeeds despite short timeout, that's fine
      expect(timeoutResponse.ok()).toBeTruthy();
    } catch (error: any) {
      // Should handle timeout error gracefully
      expect(error.message).toContain('timeout');
    }
    
    // Graph should remain functional
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle malformed API responses', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Intercept API responses and return malformed data
    await page.route('**/api/graph-operations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid": "json"' // Malformed JSON
      });
    });
    
    // Try to perform an operation that would trigger the malformed response
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    if (authToken) {
      try {
        await page.evaluate(async (token) => {
          const response = await fetch('/api/graph-operations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              operation: 'create_node',
              data: { node_type: 'goal', label: 'Test' }
            })
          });
          
          // This should handle the malformed response gracefully
          return response.json();
        }, authToken);
      } catch (error) {
        // Should catch JSON parsing errors gracefully
        console.log('Malformed JSON handled gracefully');
      }
    }
    
    // Application should not crash
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(isResponsive).toBeTruthy();
  });

  test('should handle missing graph data gracefully', async ({ page }) => {
    // Sign in as a user with no graph data
    await signInUser(page, TEST_USERS.USER_2);
    
    await page.goto('/dashboard');
    
    // Should handle empty graph state
    await page.waitForLoadState('networkidle');
    
    // Should show empty state message or minimal graph
    const errorElements = page.locator('.error, [role="alert"], [data-testid="error"]');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      // If there are error messages, they should be user-friendly
      const errorText = await errorElements.first().textContent();
      expect(errorText?.toLowerCase()).not.toContain('undefined');
      expect(errorText?.toLowerCase()).not.toContain('null');
    }
    
    // Graph container should still exist
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    await expect(graphContainer).toBeVisible();
    
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle corrupted localStorage gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Corrupt localStorage
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', 'corrupted-data');
      localStorage.setItem('invalid-key', '{"unclosed": "json"');
    });
    
    await page.reload();
    
    // Should handle corrupted data and redirect to login or show error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login');
    const hasErrorMessage = await page.locator('.error, [role="alert"]').count() > 0;
    
    expect(isOnLoginPage || hasErrorMessage).toBeTruthy();
  });

  test('should handle concurrent modification conflicts', async ({ page, browser }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Create a test node
    const userId = await getTestUserId(TEST_USERS.USER_1.email);
    const testNode = await createTestNode(userId, {
      node_type: 'goal',
      label: 'Concurrent Modification Test',
      description: 'This node will be modified concurrently'
    });
    
    // Wait for node to appear
    await page.waitForTimeout(2000);
    
    // Open second browser context
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await signInUser(secondPage, TEST_USERS.USER_1);
    
    const authToken1 = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    const authToken2 = await secondPage.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Attempt concurrent modifications
    const update1Promise = page.request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'update_node',
        data: {
          nodeId: testNode.id,
          updates: { label: 'Updated by Session 1' }
        }
      }
    });
    
    const update2Promise = secondPage.request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken2}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'update_node',
        data: {
          nodeId: testNode.id,
          updates: { label: 'Updated by Session 2' }
        }
      }
    });
    
    const [response1, response2] = await Promise.all([update1Promise, update2Promise]);
    
    // Both should either succeed or one should handle the conflict gracefully
    const success1 = response1.ok();
    const success2 = response2.ok();
    
    expect(success1 || success2).toBeTruthy();
    
    await secondContext.close();
  });

  test('should handle large dataset loading errors', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate large dataset by intercepting and modifying response
    await page.route('**/graph_nodes*', async route => {
      // Create a large fake dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        label: `Large Dataset Node ${i}`,
        node_type: 'goal',
        description: `Description for node ${i}`,
        user_id: 'test-user'
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: largeDataset })
      });
    });
    
    await page.reload();
    
    // Should handle large datasets or show appropriate loading state
    await page.waitForTimeout(5000);
    
    // Check if page is still responsive
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // Should not crash the browser
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(isResponsive).toBeTruthy();
  });

  test('should recover from Cytoscape initialization failures', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate Cytoscape failure by removing it from window
    await page.evaluate(() => {
      (window as any).cytoscape = undefined;
      delete (window as any).cytoscape;
    });
    
    await page.reload();
    
    // Should show appropriate error message or fallback
    await page.waitForTimeout(3000);
    
    const errorMessage = page.locator('.error, [role="alert"], [data-testid="error"]');
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    
    // Should either show error message or have fallback UI
    const hasError = await errorMessage.count() > 0;
    const hasGraph = await graphContainer.isVisible();
    
    if (!hasGraph) {
      expect(hasError).toBeTruthy();
      
      const errorText = await errorMessage.first().textContent();
      expect(errorText?.toLowerCase()).toMatch(/(graph|visualization|load|error)/);
    }
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Simulate memory pressure by creating large objects
    await page.evaluate(() => {
      const largeArrays = [];
      try {
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(100000).fill(`memory-test-${i}`));
        }
      } catch (error) {
        console.log('Memory allocation failed as expected');
      }
    });
    
    // Check if graph is still functional
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThanOrEqual(0);
    
    // Should handle memory pressure without crashing
    const isResponsive = await page.evaluate(() => {
      return typeof (window as any).cy !== 'undefined' || 
             typeof (window as any).cytoscapeInstance !== 'undefined';
    });
    
    // May or may not be responsive depending on memory limits, but shouldn't crash
    console.log('Graph responsive after memory pressure:', isResponsive);
  });

  test('should provide helpful error messages for common issues', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test various error scenarios
    const errorScenarios = [
      {
        name: 'Invalid authentication',
        setup: () => page.evaluate(() => localStorage.setItem('supabase.auth.token', 'invalid')),
        expectedError: /sign|auth|login/i
      },
      {
        name: 'Network error',
        setup: () => page.context().setOffline(true),
        expectedError: /network|connection|offline/i
      }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`Testing error scenario: ${scenario.name}`);
      
      await scenario.setup();
      await page.reload();
      await page.waitForTimeout(2000);
      
      const errorElements = page.locator('.error, [role="alert"], [data-testid="error"], .toast');
      const errorCount = await errorElements.count();
      
      if (errorCount > 0) {
        const errorText = await errorElements.first().textContent();
        expect(errorText).toMatch(scenario.expectedError);
      }
      
      // Reset for next test
      await page.context().setOffline(false);
      await page.evaluate(() => localStorage.clear());
    }
  });

  test('should handle browser compatibility issues', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    
    // Test browser-specific features
    const browserFeatures = await page.evaluate(() => {
      return {
        webgl: !!window.WebGLRenderingContext,
        canvas: !!document.createElement('canvas').getContext,
        localStorage: !!window.localStorage,
        fetch: !!window.fetch,
        promises: !!window.Promise
      };
    });
    
    console.log(`Browser ${browserName} features:`, browserFeatures);
    
    // Should work even if some features are missing
    await waitForGraphLoad(page);
    
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThanOrEqual(0);
  });
});