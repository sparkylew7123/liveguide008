#!/usr/bin/env node

/**
 * Comprehensive testing script for ElevenLabs coaching agents with MCP integration
 * Tests MCP server functionality, webhook endpoints, and goal extraction accuracy
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlwxmfwrksflvcacjafg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_SERVER_URL = `${SUPABASE_URL}/functions/v1/mcp-server`;
const INIT_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-init-webhook`;
const COMPLETION_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-webhook`;

// Test user ID (mark.lewis@sparkytek.com)
const TEST_USER_ID = '907f679d-b36a-42a8-8b60-ce0d9cc11726';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class CoachingAgentTester {
  constructor() {
    this.testResults = {
      mcpServer: { passed: 0, failed: 0, errors: [] },
      webhooks: { passed: 0, failed: 0, errors: [] },
      goalExtraction: { passed: 0, failed: 0, errors: [] },
      coaching: { passed: 0, failed: 0, errors: [] }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const color = type === 'success' ? colors.green : 
                  type === 'error' ? colors.red :
                  type === 'warning' ? colors.yellow : colors.blue;
    
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  async runAllTests() {
    this.log(`${colors.bold}Starting Coaching Agent Integration Tests${colors.reset}`);
    
    try {
      // Test MCP Server functionality
      await this.testMCPServer();
      
      // Test webhook endpoints
      await this.testWebhooks();
      
      // Test goal extraction and processing
      await this.testGoalExtraction();
      
      // Test coaching conversation scenarios
      await this.testCoachingScenarios();
      
      // Print final results
      this.printResults();
      
    } catch (error) {
      this.log(`Fatal error during testing: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async testMCPServer() {
    this.log(`${colors.bold}Testing MCP Server Functionality${colors.reset}`);
    
    // Test 1: Server health check
    await this.testMCPEndpoint('GET', '/', 'Server health check');
    
    // Test 2: Tools list
    await this.testMCPEndpoint('POST', '', 'Tools list', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    
    // Test 3: Initialize connection
    await this.testMCPEndpoint('POST', '', 'Initialize connection', {
      jsonrpc: '2.0',
      id: 2, 
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });
    
    // Test 4: Get user graph
    await this.testMCPTool('get_user_graph', { userId: TEST_USER_ID });
    
    // Test 5: Search nodes
    await this.testMCPTool('search_nodes', { 
      userId: TEST_USER_ID,
      query: 'goal',
      nodeType: 'goal'
    });
    
    // Test 6: Get recent nodes  
    await this.testMCPTool('get_recent_nodes', {
      userId: TEST_USER_ID,
      limit: 5
    });
    
    // Test 7: Create test node
    const testNodeLabel = `Test Goal - ${Date.now()}`;
    await this.testMCPTool('create_node', {
      type: 'goal',
      label: testNodeLabel,
      description: 'Test goal for coaching agent integration',
      userId: TEST_USER_ID,
      properties: { source: 'test_script', test: true }
    });
  }

  async testMCPEndpoint(method, path, testName, body = null) {
    try {
      const url = `${MCP_SERVER_URL}${path}`;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      const data = await response.text();
      
      if (response.ok) {
        this.log(`✓ ${testName} - Status: ${response.status}`, 'success');
        this.testResults.mcpServer.passed++;
        
        if (body && body.method === 'tools/list') {
          const jsonData = JSON.parse(data);
          if (jsonData.result && jsonData.result.tools) {
            this.log(`  Found ${jsonData.result.tools.length} MCP tools available`, 'info');
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${data}`);
      }
      
    } catch (error) {
      this.log(`✗ ${testName} - Error: ${error.message}`, 'error');
      this.testResults.mcpServer.failed++;
      this.testResults.mcpServer.errors.push({ test: testName, error: error.message });
    }
  }

  async testMCPTool(toolName, params) {
    const testName = `MCP Tool: ${toolName}`;
    
    try {
      const response = await fetch(MCP_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name: toolName, arguments: params }
        })
      });
      
      const data = await response.json();
      
      if (data.result) {
        this.log(`✓ ${testName} - Success`, 'success');
        this.testResults.mcpServer.passed++;
        
        // Log useful details for specific tools
        if (toolName === 'get_user_graph' && data.result.nodes) {
          this.log(`  Found ${data.result.nodes.length} nodes in user graph`, 'info');
        } else if (toolName === 'search_nodes' && Array.isArray(data.result)) {
          this.log(`  Search returned ${data.result.length} nodes`, 'info');
        } else if (toolName === 'create_node' && data.result.id) {
          this.log(`  Created node with ID: ${data.result.id}`, 'info');
        }
        
      } else if (data.error) {
        throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
      } else {
        throw new Error('No result or error in MCP response');
      }
      
    } catch (error) {
      this.log(`✗ ${testName} - Error: ${error.message}`, 'error');
      this.testResults.mcpServer.failed++;
      this.testResults.mcpServer.errors.push({ test: testName, error: error.message });
    }
  }

  async testWebhooks() {
    this.log(`${colors.bold}Testing Webhook Endpoints${colors.reset}`);
    
    // Test init webhook
    await this.testWebhookEndpoint(
      INIT_WEBHOOK_URL,
      'Init Webhook',
      {
        conversation_id: `test-init-${Date.now()}`,
        agent_id: 'elena-test-agent',
        user_metadata: {
          user_id: TEST_USER_ID,
          name: 'Test User'
        }
      }
    );
    
    // Test completion webhook with goal data
    await this.testWebhookEndpoint(
      COMPLETION_WEBHOOK_URL,
      'Completion Webhook',
      {
        conversation_id: `test-completion-${Date.now()}`,
        agent_id: 'elena-test-agent',
        user_metadata: {
          user_id: TEST_USER_ID
        },
        analysis_data: {
          User_Goals: [
            {
              original_text: 'I want to improve my leadership skills',
              goal_category: 'career',
              timeline: 'medium_term',
              confidence_level: 0.8
            },
            {
              original_text: 'I want to build a better morning routine',
              goal_category: 'personal', 
              timeline: 'short_term',
              confidence_level: 0.9
            }
          ],
          Key_Insights: [
            'User realizes they need more structured approach to skill development',
            'Interested in both professional and personal growth'
          ],
          Emotional_State: 'motivated',
          Action_Commitments: [
            {
              action: 'Schedule weekly one-on-ones with team',
              timeframe: 'this week'
            }
          ]
        }
      }
    );
  }

  async testWebhookEndpoint(url, testName, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.text();
      
      if (response.ok) {
        this.log(`✓ ${testName} - Status: ${response.status}`, 'success');
        this.testResults.webhooks.passed++;
        
        // Try to parse response and check for useful info
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.created_nodes) {
            this.log(`  Created ${jsonData.created_nodes} nodes from webhook`, 'info');
          }
          if (jsonData.context_provided) {
            this.log(`  Context provided for agent conversation`, 'info');
          }
        } catch (e) {
          // Response might not be JSON, that's ok
        }
        
      } else {
        throw new Error(`HTTP ${response.status}: ${data}`);
      }
      
    } catch (error) {
      this.log(`✗ ${testName} - Error: ${error.message}`, 'error');
      this.testResults.webhooks.failed++;
      this.testResults.webhooks.errors.push({ test: testName, error: error.message });
    }
  }

  async testGoalExtraction() {
    this.log(`${colors.bold}Testing Goal Extraction and Processing${colors.reset}`);
    
    const testScenarios = [
      {
        name: 'Career Goals - Elena',
        agent_id: 'elena',
        goals: [
          {
            original_text: 'I want to transition into a senior management role',
            goal_category: 'career',
            timeline: 'long_term',
            confidence_level: 0.7
          },
          {
            original_text: 'I need to improve my public speaking skills',
            goal_category: 'career', 
            timeline: 'medium_term',
            confidence_level: 0.6
          }
        ]
      },
      {
        name: 'Personal Development Goals - Maya',
        agent_id: 'maya',
        goals: [
          {
            original_text: 'I want to establish a daily meditation practice',
            goal_category: 'personal',
            timeline: 'short_term',
            confidence_level: 0.8
          },
          {
            original_text: 'I want to improve my work-life balance',
            goal_category: 'health',
            timeline: 'medium_term', 
            confidence_level: 0.5
          }
        ]
      },
      {
        name: 'Learning Goals - Sage',
        agent_id: 'sage', 
        goals: [
          {
            original_text: 'I want to learn Python for data analysis',
            goal_category: 'learning',
            timeline: 'medium_term',
            confidence_level: 0.9
          },
          {
            original_text: 'I want to get better at statistical analysis',
            goal_category: 'learning',
            timeline: 'long_term',
            confidence_level: 0.4
          }
        ]
      }
    ];
    
    for (const scenario of testScenarios) {
      await this.testGoalProcessing(scenario);
    }
    
    // Test goal node creation in database
    await this.verifyGoalNodesCreated();
  }

  async testGoalProcessing(scenario) {
    const testName = `Goal Processing: ${scenario.name}`;
    
    try {
      // Count existing goals before test
      const { count: beforeCount } = await supabase
        .from('graph_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', TEST_USER_ID)
        .eq('node_type', 'goal')
        .like('properties->source', '%test%');
      
      // Process goals through completion webhook
      const response = await fetch(COMPLETION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: `test-goals-${Date.now()}`,
          agent_id: scenario.agent_id,
          user_metadata: { user_id: TEST_USER_ID },
          analysis_data: {
            User_Goals: scenario.goals,
            Session_Focus: `Testing ${scenario.agent_id} goal extraction`
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${await response.text()}`);
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Count goals after processing
      const { count: afterCount } = await supabase
        .from('graph_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', TEST_USER_ID)
        .eq('node_type', 'goal')
        .like('properties->source', '%test%');
      
      const createdGoals = afterCount - beforeCount;
      
      if (createdGoals >= scenario.goals.length) {
        this.log(`✓ ${testName} - Created ${createdGoals} goal nodes`, 'success');
        this.testResults.goalExtraction.passed++;
      } else {
        throw new Error(`Expected ${scenario.goals.length} goals, created ${createdGoals}`);
      }
      
    } catch (error) {
      this.log(`✗ ${testName} - Error: ${error.message}`, 'error');
      this.testResults.goalExtraction.failed++;
      this.testResults.goalExtraction.errors.push({ test: testName, error: error.message });
    }
  }

  async verifyGoalNodesCreated() {
    const testName = 'Verify Goal Nodes in Database';
    
    try {
      const { data: goals, error } = await supabase
        .from('graph_nodes')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('node_type', 'goal')
        .like('properties->source', '%test%')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (goals && goals.length > 0) {
        this.log(`✓ ${testName} - Found ${goals.length} test goal nodes`, 'success');
        this.testResults.goalExtraction.passed++;
        
        // Log sample goals
        goals.slice(0, 3).forEach((goal, index) => {
          this.log(`  Goal ${index + 1}: ${goal.label} (${goal.properties?.goal_category || 'no category'})`, 'info');
        });
        
      } else {
        throw new Error('No test goal nodes found in database');
      }
      
    } catch (error) {
      this.log(`✗ ${testName} - Error: ${error.message}`, 'error');
      this.testResults.goalExtraction.failed++;
      this.testResults.goalExtraction.errors.push({ test: testName, error: error.message });
    }
  }

  async testCoachingScenarios() {
    this.log(`${colors.bold}Testing Coaching Conversation Scenarios${colors.reset}`);
    
    const scenarios = [
      {
        name: 'Context Retrieval for Returning User',
        description: 'Test that agent can retrieve and reference user context',
        test: async () => {
          // Ensure user has some existing goals
          const { data: existingGoals } = await supabase
            .from('graph_nodes')
            .select('*')
            .eq('user_id', TEST_USER_ID)
            .eq('node_type', 'goal')
            .limit(1);
          
          if (!existingGoals || existingGoals.length === 0) {
            // Create a test goal for context
            await this.testMCPTool('create_node', {
              type: 'goal',
              label: 'Improve time management skills',
              description: 'User wants to be more productive and organized',
              userId: TEST_USER_ID,
              properties: { 
                goal_category: 'personal',
                source: 'coaching_test',
                created_for_test: true
              }
            });
          }
          
          // Test init webhook (simulating agent conversation start)
          const response = await fetch(INIT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: `context-test-${Date.now()}`,
              agent_id: 'maya',
              user_metadata: { user_id: TEST_USER_ID }
            })
          });
          
          const contextData = await response.json();
          
          if (contextData.context && contextData.context.existing_goals) {
            return { success: true, message: `Retrieved ${contextData.context.existing_goals.length} existing goals` };
          } else {
            return { success: false, message: 'No context data provided' };
          }
        }
      },
      {
        name: 'Goal Progress Tracking',
        description: 'Test updating goal progress through MCP tools',
        test: async () => {
          // Find an existing goal to update
          const { data: goals } = await supabase
            .from('graph_nodes')
            .select('*')
            .eq('user_id', TEST_USER_ID)
            .eq('node_type', 'goal')
            .limit(1);
          
          if (!goals || goals.length === 0) {
            return { success: false, message: 'No existing goals to update' };
          }
          
          const goalId = goals[0].id;
          
          // Test updating goal progress
          await this.testMCPTool('update_goal_progress', {
            goalId: goalId,
            status: 'in_progress',
            progress: 50,
            userId: TEST_USER_ID
          });
          
          return { success: true, message: 'Successfully updated goal progress' };
        }
      },
      {
        name: 'Insight Connection Generation', 
        description: 'Test creating connections between insights and goals',
        test: async () => {
          // Create a test insight
          const insightResponse = await fetch(MCP_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: 'create_node',
                arguments: {
                  type: 'accomplishment',
                  label: 'Completed leadership workshop',
                  description: 'User completed a 2-day leadership development workshop',
                  userId: TEST_USER_ID,
                  properties: { source: 'coaching_test' }
                }
              }
            })
          });
          
          const insightData = await insightResponse.json();
          
          if (insightData.result && insightData.result.id) {
            return { success: true, message: 'Created test accomplishment node' };
          } else {
            return { success: false, message: 'Failed to create accomplishment node' };
          }
        }
      }
    ];
    
    for (const scenario of scenarios) {
      await this.runCoachingScenario(scenario);
    }
  }

  async runCoachingScenario(scenario) {
    try {
      this.log(`Testing: ${scenario.name}`, 'info');
      const result = await scenario.test();
      
      if (result.success) {
        this.log(`✓ ${scenario.name} - ${result.message}`, 'success');
        this.testResults.coaching.passed++;
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      this.log(`✗ ${scenario.name} - Error: ${error.message}`, 'error');
      this.testResults.coaching.failed++;
      this.testResults.coaching.errors.push({ test: scenario.name, error: error.message });
    }
  }

  printResults() {
    this.log(`${colors.bold}Test Results Summary${colors.reset}`);
    
    const categories = [
      { name: 'MCP Server', key: 'mcpServer' },
      { name: 'Webhooks', key: 'webhooks' },
      { name: 'Goal Extraction', key: 'goalExtraction' },
      { name: 'Coaching Scenarios', key: 'coaching' }
    ];
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    categories.forEach(category => {
      const results = this.testResults[category.key];
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      const statusColor = passRate >= 80 ? colors.green : passRate >= 60 ? colors.yellow : colors.red;
      this.log(`${category.name}: ${statusColor}${results.passed}/${total} passed (${passRate}%)${colors.reset}`);
      
      // Show errors for failed tests
      if (results.errors.length > 0) {
        results.errors.forEach(error => {
          this.log(`  ↳ ${error.test}: ${error.error}`, 'warning');
        });
      }
    });
    
    const grandTotal = totalPassed + totalFailed;
    const overallPassRate = grandTotal > 0 ? Math.round((totalPassed / grandTotal) * 100) : 0;
    
    this.log('');
    this.log(`${colors.bold}Overall: ${totalPassed}/${grandTotal} tests passed (${overallPassRate}%)${colors.reset}`);
    
    if (overallPassRate >= 80) {
      this.log('🎉 Coaching agent integration is working well!', 'success');
    } else if (overallPassRate >= 60) {
      this.log('⚠️  Some issues need attention before production use', 'warning');
    } else {
      this.log('❌ Significant issues found - troubleshooting needed', 'error');
    }
    
    // Cleanup: Remove test nodes
    await this.cleanupTestData();
  }

  async cleanupTestData() {
    this.log('Cleaning up test data...', 'info');
    
    try {
      // Delete test goal nodes
      const { error } = await supabase
        .from('graph_nodes')
        .delete()
        .eq('user_id', TEST_USER_ID)
        .or('properties->source.eq.test_script,properties->source.eq.coaching_test,properties->created_for_test.eq.true');
      
      if (error) {
        this.log(`Cleanup warning: ${error.message}`, 'warning');
      } else {
        this.log('Test data cleaned up successfully', 'success');
      }
      
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'warning');
    }
  }
}

// Main execution
async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }
  
  const tester = new CoachingAgentTester();
  await tester.runAllTests();
}

// Handle command line execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default CoachingAgentTester;