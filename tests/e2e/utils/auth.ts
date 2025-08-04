import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export interface TestUser {
  email: string;
  password: string;
  id?: string;
}

export const TEST_USERS = {
  USER_1: {
    email: 'test-user-1@liveguide.test',
    password: 'TestPassword123!'
  },
  USER_2: {
    email: 'test-user-2@liveguide.test',
    password: 'TestPassword123!'
  }
} as const;

/**
 * Sign in a test user through the UI
 */
export async function signInUser(page: Page, user: TestUser) {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for login form to be visible
  await expect(page.locator('form')).toBeVisible();
  
  // Fill in credentials
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  // Submit form and wait for navigation
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login')),
    page.click('button[type="submit"]')
  ]);
  
  // Verify we're logged in (should be redirected away from login)
  expect(page.url()).not.toContain('/login');
}

/**
 * Sign out the current user through the UI
 */
export async function signOutUser(page: Page) {
  // Look for a sign out button/link (adjust selector based on your UI)
  try {
    await page.click('[data-testid="sign-out"], [aria-label="Sign out"], text="Sign out"');
    await page.waitForURL('/login');
  } catch (error) {
    // Fallback: clear localStorage and navigate to login
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
  }
}

/**
 * Get a Supabase client for backend operations during testing
 */
export function getTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for testing');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Create a test node directly in the database
 */
export async function createTestNode(userId: string, nodeData: {
  node_type: string;
  label: string;
  description?: string;
  status?: string;
  properties?: Record<string, any>;
}) {
  const supabase = getTestSupabaseClient();
  
  const { data, error } = await supabase
    .from('graph_nodes')
    .insert({
      user_id: userId,
      status: 'draft_verbal',
      properties: {},
      ...nodeData
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create test node: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a test edge directly in the database
 */
export async function createTestEdge(userId: string, edgeData: {
  edge_type: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  weight?: number;
  properties?: Record<string, any>;
}) {
  const supabase = getTestSupabaseClient();
  
  const { data, error } = await supabase
    .from('graph_edges')
    .insert({
      user_id: userId,
      weight: 1.0,
      properties: {},
      ...edgeData
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create test edge: ${error.message}`);
  }
  
  return data;
}

/**
 * Get test user ID by email
 */
export async function getTestUserId(email: string): Promise<string> {
  const supabase = getTestSupabaseClient();
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u: any) => u.email === email);
  
  if (!user) {
    throw new Error(`Test user not found: ${email}`);
  }
  
  return user.id;
}

/**
 * Clean up test data for a specific user
 */
export async function cleanupUserData(userId: string) {
  const supabase = getTestSupabaseClient();
  
  // Delete edges first (foreign key constraints)
  await supabase
    .from('graph_edges')
    .delete()
    .eq('user_id', userId);
  
  // Then delete nodes
  await supabase
    .from('graph_nodes')
    .delete()
    .eq('user_id', userId);
}

/**
 * Wait for authentication state to settle
 */
export async function waitForAuthState(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle');
  
  // Wait for any auth-related JavaScript to execute
  await page.waitForFunction(
    () => {
      // Check if Supabase auth is initialized
      return window.localStorage.getItem('supabase.auth.token') !== null ||
             window.location.pathname.includes('/login');
    },
    { timeout }
  );
}

/**
 * Verify user is authenticated by checking for auth tokens
 */
export async function verifyAuthState(page: Page, shouldBeAuthenticated: boolean) {
  const hasAuthToken = await page.evaluate(() => {
    return window.localStorage.getItem('supabase.auth.token') !== null;
  });
  
  if (shouldBeAuthenticated) {
    expect(hasAuthToken).toBeTruthy();
    expect(page.url()).not.toContain('/login');
  } else {
    expect(hasAuthToken).toBeFalsy();
  }
}