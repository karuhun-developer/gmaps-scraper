/**
 * ============================================================
 *  MANUAL E2E TEST — Google Maps Scraper
 *  Runs with a REAL visible browser (headless: false)
 *
 *  Usage:
 *    npm run test:manual
 *    npm run test:manual -- --query "warung makan depok" --total 2
 *    npm run test:manual -- --query "kafe bandung" --total 1 --headless
 *
 *  Stages (each opens its own browser window):
 *   1. Basic fields (name, address, phone, rating) — default fields
 *   2. Human behaviour timing  (fast vs slow settings, side-by-side)
 *   3. Extended fields group (category, website, hours, coordinates, reviews)
 *   4. About tab fields (serviceOptions, accessibility, highlights, ...)
 *   5. All 25 fields at once
 * ============================================================
 */

import { scrapeGoogleMaps } from '../src/scraper/gmaps.js';

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const QUERY    = getArg('query', 'restoran padang jakarta');
const TOTAL    = parseInt(getArg('total', '2'), 10);
const HEADLESS = hasFlag('headless'); // pass --headless to skip headed mode

// ─── All 25 available fields ──────────────────────────────────────────────────
const ALL_FIELDS = [
  'name', 'category', 'rating', 'address', 'phone', 'website',
  'plusCode', 'priceLevel', 'hours', 'coordinates', 'reviews',
  'email', 'menu', 'accessibility', 'serviceOptions', 'highlights',
  'offerings', 'foodOptions', 'amenities', 'crowd', 'planning',
  'payments', 'parking', 'children', 'pets',
];

// ─── Assertion helpers ────────────────────────────────────────────────────────
let totalPassed = 0;
let totalFailed = 0;
let totalWarned = 0;

