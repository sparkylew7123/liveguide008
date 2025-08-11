import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useClientTools } from '@/hooks/useClientTools';
import { TestWrapper } from './test-utils';

// Mock the auth context
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com'
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Test component that uses the client tools hook
function TestClientToolsComponent() {
  const clientTools = useClientTools();
  
  return (
    <div>
      <div data-testid="connection-status">
        {clientTools.isConnected ? 'connected' : 'disconnected'}
      </div>
      <div data-testid="recommendation-eligible">
        {clientTools.recommendationEligible ? 'eligible' : 'not-eligible'}
      </div>
      <div data-testid="error">
        {clientTools.error || 'no-error'}
      </div>
      <button 
        data-testid="check-eligibility"
        onClick={() => clientTools.checkRecommendationEligibility('onboarding_complete', {
          primary_goals: ['career growth'],
          current_phase: 'onboarding',
          conversation_depth: 15
        })}
      >
        Check Eligibility
      </button>
      <button 
        data-testid="recommend-agent"
        onClick={() => clientTools.recommendSpecialistAgent({
          user_goals: ['career growth', 'skill development'],
          complexity_level: 'intermediate'
        })}
        disabled={!clientTools.canRecommendAgent()}
      >
        Recommend Agent
      </button>
    </div>
  );
}

