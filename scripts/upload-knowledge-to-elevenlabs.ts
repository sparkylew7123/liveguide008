import { ElevenLabsClient } from "@elevenlabs/client"
import * as fs from 'fs'
import * as path from 'path'

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || '***REMOVED***'
})

// Maya's agent ID
const MAYA_AGENT_ID = 'SuIlXQ4S6dyjrNViOrQ8'

// Knowledge documents to upload
const knowledgeDocuments = [
  {
    name: 'SMART Goals Framework',
    content: `SMART Goals Framework

SMART is an acronym that stands for Specific, Measurable, Achievable, Relevant, and Time-bound. This framework helps create clear and attainable goals:

Specific: Your goal should be clear and specific. Ask yourself: What do I want to accomplish? Why is this goal important? Who is involved? Where is it located? Which resources are involved?

Measurable: Track your progress with concrete criteria. How much? How many? How will I know when it is accomplished?

Achievable: Your goal should be realistic and attainable. How can I accomplish this goal? How realistic is the goal based on constraints?

Relevant: Ensure the goal matters to you and aligns with other relevant goals. Does this seem worthwhile? Is this the right time? Does this match our other efforts/needs?

Time-bound: Every goal needs a target date. When? What can I do six months from now? What can I do six weeks from now? What can I do today?

Examples of SMART goals:
- "I will increase my monthly sales by 20% within the next 3 months by making 10 additional cold calls per day"
- "I will run a 5K race in under 30 minutes by training 4 times per week for the next 8 weeks"
- "I will save $5,000 for an emergency fund by saving $500 per month for the next 10 months"`
  },
  {
    name: 'Career Transition Strategies',
    content: `Career Transition Strategies

Successfully transitioning careers requires careful planning and execution:

1. Self-Assessment: Identify transferable skills, values, and interests
   - List your top 10 skills that apply across industries
   - Identify your core values and what matters most in work
   - Explore your genuine interests and passions

2. Research: Investigate target industries and roles thoroughly
   - Use LinkedIn to find people in your target role
   - Conduct informational interviews
   - Read industry publications and reports

3. Skill Gap Analysis: Determine what new skills you need to acquire
   - Compare job descriptions to your current skills
   - Identify 3-5 key skills to develop
   - Create a learning plan with specific courses or certifications

4. Networking: Build connections in your target field
   - Attend industry events and conferences
   - Join professional associations
   - Engage with content on LinkedIn

5. Experience Building: Gain relevant experience
   - Volunteer for projects in the new field
   - Take on freelance or contract work
   - Create a portfolio showcasing relevant projects

6. Personal Branding: Update your professional presence
   - Rewrite your resume with a focus on transferable skills
   - Update your LinkedIn profile with keywords from target field
   - Create a compelling career change narrative

7. Financial Planning: Prepare for the transition
   - Build a 6-month emergency fund
   - Research salary expectations in new field
   - Plan for potential training or education costs`
  },
  {
    name: 'Holistic Wellness Approach',
    content: `Holistic Wellness Approach

True wellness encompasses multiple dimensions that work together:

Physical Wellness:
- Regular exercise (150 minutes moderate or 75 minutes vigorous per week)
- Nutritious, balanced diet with whole foods
- 7-9 hours of quality sleep nightly
- Regular medical check-ups and preventive care
- Proper hydration (8 glasses of water daily)

Mental Wellness:
- Stress management techniques (meditation, deep breathing)
- Continuous learning and cognitive challenges
- Mindfulness practices
- Professional therapy when needed
- Limiting negative media consumption

Emotional Wellness:
- Developing emotional intelligence
- Practicing self-compassion
- Building healthy coping mechanisms
- Journaling for self-reflection
- Expressing gratitude daily

Social Wellness:
- Nurturing meaningful relationships
- Setting healthy boundaries
- Developing communication skills
- Contributing to community
- Building a support network

Spiritual Wellness:
- Discovering personal purpose and meaning
- Aligning actions with values
- Practicing meditation or prayer
- Connecting with nature
- Exploring philosophical questions

Environmental Wellness:
- Creating organized, peaceful living spaces
- Spending time in nature regularly
- Practicing sustainability
- Reducing exposure to toxins
- Building a supportive work environment

Each dimension influences the others. For example, regular exercise (physical) can improve mood (emotional) and provide social connections (social) through group activities.`
  },
  {
    name: 'Effective Goal-Setting Conversation Guide',
    content: `Effective Goal-Setting Conversation Guide

As a coach, use these techniques to help clients discover and refine their goals:

Opening Questions:
- "What would you like to achieve in the next 3-6 months?"
- "If you could change one thing about your life, what would it be?"
- "What does success look like to you?"

Clarifying Questions:
- "Can you tell me more about what that means to you?"
- "What specifically would be different if you achieved this?"
- "How would you know when you've reached this goal?"

Exploring Motivation:
- "Why is this goal important to you right now?"
- "What would achieving this allow you to do?"
- "How would reaching this goal impact other areas of your life?"

Identifying Obstacles:
- "What might get in the way of achieving this?"
- "What has stopped you from pursuing this before?"
- "What support would you need to succeed?"

Creating Action Steps:
- "What's one small step you could take this week?"
- "Who could help you with this goal?"
- "What resources do you already have available?"

Accountability Questions:
- "How would you like to track your progress?"
- "When should we check in on this goal?"
- "What would help you stay motivated?"

Remember: Listen more than you speak. Your role is to guide discovery, not provide answers.`
  }
]

