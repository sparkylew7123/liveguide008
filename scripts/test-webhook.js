require('dotenv').config({ path: '.env.local' });

const WEBHOOK_URL = 'https://aesefwyijcsynbbhozhb.supabase.co/functions/v1/elevenlabs-webhook';
const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

// Test webhook with different event types
async function testWebhook() {
  console.log('🧪 Testing enhanced webhook functionality...');
  
  // Test 1: Basic webhook connectivity
  console.log('\n📡 Test 1: Basic connectivity');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEBHOOK_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('  - Status:', response.status);
    console.log('  - Response:', await response.text());
  } catch (error) {
    console.error('  - Error:', error.message);
  }
  
  // Test 2: Tool call event
  console.log('\n🛠️ Test 2: Tool call event');
  try {
    const toolCallEvent = {
      event_type: 'tool_call',
      conversation_id: 'test_conversation_123',
      agent_id: 'SuIlXQ4S6dyjrNViOrQ8',
      user_id: 'test_user_123',
      timestamp: new Date().toISOString(),
      data: {
        tool_call: {
          name: 'goal_match',
          parameters: {
            goal_text: 'I want to improve my public speaking skills',
            category: 'Personal Growth',
            confidence: 0.9,
            suggested_goals: [
              {
                title: 'Build confidence in public speaking',
                description: 'Develop skills to speak confidently in front of audiences',
                category: 'Personal Growth'
              }
            ]
          }
        }
      }
    };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ElevenLabs-Signature': 'test-signature'
      },
      body: JSON.stringify(toolCallEvent)
    });
    
    console.log('  - Status:', response.status);
    console.log('  - Response:', await response.text());
  } catch (error) {
    console.error('  - Error:', error.message);
  }
  
  // Test 3: Enhanced goal extraction
  console.log('\n🎯 Test 3: Enhanced goal extraction');
  try {
    const conversationEndedEvent = {
      event_type: 'conversation_ended',
      conversation_id: 'test_conversation_456',
      agent_id: 'SuIlXQ4S6dyjrNViOrQ8',
      user_id: 'test_user_456',
      timestamp: new Date().toISOString(),
      data: {
        transcript: 'I really want to get better at public speaking and presentation skills. I also want to improve my leadership abilities and maybe start exercising more regularly.',
        session_duration: 300
      }
    };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ElevenLabs-Signature': 'test-signature'
      },
      body: JSON.stringify(conversationEndedEvent)
    });
    
    console.log('  - Status:', response.status);
    console.log('  - Response:', await response.text());
  } catch (error) {
    console.error('  - Error:', error.message);
  }
  
  console.log('\n✅ Webhook testing completed!');
}

testWebhook();