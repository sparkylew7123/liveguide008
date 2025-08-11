# Client Tools Configuration & Testing Guide

This document outlines the implementation and comprehensive testing approach for LiveGuide's client tools configuration, which enables controlled agent recommendations and seamless handoffs.

## 🎯 Overview

The client tools system provides a restricted, secure interface for ElevenLabs agents to interact with the LiveGuide platform through:

1. **Controlled Recommendations** - Only during appropriate moments (onboarding, goal changes)
2. **Context Preservation** - 100% context transfer during agent handoffs
3. **Performance Monitoring** - Sub-200ms API responses, <2s handoffs
4. **Security & Rate Limiting** - Protected endpoints with usage quotas

## 📁 Implementation Files

### Core Implementation
- `/elevenlabs-client-tools-limited.json` - Tool configuration with restrictions
- `/src/app/api/client-tools/stream/route.ts` - SSE endpoint for tool invocations
- `/src/hooks/useClientTools.ts` - React hook for client-side tool management
- `/supabase/migrations/20250810_add_client_tools_tables.sql` - Database schema

### Testing Suite
- `/src/tests/agent-recommendation-scenarios.test.ts` - Recommendation flow testing
- `/src/tests/agent-handoff.test.ts` - Handoff scenarios and context preservation
- `/src/tests/test-utils.tsx` - Testing utilities and mocks
- `/src/tests/setup.ts` - Test environment configuration
- `/src/tests/vitest.config.ts` - Test runner configuration

## 🔧 Client Tools Configuration

### Available Tools

1. **check_recommendation_eligibility**
   - Validates recommendation timing and context
   - 30-minute cooldown between recommendations
   - Requires minimum conversation depth of 10
   - Daily limit: 50 checks per user

2. **recommend_specialist_agent**
   - Suggests appropriate specialist agents
   - Requires prior eligibility validation
   - Maximum 2 recommendations per session, 5 per day
   - Context-aware agent matching

3. **prepare_handoff_context**
   - Packages complete conversation context
   - Preserves emotional journey and breakthrough moments
   - Validates required context fields
   - Estimated handoff time: <2 seconds

4. **update_user_interface**
   - Real-time UI updates during conversations
   - Rate limited to prevent spam (5-second intervals)
   - Supports priority levels and action flags

5. **log_tool_invocation**
   - Analytics and debugging logging
   - Performance monitoring
   - Error tracking and diagnostics

### Restrictions & Rate Limits

```json
{
  "recommendation_cooldown_minutes": 30,
  "max_recommendations_per_session": 2,
  "max_recommendations_per_day": 5,
  "required_conversation_depth": 10,
  "allowed_recommendation_triggers": [
    "onboarding_complete",
    "new_goal_created", 
    "goal_status_changed",
    "context_shift_detected"
  ]
}
```

## 🧪 Testing Strategy

### Test Coverage Areas

#### 1. Recommendation Eligibility (85+ scenarios)
- **Valid Triggers**: Onboarding completion, goal changes, context shifts
- **Cooldown Enforcement**: 30-minute restriction between recommendations
- **Depth Requirements**: Minimum 10 conversation exchanges
- **Daily Limits**: Maximum 5 recommendations per user per day
- **Invalid Triggers**: Rejection of unauthorized recommendation requests

#### 2. Agent Matching Logic (40+ scenarios)
- **Career Goals**: Routes to career coaching specialists
- **Health Goals**: Connects with wellness coaches
- **Relationship Goals**: Directs to relationship specialists
- **Financial Goals**: Links to financial advisory agents
- **Fallback Behavior**: General coach for unclear/mixed goals

#### 3. Context Preservation (50+ scenarios)
- **100% Context Transfer**: Complete conversation history, insights, goals
- **Emotional Journey**: Mood tracking throughout conversation
- **Breakthrough Moments**: Key realization points
- **Conversation Metadata**: Duration, topics, progress indicators
- **Validation**: Required field checking before handoff

#### 4. Performance Requirements (25+ scenarios)
- **API Response Times**: <200ms for all tool invocations
- **Handoff Speed**: <2 seconds complete context transfer
- **Concurrent Handling**: Multiple simultaneous tool calls
- **Load Testing**: Performance under high usage scenarios

#### 5. Security & Rate Limiting (30+ scenarios)
- **Authentication**: JWT token validation
- **Authorization**: User-specific data access
- **Rate Limiting**: Tool-specific usage quotas
- **Cooldown Periods**: Enforced waiting periods
- **Error Handling**: Graceful failure modes

#### 6. Error Scenarios & Edge Cases (40+ scenarios)
- **Network Failures**: Connectivity issues, timeouts
- **Invalid Data**: Malformed requests, missing parameters
- **Service Unavailability**: Agent offline, database errors
- **Concurrency Issues**: Race conditions, state conflicts
- **Recovery Mechanisms**: Retry logic, fallback behaviors

### Performance Benchmarks

