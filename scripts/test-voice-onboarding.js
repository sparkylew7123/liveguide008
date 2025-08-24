#!/usr/bin/env node

/**
 * Test Voice Onboarding Goal Extraction
 * 
 * This script helps test the complete voice onboarding flow:
 * 1. Tests webhook endpoints
 * 2. Simulates conversation analysis events  
 * 3. Validates goal extraction and graph node creation
 * 4. Provides debugging for WebSocket connection issues
 * 
 * Usage: node scripts/test-voice-onboarding.js
 */

require('dotenv').config();

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sample test data that mimics ElevenLabs analysis output
const TEST_ANALYSIS_DATA = {
  conversation_id: `test_${Date.now()}`,
  agent_id: 'test_agent',
  user_id: '907f679d-b36a-42a8-8b60-ce0d9cc11726', // Test user ID
  data: {
    User_Goals: [
      {
        original_text: "I want to get better at public speaking",
        goal_category: "personal", 
        timeline: "medium_term",
        confidence_level: 0.8
      },
      {
        original_text: "I'd like to learn Python programming",
        goal_category: "learning",
        timeline: "short_term", 
        confidence_level: 0.9
      }
    ],
    User_Name: "Test User",
    Learning_Style: "visual",
    Time_Commitment: "moderate",
    summary: "User expressed interest in personal development and technical learning",
    transcript: "I want to get better at public speaking and I'd like to learn Python programming..."
  }
};

async function testVoiceOnboarding() {
  console.log('🧪 Testing Voice Onboarding Flow\n');
  
  try {
    // 1. Test init webhook
    console.log('1. Testing initiation webhook...');
    await testInitWebhook();
    
    // 2. Test completion webhook with analysis
    console.log('\n2. Testing completion webhook with analysis...');
    await testCompletionWebhook();
    
    // 3. Test MCP server
    console.log('\n3. Testing MCP server endpoints...');
    await testMCPServer();
    
    // 4. Test goal extraction directly
    console.log('\n4. Testing direct goal extraction...');
    await testGoalExtraction();
    
    // 5. Validate graph nodes were created
    console.log('\n5. Validating graph nodes...');
    await validateGraphNodes();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testInitWebhook() {
  const initData = {
    conversation_id: TEST_ANALYSIS_DATA.conversation_id,
    agent_id: TEST_ANALYSIS_DATA.agent_id,
    user_id: TEST_ANALYSIS_DATA.user_id,
    metadata: {
      sessionType: 'voice_onboarding',
      userName: 'Test User'
    }
  };
  
  const response = await fetch(`${BASE_URL}/functions/v1/elevenlabs-init-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(initData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Init webhook failed: ${response.status} ${error}`);
  }
  
  const result = await response.json();
  console.log('   ✅ Init webhook successful');
  console.log('   📄 Agent context:', result.instructions?.substring(0, 100) + '...');
  
  return result;
}

async function testCompletionWebhook() {
  const completionEvent = {
    type: 'conversation.analysis.completed',
    conversation_id: TEST_ANALYSIS_DATA.conversation_id,
    agent_id: TEST_ANALYSIS_DATA.agent_id,
    data: TEST_ANALYSIS_DATA.data,
    timestamp: new Date().toISOString()
  };
  
  const response = await fetch(`${BASE_URL}/functions/v1/elevenlabs-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ElevenLabs-Signature': 'sha256=test_signature',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(completionEvent)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Completion webhook failed: ${response.status} ${error}`);
  }
  
  const result = await response.json();
  console.log('   ✅ Completion webhook successful');
  console.log('   🎯 Goals should be extracted and processed');
  
  return result;
}

