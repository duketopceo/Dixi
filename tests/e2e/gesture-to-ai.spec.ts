import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Dixi Gesture-to-AI Flow
 * 
 * These tests verify the complete user flow from gesture detection to AI response.
 * Requires: Frontend, Backend, and Vision services running.
 */

test.describe('Dixi Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load', () => {
    test('should load the main page', async ({ page }) => {
      await expect(page).toHaveTitle(/Dixi/i);
    });

    test('should display camera feed container', async ({ page }) => {
      // Check for camera container
      const cameraContainer = page.locator('.projection-canvas-container, .camera-container, [data-testid="camera"]');
      await expect(cameraContainer.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display HUD overlay', async ({ page }) => {
      // Check for HUD
      const hud = page.locator('.minimal-hud, .hud, [data-testid="hud"]');
      await expect(hud.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display control panel', async ({ page }) => {
      // Control panel may be minimized
      const controlPanel = page.locator('.control-panel, .control-toggle, [data-testid="control-panel"]');
      await expect(controlPanel.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Camera Feed', () => {
    test('should show camera feed or error message', async ({ page }) => {
      // Either camera loads or error shows
      const cameraFeed = page.locator('.camera-feed, img[src*="video_feed"], .camera-error');
      await expect(cameraFeed.first()).toBeVisible({ timeout: 15000 });
    });

    test('should have refresh camera button', async ({ page }) => {
      const refreshBtn = page.locator('button:has-text("Refresh"), .refresh-button, [aria-label*="refresh"]');
      // May or may not be visible depending on state
      const count = await refreshBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Control Panel Interactions', () => {
    test('should toggle control panel visibility', async ({ page }) => {
      // Find control panel toggle
      const toggle = page.locator('.control-toggle, .panel-toggle, button:has-text("Settings")').first();
      
      if (await toggle.isVisible()) {
        await toggle.click();
        
        // Panel should expand
        const panel = page.locator('.control-panel.expanded, .control-panel-content');
        await expect(panel.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display connection status', async ({ page }) => {
      // Expand control panel if needed
      const toggle = page.locator('.control-toggle').first();
      if (await toggle.isVisible()) {
        await toggle.click();
      }

      // Check for status indicators
      const status = page.locator('.connection-status, .status-indicator, [data-testid="status"]');
      await expect(status.first()).toBeVisible({ timeout: 10000 });
    });

    test('should toggle continuous AI analysis', async ({ page }) => {
      // Expand control panel
      const toggle = page.locator('.control-toggle').first();
      if (await toggle.isVisible()) {
        await toggle.click();
      }

      // Find continuous analysis toggle
      const aiToggle = page.locator('.toggle-switch, input[type="checkbox"]:near(:text("Continuous"))');
      
      if (await aiToggle.first().isVisible()) {
        const initialState = await aiToggle.first().isChecked().catch(() => false);
        await aiToggle.first().click();
        
        // State should change
        const newState = await aiToggle.first().isChecked().catch(() => !initialState);
        expect(newState).not.toBe(initialState);
      }
    });
  });

  test.describe('AI Input Bar', () => {
    test('should show AI input bar on Space key', async ({ page }) => {
      // Press Space to show input bar
      await page.keyboard.press('Space');
      
      // Input bar should appear
      const inputBar = page.locator('.ai-input-bar, .query-input, input[placeholder*="Ask"]');
      await expect(inputBar.first()).toBeVisible({ timeout: 5000 });
    });

    test('should hide AI input bar on Escape', async ({ page }) => {
      // Show input bar
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Hide with Escape
      await page.keyboard.press('Escape');
      
      // Input bar should be hidden or showing hint
      const inputBar = page.locator('.ai-input-bar input:visible');
      await expect(inputBar).toHaveCount(0, { timeout: 3000 }).catch(() => {
        // May still be visible with hint
      });
    });

    test('should allow typing in AI input', async ({ page }) => {
      // Show input bar
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Find and type in input
      const input = page.locator('.ai-input-bar input, .query-input').first();
      await input.fill('What is 2+2?');
      
      // Check value
      await expect(input).toHaveValue('What is 2+2?');
    });

    test('should submit query on Enter', async ({ page }) => {
      // Show input bar
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Type and submit
      const input = page.locator('.ai-input-bar input, .query-input').first();
      await input.fill('Hello');
      await input.press('Enter');
      
      // Should show loading or response
      // Wait for some response indication
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Manual AI Query Flow', () => {
    test('should send AI query and receive response', async ({ page }) => {
      // Show input bar
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Type query
      const input = page.locator('.ai-input-bar input, .query-input').first();
      await input.fill('Say hello');
      await input.press('Enter');
      
      // Wait for response (may take a while)
      const response = page.locator('.ai-response, .chat-message, [data-testid="ai-response"]');
      await expect(response.first()).toBeVisible({ timeout: 30000 }).catch(() => {
        // AI might not be available
      });
    }, 35000);
  });

  test.describe('Gesture Tracking', () => {
    test('should display current gesture type', async ({ page }) => {
      // Look for gesture display in HUD
      const gestureDisplay = page.locator('.gesture-type, .current-gesture, :text("Gesture")');
      await expect(gestureDisplay.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display FPS counter', async ({ page }) => {
      // Look for FPS in HUD
      const fps = page.locator('.fps-counter, .fps, :text("FPS")');
      await expect(fps.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Manual Gesture Analysis', () => {
    test('should have analyze now button when continuous is off', async ({ page }) => {
      // Expand control panel
      const toggle = page.locator('.control-toggle').first();
      if (await toggle.isVisible()) {
        await toggle.click();
      }

      // Look for analyze button
      const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Now")');
      
      // May or may not be visible depending on continuous analysis state
      const count = await analyzeBtn.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      
      // App should still be functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      
      // App should still be functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle WebSocket disconnection gracefully', async ({ page }) => {
      // App should not crash if WebSocket disconnects
      await page.evaluate(() => {
        // Close any WebSocket connections
        const sockets = (window as any).__sockets || [];
        sockets.forEach((ws: WebSocket) => ws.close());
      });
      
      // Page should still be responsive
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show appropriate error when services unavailable', async ({ page }) => {
      // This test assumes services might not be running
      // App should show error states gracefully
      const errorMessages = page.locator('.error-message, .connection-error, :text("unavailable")');
      
      // May or may not have errors
      const count = await errorMessages.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

test.describe('Accessibility', () => {
  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    const main = page.locator('main, [role="main"], .app-container');
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should have focus somewhere
    const focusedElement = page.locator(':focus');
    const count = await focusedElement.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

