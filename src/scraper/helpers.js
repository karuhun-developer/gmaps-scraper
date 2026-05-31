/**
 * Human-like behavior helpers to avoid bot detection
 */

// Random delay between min and max ms
export const randomDelay = (min = 200, max = 800) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// Simulate human typing with random delays between keystrokes
export const humanType = async (page, selector, text, opts = {}) => {
  const { minDelay = 50, maxDelay = 150 } = opts;
  await page.click(selector);
  await randomDelay(100, 300);
  for (const char of text) {
    await page.keyboard.type(char);
    await randomDelay(minDelay, maxDelay);
  }
};

// Human-like mouse move to element before click
export const humanClick = async (page, selector, opts = {}) => {
  const { delay = 0 } = opts;
  const element = await page.$(selector);
  if (!element) return false;
  const box = await element.boundingBox();
  if (!box) return false;

  // Move to random point within element
  const x = box.x + box.width * (0.2 + Math.random() * 0.6);
  const y = box.y + box.height * (0.2 + Math.random() * 0.6);

  await page.mouse.move(x, y, { steps: Math.floor(5 + Math.random() * 10) });
  await randomDelay(50, 200);
  await page.mouse.click(x, y);
  if (delay > 0) await randomDelay(delay, delay * 2);
  return true;
};

// Scroll down with human-like behavior
export const humanScroll = async (page, opts = {}) => {
  const {
    distance = 300,
    steps = 5,
    minDelay = 100,
    maxDelay = 400,
    direction = 'down',
  } = opts;

  const scrollAmount = direction === 'down' ? distance : -distance;
  const stepSize = scrollAmount / steps;

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepSize + (Math.random() - 0.5) * 40);
    await randomDelay(minDelay, maxDelay);
  }
};

// Scroll element into view with human-like scroll
export const scrollToElement = async (page, selector, opts = {}) => {
  const { scrollDelay = 150, scrollDistance = 200 } = opts;
  const element = await page.$(selector);
  if (!element) return false;

  await element.scrollIntoViewIfNeeded();
  await randomDelay(scrollDelay, scrollDelay * 2);
  return true;
};

// Scroll the results panel to load more items
export const scrollPanel = async (page, panelSelector, opts = {}) => {
  const {
    scrollDistance = 500,
    scrollDelay = 800,
    maxScrolls = 20,
    targetCount = 10,
    getCurrentCount,
  } = opts;

  let previousCount = 0;
  let sameCountStreak = 0;

  for (let i = 0; i < maxScrolls; i++) {
    const currentCount = getCurrentCount ? await getCurrentCount() : 0;

    if (currentCount >= targetCount) break;
    if (currentCount === previousCount) {
      sameCountStreak++;
      if (sameCountStreak >= 3) break; // No new items loaded
    } else {
      sameCountStreak = 0;
    }
    previousCount = currentCount;

    // Scroll the panel element
    await page.evaluate(
      ({ selector, distance }) => {
        const panel = document.querySelector(selector);
        if (panel) {
          panel.scrollBy({
            top: distance + Math.random() * 100 - 50,
            behavior: 'smooth',
          });
        }
      },
      { selector: panelSelector, distance: scrollDistance }
    );

    await randomDelay(scrollDelay, scrollDelay * 1.5);

    // Sometimes pause a bit longer like a human would
    if (Math.random() < 0.2) {
      await randomDelay(1000, 2500);
    }
  }
};

// Apply stealth settings to browser context
export const applyStealthSettings = async (context) => {
  await context.addInitScript(() => {
    // Override webdriver detection
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'id-ID', 'id'],
    });

    // Override permissions
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    }

    // Chrome runtime mock
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }

    // Prevent headless detection via canvas fingerprint
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const ctx = getContext.call(this, type, ...args);
      if (type === '2d' && ctx) {
        const fillText = ctx.fillText.bind(ctx);
        ctx.fillText = function (...args) {
          const noise = Math.random() * 0.01;
          ctx.shadowBlur = noise;
          return fillText(...args);
        };
      }
      return ctx;
    };
  });
};
