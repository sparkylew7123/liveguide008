import { test, expect } from '@playwright/test';
import { signInUser, signOutUser, TEST_USERS, getTestUserId, createTestNode } from './utils/auth';
import { waitForGraphLoad, getGraphNodes, getNodeCount } from './utils/graph';

test.describe('Row Level Security (RLS) Policies', () => {
  test('should only show user-specific data in graph', async ({ page, browser }) => {
    // Sign in as user 1
    await signInUser(page, TEST_USERS.USER_1);
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Get user 1's node count and data
    const user1Nodes = await getGraphNodes(page);
    const user1NodeCount = user1Nodes.length;
    const user1NodeLabels = user1Nodes.map(node => node.label);
    
    expect(user1NodeCount).toBeGreaterThan(0);
    
    // Sign out and sign in as user 2
    await signOutUser(page);
    await signInUser(page, TEST_USERS.USER_2);
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Get user 2's node data
    const user2Nodes = await getGraphNodes(page);
    const user2NodeLabels = user2Nodes.map(node => node.label);
    
    // Users should not see each other's data
    const hasOverlap = user1NodeLabels.some(label => user2NodeLabels.includes(label));
    expect(hasOverlap).toBeFalsy();
    
    // User 2 should have their own test data (minimal)
    expect(user2Nodes.some(node => node.label.includes('User 2'))).toBeTruthy();
  });

  test('should prevent unauthorized node access via API', async ({ page, request }) => {
    // Sign in as user 1
    await signInUser(page, TEST_USERS.USER_1);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Create a node for user 2 directly in the database
    const user2Id = await getTestUserId(TEST_USERS.USER_2.email);
    const user2Node = await createTestNode(user2Id, {
      node_type: 'goal',
      label: 'User 2 Private Goal',
      description: 'This should not be accessible by user 1'
    });
    
    // Try to access user 2's node via API while signed in as user 1
    const unauthorizedAccess = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'update_node',
        data: {
          nodeId: user2Node.id,
          updates: {
            label: 'Hacked by User 1'
          }
        }
      }
    });
    
    // Should be denied due to RLS
    expect(unauthorizedAccess.ok()).toBeFalsy();
    expect(unauthorizedAccess.status()).toBe(400);
  });

  test('should prevent cross-user edge creation', async ({ page, request }) => {
    await signInUser(page, TEST_USERS.USER_1);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Get user 1's nodes
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    const user1Nodes = await getGraphNodes(page);
    expect(user1Nodes.length).toBeGreaterThan(0);
    
    // Create a node for user 2
    const user2Id = await getTestUserId(TEST_USERS.USER_2.email);
    const user2Node = await createTestNode(user2Id, {
      node_type: 'goal',
      label: 'User 2 Goal for Edge Test',
      description: 'Should not be connectable by user 1'
    });
    
    // Try to create an edge between user 1's node and user 2's node
    const unauthorizedEdge = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_edge',
        data: {
          edge_type: 'unauthorized_connection',
          source_node_id: user1Nodes[0].id,
          target_node_id: user2Node.id,
          label: 'cross-user edge'
        }
      }
    });
    
    // Should be denied due to RLS
    expect(unauthorizedEdge.ok()).toBeFalsy();
  });

  test('should handle unauthenticated requests properly', async ({ page, request }) => {
    // Make API requests without authentication
    const unauthenticatedRequest = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_node',
        data: {
          node_type: 'goal',
          label: 'Unauthorized Goal',
          description: 'This should not be created'
        }
      }
    });
    
    expect(unauthenticatedRequest.status()).toBe(401);
  });

  test('should prevent node deletion by unauthorized users', async ({ page, request }) => {
    // Create a node as user 1
    await signInUser(page, TEST_USERS.USER_1);
    
    const user1AuthToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    const createResponse = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${user1AuthToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_node',
        data: {
          node_type: 'goal',
          label: 'User 1 Protected Goal',
          description: 'This should only be deletable by user 1'
        }
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const nodeData = await createResponse.json();
    const nodeId = nodeData.data.id;
    
    // Sign out user 1 and sign in as user 2
    await signOutUser(page);
    await signInUser(page, TEST_USERS.USER_2);
    
    const user2AuthToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Try to delete user 1's node as user 2
    const unauthorizedDelete = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${user2AuthToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'delete_node',
        data: {
          nodeId: nodeId
        }
      }
    });
    
    // Should be denied
    expect(unauthorizedDelete.ok()).toBeFalsy();
  });

  test('should handle expired authentication tokens', async ({ page, request }) => {
    await signInUser(page, TEST_USERS.USER_1);
    
    // Use an obviously expired or invalid token
    const expiredToken = 'expired.jwt.token';
    
    const expiredTokenRequest = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
      headers: {
        'Authorization': `Bearer ${expiredToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        operation: 'create_node',
        data: {
          node_type: 'goal',
          label: 'Should Not Be Created',
          description: 'Expired token test'
        }
      }
    });
    
    expect(expiredTokenRequest.status()).toBe(401);
  });

  test('should enforce user isolation in real-time subscriptions', async ({ page, browser }) => {
    // Set up user 1 session
    await signInUser(page, TEST_USERS.USER_1);
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const user1InitialCount = await getNodeCount(page);
    
    // Set up user 2 session in a separate context
    const user2Context = await browser.newContext();
    const user2Page = await user2Context.newPage();
    await signInUser(user2Page, TEST_USERS.USER_2);
    await user2Page.goto('/dashboard');
    await waitForGraphLoad(user2Page);
    
    const user2InitialCount = await getNodeCount(user2Page);
    
    // Create a node for user 2
    const user2Id = await getTestUserId(TEST_USERS.USER_2.email);
    await createTestNode(user2Id, {
      node_type: 'goal',
      label: 'User 2 Real-time Isolation Test',
      description: 'Should not appear for user 1'
    });
    
    // Wait for real-time updates
    await page.waitForTimeout(5000);
    await user2Page.waitForTimeout(5000);
    
    // User 1 should not see user 2's new node
    const user1FinalCount = await getNodeCount(page);
    expect(user1FinalCount).toBe(user1InitialCount);
    
    // User 2 should see their new node
    const user2FinalCount = await getNodeCount(user2Page);
    expect(user2FinalCount).toBe(user2InitialCount + 1);
    
    await user2Context.close();
  });

  test('should validate user ownership in embedding operations', async ({ page, request }) => {
    await signInUser(page, TEST_USERS.USER_1);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Create a node for user 2
    const user2Id = await getTestUserId(TEST_USERS.USER_2.email);
    const user2Node = await createTestNode(user2Id, {
      node_type: 'goal',
      label: 'User 2 Embedding Test',
      description: 'Should not be accessible for embedding by user 1'
    });
    
    // Try to generate embeddings for user 2's node while signed in as user 1
    const unauthorizedEmbedding = await request.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          node_id: user2Node.id,
          text: 'User 2 Embedding Test Should not be accessible for embedding by user 1'
        }
      }
    );
    
    // Should be denied due to RLS
    expect(unauthorizedEmbedding.ok()).toBeFalsy();
  });

  test('should prevent SQL injection in graph operations', async ({ page, request }) => {
    await signInUser(page, TEST_USERS.USER_1);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Try various SQL injection attempts
    const sqlInjectionAttempts = [
      "'; DROP TABLE graph_nodes; --",
      "' OR '1'='1",
      "'; UPDATE graph_nodes SET user_id = 'hacker'; --",
      "' UNION SELECT * FROM auth.users; --"
    ];
    
    for (const injection of sqlInjectionAttempts) {
      const maliciousRequest = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          operation: 'create_node',
          data: {
            node_type: 'goal',
            label: injection,
            description: injection
          }
        }
      });
      
      // Should either succeed with escaped content or fail safely
      if (maliciousRequest.ok()) {
        const result = await maliciousRequest.json();
        // Verify the injection was treated as literal text, not executed
        expect(result.data.label).toBe(injection);
      } else {
        // Or reject the malicious input entirely
        expect(maliciousRequest.status()).toBeGreaterThanOrEqual(400);
      }
    }
  });

  test('should handle privilege escalation attempts', async ({ page, request }) => {
    await signInUser(page, TEST_USERS.USER_1);
    
    const authToken = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return auth.access_token;
    });
    
    // Try to perform admin-level operations
    const adminAttempts = [
      {
        operation: 'delete_all_nodes',
        data: { confirm: true }
      },
      {
        operation: 'update_user_permissions',
        data: { userId: 'any-user', permissions: 'admin' }
      },
      {
        operation: 'access_all_user_data',
        data: {}
      }
    ];
    
    for (const attempt of adminAttempts) {
      const privilegeEscalation = await request.post(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/api/graph-operations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: attempt
      });
      
      // Should be rejected as invalid operation or unauthorized
      expect(privilegeEscalation.ok()).toBeFalsy();
    }
  });
});