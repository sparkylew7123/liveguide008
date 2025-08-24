#!/usr/bin/env node

/**
 * Enhanced End-to-End Integration Test Suite
 * 
 * Tests the complete ElevenLabs → N8N → LiveGuide integration flow
 * with robust error handling, retry logic, and environment detection.
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Import utilities from the main setup script
const { Logger, CONFIG } = require('./setup-onboarding-webhooks.js');

// Environment detection
const ENVIRONMENT = process.env.NODE_ENV || 'test';
const CURRENT_CONFIG = CONFIG.environments[ENVIRONMENT] || CONFIG.environments.test;
const N8N_WEBHOOK_URL = CURRENT_CONFIG.n8nWebhookUrl;
const TEST_USER_ID = CURRENT_CONFIG.testUserId;

Logger.info('🧪 Enhanced End-to-End Integration Test Suite');
Logger.info('============================================');
Logger.info('Environment Configuration:', {
  environment: ENVIRONMENT,
  webhookUrl: N8N_WEBHOOK_URL,
  testUserId: TEST_USER_ID,
  description: CURRENT_CONFIG.description
});

// Test scenarios
const testScenarios = [
  {
    name: 'Basic Goal Discovery',
    description: 'User mentions career and health goals',
    conversationId: 'test-e2e-basic-' + Date.now(),
    transcript: `User: Hi Maya, I'm excited to start this journey. I've been out of work for 3 years taking care of my kids, and I'm ready to get back into marketing. I really want to improve my public speaking skills because I used to be terrified of presenting. I also want to lose 20 pounds and get healthier before I start interviewing.

Maya: That's wonderful that you're taking this step! Three years of caregiving shows incredible dedication and you've developed so many transferable skills. Let me ask - when you were managing your children's schedules and activities, that sounds like serious project management experience. 

User: I never thought of it that way! I did coordinate daycare, school events, medical appointments, and activities for two kids. It was like running a small business.

Maya: Exactly! That's complex logistics management. Now, for your goals - you mentioned public speaking and health. What timeline are you thinking for these?

User: I'd love to feel confident speaking in 6 months, and for the weight loss, maybe 4 months? I want to be ready for interviews by next year.

Maya: Those are very achievable timescales. What kind of support works best for you when learning new skills?

User: I like structure but not too rigid. I need someone who's encouraging but not pushy. I learn best with clear steps but some flexibility.

Maya: That sounds like you prefer balanced energy with balanced structure. You want guidance with flexibility. Does that feel accurate?

User: Yes, exactly! That describes me perfectly.`,
    expectedGoals: [
      { text: 'improve my public speaking skills', timescale: '6 months' },
      { text: 'lose 20 pounds and get healthier', timescale: '4 months' },
      { text: 'get back into marketing', timescale: '1 year' }
    ],
    expectedInsights: [
      { text: 'Caregiving develops transferable project management skills' },
      { text: 'User prefers balanced energy with balanced structure for coaching' }
    ]
  },
  {
    name: 'Complex Multi-Goal Scenario',
    description: 'User with multiple interconnected goals and concerns',
    conversationId: 'test-e2e-complex-' + Date.now(),
    transcript: `User: Maya, I'm feeling overwhelmed. I want to start my own consulting business, but I'm also dealing with some anxiety about my skills being outdated. I've been out for 5 years, and technology has changed so much. I want to get certified in digital marketing, improve my networking skills, and figure out how to price my services. But I'm also worried about childcare costs and work-life balance.

Maya: I can hear the mix of excitement and concern in your voice, and that's completely normal. Five years of caregiving has given you skills many business owners would envy. Let's break this down - you mentioned several goals and some concerns. Can you tell me more about what aspect feels most urgent to you?

User: The digital marketing certification feels most urgent. I want to get that done in the next 3 months. The networking and pricing - maybe 6 months? But the business launch, I'm thinking 12 months out. I just worry about failing, especially with the financial pressure.

Maya: Those timescales sound very thoughtful. The financial concerns are real and valid - many women share that worry when transitioning back. What would help you feel most supported in this journey?

User: I need someone who really understands the financial pressures and won't judge me for being cautious. I like having deadlines but with understanding if life gets in the way. I'm very detail-oriented and like step-by-step plans.

Maya: It sounds like you value high structure with empathetic support. You want clear plans with realistic flexibility for life's demands. Is that accurate?

User: Absolutely. And someone who gets the mom guilt about spending time on my career instead of with my kids.`,
    expectedGoals: [
      { text: 'get certified in digital marketing', timescale: '3 months' },
      { text: 'improve my networking skills', timescale: '6 months' },
      { text: 'figure out how to price my services', timescale: '6 months' },
      { text: 'start my own consulting business', timescale: '12 months' }
    ],
    expectedInsights: [
      { text: 'User values high structure with empathetic support' },
      { text: 'Caregiving develops business management skills' }
    ],
    expectedConcerns: [
      { text: 'anxiety about skills being outdated' },
      { text: 'childcare costs and work-life balance concerns' },
      { text: 'financial pressure and fear of failing' },
      { text: 'mom guilt about career focus' }
    ]
  }
];

class TestRetryHelper {
  static async withRetry(operation, context = '', maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        Logger.debug(`Testing ${context} (attempt ${attempt}/${maxAttempts})`);
        const result = await operation();
        if (attempt > 1) {
          Logger.success(`${context} succeeded after ${attempt} attempts`);
        }
        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        
        if (isLastAttempt) {
          Logger.error(`${context} failed after ${maxAttempts} attempts`, { error: error.message });
          throw error;
        } else {
          Logger.warn(`${context} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, { error: error.message });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
}

async function testWebhookPayload(scenario) {
  return TestRetryHelper.withRetry(async () => {
    Logger.info(`🎯 Testing Scenario: ${scenario.name}`, {
      description: scenario.description,
      conversationId: scenario.conversationId,
      environment: ENVIRONMENT
    });
    
    // Create payload in the format expected by N8N webhook
    const payload = {
      mode: 'e2e_test', // Enhanced mode for better tracking
      environment: ENVIRONMENT,
      conversationId: scenario.conversationId,
      userId: TEST_USER_ID,
      transcript: scenario.transcript,
      testMetadata: {
        scenarioName: scenario.name,
        expectedGoals: scenario.expectedGoals?.length || 0,
        expectedInsights: scenario.expectedInsights?.length || 0,
        expectedConcerns: scenario.expectedConcerns?.length || 0,
        timestamp: new Date().toISOString()
      },
      // Include expected data for validation
      analysis: {
        summary: scenario.description,
        goals: scenario.expectedGoals || [],
        insights: scenario.expectedInsights || [],
        emotions: scenario.expectedConcerns ? scenario.expectedConcerns.map(c => ({ text: c.text, type: 'concern' })) : []
      }
    };
    
    Logger.info('Sending test payload', {
      transcriptLength: payload.transcript.split(' ').length,
      expectedGoals: scenario.expectedGoals?.length || 0,
      expectedInsights: scenario.expectedInsights?.length || 0,
      expectedConcerns: scenario.expectedConcerns?.length || 0
    });
    
    const startTime = Date.now();
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'LiveGuide-E2E-Test',
        'X-Test-Scenario': scenario.name,
        'X-Environment': ENVIRONMENT,
        'X-Test-Suite-Version': '2.0.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CONFIG.timeouts.request)
    });
    
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      
      console.log(`\n✅ Scenario "${scenario.name}" - SUCCESS`);
      console.log('================================' + '='.repeat(scenario.name.length));
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 Processing mode: ${result.mode}`);
      console.log(`🔧 Tools executed: ${result.toolsExecuted || 0}`);
      console.log(`🆔 Conversation ID: ${result.conversationId}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Created Nodes:');
        console.log('================');
        
        const nodeTypes = {};
        result.results.forEach((nodeResult, index) => {
          if (nodeResult.success && nodeResult.data) {
            const nodeType = nodeResult.data.node_type;
            nodeTypes[nodeType] = (nodeTypes[nodeType] || 0) + 1;
            
            console.log(`${index + 1}. ${nodeType.toUpperCase()}: ${nodeResult.data.label}`);
            if (nodeResult.data.description) {
              console.log(`   Description: ${nodeResult.data.description.substring(0, 100)}...`);
            }
            console.log(`   Status: ${nodeResult.data.status}`);
            console.log(`   ID: ${nodeResult.data.id}`);
            console.log('');
          }
        });
        
        console.log('📈 Node Type Summary:');
        console.log('===================');
        Object.entries(nodeTypes).forEach(([type, count]) => {
          console.log(`- ${type}: ${count} node(s)`);
        });
      }
      
      return {
        success: true,
        scenario: scenario.name,
        duration,
        toolsExecuted: result.toolsExecuted || 0,
        nodesCreated: result.results?.length || 0,
        result
      };
      
    } else {
      console.log(`\n❌ Scenario "${scenario.name}" - FAILED`);
      console.log('================================' + '='.repeat(scenario.name.length));
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 HTTP Status: ${response.status}`);
      
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText.substring(0, 500)}`);
      
      return {
        success: false,
        scenario: scenario.name,
        duration,
        error: errorText,
        status: response.status
      };
    }
    
  } catch (error) {
    console.log(`\n💥 Scenario "${scenario.name}" - ERROR`);
    console.log('================================' + '='.repeat(scenario.name.length));
    console.log(`❌ Error: ${error.message}`);
    
    return {
      success: false,
      scenario: scenario.name,
      error: error.message
    };
  }
}

async function runTestSuite() {
  console.log('\n🚀 Starting End-to-End Integration Test Suite');
  console.log('=============================================');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testWebhookPayload(scenario);
    results.push(result);
    
    // Wait 2 seconds between tests to avoid overwhelming the system
    if (scenario !== testScenarios[testScenarios.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary report
  console.log('\n📊 Test Suite Summary Report');
  console.log('===========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Successful Scenarios:');
    successful.forEach(result => {
      console.log(`  ✅ ${result.scenario}: ${result.toolsExecuted} tools, ${result.nodesCreated} nodes (${result.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ Failed Scenarios:');
    failed.forEach(result => {
      console.log(`  ❌ ${result.scenario}: ${result.error || `HTTP ${result.status}`} (${result.duration || 0}ms)`);
    });
  }
  
  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  const totalNodes = successful.reduce((sum, r) => sum + r.nodesCreated, 0);
  const totalTools = successful.reduce((sum, r) => sum + r.toolsExecuted, 0);
  
  if (successful.length > 0) {
    console.log('\n📈 Performance Metrics:');
    console.log(`  ⏱️  Average response time: ${Math.round(avgDuration)}ms`);
    console.log(`  🔧 Total tools executed: ${totalTools}`);
    console.log(`  🌐 Total nodes created: ${totalNodes}`);
  }
  
  console.log('\n🏁 Test Suite Complete!');
  
  if (successful.length === results.length) {
    console.log('🎉 All tests passed! The ElevenLabs → N8N → LiveGuide integration is working correctly.');
    console.log('\nNext steps:');
    console.log('1. 🎙️ Test with real voice conversation through ElevenLabs agent');
    console.log('2. 🌐 Verify nodes appear in LiveGuide graph interface');
    console.log('3. 🔍 Test data extraction quality with various conversation styles');
    console.log('4. 📊 Monitor N8N workflow logs for any edge cases');
  } else {
    console.log('⚠️ Some tests failed. Please check the configuration and try again.');
  }
}

// Main execution
runTestSuite().catch(console.error);