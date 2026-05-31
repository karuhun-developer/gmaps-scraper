import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: 'id-ID' });
  const page = await context.newPage();

  await page.goto('https://www.google.com/maps/search/One%20Eighty%20Coffee%20and%20Music');
  await page.waitForTimeout(5000);

  const aboutTabSelectors = 'button:has-text("Tentang"), button:has-text("About"), div[role="tab"]:has-text("Tentang"), div[role="tab"]:has-text("About")';
  const aboutTab = await page.$(aboutTabSelectors);
  if (aboutTab) {
    await aboutTab.click();
    await page.waitForTimeout(3000);
    
    const htmlInfo = await page.evaluate(() => {
      const lis = document.querySelectorAll('li.hpLkke');
      return Array.from(lis).map(li => li.outerHTML).slice(0, 5);
    });
    
    console.log(JSON.stringify(htmlInfo, null, 2));
    fs.writeFileSync('debug-about-li.json', JSON.stringify(htmlInfo, null, 2));
  }
  await browser.close();
})();
