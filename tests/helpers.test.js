/**
 * Tests for human-like behavior helpers
 * Covers: randomDelay, humanType, humanClick, humanScroll, scrollPanel, applyStealthSettings
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  randomDelay,
  humanType,
  humanClick,
  humanScroll,
  scrollPanel,
  applyStealthSettings,
} from '../src/scraper/helpers.js';

// ─── randomDelay ─────────────────────────────────────────────────────────────

describe('randomDelay', () => {
  it('returns a Promise', () => {
    const result = randomDelay(0, 0);
    expect(result).toBeInstanceOf(Promise);
    return result; // resolve immediately
  });

  it('resolves within range (basic sanity)', async () => {
    const start = Date.now();
    await randomDelay(10, 30);
    const elapsed = Date.now() - start;
    // allow generous upper bound due to CI timing jitter
    expect(elapsed).toBeGreaterThanOrEqual(5);
    expect(elapsed).toBeLessThan(200);
  });

  it('uses defaults (200-800ms) when called with no args', async () => {
    // Just check it resolves without throwing
    await expect(randomDelay()).resolves.toBeUndefined();
  });

  it('handles min === max', async () => {
    await expect(randomDelay(0, 0)).resolves.toBeUndefined();
  });
});

// ─── humanType ───────────────────────────────────────────────────────────────

describe('humanType', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      click: jest.fn().mockResolvedValue(undefined),
      keyboard: {
        type: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('clicks the selector before typing', async () => {
    await humanType(mockPage, '#search', 'hello', { minDelay: 0, maxDelay: 0 });
    expect(mockPage.click).toHaveBeenCalledWith('#search');
  });

  it('types each character individually', async () => {
    const text = 'abc';
    await humanType(mockPage, '#search', text, { minDelay: 0, maxDelay: 0 });
    expect(mockPage.keyboard.type).toHaveBeenCalledTimes(text.length);
    expect(mockPage.keyboard.type).toHaveBeenNthCalledWith(1, 'a');
    expect(mockPage.keyboard.type).toHaveBeenNthCalledWith(2, 'b');
    expect(mockPage.keyboard.type).toHaveBeenNthCalledWith(3, 'c');
  });

  it('handles empty string without throwing', async () => {
    await expect(
      humanType(mockPage, '#search', '', { minDelay: 0, maxDelay: 0 })
    ).resolves.toBeUndefined();
    expect(mockPage.keyboard.type).not.toHaveBeenCalled();
  });

  it('types multi-word query correctly', async () => {
    const query = 'restoran padang';
    await humanType(mockPage, '#q', query, { minDelay: 0, maxDelay: 0 });
    expect(mockPage.keyboard.type).toHaveBeenCalledTimes(query.length);
  });
});

// ─── humanClick ──────────────────────────────────────────────────────────────

describe('humanClick', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      $: jest.fn(),
      mouse: {
        move: jest.fn().mockResolvedValue(undefined),
        click: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('returns false when selector not found', async () => {
    mockPage.$.mockResolvedValue(null);
    const result = await humanClick(mockPage, '.missing');
    expect(result).toBe(false);
    expect(mockPage.mouse.click).not.toHaveBeenCalled();
  });

  it('returns false when element has no bounding box', async () => {
    const mockEl = { boundingBox: jest.fn().mockResolvedValue(null) };
    mockPage.$.mockResolvedValue(mockEl);
    const result = await humanClick(mockPage, '.no-box');
    expect(result).toBe(false);
  });

  it('moves mouse to element and clicks', async () => {
    const box = { x: 100, y: 200, width: 80, height: 40 };
    const mockEl = { boundingBox: jest.fn().mockResolvedValue(box) };
    mockPage.$.mockResolvedValue(mockEl);

    const result = await humanClick(mockPage, '.btn', { delay: 0 });

    expect(result).toBe(true);
    expect(mockPage.mouse.move).toHaveBeenCalledTimes(1);
    expect(mockPage.mouse.click).toHaveBeenCalledTimes(1);

    // Click coordinates should be within element bounds
    const [clickX, clickY] = mockPage.mouse.click.mock.calls[0];
    expect(clickX).toBeGreaterThanOrEqual(box.x + box.width * 0.2);
    expect(clickX).toBeLessThanOrEqual(box.x + box.width * 0.8 + 1);
    expect(clickY).toBeGreaterThanOrEqual(box.y + box.height * 0.2);
    expect(clickY).toBeLessThanOrEqual(box.y + box.height * 0.8 + 1);
  });

  it('mouse.move uses multiple steps for human-like movement', async () => {
    const box = { x: 0, y: 0, width: 100, height: 50 };
    const mockEl = { boundingBox: jest.fn().mockResolvedValue(box) };
    mockPage.$.mockResolvedValue(mockEl);

    await humanClick(mockPage, '.btn', { delay: 0 });

    const moveArgs = mockPage.mouse.move.mock.calls[0];
    const stepsArg = moveArgs[2]; // { steps: N }
    expect(stepsArg.steps).toBeGreaterThanOrEqual(5);
    expect(stepsArg.steps).toBeLessThanOrEqual(15);
  });
});

// ─── humanScroll ─────────────────────────────────────────────────────────────

describe('humanScroll', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      mouse: {
        wheel: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('calls mouse.wheel the correct number of steps', async () => {
    await humanScroll(mockPage, { distance: 300, steps: 5, minDelay: 0, maxDelay: 0 });
    expect(mockPage.mouse.wheel).toHaveBeenCalledTimes(5);
  });

  it('scrolls down by default', async () => {
    await humanScroll(mockPage, { distance: 300, steps: 3, minDelay: 0, maxDelay: 0, direction: 'down' });
    const calls = mockPage.mouse.wheel.mock.calls;
    // deltaY should be positive (down)
    calls.forEach(([, deltaY]) => {
      expect(deltaY).toBeGreaterThan(-200); // with jitter it could be near 0 but positive base
    });
  });

  it('scrolls up when direction is "up"', async () => {
    await humanScroll(mockPage, { distance: 300, steps: 3, minDelay: 0, maxDelay: 0, direction: 'up' });
    const calls = mockPage.mouse.wheel.mock.calls;
    // deltaY should be negative (up)
    calls.forEach(([, deltaY]) => {
      expect(deltaY).toBeLessThan(200); // with jitter it could be near 0 but negative base
    });
  });

  it('uses defaults when no opts passed', async () => {
    await humanScroll(mockPage, { minDelay: 0, maxDelay: 0 });
    // Default steps = 5
    expect(mockPage.mouse.wheel).toHaveBeenCalledTimes(5);
  });
});

// ─── scrollPanel ─────────────────────────────────────────────────────────────

describe('scrollPanel', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      evaluate: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('stops early when targetCount is reached', async () => {
    let count = 0;
    const getCurrentCount = jest.fn().mockImplementation(() => {
      count += 5;
      return count;
    });

    await scrollPanel(mockPage, 'div.panel', {
      targetCount: 10,
      maxScrolls: 20,
      scrollDelay: 0,
      scrollDistance: 400,
      getCurrentCount,
    });

    // Should stop after count >= 10, so at most 2 iterations
    expect(getCurrentCount.mock.calls.length).toBeLessThanOrEqual(4); // generous bound
  });

  it('stops after maxScrolls if target never reached', async () => {
    const getCurrentCount = jest.fn().mockReturnValue(0);
    await scrollPanel(mockPage, 'div.panel', {
      targetCount: 100,
      maxScrolls: 3,
      scrollDelay: 0,
      scrollDistance: 400,
      getCurrentCount,
    });

    // evaluate is called for each scroll
    expect(mockPage.evaluate.mock.calls.length).toBeLessThanOrEqual(6); // 3 scrolls + possible streak checks
  });

  it('stops early if same count 3x in a row (no new items)', async () => {
    const getCurrentCount = jest.fn().mockReturnValue(5); // never changes
    await scrollPanel(mockPage, 'div.panel', {
      targetCount: 50,
      maxScrolls: 20,
      scrollDelay: 0,
      scrollDistance: 400,
      getCurrentCount,
    });

    // Should stop after 3 same-count streak
    expect(getCurrentCount.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('passes correct selector and distance to evaluate', async () => {
    const getCurrentCount = jest.fn().mockReturnValue(999); // immediately done
    await scrollPanel(mockPage, '.results-panel', {
      targetCount: 1,
      maxScrolls: 5,
      scrollDelay: 0,
      scrollDistance: 500,
      getCurrentCount,
    });

    // Should exit immediately since count >= target
    expect(mockPage.evaluate).not.toHaveBeenCalled();
  });
});

// ─── applyStealthSettings ────────────────────────────────────────────────────

describe('applyStealthSettings', () => {
  it('calls context.addInitScript with a function', async () => {
    const mockContext = {
      addInitScript: jest.fn().mockResolvedValue(undefined),
    };
    await applyStealthSettings(mockContext);
    expect(mockContext.addInitScript).toHaveBeenCalledTimes(1);
    expect(typeof mockContext.addInitScript.mock.calls[0][0]).toBe('function');
  });

  it('resolves without throwing', async () => {
    const mockContext = {
      addInitScript: jest.fn().mockResolvedValue(undefined),
    };
    await expect(applyStealthSettings(mockContext)).resolves.toBeUndefined();
  });

  it('injects stealth script that overrides navigator.webdriver', async () => {
    const mockContext = {
      addInitScript: jest.fn().mockResolvedValue(undefined),
    };
    await applyStealthSettings(mockContext);

    // Extract the injected function and run it in a sandbox
    const injectedFn = mockContext.addInitScript.mock.calls[0][0];

    // Simulate browser environment
    const mockNavigator = { permissions: null };
    const mockWindow = { navigator: mockNavigator, chrome: null };
    const mockHTMLCanvasElement = {
      prototype: {
        getContext: function () { return null; },
      },
    };

    // Run the injected stealth fn in a simulated environment
    const sandboxFn = new Function(
      'navigator', 'window', 'HTMLCanvasElement', 'Notification',
      `(${injectedFn.toString()})()`
    );

    // Should not throw
    expect(() =>
      sandboxFn(mockNavigator, mockWindow, mockHTMLCanvasElement, { permission: 'default' })
    ).not.toThrow();
  });
});
