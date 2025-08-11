import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: () => Promise.resolve({ 
      data: { user: { id: 'test-user', email: 'test@example.com' } }, 
      error: null 
    }),
    getSession: () => Promise.resolve({ 
      data: { session: { user: { id: 'test-user', email: 'test@example.com' } } }, 
      error: null 
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ eq: () => ({ gte: () => Promise.resolve({ data: [], error: null }) }) }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) })
  }),
  channel: () => ({
    on: () => ({}),
    subscribe: () => ({})
  })
};

// Mock contexts
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  );
};

const MockSupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="mock-supabase-provider">
      {children}
    </div>
  );
};

// Test wrapper component that provides all necessary context
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MockSupabaseProvider>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </MockSupabaseProvider>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: TestWrapper, ...options });
};

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

// Mock conversation data
export const mockConversationContext = {
  primary_goals: ['career growth', 'skill development'],
  current_phase: 'exploration' as const,
  conversation_depth: 15,
  last_recommendation_timestamp: undefined
};

// Mock handoff context
export const mockHandoffContext = {
  conversation_summary: 'User discussed career goals and aspirations',
  key_insights: [
    'Highly motivated individual',
    'Strong technical background',
    'Looking for leadership opportunities'
  ],
  goals_status: {
    'career_advancement': 'in_progress',
    'skill_development': 'completed',
    'leadership_growth': 'pending'
  },
  emotional_journey: [
    {
      emotion: 'excitement',
      timestamp: '2025-08-10T10:00:00Z',
      context: 'discussing new opportunities'
    },
    {
      emotion: 'confidence',
      timestamp: '2025-08-10T10:30:00Z', 
      context: 'realizing personal strengths'
    }
  ],
  next_steps: [
    'Complete leadership assessment',
    'Schedule mentor meetings',
    'Develop 90-day action plan'
  ],
  conversation_metadata: {
    duration_minutes: 35,
    topics_covered: ['career planning', 'leadership', 'professional development'],
    breakthrough_moments: ['Identified core career values', 'Clarified long-term vision']
  }
};

// Test utilities for async operations
export const waitForAsync = async (ms: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock API responses
export const mockApiResponses = {
  eligibilityCheck: {
    eligible: {
      type: 'eligibility_check',
      eligible: true,
      trigger_event: 'onboarding_complete',
      context: mockConversationContext,
      timestamp: new Date().toISOString()
    },
    notEligible: {
      type: 'eligibility_check',
      eligible: false,
      reason: 'Cooldown period active',
      retry_after: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    },
    rateLimited: {
      type: 'error',
      error: 'Rate limit exceeded',
      retry_after: 60
    }
  },
  agentRecommendation: {
    success: {
      type: 'agent_recommendation',
      recommended_agent_id: 'career_coach_agent_id',
      confidence_score: 0.85,
      reasoning: 'Based on career-focused goals and technical background'
    },
    fallback: {
      type: 'agent_recommendation',
      recommended_agent_id: 'general_coach_agent_id',
      confidence_score: 0.6,
      reasoning: 'General coaching for diverse goals'
    }
  },
  handoffPreparation: {
    success: {
      type: 'handoff_prepared',
      handoff_id: 'test_handoff_123',
      target_agent_id: 'career_coach_agent_id',
      context_package: mockHandoffContext,
      estimated_handoff_time: '2-3 seconds',
      timestamp: new Date().toISOString()
    },
    failure: {
      type: 'error',
      error: 'Failed to create handoff record: Target agent unavailable'
    }
  },
  uiUpdate: {
    success: {
      type: 'ui_update',
      update_type: 'goal_progress',
      data: {
        message: 'Goal progress updated',
        action_required: false,
        ui_component: 'progress_bar',
        priority: 'medium'
      },
      session_id: 'test_session_123',
      timestamp: new Date().toISOString()
    }
  }
};

// Mock EventSource for SSE testing
export class MockEventSource {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 1; // OPEN
  
  private listeners: Map<string, ((event: any) => void)[]> = new Map();
  
  constructor(public url: string) {}
  
  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }
  
  removeEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    return true;
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
  
  // Helper method for testing
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  simulateOpen() {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
}

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void>): Promise<number> => {
  const startTime = performance.now();
  await fn();
  const endTime = performance.now();
  return endTime - startTime;
};

// Network simulation utilities
export const simulateNetworkDelay = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const simulateNetworkError = () => {
  throw new Error('Simulated network error');
};

// Cleanup utilities
export const cleanup = () => {
  // Clean up any global state or mocks
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
  
  if (global.EventSource) {
    // Reset EventSource mock if needed
  }
};

// Export everything for easy importing
export * from '@testing-library/react';
export { renderWithProviders as render };