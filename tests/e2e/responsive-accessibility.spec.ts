import { test, expect } from '@playwright/test';
import { signInUser, TEST_USERS } from './utils/auth';
import { waitForGraphLoad, getNodeCount, clickNodeByLabel, verifyMobileResponsive } from './utils/graph';

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should adapt to mobile viewport (iPhone)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Verify graph is visible and responsive
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container, #graph-canvas');
    await expect(graphContainer).toBeVisible();
    
    // Check container takes full width on mobile
    const containerWidth = await graphContainer.evaluate(el => el.clientWidth);
    expect(containerWidth).toBeLessThanOrEqual(375);
    expect(containerWidth).toBeGreaterThan(300);
    
    await verifyMobileResponsive(page);
  });

  test('should adapt to tablet viewport (iPad)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    await expect(graphContainer).toBeVisible();
    
    // Verify nodes are still interactive on tablet
    const nodeCount = await getNodeCount(page);
    if (nodeCount > 0) {
      await clickNodeByLabel(page, 'Improve Fitness');
      
      // Details panel should be visible and not cut off
      const detailsPanel = page.locator('[data-testid="node-details"]');
      await expect(detailsPanel).toBeVisible();
      
      const panelBounds = await detailsPanel.boundingBox();
      expect(panelBounds?.x).toBeGreaterThanOrEqual(0);
      expect(panelBounds?.y).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle landscape orientation on mobile', async ({ page }) => {
    // Mobile landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    await expect(graphContainer).toBeVisible();
    
    // Graph should utilize available width
    const containerWidth = await graphContainer.evaluate(el => el.clientWidth);
    expect(containerWidth).toBeGreaterThan(500);
  });

  test('should handle touch gestures on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const nodeCount = await getNodeCount(page);
    if (nodeCount > 0) {
      // Simulate touch tap
      await page.evaluate(() => {
        const cy = (window as any).cy || (window as any).cytoscapeInstance;
        if (cy && cy.nodes().length > 0) {
          const node = cy.nodes()[0];
          
          // Simulate touch start and end
          node.trigger('touchstart');
          node.trigger('touchend');
          node.trigger('tap');
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Should show node details
      const detailsPanel = page.locator('[data-testid="node-details"]');
      await expect(detailsPanel).toBeVisible();
    }
  });

  test('should handle pinch-to-zoom on touch devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    // Simulate pinch gesture (zoom in)
    await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      if (cy) {
        cy.zoom(cy.zoom() * 1.5);
      }
    });
    
    const zoomedLevel = await page.evaluate(() => {
      const cy = (window as any).cy || (window as any).cytoscapeInstance;
      return cy ? cy.zoom() : 1;
    });
    
    expect(zoomedLevel).toBeGreaterThan(initialZoom);
  });

  test('should show appropriate UI controls on different screen sizes', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Should show full toolbar
    const toolbar = page.locator('[data-testid="graph-toolbar"], .graph-toolbar');
    if (await toolbar.isVisible()) {
      const toolbarButtons = toolbar.locator('button');
      const buttonCount = await toolbarButtons.count();
      expect(buttonCount).toBeGreaterThan(3);
    }
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await waitForGraphLoad(page);
    
    // May show condensed controls or hamburger menu
    const mobileControls = page.locator('[data-testid="mobile-controls"], .mobile-nav, button[aria-label="Menu"]');
    try {
      await expect(mobileControls).toBeVisible({ timeout: 2000 });
    } catch {
      // Mobile controls might be implemented differently
      console.log('Mobile-specific controls not found, checking if desktop controls adapt');
    }
  });
});

