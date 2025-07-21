-- Seed data for LiveGuide knowledge base
-- This provides initial coaching knowledge for the RAG system

-- Get Maya's knowledge base ID
DO $$
DECLARE
    maya_kb_id UUID;
    career_cat_id UUID;
    wellness_cat_id UUID;
    personal_cat_id UUID;
    goals_cat_id UUID;
BEGIN
    -- Get Maya's knowledge base
    SELECT id INTO maya_kb_id FROM agent_knowledge_bases 
    WHERE agent_id = 'SuIlXQ4S6dyjrNViOrQ8' LIMIT 1;

    -- Create categories
    INSERT INTO knowledge_categories (kb_id, category, description) VALUES
    (maya_kb_id, 'Career Development', 'Career coaching strategies and advice')
    RETURNING id INTO career_cat_id;

    INSERT INTO knowledge_categories (kb_id, category, description) VALUES
    (maya_kb_id, 'Wellness & Health', 'Physical and mental wellness guidance')
    RETURNING id INTO wellness_cat_id;

    INSERT INTO knowledge_categories (kb_id, category, description) VALUES
    (maya_kb_id, 'Personal Growth', 'Personal development and self-improvement')
    RETURNING id INTO personal_cat_id;

    INSERT INTO knowledge_categories (kb_id, category, description) VALUES
    (maya_kb_id, 'Goal Setting', 'Goal setting frameworks and methodologies')
    RETURNING id INTO goals_cat_id;

    -- Insert knowledge documents (embeddings will be generated later)
    
    -- Goal Setting Documents
    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'SMART Goals Framework', 
    'SMART is an acronym that stands for Specific, Measurable, Achievable, Relevant, and Time-bound. This framework helps create clear and attainable goals:

    Specific: Your goal should be clear and specific. Ask yourself: What do I want to accomplish? Why is this goal important? Who is involved? Where is it located? Which resources are involved?

    Measurable: Track your progress with concrete criteria. How much? How many? How will I know when it is accomplished?

    Achievable: Your goal should be realistic and attainable. How can I accomplish this goal? How realistic is the goal based on constraints?

    Relevant: Ensure the goal matters to you and aligns with other relevant goals. Does this seem worthwhile? Is this the right time? Does this match our other efforts/needs?

    Time-bound: Every goal needs a target date. When? What can I do six months from now? What can I do six weeks from now? What can I do today?',
    '{"framework": "SMART", "difficulty": "beginner", "application": ["career", "personal", "fitness"]}'::jsonb);

    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'Goal Categories and Life Balance', 
    'A balanced life requires attention to multiple goal categories:

    1. Career & Professional Goals: Job advancement, skill development, entrepreneurship, networking
    2. Financial Goals: Savings, investments, debt reduction, income targets
    3. Health & Fitness Goals: Exercise routines, nutrition, weight management, medical checkups
    4. Relationship Goals: Family time, friendships, romantic relationships, community involvement
    5. Personal Development: Education, hobbies, creative pursuits, spiritual growth
    6. Lifestyle Goals: Travel, home improvement, work-life balance, time management

    The key is not to focus exclusively on one area but to create a portfolio of goals that support overall life satisfaction.',
    '{"type": "overview", "categories": ["life_balance", "goal_categories"]}'::jsonb);

    -- Career Development Documents
    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'Career Transition Strategies', 
    'Successfully transitioning careers requires careful planning and execution:

    1. Self-Assessment: Identify transferable skills, values, and interests
    2. Research: Investigate target industries and roles thoroughly
    3. Skill Gap Analysis: Determine what new skills you need to acquire
    4. Networking: Build connections in your target field
    5. Experience Building: Volunteer, freelance, or take on projects in the new field
    6. Personal Branding: Update resume, LinkedIn, and create a compelling narrative
    7. Financial Planning: Build a transition fund to support yourself during the change',
    '{"category": "career", "topic": "career_change", "level": "intermediate"}'::jsonb);

    -- Wellness Documents
    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'Holistic Wellness Approach', 
    'True wellness encompasses multiple dimensions:

    Physical Wellness: Regular exercise, nutritious diet, adequate sleep, preventive healthcare
    Mental Wellness: Stress management, mindfulness, cognitive challenges, therapy when needed
    Emotional Wellness: Self-awareness, healthy relationships, emotional regulation
    Social Wellness: Community connections, meaningful relationships, communication skills
    Spiritual Wellness: Purpose, values alignment, meditation or prayer, connection to something greater
    Environmental Wellness: Organized living spaces, time in nature, sustainable practices

    Each dimension influences the others, creating a synergistic effect on overall well-being.',
    '{"category": "wellness", "approach": "holistic", "dimensions": 6}'::jsonb);

    -- Personal Growth Documents
    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'Growth Mindset Development', 
    'Developing a growth mindset is fundamental to personal development:

    Fixed Mindset vs Growth Mindset:
    - Fixed: "I am not good at this" → Growth: "I am not good at this yet"
    - Fixed: "This is too hard" → Growth: "This may take time and effort"
    - Fixed: "I made a mistake" → Growth: "Mistakes help me learn"

    Strategies to Develop Growth Mindset:
    1. Embrace challenges as opportunities
    2. View effort as the path to mastery
    3. Learn from feedback and criticism
    4. Find inspiration in others success
    5. Use the word "yet" when facing difficulties
    6. Focus on the process, not just outcomes',
    '{"category": "personal_growth", "concept": "mindset", "psychologist": "Carol Dweck"}'::jsonb);

    -- Coaching Methodologies
    INSERT INTO knowledge_documents (kb_id, title, content, metadata) VALUES
    (maya_kb_id, 'Coaching Conversation Techniques', 
    'Effective coaching conversations follow key principles:

    1. Active Listening: Give full attention, reflect back what you hear, ask clarifying questions
    2. Powerful Questions: Open-ended questions that promote discovery and insight
    3. Goal Clarification: Help identify what success looks like
    4. Action Planning: Break down goals into concrete steps
    5. Accountability: Establish check-ins and progress tracking
    6. Celebration: Acknowledge progress and wins, no matter how small

    Sample Powerful Questions:
    - What would success look like to you?
    - What is holding you back?
    - What would you do if you knew you could not fail?
    - What is one small step you could take today?',
    '{"category": "coaching", "technique": "conversation", "application": "all_areas"}'::jsonb);

    -- Link documents to categories
    -- (In production, this would be done programmatically based on content analysis)
    
END $$;