async function testMCPServer() {
  // Test MCP server tools list
  const mcpRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  const response = await fetch(`${BASE_URL}/functions/v1/mcp-server`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mcpRequest)
  });
  
  if (!response.ok) {
    throw new Error(`MCP server request failed: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('   ✅ MCP server accessible');
  console.log('   🛠️ Available tools:', result.result?.tools?.length || 0);
  
  // Test specific tool call
  const toolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_user_graph',
      arguments: {
        userId: TEST_ANALYSIS_DATA.user_id
      }
    }
  };
  
  const toolResponse = await fetch(`${BASE_URL}/functions/v1/mcp-server`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(toolRequest)
  });
  
  if (toolResponse.ok) {
    const toolResult = await toolResponse.json();
    console.log('   📊 User graph nodes:', toolResult.result?.nodeCount || 0);
  }
  
  return result;
}

async function testGoalExtraction() {
  // Test the goal extraction function directly
  const { createClient } = require('@supabase/supabase-js');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );
    
    // Test creating a goal node directly
    const { data: goalNode, error } = await supabase
      .rpc('create_goal_node', {
        p_user_id: TEST_ANALYSIS_DATA.user_id,
        p_title: 'Test Goal: Learn React',
        p_description: 'Test goal from voice onboarding integration test',
        p_category: 'learning',
        p_properties: {
          source: 'test_script',
          confidence: 0.9,
          timeline: 'short_term',
          test_run: true
        }
      });
    
    if (error) {
      console.log('   ⚠️ Goal creation test failed:', error.message);
    } else {
      console.log('   ✅ Goal extraction test successful');
      console.log('   🎯 Created test goal node:', goalNode?.id);
    }
    
  } catch (error) {
    console.log('   ⚠️ Direct goal extraction test failed:', error.message);
  }
}

async function validateGraphNodes() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );
    
    // Check for recently created goal nodes
    const { data: recentGoals, error } = await supabase
      .from('graph_nodes')
      .select('id, label, properties, created_at')
      .eq('user_id', TEST_ANALYSIS_DATA.user_id)
      .eq('node_type', 'goal')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('   ⚠️ Could not validate nodes:', error.message);
      return;
    }
    
    console.log('   📈 Recent goal nodes:', recentGoals?.length || 0);
    
    if (recentGoals && recentGoals.length > 0) {
      recentGoals.forEach((goal, index) => {
        console.log(`   ${index + 1}. "${goal.label}" (confidence: ${goal.properties?.confidence || 'N/A'})`);
      });
    }
    
    // Check conversation record
    const { data: conversation } = await supabase
      .from('elevenlabs_conversations')
      .select('*')
      .eq('conversation_id', TEST_ANALYSIS_DATA.conversation_id)
      .single();
    
    if (conversation) {
      console.log('   💬 Conversation record found');
      console.log('   📊 Analysis insights:', !!conversation.insights);
      console.log('   🎯 Goals extracted:', conversation.insights?.goals_extracted?.length || 0);
    }
    
  } catch (error) {
    console.log('   ⚠️ Node validation failed:', error.message);
  }
}

async function debugWebSocketConnection() {
  console.log('\n🔧 WebSocket Connection Debugging Tips:');
  console.log('\n1. Check if ElevenLabs agent is properly configured:');
  console.log('   - Analysis tab has User_Goals field configured');
  console.log('   - Widget tab has webhook URLs set');
  console.log('   - Security tab allows agent overrides');
  
  console.log('\n2. For Playwright testing issues:');
  console.log('   - Use headless: false to see browser behavior');
  console.log('   - Add longer timeouts for WebSocket connections');
  console.log('   - Mock WebSocket responses if needed');
  
  console.log('\n3. Check edge function logs:');
  console.log('   supabase functions logs elevenlabs-webhook --follow');
  console.log('   supabase functions logs elevenlabs-init-webhook --follow');
  
  console.log('\n4. Test direct API calls:');
  console.log(`   curl -X POST ${BASE_URL}/functions/v1/elevenlabs-webhook`);
}

if (require.main === module) {
  testVoiceOnboarding()
    .then(() => {
      debugWebSocketConnection();
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      debugWebSocketConnection();
      process.exit(1);
    });
}

module.exports = { testVoiceOnboarding, TEST_ANALYSIS_DATA };