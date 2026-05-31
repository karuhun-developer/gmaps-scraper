import { chromium } from 'playwright';
import {
  randomDelay,
  humanType,
  humanClick,
  humanScroll,
  scrollPanel,
  applyStealthSettings,
} from './helpers.js';
import { SELECTORS } from './selectors.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

/**
 * Extract basic info from place panel
 */
async function extractBasicInfo(page, fields) {
  const result = {};

  // Name
  if (fields.includes('name')) {
    result.name = await page.$eval(SELECTORS.placeName, (el) => el.textContent?.trim()).catch(() => null);
  }

  // Category
  if (fields.includes('category')) {
    result.category = await page.$eval(SELECTORS.placeCategory, (el) => el.textContent?.trim()).catch(() => null);
  }

  // Rating
  if (fields.includes('rating')) {
    result.rating = await page.$eval(SELECTORS.placeRating, (el) => el.textContent?.trim()).catch(() => null);
    result.reviewCount = await page
      .$eval(
        'div.F7nice',
        (el) => {
          const spans = el.querySelectorAll('span');
          for (const span of spans) {
            const aria = span.getAttribute('aria-label') || '';
            if (aria.includes('ulasan') || aria.includes('review')) {
              return aria.replace(/[^0-9.,]/g, '').trim();
            }
          }
          return null;
        }
      )
      .catch(() => null);
  }

  // Address
  if (fields.includes('address')) {
    result.address = await page
      .$eval(SELECTORS.placeAddress, (el) => el.textContent?.trim())
      .catch(() => null);
  }

  // Phone
  if (fields.includes('phone')) {
    result.phone = await page
      .$eval(SELECTORS.placePhone, (el) => el.textContent?.trim())
      .catch(() => null);
  }

  // Website
  if (fields.includes('website')) {
    result.website = await page
      .$eval('a[data-item-id="authority"]', (el) => el.href)
      .catch(() => null);
  }

  // Plus Code
  if (fields.includes('plusCode')) {
    result.plusCode = await page
      .$eval(SELECTORS.placePlusCode, (el) => el.textContent?.trim())
      .catch(() => null);
  }

  // Price level
  if (fields.includes('priceLevel')) {
    result.priceLevel = await page
      .$eval('[aria-label*="Harga:"], [aria-label*="Price:"]', (el) =>
        el.getAttribute('aria-label')?.replace(/Harga:|Price:/gi, '').trim()
      )
      .catch(() => null);
  }

  // Hours
  if (fields.includes('hours')) {
    result.hours = await extractHours(page);
  }

  // Coordinates from URL
  if (fields.includes('coordinates')) {
    const url = page.url();
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      result.coordinates = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      };
    }
  }

  return result;
}

/**
 * Extract business hours
 */
async function extractHours(page) {
  try {
    // Try to click on hours button to expand
    const hoursBtn = await page.$('button[jsaction*="openhours"], button[aria-label*="jam"], button[aria-label*="hours"]');
    if (hoursBtn) {
      await hoursBtn.click();
      await randomDelay(500, 1000);
    }

    const hoursData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.eK4R0e tr');
      const hours = {};
      rows.forEach((row) => {
        const day = row.querySelector('td:first-child')?.textContent?.trim();
        const time = row.querySelector('td:last-child')?.textContent?.trim();
        if (day && time) hours[day] = time;
      });
      return Object.keys(hours).length > 0 ? hours : null;
    });

    return hoursData;
  } catch {
    return null;
  }
}

/**
 * Extract reviews from the reviews tab
 */
