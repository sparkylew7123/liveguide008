import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';

// Mock global objects and APIs
beforeAll(() => {
  // Mock fetch globally
  global.fetch = vi.fn();
  
  // Mock EventSource for SSE testing
  global.EventSource = vi.fn().mockImplementation((url: string) => ({
    onopen: null,
    onmessage: null,
    onerror: null,
    readyState: 1,
    url,
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

  // Mock performance API
  global.performance = {
    ...global.performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn()
  };

  // Mock console methods to reduce test noise
  global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  };

  // Mock crypto for UUID generation
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `mock-uuid-${Math.random().toString(36).substr(2, 9)}`,
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    }
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(), 
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  });

  // Mock location
  delete (window as any).location;
  window.location = {
    ...window.location,
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  };
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  
  // Clear any timers
  vi.clearAllTimers();
  
  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as any).mockClear();
  }
  
  // Clear localStorage/sessionStorage
  if (window.localStorage) {
    window.localStorage.clear();
  }
  if (window.sessionStorage) {
    window.sessionStorage.clear();
  }
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Custom matchers for testing client tools
expect.extend({
  toBeValidToolInvocation(received: any, toolName: string) {
    const pass = received && 
                 received.tool_name === toolName &&
                 received.user_id &&
                 received.session_id &&
                 received.timestamp &&
                 received.parameters;
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid ${toolName} invocation`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid ${toolName} invocation`,
        pass: false
      };
    }
  },

  toBeWithinPerformanceLimit(received: number, limit: number) {
    const pass = received <= limit;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms to exceed performance limit of ${limit}ms`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within performance limit of ${limit}ms`,
        pass: false
      };
    }
  },

  toHaveValidHandoffContext(received: any) {
    const requiredFields = ['conversation_summary', 'goals_status'];
    const hasRequiredFields = requiredFields.every(field => 
      received && received.hasOwnProperty(field) && received[field] !== null
    );
    
    const pass = hasRequiredFields;
    
    if (pass) {
      return {
        message: () => `Expected handoff context to be invalid`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected handoff context to have required fields: ${requiredFields.join(', ')}`,
        pass: false
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidToolInvocation(toolName: string): any;
      toBeWithinPerformanceLimit(limit: number): any;
      toHaveValidHandoffContext(): any;
    }
  }
}

// Test data factories
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockToolInvocation = (toolName: string, overrides: Partial<any> = {}) => ({
  tool_name: toolName,
  parameters: {},
  user_id: 'test-user-123',
  session_id: `session-${Date.now()}`,
  conversation_id: `conv-${Date.now()}`,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createMockEligibilityContext = (overrides: Partial<any> = {}) => ({
  primary_goals: ['career growth'],
  current_phase: 'onboarding' as const,
  conversation_depth: 15,
  last_recommendation_timestamp: undefined,
  ...overrides
});

export const createMockHandoffContext = (overrides: Partial<any> = {}) => ({
  conversation_summary: 'Test conversation summary',
  key_insights: ['Test insight 1', 'Test insight 2'],
  goals_status: { 'test_goal': 'in_progress' },
  emotional_journey: [
    { emotion: 'excited', timestamp: new Date().toISOString(), context: 'test context' }
  ],
  next_steps: ['Test next step'],
  conversation_metadata: {
    duration_minutes: 30,
    topics_covered: ['test topic'],
    breakthrough_moments: ['test breakthrough']
  },
  ...overrides
});

// Network simulation utilities
export const simulateNetworkConditions = {
  slow: () => vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 2000))
  ),
  fast: () => vi.fn().mockImplementation(() => 
    Promise.resolve({ ok: true, json: () => ({}) })
  ),
  error: () => vi.fn().mockImplementation(() => 
    Promise.reject(new Error('Network error'))
  ),
  timeout: () => vi.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
  )
};

// SSE simulation utilities
export const simulateSSEEvents = {
  eligibilityResult: (eligible: boolean) => ({
    data: JSON.stringify({
      type: 'eligibility_check',
      eligible,
      trigger_event: 'test_trigger',
      timestamp: new Date().toISOString()
    })
  }),
  
  recommendationResult: (agentId: string) => ({
    data: JSON.stringify({
      type: 'agent_recommendation',
      recommended_agent_id: agentId,
      confidence_score: 0.8,
      reasoning: 'Test recommendation',
      timestamp: new Date().toISOString()
    })
  }),
  
  handoffResult: (handoffId: string) => ({
    data: JSON.stringify({
      type: 'handoff_prepared',
      handoff_id: handoffId,
      target_agent_id: 'test_agent',
      estimated_handoff_time: '2 seconds',
      timestamp: new Date().toISOString()
    })
  }),
  
  error: (message: string) => ({
    data: JSON.stringify({
      type: 'error',
      error: message,
      timestamp: new Date().toISOString()
    })
  })
};

// Rate limiting test utilities
export const createRateLimitScenario = (toolName: string, limit: number) => {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount > limit) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          type: 'error',
          error: 'Rate limit exceeded',
          retry_after: 60
        })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ type: 'success', tool_name: toolName })
    });
  });
};