import { Hono } from 'hono';
import { scrapeGoogleMaps } from '../scraper/gmaps.js';

const gmaps = new Hono();

/**
 * POST /api/v1/gmaps
 *
 * Body:
 * {
 *   "query": "string (required) - Search keyword e.g. 'restoran padang jakarta'",
 *   "total": "number (optional, default 10) - Max places to scrape",
 *   "fields": ["string"] - Fields to extract. Available:
 *     name, category, rating, address, phone, website, plusCode, priceLevel,
 *     hours, coordinates, reviews, email, menu, accessibility, serviceOptions,
 *     highlights, offerings, foodOptions, amenities, crowd, planning, payments,
 *     parking, children, pets
 *   "maxReviews": "number (optional, default 10) - Max reviews per place",
 *   "scrollDelay": "number (optional, default 800) - Delay in ms between scrolls",
 *   "scrollDistance": "number (optional, default 400) - Pixels per scroll",
 *   "clickDelay": "number (optional, default 300) - Delay in ms after clicks",
 *   "headless": "boolean (optional, default false) - Run browser headlessly"
 * }
 */
gmaps.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const {
    query,
    total = 10,
    fields = ['name', 'address', 'phone', 'rating'],
    maxReviews = 10,
    scrollDelay = 800,
    scrollDistance = 400,
    clickDelay = 300,
    headless = false,
  } = body;

  // Validate required
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return c.json({ success: false, error: '"query" is required and must be a non-empty string' }, 400);
  }

  // Validate fields
  const ALLOWED_FIELDS = [
    'name', 'category', 'rating', 'address', 'phone', 'website', 'plusCode',
    'priceLevel', 'hours', 'coordinates', 'reviews', 'email', 'menu',
    'accessibility', 'serviceOptions', 'highlights', 'offerings', 'foodOptions',
    'amenities', 'crowd', 'planning', 'payments', 'parking', 'children', 'pets',
  ];

  if (!Array.isArray(fields) || fields.length === 0) {
    return c.json({ success: false, error: '"fields" must be a non-empty array' }, 400);
  }

  const invalidFields = fields.filter((f) => !ALLOWED_FIELDS.includes(f));
  if (invalidFields.length > 0) {
    return c.json(
      {
        success: false,
        error: `Invalid fields: ${invalidFields.join(', ')}`,
        allowedFields: ALLOWED_FIELDS,
      },
      400
    );
  }

  if (total < 1 || total > 100) {
    return c.json({ success: false, error: '"total" must be between 1 and 100' }, 400);
  }

  console.log(`[API] New scrape request: query="${query}" total=${total} fields=[${fields.join(',')}]`);

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    const data = await scrapeGoogleMaps({
      query: query.trim(),
      total,
      fields,
      maxReviews,
      scrollDelay,
      scrollDistance,
      clickDelay,
      headless,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return c.json({
      success: true,
      meta: {
        query: query.trim(),
        requested: total,
        scraped: data.length,
        fields,
        maxReviews: fields.includes('reviews') ? maxReviews : undefined,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationSeconds: parseFloat(duration),
        scrapeOptions: {
          scrollDelay,
          scrollDistance,
          clickDelay,
          headless,
        },
      },
      data,
    });
  } catch (err) {
    console.error('[API] Scrape error:', err.message);
    return c.json(
      {
        success: false,
        error: err.message,
        meta: {
          query: query.trim(),
          startedAt,
          failedAt: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/gmaps/fields
 * Returns list of available fields
 */
gmaps.get('/fields', (c) => {
  return c.json({
    success: true,
    fields: {
      basicInfo: {
        name: 'Business name',
        category: 'Business category/type',
        rating: 'Average star rating',
        address: 'Full address',
        phone: 'Phone number',
        website: 'Website URL',
        plusCode: 'Google Plus Code',
        priceLevel: 'Price level (e.g. $$, $$$)',
        hours: 'Business hours per day',
        coordinates: 'Latitude & longitude',
      },
      content: {
        reviews: `Last N reviews text (set maxReviews, default 10)`,
        menu: 'Menu items or external menu link',
        email: 'Email scraped from website (slow)',
      },
      aboutTab: {
        serviceOptions: 'Dine-in, Takeout, Delivery, etc.',
        accessibility: 'Wheelchair access, parking, etc.',
        highlights: 'Business highlights/amenities',
        offerings: 'Offerings like alcohol, coffee, etc.',
        foodOptions: 'Vegetarian, vegan, halal, etc.',
        amenities: 'Facilities/amenities',
        crowd: 'Crowd/atmosphere type',
        planning: 'Reservations, LGBTQ+ friendly, etc.',
        payments: 'Accepted payment methods',
        parking: 'Parking options',
        children: 'Child-friendly options',
        pets: 'Pet policies',
      },
    },
  });
});

export default gmaps;