async function extractReviews(page, maxReviews = 10) {
  try {
    // Click on Reviews tab
    const reviewsTab = await page.$('button[aria-label*="Ulasan"], button[aria-label*="Reviews"]');
    if (reviewsTab) {
      await reviewsTab.click();
      await randomDelay(1000, 2000);
    }

    // Sort by newest
    await sortReviewsByNewest(page);
    await randomDelay(1000, 2000);

    // Scroll to load reviews
    const reviewsContainer = await page.$('div.m6QErb.DxyBCb');
    if (reviewsContainer) {
      let loaded = 0;
      let attempts = 0;
      while (loaded < maxReviews && attempts < 15) {
        loaded = await page.$$eval('div[data-review-id]', (els) => els.length);
        if (loaded >= maxReviews) break;
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.scrollBy(0, 600 + Math.random() * 200);
        }, 'div.m6QErb.DxyBCb');
        await randomDelay(800, 1500);
        attempts++;
      }
    }

    // Expand all "More" buttons in reviews
    const moreButtons = await page.$$('button[aria-label*="Selengkapnya"], button[aria-label*="More"], button.w8nwRe');
    for (const btn of moreButtons) {
      try {
        await btn.click();
        await randomDelay(200, 400);
      } catch {
        // ignore
      }
    }

    // Extract review data
    const reviews = await page.evaluate((maxCount) => {
      const reviewItems = Array.from(document.querySelectorAll('div[data-review-id]')).slice(0, maxCount);
      return reviewItems.map((item) => {
        const textEl = item.querySelector('span.wiI7pd');
        const ratingEl = item.querySelector('span[aria-label*="bintang"], span[aria-label*="star"]');
        const dateEl = item.querySelector('span.rsqaWe');
        const authorEl = item.querySelector('div.d4r55');

        let rating = null;
        if (ratingEl) {
          const ariaLabel = ratingEl.getAttribute('aria-label') || '';
          const match = ariaLabel.match(/(\d+)/);
          if (match) rating = parseInt(match[1]);
        }

        return {
          author: authorEl?.textContent?.trim() || null,
          rating,
          date: dateEl?.textContent?.trim() || null,
          text: textEl?.textContent?.trim() || null,
        };
      });
    }, maxReviews);

    return reviews;
  } catch (err) {
    console.error('Error extracting reviews:', err.message);
    return [];
  }
}

/**
 * Sort reviews by newest
 */
async function sortReviewsByNewest(page) {
  try {
    // Try to click sort button
    const sortBtn = await page.$('button[aria-label*="Urutkan"], button[aria-label*="Sort reviews"], button[data-value*="sort"]');
    if (!sortBtn) return;
    await sortBtn.click();
    await randomDelay(500, 1000);

    // Click "Terbaru" / "Newest"
    const newestOption = await page.$('li[aria-label*="Terbaru"], li[data-index="1"], div[data-index="1"]');
    if (newestOption) {
      await newestOption.click();
      await randomDelay(800, 1500);
    }
  } catch {
    // ignore sort errors
  }
}

/**
 * Extract "About" tab features (accessibility, service options, highlights, offerings, food options)
 */
async function extractAboutFeatures(page, fields) {
  const result = {};
  const wantedFields = [
    'accessibility',
    'serviceOptions',
    'highlights',
    'offerings',
    'foodOptions',
    'amenities',
    'crowd',
    'planning',
    'payments',
    'parking',
    'children',
    'pets',
  ];

  const needed = wantedFields.filter((f) => fields.includes(f));
  if (needed.length === 0) return result;

  try {
    // Click About tab
    const aboutTab = await page.$('button[aria-label*="Tentang"], button[aria-label*="About"]');
    if (aboutTab) {
      await aboutTab.click();
      await randomDelay(1000, 2000);
    }

    // Extract all feature sections from About tab
    const features = await page.evaluate(() => {
      const sections = {};

      // Find all feature section containers
      const sectionEls = document.querySelectorAll('div.iP2t7d');
      sectionEls.forEach((section) => {
        const titleEl = section.querySelector('h2.iL3Qke, h2.fontTitleSmall');
        if (!titleEl) return;

        const title = titleEl.textContent?.trim() || '';
        const items = [];

        const itemEls = section.querySelectorAll('li.hpLkke');
        itemEls.forEach((item) => {
          const label = item.querySelector('span.fontBodyMedium')?.textContent?.trim();
          // Check for checkmark (available) vs X (unavailable)
          const svgEl = item.querySelector('svg');
          const svgTitle = svgEl?.querySelector('title')?.textContent || '';
          const isAvailable =
            !svgTitle.toLowerCase().includes('tidak') &&
            !svgTitle.toLowerCase().includes('no') &&
            !svgTitle.toLowerCase().includes('x');

          if (label) {
            items.push({ label, available: isAvailable });
          }
        });

        if (title && items.length > 0) {
          sections[title] = items;
        }
      });

      return sections;
    });

    // Map sections to requested fields
    const fieldMapping = {
      serviceOptions: ['Opsi layanan', 'Service options', 'Layanan', 'Pengiriman'],
      accessibility: ['Aksesibilitas', 'Accessibility'],
      highlights: ['Keunggulan', 'Highlights', 'Amenities'],
      offerings: ['Penawaran', 'Offerings'],
      foodOptions: ['Pilihan makanan', 'Food options', 'Makanan'],
      amenities: ['Fasilitas', 'Amenities'],
      crowd: ['Suasana', 'Crowd', 'Keramaian'],
      planning: ['Perencanaan', 'Planning'],
      payments: ['Pembayaran', 'Payments'],
      parking: ['Parkir', 'Parking'],
      children: ['Anak-anak', 'Children'],
      pets: ['Hewan peliharaan', 'Pets'],
    };

    for (const field of needed) {
      const keywords = fieldMapping[field] || [];
      for (const [sectionTitle, items] of Object.entries(features)) {
        const matched = keywords.some((kw) =>
          sectionTitle.toLowerCase().includes(kw.toLowerCase())
        );
        if (matched) {
          result[field] = items;
          break;
        }
      }
      // If not matched, still expose raw sections
      if (!result[field] && Object.keys(features).length > 0) {
        result[`_raw_about`] = features;
      }
    }
  } catch (err) {
    console.error('Error extracting about features:', err.message);
  }

  return result;
}