| Operation | Target | Test Scenarios |
|-----------|--------|----------------|
| Eligibility Check | <200ms | 15 performance tests |
| Agent Recommendation | <200ms | 12 performance tests |
| Handoff Preparation | <2000ms | 20 performance tests |
| Context Transfer | 100% accuracy | 25 validation tests |
| Concurrent Operations | No degradation | 10 load tests |

### Test Categories

#### Unit Tests
- Individual tool function testing
- Rate limiting logic validation
- Context packaging accuracy
- Error handling robustness

#### Integration Tests  
- End-to-end tool invocation flows
- Database interaction validation
- SSE streaming functionality
- Authentication integration

#### Performance Tests
- Response time measurements
- Concurrent load handling
- Memory usage monitoring
- Network condition simulation

#### Security Tests
- Authentication bypass attempts
- Authorization boundary testing
- Rate limit circumvention
- Data injection prevention

## 🚀 Running Tests

### Prerequisites
```bash
npm install
npm run build
```

### Test Execution

```bash
# Run all client tools tests
npm run test src/tests/agent-recommendation-scenarios.test.ts
npm run test src/tests/agent-handoff.test.ts

# Run with coverage
npm run test:coverage

# Run performance tests specifically
npm run test -- --grep "Performance"

# Run security tests
npm run test -- --grep "Security"

# Run with UI for debugging
npm run test:ui
```

### Test Configuration

Tests are configured with:
- **10-second timeout** for complex async operations
- **Coverage thresholds**: 85% minimum, 95% for critical paths
- **Custom matchers** for tool-specific validation
- **Mock data factories** for consistent test scenarios
- **Network simulation** for realistic conditions

## 📊 Test Results & Coverage

### Expected Coverage Targets

| Component | Line Coverage | Branch Coverage | Function Coverage |
|-----------|---------------|-----------------|-------------------|
| useClientTools.ts | >90% | >90% | >95% |
| stream/route.ts | >85% | >85% | >90% |
| Tool validation | >95% | >95% | >100% |
| Error handling | >80% | >85% | >90% |

### Key Metrics Tracked

1. **Recommendation Accuracy**: Agent suggestions match user context
2. **Context Preservation**: Zero data loss during handoffs  
3. **Performance Compliance**: All operations within time limits
4. **Security Validation**: No unauthorized access patterns
5. **User Experience**: No excessive recommendation fatigue

## 🔍 Monitoring & Analytics

### Logged Metrics
- Tool invocation frequency and patterns
- Performance timing for all operations
- Error rates and failure modes
- User engagement with recommendations
- Context transfer completeness

### Dashboard Indicators
- Average response times by tool
- Recommendation acceptance rates
- Handoff success percentages
- Daily/weekly usage patterns
- Error frequency and types

## 🛠️ Development Workflow

### Adding New Tools
1. Update `elevenlabs-client-tools-limited.json` configuration
2. Implement handler in `stream/route.ts`
3. Add method to `useClientTools.ts` hook
4. Create comprehensive test suite
5. Update database schema if needed
6. Document usage and restrictions

### Modifying Restrictions
1. Update JSON configuration limits
2. Adjust database quota settings
3. Update test scenarios to match
4. Verify security implications
5. Monitor impact on user experience

## 🚨 Critical Test Scenarios

### Must-Pass Scenarios

1. **No Spam Recommendations**: Users cannot be overwhelmed with suggestions
2. **Context Integrity**: Zero data loss during agent transfers
3. **Performance SLAs**: All operations complete within defined limits
4. **Security Boundaries**: No unauthorized access to user data
5. **Graceful Degradation**: System continues functioning during failures

### Edge Cases

1. **Rapid Goal Changes**: Multiple quick goal updates triggering recommendations
2. **Network Interruptions**: SSE connection drops during tool operations
3. **Concurrent Users**: Multiple sessions from same user
4. **Resource Exhaustion**: High load scenarios affecting performance
5. **Data Corruption**: Invalid context data handling

## 📋 Quality Assurance Checklist

### Pre-Release Validation

- [ ] All test suites pass with >95% success rate
- [ ] Performance benchmarks met in staging environment
- [ ] Security scan completed with no high/critical findings
- [ ] Rate limiting verified under load conditions
- [ ] Context preservation tested with real conversation data
- [ ] Error handling validated for all failure modes
- [ ] User interface updates work across all supported browsers
- [ ] Mobile responsiveness verified for tool interactions
- [ ] Accessibility compliance confirmed for all UI updates
- [ ] Analytics and monitoring systems active and accurate

### Ongoing Monitoring

- [ ] Daily performance metric reviews
- [ ] Weekly security audit log analysis
- [ ] Monthly user experience feedback assessment
- [ ] Quarterly load testing and capacity planning
- [ ] Continuous integration test results monitoring

## 🎯 Success Criteria

The client tools implementation is considered successful when:

1. **User Experience**: No complaints about excessive recommendations
2. **Performance**: 99.5% of operations complete within SLA times  
3. **Reliability**: <0.1% error rate for tool invocations
4. **Security**: Zero successful unauthorized access attempts
5. **Adoption**: >80% user engagement with appropriate recommendations

This comprehensive testing approach ensures the client tools system meets all functional, performance, and security requirements while providing an optimal user experience.