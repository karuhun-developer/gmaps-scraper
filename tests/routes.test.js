/**
 * Tests for API route handlers (GET /fields and POST /)
 * Uses Hono's test utilities to test request/response without a live server.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Hono } from 'hono';

// ─── All available fields defined in routes/gmaps.js ─────────────────────────

const ALLOWED_FIELDS = [
  'name', 'category', 'rating', 'address', 'phone', 'website', 'plusCode',
  'priceLevel', 'hours', 'coordinates', 'reviews', 'email', 'menu',
  'accessibility', 'serviceOptions', 'highlights', 'offerings', 'foodOptions',
  'amenities', 'crowd', 'planning', 'payments', 'parking', 'children', 'pets',
];

// ─── Mock scrapeGoogleMaps so tests don't launch a real browser ───────────────

jest.unstable_mockModule('../src/scraper/gmaps.js', () => ({
  scrapeGoogleMaps: jest.fn().mockResolvedValue([
    {
      name: 'Test Place',
      address: 'Jl. Test No.1',
      phone: '+62 21 0000000',
      rating: '4.5',
    },
  ]),
}));

// ─── Build the same app structure as src/index.js ────────────────────────────

async function buildApp() {
  const { default: gmapsRoute } = await import('../src/routes/gmaps.js');
  const app = new Hono();
  app.route('/api/v1/gmaps', gmapsRoute);
  return app;
}

// ─── GET /api/v1/gmaps/fields ─────────────────────────────────────────────────

describe('GET /api/v1/gmaps/fields', () => {
  let app;

  beforeEach(async () => {
    app = await buildApp();
  });

  it('returns 200 OK', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    expect(res.status).toBe(200);
  });

  it('returns success: true', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns a fields object', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    expect(body.fields).toBeDefined();
    expect(typeof body.fields).toBe('object');
  });

  it('fields response contains basicInfo category', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    expect(body.fields.basicInfo).toBeDefined();
  });

  it('fields response contains aboutTab category', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    expect(body.fields.aboutTab).toBeDefined();
  });

  it('fields response contains content category', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    expect(body.fields.content).toBeDefined();
  });

  it('basicInfo includes all expected field keys', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    const basicInfoKeys = Object.keys(body.fields.basicInfo);
    ['name', 'category', 'rating', 'address', 'phone', 'website', 'plusCode', 'priceLevel', 'hours', 'coordinates'].forEach((f) => {
      expect(basicInfoKeys).toContain(f);
    });
  });

  it('aboutTab includes all expected field keys', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    const aboutTabKeys = Object.keys(body.fields.aboutTab);
    ['serviceOptions', 'accessibility', 'highlights', 'offerings', 'foodOptions',
      'amenities', 'crowd', 'planning', 'payments', 'parking', 'children', 'pets'].forEach((f) => {
      expect(aboutTabKeys).toContain(f);
    });
  });

  it('content includes reviews, menu, email', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    const contentKeys = Object.keys(body.fields.content);
    ['reviews', 'menu', 'email'].forEach((f) => {
      expect(contentKeys).toContain(f);
    });
  });

  it('total unique fields across all categories equals 25', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    const allKeys = [
      ...Object.keys(body.fields.basicInfo),
      ...Object.keys(body.fields.content),
      ...Object.keys(body.fields.aboutTab),
    ];
    expect(allKeys.length).toBe(25);
  });

  it('all returned field keys are in ALLOWED_FIELDS', async () => {
    const res = await app.request('/api/v1/gmaps/fields');
    const body = await res.json();
    const allKeys = [
      ...Object.keys(body.fields.basicInfo),
      ...Object.keys(body.fields.content),
      ...Object.keys(body.fields.aboutTab),
    ];
    allKeys.forEach((key) => {
      expect(ALLOWED_FIELDS).toContain(key);
    });
  });
});

// ─── POST /api/v1/gmaps — request body validation ────────────────────────────

describe('POST /api/v1/gmaps – request body validation', () => {
  let app;

  beforeEach(async () => {
    app = await buildApp();
  });

  const postJSON = (body) =>
    app.request('/api/v1/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // ── Missing / invalid query ──

  it('returns 400 when query is missing', async () => {
    const res = await postJSON({ total: 5, fields: ['name'] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/query/i);
  });

  it('returns 400 when query is empty string', async () => {
    const res = await postJSON({ query: '   ', fields: ['name'] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 400 when query is a number', async () => {
    const res = await postJSON({ query: 123, fields: ['name'] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.request('/api/v1/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'NOT_JSON',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Missing / invalid fields ──

  it('returns 400 when fields is empty array', async () => {
    const res = await postJSON({ query: 'test', fields: [] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/fields/i);
  });

  it('returns 400 when fields is not an array', async () => {
    const res = await postJSON({ query: 'test', fields: 'name' });
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid field name', async () => {
    const res = await postJSON({ query: 'test', fields: ['name', 'INVALID_FIELD'] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/invalid fields/i);
    expect(body.allowedFields).toBeDefined();
  });

  it('returns allowedFields list when invalid field sent', async () => {
    const res = await postJSON({ query: 'test', fields: ['badfield'] });
    const body = await res.json();
    expect(Array.isArray(body.allowedFields)).toBe(true);
    expect(body.allowedFields).toEqual(expect.arrayContaining(ALLOWED_FIELDS));
  });

  // ── total validation ──

  it('returns 400 when total < 1', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'], total: 0 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/total/i);
  });

  it('returns 400 when total > 100', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'], total: 101 });
    expect(res.status).toBe(400);
  });

  it('accepts total = 1', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'], total: 1 });
    expect(res.status).toBe(200);
  });

  it('accepts total = 100', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'], total: 100 });
    expect(res.status).toBe(200);
  });

  // ── Successful response structure ──

  it('returns 200 on valid minimal request', async () => {
    const res = await postJSON({ query: 'restoran jakarta' });
    expect(res.status).toBe(200);
  });

  it('response contains success: true', async () => {
    const res = await postJSON({ query: 'restoran jakarta', fields: ['name', 'address'] });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('response contains meta object', async () => {
    const res = await postJSON({ query: 'restoran jakarta', fields: ['name'] });
    const body = await res.json();
    expect(body.meta).toBeDefined();
    expect(typeof body.meta).toBe('object');
  });

  it('meta.query matches trimmed request query', async () => {
    const res = await postJSON({ query: '  kafe bandung  ', fields: ['name'] });
    const body = await res.json();
    expect(body.meta.query).toBe('kafe bandung');
  });

  it('meta contains scrapeOptions with all behavior params', async () => {
    const res = await postJSON({
      query: 'test',
      fields: ['name'],
      scrollDelay: 1200,
      scrollDistance: 500,
      clickDelay: 400,
      headless: true,
    });
    const body = await res.json();
    const opts = body.meta.scrapeOptions;
    expect(opts).toBeDefined();
    expect(opts.scrollDelay).toBe(1200);
    expect(opts.scrollDistance).toBe(500);
    expect(opts.clickDelay).toBe(400);
    expect(opts.headless).toBe(true);
  });

  it('meta.scrapeOptions uses defaults when not provided', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'] });
    const body = await res.json();
    const opts = body.meta.scrapeOptions;
    expect(opts.scrollDelay).toBe(800);
    expect(opts.scrollDistance).toBe(400);
    expect(opts.clickDelay).toBe(300);
    expect(opts.headless).toBe(false);
  });

  it('meta contains startedAt and finishedAt ISO timestamps', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'] });
    const body = await res.json();
    expect(body.meta.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.meta.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('meta.durationSeconds is a non-negative number', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'] });
    const body = await res.json();
    expect(typeof body.meta.durationSeconds).toBe('number');
    expect(body.meta.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('meta.requested equals the total sent in body', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'], total: 7 });
    const body = await res.json();
    expect(body.meta.requested).toBe(7);
  });

  it('meta.fields reflects requested fields', async () => {
    const fields = ['name', 'address', 'rating'];
    const res = await postJSON({ query: 'test', fields });
    const body = await res.json();
    expect(body.meta.fields).toEqual(fields);
  });

  it('response contains data array', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'] });
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('meta.scraped equals data.length', async () => {
    const res = await postJSON({ query: 'test', fields: ['name'] });
    const body = await res.json();
    expect(body.meta.scraped).toBe(body.data.length);
  });

  it('meta.maxReviews is present when reviews field requested', async () => {
    const res = await postJSON({ query: 'test', fields: ['name', 'reviews'], maxReviews: 5 });
    const body = await res.json();
    expect(body.meta.maxReviews).toBe(5);
  });

  it('meta.maxReviews is undefined when reviews field NOT requested', async () => {
    const res = await postJSON({ query: 'test', fields: ['name', 'address'] });
    const body = await res.json();
    expect(body.meta.maxReviews).toBeUndefined();
  });

  // ── All 25 available fields accepted ──

  it.each(ALLOWED_FIELDS)(
    'accepts single-field request with field "%s"',
    async (field) => {
      const res = await postJSON({ query: 'test query', fields: [field] });
      expect(res.status).toBe(200);
    }
  );

  it('accepts all 25 fields in one request', async () => {
    const res = await postJSON({ query: 'test query', fields: ALLOWED_FIELDS });
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/v1/gmaps — human behaviour params passthrough ─────────────────

describe('POST /api/v1/gmaps – human behaviour options', () => {
  let app;
  let mockScrape;

  beforeEach(async () => {
    const scraperModule = await import('../src/scraper/gmaps.js');
    mockScrape = scraperModule.scrapeGoogleMaps;
    mockScrape.mockClear();
    app = await buildApp();
  });

  const postJSON = (body) =>
    app.request('/api/v1/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('passes scrollDelay to scrapeGoogleMaps', async () => {
    await postJSON({ query: 'test', fields: ['name'], scrollDelay: 1500 });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ scrollDelay: 1500 })
    );
  });

  it('passes scrollDistance to scrapeGoogleMaps', async () => {
    await postJSON({ query: 'test', fields: ['name'], scrollDistance: 600 });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ scrollDistance: 600 })
    );
  });

  it('passes clickDelay to scrapeGoogleMaps', async () => {
    await postJSON({ query: 'test', fields: ['name'], clickDelay: 500 });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ clickDelay: 500 })
    );
  });

  it('passes headless: true to scrapeGoogleMaps', async () => {
    await postJSON({ query: 'test', fields: ['name'], headless: true });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ headless: true })
    );
  });

  it('passes maxReviews to scrapeGoogleMaps', async () => {
    await postJSON({ query: 'test', fields: ['name', 'reviews'], maxReviews: 20 });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ maxReviews: 20 })
    );
  });

  it('uses default scrollDelay=800 when not provided', async () => {
    await postJSON({ query: 'test', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ scrollDelay: 800 })
    );
  });

  it('uses default scrollDistance=400 when not provided', async () => {
    await postJSON({ query: 'test', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ scrollDistance: 400 })
    );
  });

  it('uses default clickDelay=300 when not provided', async () => {
    await postJSON({ query: 'test', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ clickDelay: 300 })
    );
  });

  it('uses default headless=false when not provided', async () => {
    await postJSON({ query: 'test', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ headless: false })
    );
  });

  it('uses default total=10 when not provided', async () => {
    await postJSON({ query: 'test', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ total: 10 })
    );
  });

  it('passes trimmed query to scrapeGoogleMaps', async () => {
    await postJSON({ query: '  restoran padang  ', fields: ['name'] });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'restoran padang' })
    );
  });

  it('passes fields array to scrapeGoogleMaps', async () => {
    const fields = ['name', 'address', 'phone'];
    await postJSON({ query: 'test', fields });
    expect(mockScrape).toHaveBeenCalledWith(
      expect.objectContaining({ fields })
    );
  });
});