/**
 * Extract menu items
 */
async function extractMenu(page) {
  try {
    // Try menu tab first
    const menuTab = await page.$('button[aria-label*="Menu"]');
    if (menuTab) {
      await menuTab.click();
      await randomDelay(1000, 2000);
    }

    // Try to find embedded menu items
    const menuItems = await page.evaluate(() => {
      const items = [];
      const menuEls = document.querySelectorAll('div.WbznCd li.qjESne, ul.ZWT7He li');
      menuEls.forEach((item) => {
        const name = item.querySelector('div.WV7iEb, span.fontBodyMedium')?.textContent?.trim();
        const price = item.querySelector('div.GkFnEb, span.fontBodySmall')?.textContent?.trim();
        const desc = item.querySelector('div.HlvSq')?.textContent?.trim();
        if (name) items.push({ name, price: price || null, description: desc || null });
      });
      return items;
    });

    if (menuItems.length > 0) return menuItems;

    // Try to find external menu link
    const menuLink = await page.$eval(
      'a[data-item-id*="menu"], a[aria-label*="menu"], a[href*="menu"]',
      (el) => el.href
    ).catch(() => null);

    return menuLink ? { type: 'external', url: menuLink } : null;
  } catch {
    return null;
  }
}

/**
 * Extract email from website (best effort)
 */
