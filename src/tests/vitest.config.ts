import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/setup.ts',
        'src/tests/test-utils.tsx',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'build/',
        'dist/',
        '.next/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Specific thresholds for critical client tools functionality
        'src/hooks/useClientTools.ts': {
          branches: 90,
          functions: 95,
          lines: 90,
          statements: 90
        },
        'src/app/api/client-tools/stream/route.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        }
      }
    },
    // Test timeout configuration
    testTimeout: 10000, // 10 seconds for complex async tests
    hookTimeout: 5000,  // 5 seconds for setup/teardown
    
    // Custom test patterns for different scenarios
    reporters: ['default', 'json'],
    
    // Environment variables for testing
    env: {
      VITEST_ENVIRONMENT: 'test',
      NODE_ENV: 'test'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@/components': path.resolve(__dirname, '../../components'),
      '@/hooks': path.resolve(__dirname, '../../hooks'), 
      '@/contexts': path.resolve(__dirname, '../../contexts'),
      '@/utils': path.resolve(__dirname, '../../utils'),
      '@/types': path.resolve(__dirname, '../../types')
    }
  }
});