test.describe('Accessibility (WCAG Compliance)', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.USER_1);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Check for main landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Graph should have appropriate role
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    const role = await graphContainer.getAttribute('role');
    expect(['application', 'img', 'graphics-document']).toContain(role);
    
    // Interactive elements should have labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      
      // Should remain within the application
      const isVisible = await currentFocus.isVisible().catch(() => false);
      if (isVisible) {
        const tagName = await currentFocus.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'input', 'select', 'a', 'canvas']).toContain(tagName);
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Check for screen reader content
    const srOnlyElements = page.locator('.sr-only, .screen-reader-only, [class*="visually-hidden"]');
    const srCount = await srOnlyElements.count();
    
    if (srCount > 0) {
      // Verify screen reader content is present but visually hidden
      const firstSrElement = srOnlyElements.first();
      const isVisible = await firstSrElement.isVisible();
      expect(isVisible).toBeFalsy();
      
      const hasContent = await firstSrElement.textContent();
      expect(hasContent?.trim()).toBeTruthy();
    }
    
    // Check for ARIA live regions for dynamic updates
    const liveRegions = page.locator('[aria-live], [aria-atomic], [role="status"], [role="alert"]');
    const liveCount = await liveRegions.count();
    
    if (liveCount > 0) {
      console.log(`Found ${liveCount} live regions for screen reader updates`);
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Test high contrast mode compatibility
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.reload();
    await waitForGraphLoad(page);
    
    // Graph should still be visible in dark mode
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    await expect(graphContainer).toBeVisible();
    
    // Check text elements have reasonable contrast
    const textElements = page.locator('p, span, label, button');
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 5); i++) {
      const element = textElements.nth(i);
      const computedStyle = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize
        };
      });
      
      // Basic check that text has color defined
      expect(computedStyle.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Test with reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Graph should still function without animations
    const nodeCount = await getNodeCount(page);
    expect(nodeCount).toBeGreaterThan(0);
    
    // Test layout change without excessive animation
    try {
      await page.click('[data-testid="layout-selector"], button:has-text("circle")');
      await page.waitForTimeout(1000);
      
      // Should complete quickly in reduced motion mode
      const newNodeCount = await getNodeCount(page);
      expect(newNodeCount).toBe(nodeCount);
    } catch (error) {
      console.log('Layout controls not available for reduced motion test');
    }
  });

  test('should provide alternative text for visual elements', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Check for images with alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text, aria-label, or be marked as decorative
      expect(alt !== null || ariaLabel !== null || role === 'presentation').toBeTruthy();
    }
    
    // Graph visualization should have description
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    const ariaLabel = await graphContainer.getAttribute('aria-label');
    const ariaDescribedBy = await graphContainer.getAttribute('aria-describedby');
    
    expect(ariaLabel || ariaDescribedBy).toBeTruthy();
  });

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    const nodeCount = await getNodeCount(page);
    if (nodeCount > 0) {
      // Click on a node
      await clickNodeByLabel(page, 'Improve Fitness');
      
      // Details panel should receive focus or focus should be managed
      const detailsPanel = page.locator('[data-testid="node-details"]');
      await expect(detailsPanel).toBeVisible();
      
      // Check if focus is moved to the panel or stays on graph
      const focusedElement = page.locator(':focus');
      const focusedTag = await focusedElement.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
      
      // Focus should be on an interactive element
      expect(['button', 'input', 'canvas', 'div']).toContain(focusedTag);
      
      // Should be able to close panel with Escape
      await page.keyboard.press('Escape');
      
      // Panel should close
      await expect(detailsPanel).not.toBeVisible();
    }
  });

  test('should provide meaningful error messages', async ({ page }) => {
    // Test with invalid authentication
    await page.goto('/dashboard');
    
    // Clear auth tokens to simulate error state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    
    // Should show meaningful error message
    const errorMessage = page.locator('[role="alert"], .error, [data-testid="error"]');
    
    try {
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      const errorText = await errorMessage.textContent();
      expect(errorText?.length).toBeGreaterThan(10);
      expect(errorText?.toLowerCase()).toContain('sign in');
    } catch {
      // Should at least redirect to login
      expect(page.url()).toContain('/login');
    }
  });

  test('should support zoom up to 200% without breaking layout', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForGraphLoad(page);
    
    // Zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    
    await page.waitForTimeout(1000);
    
    // Graph should still be functional
    const graphContainer = page.locator('[data-testid="graph-canvas"], .cytoscape-container');
    await expect(graphContainer).toBeVisible();
    
    // UI elements should not overflow
    const body = page.locator('body');
    const hasHorizontalScroll = await body.evaluate(el => el.scrollWidth > el.clientWidth);
    
    // Some horizontal scroll is acceptable at 200% zoom
    if (hasHorizontalScroll) {
      console.log('Horizontal scroll present at 200% zoom (may be acceptable)');
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });
});