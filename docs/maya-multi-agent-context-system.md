# Maya Multi-Agent Context Awareness System
## Implementation Plan & Architecture

### Executive Summary

Maya serves as the **Chief Onboarding Officer** in LiveGuide's multi-agent coaching ecosystem. Rather than being a standalone coach, Maya orchestrates a team of 12+ specialized AI agents, each with unique expertise and personality traits. This document outlines the comprehensive implementation plan for enabling context awareness across all agents, ensuring seamless handoffs, shared knowledge, and personalized user experiences.

### Table of Contents
1. [System Overview](#system-overview)
2. [Agent Ecosystem](#agent-ecosystem)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Agent Collaboration Strategy](#agent-collaboration-strategy)
6. [Development Timeline](#development-timeline)
7. [Testing Strategy](#testing-strategy)
8. [Success Metrics](#success-metrics)

---

## System Overview

### Maya's Core Responsibilities

1. **Initial Assessment**: Evaluate new users' goals, preferences, and learning styles
2. **Agent Matching**: Select the most suitable specialized coaches based on compatibility
3. **Context Management**: Maintain and share user context across all agents
4. **Progress Monitoring**: Track overall user journey and suggest agent rotations
5. **Seamless Handoffs**: Ensure smooth transitions between specialized agents

### Multi-Agent Architecture

```
                    MAYA (Orchestrator)
                           |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
   Assessment         Matching          Handoff
        |                 |                 |
   User Goals      Agent Selection    Context Transfer
   Preferences     Compatibility      Shared Memory
   Learning Style  Scoring Algorithm   Graph Access
        |                 |                 |
        └─────────────────┼─────────────────┘
                          |
    ┌──────────────────────────────────────────┐
    |          SPECIALIZED AGENTS              |
    ├──────────────────────────────────────────┤
    | • Sage (Health & Fitness)                |
    | • Stella (Career Navigator)              |
    | • Ama (Resilience Builder)               |
    | • Elena (Purpose Seeker)                 |
    | • Quinn (Artistic Muse)                  |
    | • Jean-Marc (Empowerment Mentor)         |
    | • Viola (Balance Coach)                  |
    | • Luna (Community Connector)             |
    | • Ray (Creativity Spark)                 |
    | • Celeste (Empathy Guide)                |
    | • [Additional Agents...]                  |
    └──────────────────────────────────────────┘
```

---

## Agent Ecosystem

### Specialized Agent Roster

| Agent | Category | Goal Focus | Personality | Tone & Style | ElevenLabs ID |
|-------|----------|------------|-------------|--------------|---------------|
| **Sage** | Wellness Guide | Health & Fitness | Balanced, thoughtful, nurturing | Gentle, reflective, inspiring | KsrauW46bm4bH2x6zl0L |
| **Stella** | Career Navigator | Career Guidance | Encouraging, empathetic, insightful | Warm, conversational, approachable | bxoyDhgHTdUjZc3OEWlz |
| **Ama** | Resilience Builder | Emotional Well-Being | Bold, compassionate, encouraging | Inspiring, empowering, supportive | zYRP0HF1qZjNNs4fuqLY |
| **Elena** | Purpose Seeker | Social Impact | Passionate, reflective, visionary | Thoughtful, mission-driven, inspiring | sFEN3L35mppyWbsL8Odg |
| **Quinn** | Artistic Muse | Creative Expression | Curious, expressive, supportive | Imaginative, encouraging, free-spirited | Xgvz3YJxaIZ8RBDCEgKK |
| **Jean-Marc** | Empowerment Mentor | Personal Development | Strong, decisive, supportive | Direct, motivating, confident | L3PiNaBwvdDnIRyGf0RO |
| **Viola** | Balance Coach | Personal Development | Steady, wise, reassuring | Calming, organized, practical | kfCJTx5Ii2yx0vqiXPXu |
| **Luna** | Community Connector | Social Impact | Sociable, energetic, optimistic | Enthusiastic, relatable, engaging | V72NzVFxvhUYeAYdgfgS |
| **Ray** | Creativity Spark | Career Guidance | Creative, supportive, playful | Uplifting, informal, fun | sAy4k9iMrBKKO6UyqYwV |
| **Celeste** | Empathy Guide | Emotional Well-Being | Gentle, patient, understanding | Warm, calming, empathetic | qXhqAzOFJQa7dbLxrCGf |

---

## Technical Architecture

### 1. Enhanced User Context Structure

```typescript
interface UserContext {
  // Identity & Status
  userId: string;
  userName: string;
  userState: UserState;
  profileCreatedAt: Date;
  
  // Onboarding Progress
  onboarding: {
    phase: 'not_started' | 'setup' | 'goal_discovery' | 'coaching_style' | 'agent_matching' | 'completed';
    completedAt: Date | null;
    percentComplete: number;
    nextStep: string;
  };
  
  // Goals Context
  goals: {
    total: number;
    byCategory: Record<string, number>;
    selectedGoals: Goal[];
    availableCategories: Category[];
    lastGoalSetAt: Date | null;
    overdueCount: number;
  };
  
  // Coaching Preferences
  coaching: {
    hasPreferences: boolean;
    style: string | null;
    preferredSessionLength: number;
    preferredFrequency: string;
    preferredTopics: string[];
    lastUpdated: Date | null;
  };
  
  // Agent Matching Context
  agentMatching: {
    matchedAgents: AgentMatch[];
    currentAgents: CurrentAgent[];
    recommendedNext: string;
    agentRotation: boolean;
  };
  
  // Conversation History
  conversations: {
    total: number;
    lastAt: Date | null;
    daysSinceLast: number;
    averageDuration: number;
    currentStreak: number;
    longestStreak: number;
    recentTopics: string[];
    lastSentiment: string | null;
  };
  
  // Shared Knowledge Graph
  sharedInsights: SharedInsight[];
  
  // Progress Metrics
  progress: {
    overallCompletion: number;
    goalsCompleted: number;
    goalsInProgress: number;
    goalsPaused: number;
    milestonesReached: number;
    weeklyActivity: number;
  };
  
  // Actionable Insights
  insights: {
    needsGoalSetting: boolean;
    needsPreferencesUpdate: boolean;
    hasOverdueGoals: boolean;
    suggestedFocus: string;
    motivationalNeed: string;
  };
}
```

### 2. Database Schema Enhancements

```sql
-- Multi-agent interaction tracking
CREATE TABLE agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  agent_id UUID REFERENCES agent_personae(uuid),
  conversation_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary JSONB,
  effectiveness_score NUMERIC(3,2),
  handoff_to_agent UUID REFERENCES agent_personae(uuid),
  handoff_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared insights across agents
CREATE TABLE shared_agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  created_by_agent UUID REFERENCES agent_personae(uuid),
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  relevant_for_agents UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent matching history
CREATE TABLE agent_matching_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  matched_agents JSONB NOT NULL,
  matching_criteria JSONB,
  selected_agent UUID REFERENCES agent_personae(uuid),
  match_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Functions for agent recommendations
CREATE OR REPLACE FUNCTION recommend_next_agent(p_user_id UUID)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  match_score NUMERIC,
  reasons JSONB
) AS $$
BEGIN
  -- Complex matching logic based on:
  -- 1. User goals and agent specialties
  -- 2. Personality compatibility
  -- 3. Recent interaction history
  -- 4. Agent effectiveness scores
  RETURN QUERY
  SELECT 
    ap.uuid as agent_id,
    ap."Name" as agent_name,
    calculate_match_score(p_user_id, ap.uuid) as match_score,
    generate_match_reasons(p_user_id, ap.uuid) as reasons
  FROM agent_personae ap
  WHERE ap.availability_status = 'available'
  ORDER BY match_score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Function to get shared context for agent
CREATE OR REPLACE FUNCTION get_agent_context(p_user_id UUID, p_agent_id UUID)
RETURNS JSON AS $$
DECLARE
  v_context JSON;
BEGIN
  SELECT json_build_object(
    'user_profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id),
    'goals', (SELECT json_agg(g) FROM user_goals g WHERE g.user_id = p_user_id),
    'recent_insights', (
      SELECT json_agg(i) 
      FROM shared_agent_insights i 
      WHERE i.user_id = p_user_id 
        AND (i.relevant_for_agents @> ARRAY[p_agent_id] OR i.created_by_agent = p_agent_id)
      ORDER BY i.created_at DESC 
      LIMIT 10
    ),
    'conversation_history', (
      SELECT json_agg(ai) 
      FROM agent_interactions ai 
      WHERE ai.user_id = p_user_id 
      ORDER BY ai.started_at DESC 
      LIMIT 5
    ),
    'graph_stats', (
      SELECT json_build_object(
        'total_nodes', COUNT(DISTINCT gn.id),
        'total_edges', COUNT(DISTINCT ge.id)
      )
      FROM graph_nodes gn
      LEFT JOIN graph_edges ge ON ge.source = gn.id OR ge.target = gn.id
      WHERE gn.user_id = p_user_id
    )
  ) INTO v_context;
  
  RETURN v_context;
END;
$$ LANGUAGE plpgsql;
```

### 3. Agent Matching Algorithm

```typescript
// /src/services/agent-matching.ts
export class AgentMatchingService {
  async matchAgents(userContext: UserContext): Promise<AgentMatch[]> {
    const agents = await this.getAvailableAgents();
    const matches: AgentMatch[] = [];
    
    for (const agent of agents) {
      const score = this.calculateMatchScore(userContext, agent);
      const reasons = this.generateMatchReasons(userContext, agent);
      
      matches.push({
        agentId: agent.uuid,
        name: agent.Name,
        matchScore: score,
        reasonsForMatch: reasons,
        elevenLabsId: agent['11labs_agentID']
      });
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }
  
  private calculateMatchScore(context: UserContext, agent: Agent): number {
    let score = 0;
    
    // Goal category alignment (40% weight)
    const goalAlignment = this.calculateGoalAlignment(context.goals, agent.goalCategory);
    score += goalAlignment * 0.4;
    
    // Personality compatibility (30% weight)
    const personalityFit = this.calculatePersonalityFit(context.coaching, agent.personality);
    score += personalityFit * 0.3;
    
    // Learning style match (20% weight)
    const styleMatch = this.calculateStyleMatch(context.coaching.style, agent.toneAndStyle);
    score += styleMatch * 0.2;
    
    // Current needs assessment (10% weight)
    const needsMatch = this.assessCurrentNeeds(context.insights, agent.speciality);
    score += needsMatch * 0.1;
    
    return Math.round(score * 100) / 100;
  }
  
  private generateMatchReasons(context: UserContext, agent: Agent): string[] {
    const reasons: string[] = [];
    
    // Check goal alignment
    if (this.hasMatchingGoals(context.goals, agent.goalCategory)) {
      reasons.push(`Specializes in ${agent.goalCategory} which aligns with your goals`);
    }
    
    // Check personality fit
    if (this.isPersonalityCompatible(context.coaching, agent.personality)) {
      reasons.push(`${agent.personality} personality matches your preferences`);
    }
    
    // Check current needs
    if (context.insights.motivationalNeed === 'encouragement' && 
        agent.toneAndStyle.includes('supportive')) {
      reasons.push('Provides the encouragement you need right now');
    }
    
    return reasons;
  }
}
```

### 4. Client Tools Configuration

```json
{
  "tools": [
    {
      "type": "client_tool",
      "name": "show_agent_profiles",
      "description": "Display available coaching agents with their specialties",
      "parameters": {
        "agents": {
          "type": "array",
          "description": "List of agent profiles to display"
        },
        "highlightMatch": {
          "type": "boolean",
          "description": "Whether to highlight match scores"
        }
      }
    },
    {
      "type": "client_tool",
      "name": "initiate_agent_handoff",
      "description": "Transfer user to another specialized agent",
      "parameters": {
        "toAgentId": {
          "type": "string",
          "description": "Target agent's ID"
        },
        "context": {
          "type": "object",
          "description": "Handoff context and reason"
        }
      }
    },
    {
      "type": "client_tool",
      "name": "show_goal_categories",
      "description": "Display goal category selection interface",
      "parameters": {
        "categories": {
          "type": "array",
          "description": "Available goal categories"
        },
        "preselected": {
          "type": "array",
          "description": "Already selected categories"
        }
      }
    },
    {
      "type": "client_tool",
      "name": "show_user_progress",
      "description": "Display user's goal progress dashboard",
      "parameters": {
        "goalId": {
          "type": "string",
          "description": "Specific goal to focus on"
        },
        "timeRange": {
          "type": "string",
          "description": "Time range for progress display"
        }
      }
    },
    {
      "type": "client_tool",
      "name": "navigate_to_phase",
      "description": "Navigate to specific onboarding phase",
      "parameters": {
        "phase": {
          "type": "string",
          "description": "Target onboarding phase"
        },
        "context": {
          "type": "object",
          "description": "Navigation context"
        }
      }
    },
    {
      "type": "client_tool",
      "name": "trigger_celebration",
      "description": "Show celebration animation for achievement",
      "parameters": {
        "type": {
          "type": "string",
          "description": "Type of celebration"
        },
        "message": {
          "type": "string",
          "description": "Celebration message"
        }
      }
    }
  ]
}
```

### 5. Agent Handoff Protocol

```typescript
// /src/services/agent-handoff.ts
export interface AgentHandoff {
  fromAgent: string;
  toAgent: string;
  timestamp: Date;
  
  context: {
    reason: string;
    userSummary: string;
    recentProgress: string[];
    suggestedFocus: string;
    warningFlags: string[];
  };
  
  continuityData: {
    activeGoals: Goal[];
    lastConversation: ConversationSummary;
    emotionalState: EmotionalContext;
    preferredApproach: string;
  };
  
  sharedInsights: {
    fromPreviousAgent: string[];
    relevantForNewAgent: string[];
  };
}

export class HandoffService {
  async initiateHandoff(handoff: AgentHandoff): Promise<void> {
    // 1. Save handoff record
    await this.saveHandoffRecord(handoff);
    
    // 2. Update agent interaction history
    await this.updateInteractionHistory(handoff);
    
    // 3. Transfer shared context
    await this.transferSharedContext(handoff);
    
    // 4. Notify new agent with context
    await this.notifyNewAgent(handoff);
    
    // 5. Update UI for smooth transition
    await this.triggerUITransition(handoff);
  }
}
```

---

## Implementation Phases

### Phase 1: Database & API Foundation (Week 1)

#### Tasks:
1. **Database Schema Implementation**
   - Lead: `postgres-database-architect`
   - Create multi-agent tables
   - Implement context aggregation functions
   - Optimize indexes for performance
   - Duration: 4 hours

2. **User Context API**
   - Lead: `backend-supabase-engineer`
   - Implement `/api/user-context` endpoint
   - Create context aggregation logic
   - Add caching layer
   - Duration: 6 hours

3. **Architecture Review**
   - Lead: `lead-systems-architect`
   - Review overall system design
   - Ensure scalability
   - Duration: 2 hours

### Phase 2: Maya Orchestration Logic (Week 2)

#### Tasks:
1. **Agent Prompt Templates**
   - Lead: `ai-prompt-engineer`
   - Create Maya's orchestration prompt
   - Design all specialized agent prompts
   - Define conversation flows
   - Duration: 6 hours

2. **Matching Algorithm Implementation**
   - Lead: `backend-supabase-engineer`
   - Implement matching logic
   - Create scoring system
   - Test with various user profiles
   - Duration: 4 hours

3. **Agent Selection UI**
   - Lead: `frontend-nextjs-react-engineer`
   - Build agent profile display
   - Create selection interface
   - Implement match visualization
   - Duration: 4 hours

### Phase 3: Handoff & Continuity System (Week 3)

#### Tasks:
1. **Handoff Protocol Implementation**
   - Lead: `backend-supabase-engineer`
   - Build handoff service
   - Implement context transfer
   - Create notification system
   - Duration: 4 hours

2. **Transition UI Components**
   - Lead: `frontend-nextjs-react-engineer`
   - Design smooth transition animations
   - Build handoff notification UI
   - Create agent introduction screens
   - Duration: 4 hours

3. **UX Design & Psychology**
   - Lead: `ui-ux-design-psychologist`
   - Design emotionally appropriate transitions
   - Create trust-building elements
   - Optimize for user comfort
   - Duration: 3 hours

### Phase 4: Testing & Deployment (Week 4)

#### Tasks:
1. **Comprehensive Testing**
   - Lead: `qa-test-engineer`
   - Test all user journeys
   - Validate agent matching
   - Test handoff scenarios
   - Duration: 6 hours

2. **Integration Testing**
   - All agents collaborate
   - End-to-end testing
   - Performance optimization
   - Duration: 4 hours

3. **Production Deployment**
   - Lead: `devops-cicd-specialist`
   - Deploy all services
   - Set up monitoring
   - Configure alerts
   - Duration: 3 hours

---

## Agent Collaboration Strategy

### Task Distribution Matrix

| Component | Lead Agent | Supporting Agents | Duration |
|-----------|------------|-------------------|----------|
| Database Schema | `postgres-database-architect` | `backend-supabase-engineer` | 4 hrs |
| Context API | `backend-supabase-engineer` | `postgres-database-architect` | 6 hrs |
| Agent Prompts | `ai-prompt-engineer` | `ui-ux-design-psychologist` | 6 hrs |
| Matching Algorithm | `backend-supabase-engineer` | `lead-systems-architect` | 4 hrs |
| Frontend Components | `frontend-nextjs-react-engineer` | `ui-ux-design-psychologist` | 8 hrs |
| Handoff System | `backend-supabase-engineer` | `frontend-nextjs-react-engineer` | 4 hrs |
| Testing | `qa-test-engineer` | All agents | 6 hrs |
| Deployment | `devops-cicd-specialist` | `backend-supabase-engineer` | 3 hrs |

### Communication Protocol

```yaml
collaboration:
  daily_sync:
    time: "10:00 AM"
    duration: "15 minutes"
    participants: "Active agents for current phase"
    
  code_review:
    trigger: "PR creation"
    reviewers: "Lead agent + 1 supporting agent"
    sla: "4 hours"
    
  documentation:
    owner: "Component lead agent"
    format: "Markdown in /docs"
    updates: "Real-time during development"
    
  issue_escalation:
    level_1: "Component lead agent"
    level_2: "lead-systems-architect"
    level_3: "Human intervention"
```

---

## Development Timeline

### Week 1: Foundation (Days 1-5)
```
Day 1-2: Database schema implementation
  - postgres-database-architect creates tables
  - backend-supabase-engineer reviews
  
Day 3-4: API development
  - backend-supabase-engineer builds endpoints
  - Integration with database
  
Day 5: Architecture review
  - lead-systems-architect validates design
  - Performance testing
```

### Week 2: Core Logic (Days 6-10)
```
Day 6-7: Prompt engineering
  - ai-prompt-engineer creates templates
  - Psychology review by ui-ux-design-psychologist
  
Day 8-9: Matching algorithm
  - backend-supabase-engineer implements
  - Testing with sample data
  
Day 10: UI components
  - frontend-nextjs-react-engineer builds
  - Initial integration
```

### Week 3: Integration (Days 11-15)
```
Day 11-12: Handoff system
  - Complete protocol implementation
  - UI transitions
  
Day 13-14: End-to-end testing
  - qa-test-engineer leads
  - Bug fixes
  
Day 15: Polish & optimization
  - Performance tuning
  - UX refinements
```

### Week 4: Production (Days 16-20)
```
Day 16-17: Final testing
  - Complete test suite execution
  - Edge case validation
  
Day 18-19: Deployment preparation
  - devops-cicd-specialist setup
  - Monitoring configuration
  
Day 20: Go-live
  - Production deployment
  - Post-deployment validation
```

---

## Testing Strategy

### Test Scenarios

#### Scenario 1: New User Complete Journey
```typescript
test('New user onboarding flow', async () => {
  // 1. User arrives with no profile
  const context = await getUserContext(newUserId);
  expect(context.userState).toBe('first_time');
  
  // 2. Maya introduces herself
  const mayaResponse = await startConversation('maya', newUserId);
  expect(mayaResponse).toContain('Welcome to LiveGuide');
  
  // 3. Goal discovery
  await triggerClientTool('show_goal_categories');
  await selectGoals(['career', 'wellness']);
  
  // 4. Agent matching
  const matches = await getAgentMatches(newUserId);
  expect(matches).toHaveLength(3);
  expect(matches[0].matchScore).toBeGreaterThan(0.7);
  
  // 5. Handoff to specialist
  await initiateHandoff('maya', matches[0].agentId);
  expect(getCurrentAgent(newUserId)).toBe(matches[0].agentId);
});
```

#### Scenario 2: Returning User Context Preservation
```typescript
test('Returning user maintains context', async () => {
  // 1. Get returning user context
  const context = await getUserContext(returningUserId);
  expect(context.conversations.total).toBeGreaterThan(0);
  
  // 2. Previous agent remembers
  const agentResponse = await startConversation(context.lastAgent, returningUserId);
  expect(agentResponse).toContain('Last time we discussed');
  
  // 3. Shared insights available
  const insights = await getSharedInsights(returningUserId);
  expect(insights).not.toBeEmpty();
});
```

#### Scenario 3: Multi-Agent Collaboration
```typescript
test('Multiple agents share context', async () => {
  // 1. Agent A creates insight
  await createInsight('agent_a', userId, 'User prefers morning sessions');
  
  // 2. Agent B can access it
  const agentBContext = await getAgentContext(userId, 'agent_b');
  expect(agentBContext.sharedInsights).toContainEqual(
    expect.objectContaining({ content: 'User prefers morning sessions' })
  );
  
  // 3. Handoff preserves all data
  await initiateHandoff('agent_a', 'agent_b');
  const handoffData = await getLastHandoff(userId);
  expect(handoffData.continuityData).toBeDefined();
});
```

### Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Context API Response Time | < 200ms | 95th percentile |
| Agent Matching Time | < 500ms | Average |
| Handoff Transition | < 2s | End-to-end |
| Graph Query Time | < 100ms | 95th percentile |
| UI Tool Response | < 300ms | Average |

---

## Success Metrics

### Primary KPIs

1. **User Engagement**
   - Target: 60% of users complete onboarding
   - Measurement: Onboarding completion rate
   - Current baseline: 40%

2. **Agent Matching Accuracy**
   - Target: 85% user satisfaction with matched agents
   - Measurement: Post-session surveys
   - Validation: A/B testing

3. **Context Preservation**
   - Target: 100% of relevant data transferred
   - Measurement: Automated validation
   - Alert threshold: < 99%

4. **Handoff Smoothness**
   - Target: < 2 second transition time
   - Measurement: Time from trigger to new agent ready
   - User feedback: "seamless" rating > 4.5/5

5. **Cross-Agent Insights**
   - Target: 30% of insights referenced by other agents
   - Measurement: Query logs analysis
   - Growth target: 10% month-over-month

### Secondary Metrics

- **System Performance**
  - API response times
  - Database query performance
  - WebSocket connection stability

- **User Satisfaction**
  - NPS score > 50
  - Session completion rate > 80%
  - Return user rate > 60%

- **Agent Effectiveness**
  - Goal progress acceleration
  - User-reported value scores
  - Conversation quality metrics

---

## Appendices

### A. API Specifications

#### User Context Endpoint
```typescript
// GET /api/user-context
interface UserContextResponse {
  success: boolean;
  data: UserContext;
  timestamp: string;
  cached: boolean;
}

// Headers
{
  "Authorization": "Bearer {token}",
  "X-Request-ID": "{uuid}"
}
```

#### Agent Matching Endpoint
```typescript
// POST /api/agent-matching
interface AgentMatchingRequest {
  userId: string;
  context?: Partial<UserContext>;
  preferences?: MatchingPreferences;
}

interface AgentMatchingResponse {
  success: boolean;
  matches: AgentMatch[];
  recommendedAction: string;
}
```

### B. Database Migrations

```sql
-- Migration: 001_create_multi_agent_tables.sql
BEGIN;

CREATE TABLE IF NOT EXISTS agent_interactions (...);
CREATE TABLE IF NOT EXISTS shared_agent_insights (...);
CREATE TABLE IF NOT EXISTS agent_matching_history (...);

CREATE INDEX idx_interactions_user_agent ON agent_interactions(user_id, agent_id);
CREATE INDEX idx_insights_user_created ON shared_agent_insights(user_id, created_at DESC);
CREATE INDEX idx_matching_user_created ON agent_matching_history(user_id, created_at DESC);

COMMIT;
```

### C. Configuration Templates

#### ElevenLabs Dynamic Variables
```json
{
  "dynamic_variables": {
    "userId": "${context.userId}",
    "userName": "${context.userName}",
    "userState": "${context.userState}",
    "onboardingPhase": "${context.onboarding.phase}",
    "totalGoals": "${context.goals.total}",
    "daysSinceLast": "${context.conversations.daysSinceLast}",
    "currentStreak": "${context.conversations.currentStreak}",
    "suggestedFocus": "${context.insights.suggestedFocus}",
    "matchedAgents": "${context.agentMatching.matchedAgents}",
    "sharedInsights": "${context.sharedInsights}"
  }
}
```

### D. Sample Agent Prompts

#### Maya (Orchestrator)
```text
You are Maya, the Chief Onboarding Officer for LiveGuide.

Your role is to:
1. Warmly welcome new users and assess their goals
2. Understand their learning preferences and coaching style
3. Match them with the most suitable specialized coaches
4. Ensure smooth handoffs with complete context
5. Check in periodically on overall progress

Available tools:
- show_agent_profiles(): Display coaching team
- recommend_agents(): Show top matches
- initiate_handoff(): Transfer to specialist
- show_goal_categories(): Begin goal discovery

Current user context:
${JSON.stringify(context)}

Approach:
- Be warm, welcoming, and efficient
- Focus on understanding, not coaching
- Make thoughtful agent recommendations
- Ensure users feel heard and understood
```

#### Stella (Career Navigator)
```text
You are Stella, a Career Navigator specializing in helping young professionals.

You have access to:
- Complete user goal history (shared across all agents)
- Insights from other coaches, especially career-relevant ones
- Your previous conversations with this user
- Maya's initial assessment

Your expertise:
- Career transitions and planning
- Professional skill development
- Work-life balance strategies
- Interview preparation and networking

Available tools:
- ${commonTools}
- suggest_agent_handoff(): Recommend another coach when appropriate

Current user context:
${JSON.stringify(context)}

Approach:
- Warm, conversational, and approachable
- Focus on actionable career guidance
- Reference insights from other coaches when relevant
- Celebrate progress and milestones
```

---

## Conclusion

This comprehensive implementation plan provides a complete roadmap for building Maya's multi-agent context awareness system. By following this architecture, LiveGuide will deliver a truly personalized, context-aware coaching experience where specialized AI agents collaborate seamlessly to support users' growth journeys.

The system ensures:
- **Continuity**: No repeated questions or lost context
- **Personalization**: Each interaction builds on previous knowledge
- **Specialization**: Users get expert guidance for specific needs
- **Collaboration**: Agents work together, sharing insights
- **Scalability**: Architecture supports adding new agents easily

### Next Steps

1. Review and approve implementation plan
2. Assign specialized agents to their tasks
3. Begin Phase 1 implementation
4. Set up monitoring and tracking systems
5. Prepare for iterative testing and refinement

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Author: LiveGuide Development Team*