async function uploadKnowledgeToElevenLabs() {
  console.log('🚀 Starting knowledge upload to ElevenLabs...')

  try {
    // Get agent details
    console.log('📋 Fetching agent details...')
    const agent = await elevenlabs.conversationalAI.getAgent({
      agentId: MAYA_AGENT_ID
    })
    console.log(`✅ Found agent: ${agent.name}`)

    // Note: ElevenLabs API for knowledge base is not directly available in the SDK
    // In production, you would:
    // 1. Use the ElevenLabs dashboard to manually upload documents
    // 2. Or use their API directly with proper endpoints
    // 3. Or integrate with their webhook system to provide context dynamically

    console.log('\n📚 Knowledge documents prepared:')
    knowledgeDocuments.forEach(doc => {
      console.log(`- ${doc.name} (${doc.content.length} characters)`)
    })

    console.log('\n💡 Next steps:')
    console.log('1. Go to ElevenLabs dashboard: https://elevenlabs.io/conversational-ai')
    console.log(`2. Select agent: ${agent.name} (${MAYA_AGENT_ID})`)
    console.log('3. Navigate to Knowledge Base section')
    console.log('4. Upload the prepared documents')
    console.log('5. Enable RAG in agent settings')

    // Save documents locally for manual upload
    const outputDir = path.join(process.cwd(), 'knowledge-export')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    knowledgeDocuments.forEach(doc => {
      const filename = `${doc.name.toLowerCase().replace(/\s+/g, '-')}.txt`
      const filepath = path.join(outputDir, filename)
      fs.writeFileSync(filepath, doc.content)
      console.log(`\n📄 Saved: ${filepath}`)
    })

    console.log('\n✅ Knowledge documents saved to:', outputDir)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Alternative: Update agent system prompt with knowledge
async function updateAgentWithKnowledge() {
  console.log('\n🔄 Alternative: Updating agent system prompt with knowledge...')

  try {
    // Combine all knowledge into a comprehensive prompt addition
    const knowledgePrompt = `

## Coaching Knowledge Base

You have access to the following coaching frameworks and strategies:

${knowledgeDocuments.map(doc => `### ${doc.name}\n${doc.content}`).join('\n\n')}

Use this knowledge to provide evidence-based coaching guidance. When relevant, reference specific frameworks or strategies from this knowledge base.
`

    console.log('📝 Knowledge prompt prepared')
    console.log('Length:', knowledgePrompt.length, 'characters')
    
    // Note: The ElevenLabs SDK doesn't currently support updating agent prompts
    // You would need to do this through the dashboard or API directly
    
    console.log('\n💡 To add this knowledge to Maya:')
    console.log('1. Go to agent configuration in ElevenLabs dashboard')
    console.log('2. Edit the system prompt')
    console.log('3. Append the knowledge content to the existing prompt')
    console.log('4. Save and test the updated agent')

    // Save the prompt for manual update
    const promptPath = path.join(process.cwd(), 'knowledge-export', 'maya-knowledge-prompt.txt')
    fs.writeFileSync(promptPath, knowledgePrompt)
    console.log('\n📄 Knowledge prompt saved to:', promptPath)

  } catch (error) {
    console.error('❌ Error updating agent:', error)
  }
}

// Run both approaches
async function main() {
  await uploadKnowledgeToElevenLabs()
  await updateAgentWithKnowledge()
}

main().catch(console.error)