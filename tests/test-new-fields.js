import { scrapeGoogleMaps } from '../src/scraper/gmaps.js';

(async () => {
  const query = 'Jardin Cafe';
  const fields = ['name', 'priceLevel', 'hours', 'reservation'];
  
  console.log(`Testing scraper for: ${query}`);
  const results = await scrapeGoogleMaps({
    query,
    total: 1,
    headless: false,
    fields,
  });
  
  console.log('Results:');
  console.log(JSON.stringify(results, null, 2));
})();
