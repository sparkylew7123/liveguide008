require('dotenv').config({ path: '.env.local' });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

async function testAgentConfig() {
  try {
    console.log('📋 Checking current agent configuration...');
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.status}`);
    }

    const agent = await response.json();
    
    console.log('🤖 Agent Details:');
    console.log('  - Name:', agent.name);
    console.log('  - Agent ID:', agent.agent_id);
    console.log('  - Tools count:', agent.tools?.length || 0);
    console.log('  - Tools:', agent.tools?.map(t => t.name).join(', ') || 'None');
    console.log('  - System prompt length:', agent.prompt?.system?.length || 0);
    console.log('  - System prompt preview:', agent.prompt?.system?.substring(0, 200) || 'None');
    
    // Test webhook URL
    console.log('\n🔗 Testing webhook connection...');
    const webhookResponse = await fetch('https://aesefwyijcsynbbhozhb.supabase.co/functions/v1/elevenlabs-webhook');
    console.log('  - Webhook status:', webhookResponse.status);
    console.log('  - Webhook response:', await webhookResponse.text());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAgentConfig();