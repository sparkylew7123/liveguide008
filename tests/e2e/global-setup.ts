import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  console.log('Global setup: Preparing test environment...');

  // Initialize Supabase client for test data setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials not available. Some tests may fail.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Clean up any existing test data
    await cleanupTestData(supabase);
    
    // Create test users and sample graph data
    await setupTestData(supabase);
    
    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

async function cleanupTestData(supabase: any) {
  console.log('Cleaning up existing test data...');
  
  // Delete test users and their data
  const testEmails = [
    'test-user-1@liveguide.test',
    'test-user-2@liveguide.test',
    'test-admin@liveguide.test',
  ];

  for (const email of testEmails) {
    try {
      // Get user ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const testUser = users?.users?.find((u: any) => u.email === email);
      
      if (testUser) {
        // Delete user's graph data
        await supabase
          .from('graph_edges')
          .delete()
          .eq('user_id', testUser.id);
          
        await supabase
          .from('graph_nodes')
          .delete()
          .eq('user_id', testUser.id);
        
        // Delete user profile
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testUser.id);
        
        // Delete auth user
        await supabase.auth.admin.deleteUser(testUser.id);
      }
    } catch (error) {
      console.warn(`Failed to cleanup user ${email}:`, error);
    }
  }
}

async function setupTestData(supabase: any) {
  console.log('Setting up test data...');
  
  // Create test users
  const testUser1 = await supabase.auth.admin.createUser({
    email: 'test-user-1@liveguide.test',
    password: 'TestPassword123!',
    email_confirm: true,
  });

  const testUser2 = await supabase.auth.admin.createUser({
    email: 'test-user-2@liveguide.test',
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (testUser1.error || testUser2.error) {
    throw new Error('Failed to create test users');
  }

  console.log('Test users created successfully');

  // Create sample graph data for user 1
  await createSampleGraphData(supabase, testUser1.data.user.id);
  
  // Create minimal data for user 2 (for isolation testing)
  await createMinimalGraphData(supabase, testUser2.data.user.id);
}

async function createSampleGraphData(supabase: any, userId: string) {
  console.log('Creating sample graph data for user 1...');
  
  // Create diverse node types
  const nodes = [
    {
      user_id: userId,
      node_type: 'goal',
      label: 'Improve Fitness',
      description: 'Get in better shape and build healthy habits',
      status: 'curated',
      properties: { priority: 'high', category: 'health' }
    },
    {
      user_id: userId,
      node_type: 'goal',
      label: 'Learn Spanish',
      description: 'Become conversational in Spanish',
      status: 'draft_verbal',
      properties: { priority: 'medium', category: 'education' }
    },
    {
      user_id: userId,
      node_type: 'skill',
      label: 'Running',
      description: 'Cardiovascular endurance and stamina',
      status: 'curated',
      properties: { level: 'beginner' }
    },
    {
      user_id: userId,
      node_type: 'emotion',
      label: 'Motivation',
      description: 'Feeling motivated and energized',
      status: 'draft_verbal',
      properties: { intensity: 'high', valence: 'positive' }
    },
    {
      user_id: userId,
      node_type: 'session',
      label: 'Morning Workout Session',
      description: 'Daily morning exercise routine',
      status: 'curated',
      properties: { duration: '30min', type: 'cardio' }
    },
    {
      user_id: userId,
      node_type: 'accomplishment',
      label: 'Ran 5K',
      description: 'Successfully completed first 5K run',
      status: 'curated',
      properties: { date: '2024-01-15', time: '28:30' }
    }
  ];

  const insertedNodes = [];
  for (const node of nodes) {
    const { data, error } = await supabase
      .from('graph_nodes')
      .insert(node)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to insert node:', error);
      continue;
    }
    insertedNodes.push(data);
  }

  // Create edges between nodes
  const edges = [
    // Goal -> Skill connections
    {
      user_id: userId,
      edge_type: 'requires',
      source_node_id: insertedNodes[0]?.id, // Improve Fitness
      target_node_id: insertedNodes[2]?.id, // Running
      label: 'requires skill',
      weight: 0.8
    },
    // Skill -> Session connections
    {
      user_id: userId,
      edge_type: 'practiced_in',
      source_node_id: insertedNodes[2]?.id, // Running
      target_node_id: insertedNodes[4]?.id, // Morning Workout Session
      label: 'practiced in',
      weight: 1.0
    },
    // Session -> Accomplishment connections
    {
      user_id: userId,
      edge_type: 'led_to',
      source_node_id: insertedNodes[4]?.id, // Morning Workout Session
      target_node_id: insertedNodes[5]?.id, // Ran 5K
      label: 'led to accomplishment',
      weight: 0.9
    },
    // Emotion -> Goal connections
    {
      user_id: userId,
      edge_type: 'influences',
      source_node_id: insertedNodes[3]?.id, // Motivation
      target_node_id: insertedNodes[0]?.id, // Improve Fitness
      label: 'influences progress',
      weight: 0.7
    }
  ];

  for (const edge of edges) {
    if (edge.source_node_id && edge.target_node_id) {
      const { error } = await supabase
        .from('graph_edges')
        .insert(edge);
      
      if (error) {
        console.error('Failed to insert edge:', error);
      }
    }
  }

  console.log(`Created ${insertedNodes.length} nodes and ${edges.length} edges for test user 1`);
}

async function createMinimalGraphData(supabase: any, userId: string) {
  console.log('Creating minimal graph data for user 2...');
  
  // Create just one goal node for isolation testing
  const { data, error } = await supabase
    .from('graph_nodes')
    .insert({
      user_id: userId,
      node_type: 'goal',
      label: 'Test Goal User 2',
      description: 'This goal should not be visible to other users',
      status: 'curated',
      properties: { test: true }
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create minimal data for user 2:', error);
  } else {
    console.log('Created minimal graph data for user 2');
  }
}

export default globalSetup;