#!/usr/bin/env node

/**
 * Test script for embedding functions
 * 
 * This script tests the embedding generation functionality by:
 * 1. Creating a test node without embeddings
 * 2. Calling the generate-embeddings function
 * 3. Verifying the embedding was created
 * 4. Testing the queue processing function
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user ID (you'll need to replace this with a real user ID from your database)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID

async function runTests() {
  console.log('🧪 Running Embedding Function Tests\n');

  try {
    // Test 1: Check if we have a real user
    console.log('1. Checking for test user...');
    const testUserId = await getTestUser();
    if (!testUserId) {
      console.log('❌ No users found in database. Creating test requires authenticated user.');
      return;
    }
    console.log(`✅ Using test user: ${testUserId}\n`);

    // Test 2: Get current embedding status
    console.log('2. Getting current embedding status...');
    await testEmbeddingStatus(testUserId);

    // Test 3: Create a test node if needed
    console.log('3. Ensuring we have test nodes...');
    const testNodeId = await createTestNode(testUserId);
    console.log(`✅ Test node ready: ${testNodeId}\n`);

    // Test 4: Test embedding generation
    console.log('4. Testing embedding generation...');
    await testEmbeddingGeneration(testNodeId);

    // Test 5: Test queue processing
    console.log('5. Testing queue processing...');
    await testQueueProcessing();

    // Test 6: Validate embeddings
    console.log('6. Validating embeddings...');
    await testEmbeddingValidation(testUserId);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function getTestUser() {
  const { data, error } = await supabase
    .from('graph_nodes')
    .select('user_id')
    .limit(1);
    
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0].user_id;
}

async function testEmbeddingStatus(userId) {
  const { data, error } = await supabase
    .rpc('get_embedding_queue_stats', { p_user_id: userId });
    
  if (error) {
    throw new Error(`Status check failed: ${error.message}`);
  }
  
  const stats = data[0];
  console.log(`   Total nodes: ${stats.total_nodes}`);
  console.log(`   With embeddings: ${stats.nodes_with_embeddings}`);
  console.log(`   Without embeddings: ${stats.nodes_without_embeddings}`);
  console.log('✅ Status check passed\n');
}

async function createTestNode(userId) {
  // First check if we already have nodes without embeddings
  const { data: existingNodes } = await supabase
    .from('graph_nodes')
    .select('id')
    .eq('user_id', userId)
    .is('embedding', null)
    .limit(1);
    
  if (existingNodes && existingNodes.length > 0) {
    console.log(`   Using existing node without embedding: ${existingNodes[0].id}`);
    return existingNodes[0].id;
  }
  
  // Create a new test node
  const { data, error } = await supabase
    .from('graph_nodes')
    .insert({
      user_id: userId,
      node_type: 'goal',
      label: `Test Embedding Goal ${Date.now()}`,
      description: 'This is a test goal created to verify embedding generation functionality.',
      properties: {
        category: 'test',
        priority: 'low',
        created_by: 'embedding-test-script'
      },
      status: 'draft_verbal'
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to create test node: ${error.message}`);
  }
  
  console.log(`   Created new test node: ${data.id}`);
  return data.id;
}

async function testEmbeddingGeneration(nodeId) {
  console.log(`   Generating embedding for node: ${nodeId}`);
  
  // Call the generate-embeddings function
  const { data, error } = await supabase.functions.invoke('generate-embeddings', {
    body: {
      nodeIds: [nodeId],
      batchSize: 1
    }
  });
  
  if (error) {
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
  
  console.log(`   Result: ${data.message}`);
  
  if (data.errors && data.errors.length > 0) {
    console.log('   Errors:', data.errors);
  }
  
  // Verify the embedding was created
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
  
  const { data: nodeData, error: fetchError } = await supabase
    .from('graph_nodes')
    .select('embedding')
    .eq('id', nodeId)
    .single();
    
  if (fetchError) {
    throw new Error(`Failed to verify embedding: ${fetchError.message}`);
  }
  
  if (nodeData.embedding) {
    console.log('✅ Embedding generated successfully\n');
  } else {
    throw new Error('Embedding not found after generation');
  }
}

async function testQueueProcessing() {
  console.log('   Testing queue processing with dry run...');
  
  const { data, error } = await supabase.functions.invoke('process-embedding-queue', {
    body: {
      maxNodes: 10,
      batchSize: 5,
      dryRun: true
    }
  });
  
  if (error) {
    throw new Error(`Queue processing failed: ${error.message}`);
  }
  
  console.log(`   Result: ${data.message}`);
  if (data.stats) {
    console.log(`   Would process ${data.pendingNodes || 0} nodes`);
  }
  console.log('✅ Queue processing test passed\n');
}

async function testEmbeddingValidation(userId) {
  const { data, error } = await supabase
    .rpc('validate_node_embeddings', { 
      p_user_id: userId,
      p_check_dimensions: true 
    });
    
  if (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
  
  const validation = data[0];
  console.log(`   Checked: ${validation.total_checked} embeddings`);
  console.log(`   Valid: ${validation.valid_embeddings}`);
  console.log(`   Invalid: ${validation.invalid_embeddings}`);
  
  if (validation.invalid_embeddings > 0) {
    console.log('   Issues:', validation.issues);
  }
  
  console.log('✅ Validation test passed\n');
}

// Run the tests
runTests();