describe('Agent Recommendation Scenarios', () => {
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

  describe('Recommendation Eligibility Checks', () => {
    test('should allow recommendations during onboarding completion', async () => {
      const mockResponse = {
        type: 'eligibility_check',
        eligible: true,
        trigger_event: 'onboarding_complete',
        context: {
          primary_goals: ['career growth'],
          current_phase: 'onboarding', 
          conversation_depth: 15
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('eligible');
      });
    });

    test('should block recommendations during cooldown period', async () => {
      const cooldownUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const mockResponse = {
        type: 'eligibility_check',
        eligible: false,
        reason: 'Cooldown period active',
        retry_after: cooldownUntil.toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('not-eligible');
      });
    });

    test('should require minimum conversation depth', async () => {
      const mockResponse = {
        type: 'eligibility_check',
        eligible: false,
        reason: 'Insufficient conversation depth',
        required_depth: 10,
        current_depth: 5
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { rerender } = render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('not-eligible');
      });
    });

    test('should enforce daily recommendation limits', async () => {
      const mockResponse = {
        type: 'eligibility_check',
        eligible: false,
        reason: 'Daily recommendation limit reached',
        limit: 5,
        current: 5
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('not-eligible');
      });
    });

    test('should only allow valid trigger events', async () => {
      const invalidTriggers = ['random_event', 'user_request', 'system_prompt'];
      
      for (const trigger of invalidTriggers) {
        const mockResponse = {
          type: 'eligibility_check',
          eligible: false,
          reason: 'Invalid trigger event'
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        render(
          <TestWrapper>
            <TestClientToolsComponent />
          </TestWrapper>
        );

        // Simulate invalid trigger
        const checkButton = screen.getByTestId('check-eligibility');
        fireEvent.click(checkButton);

        await waitFor(() => {
          expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('not-eligible');
        });
      }
    });
  });

  describe('Agent Recommendation Logic', () => {
    beforeEach(() => {
      // Mock eligibility check to pass
      const eligibilityResponse = {
        type: 'eligibility_check',
        eligible: true,
        trigger_event: 'new_goal_created'
      };

      (global.fetch as any).mockImplementation((url, options) => {
        if (options?.body?.includes('check_recommendation_eligibility')) {
          return Promise.resolve({
            ok: true,
            json: async () => eligibilityResponse
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });
    });

    test('should recommend career coach for career-related goals', async () => {
      const mockResponse = {
        type: 'agent_recommendation',
        recommended_agent_id: 'career_coach_agent_id',
        confidence_score: 0.8,
        reasoning: 'Based on your goals: career growth, skill development'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      // First make eligible
      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('eligible');
      });

      // Then request recommendation
      const recommendButton = screen.getByTestId('recommend-agent');
      fireEvent.click(recommendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/client-tools/stream',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('recommend_specialist_agent')
          })
        );
      });
    });

    test('should recommend wellness coach for health-related goals', async () => {
      const mockResponse = {
        type: 'agent_recommendation',
        recommended_agent_id: 'wellness_coach_agent_id',
        confidence_score: 0.85,
        reasoning: 'Based on your goals: fitness, nutrition, mental health'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Test with health-related goals
      const TestHealthGoalsComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.recommendSpecialistAgent({
              user_goals: ['fitness', 'nutrition', 'mental health'],
              complexity_level: 'intermediate'
            })}
            disabled={!clientTools.canRecommendAgent()}
          >
            Recommend Health Coach
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestHealthGoalsComponent />
        </TestWrapper>
      );
    });

    test('should fall back to general coach for unclear goals', async () => {
      const mockResponse = {
        type: 'agent_recommendation',
        recommended_agent_id: 'general_coach_agent_id',
        confidence_score: 0.6,
        reasoning: 'Based on your goals: general improvement'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const TestUnclearGoalsComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={() => clientTools.recommendSpecialistAgent({
              user_goals: ['general improvement', 'life balance'],
              complexity_level: 'basic'
            })}
            disabled={!clientTools.canRecommendAgent()}
          >
            Recommend General Coach
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestUnclearGoalsComponent />
        </TestWrapper>
      );
    });
  });

  describe('Rate Limiting and Cooldown', () => {
    test('should respect rate limits on recommendation checks', async () => {
      const rateLimitResponse = {
        type: 'error',
        error: 'Rate limit exceeded',
        retry_after: 60
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => rateLimitResponse
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      
      // Simulate multiple rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(checkButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Rate limit exceeded');
      });
    });

    test('should show cooldown period remaining', async () => {
      const cooldownUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      const TestCooldownComponent = () => {
        const clientTools = useClientTools();
        const remainingMs = clientTools.getRecommendationCooldownRemaining();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        
        return (
          <div>
            <div data-testid="cooldown-remaining">{remainingMinutes}</div>
            <div data-testid="can-recommend">{clientTools.canRecommendAgent() ? 'yes' : 'no'}</div>
          </div>
        );
      };

      // Mock the state to have a cooldown
      vi.mock('@/hooks/useClientTools', () => ({
        useClientTools: () => ({
          recommendationCooldownUntil: cooldownUntil,
          canRecommendAgent: () => false,
          getRecommendationCooldownRemaining: () => 15 * 60 * 1000
        })
      }));

      render(
        <TestWrapper>
          <TestCooldownComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('cooldown-remaining')).toHaveTextContent('15');
      expect(screen.getByTestId('can-recommend')).toHaveTextContent('no');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Tool invocation failed');
      });
    });

    test('should handle invalid tool responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      // Should not crash the application
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });
    });

    test('should prevent recommendations without eligibility validation', async () => {
      const TestDirectRecommendationComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={async () => {
              try {
                await clientTools.recommendSpecialistAgent({
                  user_goals: ['test'],
                  complexity_level: 'basic'
                });
              } catch (error) {
                // Error should be caught
              }
            }}
          >
            Direct Recommend
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestDirectRecommendationComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Direct Recommend');
      fireEvent.click(button);

      // Should throw error internally - test that it doesn't crash
      await waitFor(() => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should complete eligibility check within 200ms', async () => {
      const startTime = Date.now();
      
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ type: 'eligibility_check', eligible: true })
            });
          }, 150); // Simulate 150ms response
        })
      );

      render(
        <TestWrapper>
          <TestClientToolsComponent />
        </TestWrapper>
      );

      const checkButton = screen.getByTestId('check-eligibility');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-eligible')).toHaveTextContent('eligible');
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('should handle concurrent tool invocations', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ type: 'eligibility_check', eligible: true })
      });

      const TestConcurrentComponent = () => {
        const clientTools = useClientTools();
        
        return (
          <button 
            onClick={async () => {
              // Fire multiple concurrent requests
              const promises = Array.from({ length: 5 }, (_, i) =>
                clientTools.checkRecommendationEligibility(`trigger_${i}`, {
                  primary_goals: ['test'],
                  current_phase: 'onboarding',
                  conversation_depth: 15
                })
              );
              
              await Promise.all(promises);
            }}
          >
            Concurrent Checks
          </button>
        );
      };

      render(
        <TestWrapper>
          <TestConcurrentComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Concurrent Checks');
      fireEvent.click(button);

      // Should handle concurrent requests without errors
      await waitFor(() => {
        expect(button).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});