# LiveGuide E2E Test Suite

Comprehensive end-to-end testing for the LiveGuide graph system using Playwright.

## Overview

This test suite validates the complete user journey from voice input to graph visualization and interaction, covering:

- **Graph Data Flow**: API → Database → Frontend visualization
- **Node/Edge Operations**: Creation, updates, deletion via edge functions
- **Real-time Updates**: Instant synchronization across sessions
- **Graph Interactions**: Click, drag, search, filter, zoom
- **Embedding Generation**: OpenAI embeddings via edge functions
- **Security**: Row-Level Security (RLS) policies and auth validation
- **Responsive Design**: Mobile/tablet compatibility
- **Accessibility**: WCAG compliance and screen reader support
- **Error Handling**: Network issues, API failures, recovery

## Test Structure

```
tests/e2e/
├── README.md                     # This file
├── global-setup.ts              # Test environment setup
├── global-teardown.ts           # Cleanup after all tests
├── utils/
│   ├── auth.ts                  # Authentication utilities
│   └── graph.ts                 # Graph interaction helpers
├── graph-data-flow.spec.ts      # Core data flow tests
├── node-creation-edges.spec.ts  # CRUD operations
├── realtime-updates.spec.ts     # Real-time synchronization  
├── graph-interactions.spec.ts   # UI interactions
├── embedding-generation.spec.ts # AI/ML edge functions
├── rls-security.spec.ts         # Security and authorization
├── responsive-accessibility.spec.ts # UX and accessibility
└── error-handling.spec.ts       # Error scenarios and recovery
```

## Setup

### Prerequisites

1. **Environment Variables**: Ensure these are set in your environment:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PLAYWRIGHT_BASE_URL=http://localhost:3000  # Optional
   ```

2. **Test Database**: Use a separate Supabase project or branch for testing to avoid affecting production data.

3. **Development Server**: The tests expect the Next.js app to be running locally.

### Installation

```bash
# Install Playwright
npm run test:e2e:install

# Or run the full setup
npm install
npx playwright install
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode (step through tests)
```bash
npm run test:e2e:debug
```

### Headed Mode (see browser)
```bash
npm run test:e2e:headed
```

### Specific Test File
```bash
npx playwright test graph-data-flow.spec.ts
```

### Specific Test
```bash
npx playwright test -g "should load graph data from database"
```

### Different Browsers
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
```

## Test Data

### Automatic Setup
- **Global Setup**: Creates test users and sample graph data
- **Test User 1**: Has rich graph data (goals, skills, emotions, sessions)
- **Test User 2**: Has minimal data for isolation testing
- **Global Teardown**: Cleans up all test data

### Test Users
```typescript
USER_1: {
  email: 'test-user-1@liveguide.test',
  password: 'TestPassword123!'
}