async function extractEmailFromWebsite(page, website, opts = {}) {
  const { scrollDelay = 500, clickDelay = 300 } = opts;
  if (!website) return null;
  try {
    const newPage = await page.context().newPage();
    await newPage.goto(website, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await randomDelay(scrollDelay, scrollDelay * 2);

    const email = await newPage.evaluate(() => {
      const bodyText = document.body.innerText;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = bodyText.match(emailRegex);
      return matches ? [...new Set(matches)].slice(0, 3) : null;
    });

    await newPage.close();
    return email;
  } catch {
    return null;
  }
}

/**
 * Scrape a single place by its URL/card
 */
async function scrapeSinglePlace(page, placeUrl, opts = {}) {
  const {
    fields = ['name', 'address', 'phone', 'rating'],
    maxReviews = 10,
    scrollDelay = 500,
    clickDelay = 300,
    scrollDistance = 300,
  } = opts;

  await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(1500, 3000);

  // Wait for main content
  await page.waitForSelector(SELECTORS.placeName, { timeout: 15000 }).catch(() => {});

  const data = {};

  // Extract basic info
  const basicInfo = await extractBasicInfo(page, fields);
  Object.assign(data, basicInfo);

  // Reviews
  if (fields.includes('reviews')) {
    data.reviews = await extractReviews(page, maxReviews);
    await randomDelay(500, 1000);
  }

  // About tab features
  const aboutData = await extractAboutFeatures(page, fields);
  Object.assign(data, aboutData);

  // Back to overview tab for menu
  if (fields.includes('menu')) {
    const overviewTab = await page.$('button[aria-label*="Ringkasan"], button[aria-label*="Overview"]');
    if (overviewTab) {
      await overviewTab.click();
      await randomDelay(800, 1500);
    }
    data.menu = await extractMenu(page);
  }

  // Email (requires visiting website)
  if (fields.includes('email') && data.website) {
    data.email = await extractEmailFromWebsite(page, data.website, { scrollDelay, clickDelay });
  }

  return data;
}

/**
 * Main scraper function
 */
export async function scrapeGoogleMaps(opts = {}) {
  const {
    query,
    total = 10,
    fields = ['name', 'address', 'phone', 'rating'],
    maxReviews = 10,
    scrollDelay = 800,
    scrollDistance = 400,
    clickDelay = 300,
    headless = false,
  } = opts;

  if (!query) throw new Error('Query is required');

  // Auto-detect headless: if no DISPLAY env var and headless not explicitly set to false, use headless
  const hasDisplay = !!process.env.DISPLAY;
  const useHeadless = headless === false && hasDisplay ? false : (headless === false ? (() => { console.warn('[Scraper] No DISPLAY detected, falling back to headless=true. Use xvfb-run for headed mode.'); return true; })() : headless);

  console.log(`[Scraper] Starting: "${query}" | total=${total} | fields=${fields.join(',')} | headless=${useHeadless}`);

  const browser = await chromium.launch({
    headless: useHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,768',
      '--start-maximized',
    ],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    geolocation: { longitude: 106.8456, latitude: -6.2088 },
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  // Apply stealth
  await applyStealthSettings(context);

  const page = await context.newPage();

  // Block unnecessary resources to speed up
  await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf}', (route) => {
    // Allow some images for proper rendering detection
    if (Math.random() < 0.1) route.continue();
    else route.abort();
  });

  const results = [];

  try {
    // Go to Google Maps
    console.log('[Scraper] Navigating to Google Maps...');
    await page.goto('https://www.google.com/maps', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await randomDelay(1500, 3000);

    // Handle cookie consent if present
    const acceptBtn = await page.$('button[aria-label*="Terima"], button[aria-label*="Accept all"]');
    if (acceptBtn) {
      await acceptBtn.click();
      await randomDelay(800, 1500);
    }

    // Search for the query
    console.log(`[Scraper] Searching for: "${query}"`);
    await page.waitForSelector(SELECTORS.searchBox, { timeout: 15000 });
    await humanType(page, SELECTORS.searchBox, query, { minDelay: 60, maxDelay: 160 });
    await randomDelay(400, 800);
    await page.keyboard.press('Enter');
    await randomDelay(2000, 4000);

    // Wait for results panel
    await page.waitForSelector(SELECTORS.resultsPanel, { timeout: 15000 }).catch(() => {});
    await randomDelay(1000, 2000);

    // Collect result URLs by scrolling the panel
    const collectedUrls = new Set();
    let scrollAttempts = 0;
    const maxScrollAttempts = Math.ceil(total / 5) + 10;

    console.log(`[Scraper] Collecting ${total} place URLs...`);

    while (collectedUrls.size < total && scrollAttempts < maxScrollAttempts) {
      // Get current visible result items
      const urls = await page.evaluate((panelSel) => {
        const panel = document.querySelector(panelSel);
        if (!panel) return [];
        const links = panel.querySelectorAll('a[href*="/maps/place/"]');
        return Array.from(links).map((a) => a.href).filter(Boolean);
      }, SELECTORS.resultsPanel);

      for (const url of urls) {
        if (collectedUrls.size >= total) break;
        // Normalize URL - remove extra params after @coords
        const cleanUrl = url.split('?')[0];
        collectedUrls.add(cleanUrl);
      }

      if (collectedUrls.size >= total) break;

      // Scroll down the results panel
      await page.evaluate(
        ({ selector, distance }) => {
          const panel = document.querySelector(selector);
          if (panel) panel.scrollBy({ top: distance, behavior: 'smooth' });
        },
        { selector: SELECTORS.resultsPanel, distance: scrollDistance + Math.random() * 100 }
      );

      await randomDelay(scrollDelay, scrollDelay * 1.5);
      scrollAttempts++;

      // Check if end of results
      const endMsg = await page.$('p.fontBodyMedium span');
      if (endMsg) {
        const text = await endMsg.textContent();
        if (text?.includes('akhir') || text?.includes('end of')) break;
      }
    }

    const urlsToScrape = Array.from(collectedUrls).slice(0, total);
    console.log(`[Scraper] Found ${urlsToScrape.length} places to scrape`);

    // Scrape each place
    for (let i = 0; i < urlsToScrape.length; i++) {
      const url = urlsToScrape[i];
      console.log(`[Scraper] Scraping [${i + 1}/${urlsToScrape.length}]: ${url}`);

      try {
        const placeData = await scrapeSinglePlace(page, url, {
          fields,
          maxReviews,
          scrollDelay,
          clickDelay,
          scrollDistance,
        });

        placeData.url = url;
        results.push(placeData);

        // Human-like pause between places
        await randomDelay(1500, 4000);

        // Occasionally go back to results to seem more human
        if (i < urlsToScrape.length - 1 && Math.random() < 0.3) {
          await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
          await randomDelay(800, 1500);
        }
      } catch (err) {
        console.error(`[Scraper] Error scraping place ${url}:`, err.message);
        results.push({ url, error: err.message });
      }
    }
  } catch (err) {
    console.error('[Scraper] Fatal error:', err.message);
    throw err;
  } finally {
    await browser.close();
  }

  console.log(`[Scraper] Done! Scraped ${results.length} places`);
  return results;
}
