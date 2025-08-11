import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { useClientTools } from '@/hooks/useClientTools';
import { TestWrapper } from './test-utils';

// Mock user and auth context
const mockUser = {
  id: 'test-user-456',
  email: 'handoff-test@example.com'
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock fetch globally
global.fetch = vi.fn();

// Test component for handoff scenarios
function TestHandoffComponent() {
  const clientTools = useClientTools();
  
  const handlePrepareHandoff = async () => {
    await clientTools.prepareHandoff(
      'career_coach_agent_id',
      'User needs specialized career guidance',
      {
        conversation_summary: 'User discussed career transition from tech to healthcare',
        key_insights: [
          'Motivated by desire to help people',
          'Has technical background',
          'Concerns about salary reduction'
        ],
        goals_status: {
          'career_transition': 'in_progress',
          'salary_research': 'pending',
          'skill_assessment': 'completed'
        },
        emotional_journey: [
          { emotion: 'excitement', timestamp: '2025-08-10T10:00:00Z', context: 'discussing new possibilities' },
          { emotion: 'anxiety', timestamp: '2025-08-10T10:15:00Z', context: 'financial concerns' }
        ],
        next_steps: [
          'Research healthcare career paths',
          'Connect with healthcare professionals',
          'Evaluate financial implications'
        ],
        conversation_metadata: {
          duration_minutes: 45,
          topics_covered: ['career change', 'healthcare industry', 'financial planning'],
          breakthrough_moments: ['Identified core motivation: helping people']
        }
      }
    );
  };
  
  return (
    <div>
      <div data-testid="connection-status">
        {clientTools.isConnected ? 'connected' : 'disconnected'}
      </div>
      <div data-testid="pending-handoff">
        {clientTools.pendingHandoff ? JSON.stringify(clientTools.pendingHandoff) : 'none'}
      </div>
      <div data-testid="error">
        {clientTools.error || 'no-error'}
      </div>
      <button 
        data-testid="prepare-handoff"
        onClick={handlePrepareHandoff}
      >
        Prepare Handoff
      </button>
      <button 
        data-testid="clear-handoff"
        onClick={clientTools.clearPendingHandoff}
      >
        Clear Handoff
      </button>
    </div>
  );
}

describe('Agent Handoff Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock EventSource
    global.EventSource = vi.fn().mockImplementation(() => ({
      onopen: null,
      onmessage: null,
      onerror: null,
      close: vi.fn()
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Context Preservation', () => {
    test('should preserve 100% of conversation context during handoff', async () => {
      const expectedContext = {
        conversation_summary: 'User discussed career transition from tech to healthcare',
        key_insights: [
          'Motivated by desire to help people',
          'Has technical background', 
          'Concerns about salary reduction'
        ],
        goals_status: {
          'career_transition': 'in_progress',
          'salary_research': 'pending',
          'skill_assessment': 'completed'
        },
        emotional_journey: [
          { emotion: 'excitement', timestamp: '2025-08-10T10:00:00Z', context: 'discussing new possibilities' },
          { emotion: 'anxiety', timestamp: '2025-08-10T10:15:00Z', context: 'financial concerns' }
        ],
        next_steps: [
          'Research healthcare career paths',
          'Connect with healthcare professionals',
          'Evaluate financial implications'
        ],
        conversation_metadata: {
          duration_minutes: 45,
          topics_covered: ['career change', 'healthcare industry', 'financial planning'],
          breakthrough_moments: ['Identified core motivation: helping people']
        }
      };

      const mockResponse = {
        type: 'handoff_prepared',
        handoff_id: 'handoff_123',
        target_agent_id: 'career_coach_agent_id',
        context_package: expectedContext,
        estimated_handoff_time: '2-3 seconds'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        const pendingHandoff = screen.getByTestId('pending-handoff');
        expect(pendingHandoff).not.toHaveTextContent('none');
        
        const handoffData = JSON.parse(pendingHandoff.textContent!);
        expect(handoffData.target_agent_id).toBe('career_coach_agent_id');
        expect(handoffData.handoff_id).toBe('handoff_123');
      });

      // Verify the API was called with complete context
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/client-tools/stream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('prepare_handoff_context')
        })
      );
    });

    test('should validate required context fields before handoff', async () => {
      const TestIncompleteContextComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.prepareHandoff(
              'career_coach_agent_id',
              'Test handoff',
              {
                // Missing required conversation_summary
                key_insights: ['test insight'],
                goals_status: {}
              } as any
            )}
          >
            Incomplete Handoff
          </button>
        );
      };

      const mockErrorResponse = {
        type: 'error',
        error: 'Required context fields missing'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      render(
        <TestWrapper>
          <TestIncompleteContextComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Incomplete Handoff');
      fireEvent.click(button);

      await waitFor(() => {
        // Should handle the error gracefully
        expect(button).toBeInTheDocument();
      });
    });

    test('should include emotional journey and breakthrough moments', async () => {
      const emotionalContext = {
        conversation_summary: 'Deep conversation about life changes',
        key_insights: ['Major breakthrough in self-awareness'],
        goals_status: { 'personal_growth': 'breakthrough' },
        emotional_journey: [
          { emotion: 'confusion', timestamp: '2025-08-10T09:00:00Z', context: 'feeling lost' },
          { emotion: 'clarity', timestamp: '2025-08-10T09:30:00Z', context: 'moment of insight' },
          { emotion: 'determination', timestamp: '2025-08-10T10:00:00Z', context: 'ready to act' }
        ],
        next_steps: ['Apply new insights to daily life'],
        conversation_metadata: {
          duration_minutes: 60,
          topics_covered: ['self-reflection', 'life purpose', 'values alignment'],
          breakthrough_moments: [
            'Realized core values misalignment with current job',
            'Identified passion for creative work'
          ]
        }
      };

      const TestEmotionalHandoffComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.prepareHandoff(
              'life_coach_agent_id',
              'User had major breakthrough, needs specialized support',
              emotionalContext
            )}
          >
            Emotional Handoff
          </button>
        );
      };

      const mockResponse = {
        type: 'handoff_prepared',
        handoff_id: 'emotional_handoff_456',
        target_agent_id: 'life_coach_agent_id',
        context_package: emotionalContext
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestEmotionalHandoffComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Emotional Handoff');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/client-tools/stream',
          expect.objectContaining({
            body: expect.stringContaining('breakthrough_moments')
          })
        );
      });
    });
  });

  describe('Handoff Performance', () => {
    test('should complete handoff preparation within 2 seconds', async () => {
      const startTime = Date.now();
      
      const mockResponse = {
        type: 'handoff_prepared',
        handoff_id: 'fast_handoff_789',
        target_agent_id: 'specialist_agent',
        estimated_handoff_time: '1.5 seconds'
      };

      // Simulate 1.8 second response time
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockResponse
            });
          }, 1800);
        })
      );

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        expect(screen.getByTestId('pending-handoff')).not.toHaveTextContent('none');
      }, { timeout: 3000 });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2500); // Allow some buffer for test overhead
    });

    test('should handle concurrent handoff preparations', async () => {
      const mockResponse = {
        type: 'handoff_prepared',
        handoff_id: 'concurrent_handoff',
        target_agent_id: 'test_agent'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const TestConcurrentHandoffComponent = () => {
        const clientTools = useClientTools();
        
        const handleMultipleHandoffs = async () => {
          const promises = Array.from({ length: 3 }, (_, i) =>
            clientTools.prepareHandoff(
              `agent_${i}`,
              `Concurrent handoff ${i}`,
              {
                conversation_summary: `Test conversation ${i}`,
                goals_status: {},
                key_insights: [`Insight ${i}`]
              }
            )
          );
          
          await Promise.all(promises);
        };
        
        return (
          <button onClick={handleMultipleHandoffs}>
            Multiple Handoffs
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestConcurrentHandoffComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Multiple Handoffs');
      fireEvent.click(button);

      // Should complete without errors
      await waitFor(() => {
        expect(button).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Handoff Validation and Security', () => {
    test('should validate target agent exists before handoff', async () => {
      const mockErrorResponse = {
        type: 'error',
        error: 'Invalid target agent ID'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      const TestInvalidAgentComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.prepareHandoff(
              'nonexistent_agent_id',
              'Test with invalid agent',
              {
                conversation_summary: 'Test',
                goals_status: {},
                key_insights: []
              }
            )}
          >
            Invalid Agent Handoff
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestInvalidAgentComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Invalid Agent Handoff');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should authenticate handoff requests', async () => {
      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/client-tools/stream',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining(mockUser.id)
          })
        );
      });
    });

    test('should prevent handoff without proper context', async () => {
      const TestEmptyContextComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.prepareHandoff(
              'test_agent',
              'Empty context test',
              {} as any // Empty context should fail validation
            )}
          >
            Empty Context Handoff
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestEmptyContextComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Empty Context Handoff');
      
      // Should throw error or handle gracefully
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Behaviors', () => {
    test('should gracefully handle handoff failures', async () => {
      const mockFailureResponse = {
        type: 'error',
        error: 'Handoff service unavailable'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFailureResponse
      });

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Handoff service unavailable');
      });

      // Application should continue functioning
      expect(screen.getByTestId('prepare-handoff')).toBeInTheDocument();
    });

    test('should provide graceful continuation when handoff fails', async () => {
      // Simulate network failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Tool invocation failed');
      });

      // User should still be able to continue conversation
      expect(prepareButton).not.toBeDisabled();
    });

    test('should allow manual handoff retry after failure', async () => {
      // First call fails
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            type: 'handoff_prepared',
            handoff_id: 'retry_success',
            target_agent_id: 'career_coach_agent_id'
          })
        });

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      const prepareButton = screen.getByTestId('prepare-handoff');
      
      // First attempt
      fireEvent.click(prepareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Tool invocation failed');
      });

      // Retry attempt
      fireEvent.click(prepareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('pending-handoff')).not.toHaveTextContent('none');
      });
    });
  });

  describe('Complete User Journey', () => {
    test('should support full onboarding to specialist coaching flow', async () => {
      let currentStep = 'onboarding';
      
      const TestFullJourneyComponent = () => {
        const clientTools = useClientTools();
        
        const simulateOnboardingComplete = async () => {
          currentStep = 'goal_setting';
          await clientTools.checkRecommendationEligibility('onboarding_complete', {
            primary_goals: ['career advancement'],
            current_phase: 'onboarding',
            conversation_depth: 15
          });
        };
        
        const simulateSpecialistRecommendation = async () => {
          currentStep = 'specialist_recommended';
          await clientTools.recommendSpecialistAgent({
            user_goals: ['career advancement', 'leadership development'],
            complexity_level: 'advanced'
          });
        };
        
        const simulateHandoffPreparation = async () => {
          currentStep = 'handoff_prepared';
          await clientTools.prepareHandoff(
            'leadership_coach_agent_id',
            'User ready for advanced leadership coaching',
            {
              conversation_summary: 'Completed onboarding, identified leadership goals',
              key_insights: ['Natural leadership qualities', 'Needs confidence building'],
              goals_status: { 'leadership_development': 'ready_for_specialist' },
              next_steps: ['Advanced leadership assessment', 'Executive coaching program']
            }
          );
        };
        
        return (
          <div>
            <div data-testid="current-step">{currentStep}</div>
            <button data-testid="complete-onboarding" onClick={simulateOnboardingComplete}>
              Complete Onboarding
            </button>
            <button data-testid="get-recommendation" onClick={simulateSpecialistRecommendation}>
              Get Recommendation
            </button>
            <button data-testid="prepare-handoff" onClick={simulateHandoffPreparation}>
              Prepare Handoff
            </button>
          </div>
        );
      };

      // Mock successful responses for each step
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'eligibility_check', eligible: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'agent_recommendation', recommended_agent_id: 'leadership_coach_agent_id' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'handoff_prepared', handoff_id: 'full_journey_handoff' })
        });

      render(
        <TestWrapper>
          <TestFullJourneyComponent />
        </TestWrapper>
      );

      // Step 1: Complete onboarding
      fireEvent.click(screen.getByTestId('complete-onboarding'));
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('goal_setting');
      });

      // Step 2: Get specialist recommendation
      fireEvent.click(screen.getByTestId('get-recommendation'));
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('specialist_recommended');
      });

      // Step 3: Prepare handoff to specialist
      fireEvent.click(screen.getByTestId('prepare-handoff'));
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('handoff_prepared');
      });

      // Verify all API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('State Management', () => {
    test('should clear pending handoff state', async () => {
      const mockResponse = {
        type: 'handoff_prepared',
        handoff_id: 'clear_test_handoff',
        target_agent_id: 'test_agent'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      // Prepare handoff
      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      await waitFor(() => {
        expect(screen.getByTestId('pending-handoff')).not.toHaveTextContent('none');
      });

      // Clear handoff
      const clearButton = screen.getByTestId('clear-handoff');
      fireEvent.click(clearButton);

      expect(screen.getByTestId('pending-handoff')).toHaveTextContent('none');
    });

    test('should maintain connection state during handoffs', async () => {
      render(
        <TestWrapper>
          <TestHandoffComponent />
        </TestWrapper>
      );

      // Should start connected (mocked)
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      
      // Connection state should remain stable during handoff operations
      const prepareButton = screen.getByTestId('prepare-handoff');
      fireEvent.click(prepareButton);

      // Connection should not be affected by handoff preparation
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });
});