USER_2: {
  email: 'test-user-2@liveguide.test', 
  password: 'TestPassword123!'
}
```

## Test Categories

### 1. Graph Data Flow (`graph-data-flow.spec.ts`)
- ✅ Database to frontend visualization
- ✅ Node details display on click
- ✅ API node creation with real-time updates
- ✅ Edge function updates reflected in UI
- ✅ Different node statuses (draft vs curated)
- ✅ Edge relationships between nodes

### 2. Node Creation & Edges (`node-creation-edges.spec.ts`)
- ✅ Create nodes via edge functions
- ✅ Multiple node types (goal, skill, emotion, etc.)
- ✅ Edge creation between nodes
- ✅ Node/edge deletion with cleanup
- ✅ Status updates (draft → curated)
- ✅ Validation and error handling
- ✅ Concurrent operations

### 3. Real-time Updates (`realtime-updates.spec.ts`)
- ✅ Node creation notifications
- ✅ Node update synchronization
- ✅ Edge creation updates
- ✅ Multiple concurrent updates
- ✅ Node deletion updates
- ✅ Network reconnection handling
- ✅ User isolation (RLS enforcement)
- ✅ Subscription cleanup

### 4. Graph Interactions (`graph-interactions.spec.ts`)
- ✅ Node click/selection
- ✅ Right-click context menus
- ✅ Drag and drop nodes
- ✅ Search functionality
- ✅ Layout changes (fcose, cola, circle, grid)
- ✅ Zoom controls (in, out, reset)
- ✅ Node type filtering
- ✅ Multi-selection
- ✅ Graph export
- ✅ Keyboard shortcuts
- ✅ Touch interactions

### 5. Embedding Generation (`embedding-generation.spec.ts`)
- ✅ Generate embeddings for new nodes
- ✅ Update embeddings when content changes
- ✅ Batch embedding generation
- ✅ Similarity search using embeddings
- ✅ Error handling for invalid data
- ✅ Timeout handling
- ✅ Vector dimension validation
- ✅ Queue processing

### 6. Security & RLS (`rls-security.spec.ts`)
- ✅ User data isolation
- ✅ Unauthorized API access prevention
- ✅ Cross-user edge creation blocking
- ✅ Unauthenticated request handling
- ✅ Node deletion authorization
- ✅ Expired token handling
- ✅ Real-time subscription isolation
- ✅ Embedding operation validation
- ✅ SQL injection prevention
- ✅ Privilege escalation prevention

### 7. Responsive & Accessibility (`responsive-accessibility.spec.ts`)
- ✅ Mobile viewport adaptation (iPhone)
- ✅ Tablet compatibility (iPad)
- ✅ Landscape orientation
- ✅ Touch gesture support
- ✅ Pinch-to-zoom
- ✅ Adaptive UI controls
- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast
- ✅ Reduced motion preferences
- ✅ Alternative text
- ✅ Focus management
- ✅ 200% zoom support

### 8. Error Handling (`error-handling.spec.ts`)
- ✅ Network connectivity issues
- ✅ API timeout handling
- ✅ Malformed response handling
- ✅ Missing data graceful handling
- ✅ Corrupted localStorage recovery
- ✅ Concurrent modification conflicts
- ✅ Large dataset loading
- ✅ Cytoscape initialization failures
- ✅ Memory pressure handling
- ✅ User-friendly error messages
- ✅ Browser compatibility

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Debugging

### View Test Results
```bash
npm run test:e2e:report
```

### Debug Failed Tests
```bash
npx playwright test --debug --project=chromium
```

### Screenshots and Videos
- Screenshots: `test-results/` folder
- Videos: Available for failed tests
- Traces: Can be viewed in Playwright UI

### Console Logs
Tests include extensive console logging for debugging:
```bash
npx playwright test --headed
```

## Performance Testing

### Metrics Tracked
- Graph load time
- Node rendering performance  
- Real-time update latency
- Memory usage
- Network request timing

### Performance Assertions
```typescript
// Example from tests
const loadTime = await page.evaluate(() => performance.now());
expect(loadTime).toBeLessThan(5000); // 5 second max load time
```

## Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Follow existing patterns for utilities
3. Include both happy path and edge cases
4. Add proper assertions and error handling
5. Update this README

### Test Conventions
- Use descriptive test names
- Include setup/teardown as needed
- Mock external dependencies when appropriate
- Test one feature per test case
- Include accessibility checks where relevant

### Utilities
- `auth.ts`: Authentication helpers
- `graph.ts`: Graph interaction helpers
- Add new utilities as needed

## Known Issues

- Some tests may be flaky due to real-time timing
- Large dataset tests may timeout on slower machines
- Mobile tests require touch event simulation
- Embedding tests depend on OpenAI API availability

## Maintenance

### Regular Tasks
- Update test data as schema changes
- Verify browser compatibility
- Check for deprecated Playwright features
- Monitor test execution times
- Update accessibility requirements

### Test Data Cleanup
Tests automatically clean up data via global teardown, but manual cleanup may be needed:

```bash
# Clear test database (if using separate instance)
npx supabase db reset --linked
```

## Support

For issues with the test suite:
1. Check test output and screenshots
2. Verify environment variables
3. Ensure development server is running
4. Check Supabase connection
5. Review browser console for errors

The test suite provides comprehensive coverage of the LiveGuide graph system to ensure reliability, security, and excellent user experience across all supported devices and browsers.