const clr = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m' };
const c = (color, text) => `${clr[color]}${text}${clr.reset}`;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ${c('green', '✅ PASS')}  ${label}${detail ? c('cyan', `  → ${detail}`) : ''}`);
    totalPassed++;
  } else {
    console.log(`  ${c('red', '❌ FAIL')}  ${label}${detail ? c('cyan', `  → ${detail}`) : ''}`);
    totalFailed++;
  }
}

// warn = field may legitimately be null/missing for certain places
function warn(condition, label, detail = '') {
  if (condition) {
    console.log(`  ${c('green', '✅ PASS')}  ${label}${detail ? c('cyan', `  → ${detail}`) : ''}`);
    totalPassed++;
  } else {
    console.log(`  ${c('yellow', '⚠️  WARN')}  ${label}${detail ? c('cyan', `  → (null/missing for this place)`) : ''}`);
    totalWarned++;
  }
}

function section(title) {
  console.log('');
  console.log(c('bold', '─'.repeat(64)));
  console.log(c('bold', `  🔍 ${title}`));
  console.log(c('bold', '─'.repeat(64)));
}

function info(msg) {
  console.log(`  ${c('cyan', 'ℹ')}  ${msg}`);
}

// ─── Run a single scrape ──────────────────────────────────────────────────────
async function runScrape(label, opts) {
  const sd  = opts.scrollDelay   ?? 800;
  const cd  = opts.clickDelay    ?? 300;
  const sdist = opts.scrollDistance ?? 400;
  const hl  = HEADLESS || opts.headless || false;

  info(`Launching: ${c('bold', label)}`);
  info(`Query: "${opts.query}"  total: ${opts.total}  headless: ${hl}`);
  info(`scrollDelay=${sd}ms  clickDelay=${cd}ms  scrollDistance=${sdist}px`);
  console.log('');

  const t0 = Date.now();
  let data;
  try {
    data = await scrapeGoogleMaps({ ...opts, headless: hl });
  } catch (err) {
    console.log(`  ${c('red', '❌ FAIL')}  scrapeGoogleMaps threw: ${err.message}`);
    totalFailed++;
    return null;
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  info(`Done in ${c('bold', elapsed + 's')} — got ${c('bold', String(data.length))} result(s)\n`);
  return { data, elapsed: parseFloat(elapsed) };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 1 — Basic fields
// ─────────────────────────────────────────────────────────────────────────────
async function stage1_basic() {
  section('STAGE 1 — Basic fields  (name, address, phone, rating)');

  const result = await runScrape('Stage 1', {
    query: QUERY,
    total: TOTAL,
    fields: ['name', 'address', 'phone', 'rating'],
  });
  if (!result) return;

  const { data } = result;
  assert(Array.isArray(data),       'data is an array');
  assert(data.length > 0,           'at least 1 result returned',   `got ${data.length}`);
  assert(data.length <= TOTAL,      'results ≤ requested total',     `${data.length} ≤ ${TOTAL}`);

  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    console.log(`\n  Place [${i + 1}]: ${c('bold', p.name ?? '(no name)')}`);
    assert(typeof p.name === 'string' && p.name.length > 0, `[${i+1}] name`,    p.name);
    warn(typeof p.address === 'string',                     `[${i+1}] address`,  p.address);
    warn(typeof p.phone   === 'string',                     `[${i+1}] phone`,    p.phone);
    warn(p.rating != null,                                  `[${i+1}] rating`,   p.rating);
    assert(typeof p.url === 'string',                       `[${i+1}] url`,      p.url?.slice(0, 70));
    assert(!p.error,                                        `[${i+1}] no error`, p.error || 'clean');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 2 — Human behaviour timing (fast vs slow)
// ─────────────────────────────────────────────────────────────────────────────
async function stage2_humanBehaviour() {
  section('STAGE 2 — Human behaviour  (timing comparison: fast vs slow)');

  const fast = await runScrape('Stage 2a — FAST (scrollDelay=200, clickDelay=100)', {
    query: QUERY, total: 1, fields: ['name', 'rating'],
    scrollDelay: 200, scrollDistance: 600, clickDelay: 100,
  });

  const slow = await runScrape('Stage 2b — SLOW (scrollDelay=1200, clickDelay=600)', {
    query: QUERY, total: 1, fields: ['name', 'rating'],
    scrollDelay: 1200, scrollDistance: 300, clickDelay: 600,
  });

  if (fast && slow) {
    assert(fast.data.length > 0, 'fast mode: returned result');
    assert(slow.data.length > 0, 'slow mode: returned result');

    const diff = slow.elapsed - fast.elapsed;
    info(`fast=${fast.elapsed}s  |  slow=${slow.elapsed}s  |  diff=${diff.toFixed(1)}s`);
    warn(diff > 0, `slow (${slow.elapsed}s) took longer than fast (${fast.elapsed}s)`);

    assert(typeof fast.data[0]?.name === 'string', 'fast mode: name field present', fast.data[0]?.name);
    assert(typeof slow.data[0]?.name === 'string', 'slow mode: name field present', slow.data[0]?.name);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 3 — Extended fields
// ─────────────────────────────────────────────────────────────────────────────
async function stage3_extendedFields() {
  section('STAGE 3 — Extended fields  (category, website, hours, coordinates, priceLevel)');

  const result = await runScrape('Stage 3', {
    query: QUERY, total: 1,
    fields: ['name', 'category', 'website', 'hours', 'coordinates', 'plusCode', 'priceLevel'],
    scrollDelay: 600, clickDelay: 250,
  });
  if (!result) return;

  const p = result.data[0];
  if (!p) { assert(false, 'got at least 1 result'); return; }

  console.log(`\n  Place: ${c('bold', p.name ?? '(no name)')}`);
  warn(typeof p.category    === 'string', 'category',    p.category);
  warn(typeof p.website     === 'string', 'website',     p.website);
  warn(p.hours   != null,                'hours',        JSON.stringify(p.hours)?.slice(0,60));
  warn(p.coordinates != null,            'coordinates',  p.coordinates ? `lat=${p.coordinates.lat} lng=${p.coordinates.lng}` : null);
  warn(typeof p.plusCode    === 'string', 'plusCode',    p.plusCode);
  warn(p.priceLevel != null,             'priceLevel',   p.priceLevel);

  if (p.coordinates) {
    assert(typeof p.coordinates.lat === 'number', 'coordinates.lat is a number', p.coordinates.lat);
    assert(typeof p.coordinates.lng === 'number', 'coordinates.lng is a number', p.coordinates.lng);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 4 — Reviews
// ─────────────────────────────────────────────────────────────────────────────
async function stage4_reviews() {
  section('STAGE 4 — Reviews  (maxReviews=3)');

  const result = await runScrape('Stage 4', {
    query: QUERY, total: 1,
    fields: ['name', 'reviews'],
    maxReviews: 3,
    scrollDelay: 800, clickDelay: 300,
  });
  if (!result) return;

  const p = result.data[0];
  if (!p) { assert(false, 'got at least 1 result'); return; }

  console.log(`\n  Place: ${c('bold', p.name ?? '(no name)')}`);
  assert(Object.prototype.hasOwnProperty.call(p, 'reviews'), 'reviews key present');
  warn(Array.isArray(p.reviews) && p.reviews.length > 0, 'reviews array has items', `got ${p.reviews?.length ?? 0}`);

  if (Array.isArray(p.reviews) && p.reviews.length > 0) {
    const r = p.reviews[0];
    info(`Sample review: ${JSON.stringify(r).slice(0, 100)}`);
    warn('author' in r, 'review[0].author', r.author);
    warn('rating' in r, 'review[0].rating', r.rating);
    warn('date'   in r, 'review[0].date',   r.date);
    warn('text'   in r, 'review[0].text',   r.text?.slice(0, 60));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 5 — About tab fields
// ─────────────────────────────────────────────────────────────────────────────
async function stage5_aboutFields() {
  section('STAGE 5 — About tab fields  (serviceOptions, accessibility, highlights, offerings, foodOptions, ...)');

  const aboutFields = [
    'name', 'serviceOptions', 'accessibility', 'highlights',
    'offerings', 'foodOptions', 'amenities', 'crowd',
    'planning', 'payments', 'parking', 'children', 'pets',
  ];

  const result = await runScrape('Stage 5', {
    query: QUERY, total: 1,
    fields: aboutFields,
    scrollDelay: 800, clickDelay: 300,
  });
  if (!result) return;

  const p = result.data[0];
  if (!p) { assert(false, 'got at least 1 result'); return; }

  console.log(`\n  Place: ${c('bold', p.name ?? '(no name)')}`);
  for (const field of aboutFields.filter(f => f !== 'name')) {
    const hasKey = Object.prototype.hasOwnProperty.call(p, field);
    const val = p[field];
    const preview = val == null ? 'null'
      : Array.isArray(val) ? `[${val.length} items] ${JSON.stringify(val[0] ?? '').slice(0,40)}`
      : JSON.stringify(val).slice(0, 60);
    warn(hasKey, `field "${field}"`, preview);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STAGE 6 — All 25 fields
// ─────────────────────────────────────────────────────────────────────────────
async function stage6_allFields() {
  section('STAGE 6 — All 25 fields in one request');

  const result = await runScrape('Stage 6 — ALL FIELDS', {
    query: QUERY, total: 1,
    fields: ALL_FIELDS,
    maxReviews: 3,
    scrollDelay: 800, scrollDistance: 400, clickDelay: 300,
  });
  if (!result) return;

  const p = result.data[0];
  if (!p) { assert(false, 'got at least 1 result'); return; }

  console.log(`\n  Place: ${c('bold', p.name ?? '(no name)')}`);
  assert(!p.error, 'no scrape error');

  for (const field of ALL_FIELDS) {
    const hasKey = Object.prototype.hasOwnProperty.call(p, field);
    const val = p[field];
    const preview = val == null     ? 'null (unavailable for this place)'
      : Array.isArray(val)          ? `[${val.length} items]`
      : typeof val === 'object'     ? JSON.stringify(val).slice(0, 60)
      : String(val).slice(0, 60);
    warn(hasKey, `field "${field}"`, preview);
  }

  // Extra structural checks
  console.log('');
  info('Structural checks:');
  if (p.coordinates) {
    assert(typeof p.coordinates.lat === 'number', 'coordinates.lat is number', p.coordinates.lat);
    assert(typeof p.coordinates.lng === 'number', 'coordinates.lng is number', p.coordinates.lng);
  }
  if (Array.isArray(p.reviews) && p.reviews.length > 0) {
    const r = p.reviews[0];
    assert(['author','rating','date','text'].every(k => k in r), 'review object has all expected keys');
  }
  if (Array.isArray(p.serviceOptions)) {
    assert(p.serviceOptions.every(o => 'label' in o && 'available' in o), 'serviceOptions items have {label, available}');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  const w = 64;
  const pad = (s) => s.padEnd(w - 4);
  console.log(c('bold', '╔' + '═'.repeat(w) + '╗'));
  console.log(c('bold', '║  Google Maps Scraper — MANUAL E2E TEST' + ' '.repeat(w - 38) + '║'));
  console.log(c('bold', '╠' + '═'.repeat(w) + '╣'));
  console.log(c('bold', `║  Query   : ${pad(QUERY)}║`));
  console.log(c('bold', `║  Total   : ${pad(String(TOTAL))}║`));
  console.log(c('bold', `║  Headless: ${pad(HEADLESS ? 'true (--headless flag set)' : 'false — browser window VISIBLE')}║`));
  console.log(c('bold', '╚' + '═'.repeat(w) + '╝'));

  if (!HEADLESS) {
    console.log('');
    console.log(c('yellow', '  ⚠️  Browser windows will open — do NOT close them manually.'));
    console.log(c('yellow', '     They will close automatically when each stage finishes.'));
  }

  await stage1_basic();
  await stage2_humanBehaviour();
  await stage3_extendedFields();
  await stage4_reviews();
  await stage5_aboutFields();
  await stage6_allFields();

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log(c('bold', '═'.repeat(64)));
  console.log(c('bold', '  TEST SUMMARY'));
  console.log(c('bold', '─'.repeat(64)));
  console.log(`  ${c('green', '✅ Passed')}  : ${totalPassed}`);
  console.log(`  ${c('red',   '❌ Failed')}  : ${totalFailed}`);
  console.log(`  ${c('yellow','⚠️  Warned')}  : ${totalWarned}  ${c('cyan','(field may be null/missing for this place)')}`);
  console.log(c('bold', '═'.repeat(64)));
  console.log('');

  if (totalFailed > 0) {
    console.error(c('red', `Manual test FAILED with ${totalFailed} failure(s).`));
    process.exit(1);
  } else {
    console.log(c('green', c('bold', `All ${totalPassed} assertions passed! 🎉`)));
    if (totalWarned > 0) {
      console.log(c('yellow', `(${totalWarned} warnings — these fields may be null for this particular place)`));
    }
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
