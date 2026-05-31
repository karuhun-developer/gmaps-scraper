import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: 'id-ID' });
  const page = await context.newPage();

  console.log('Navigating to One Eighty Coffee and Music...');
  await page.goto('https://www.google.com/maps/search/One%20Eighty%20Coffee%20and%20Music');
  
  await page.waitForTimeout(5000);

  const aboutTabSelectors = 'button:has-text("Tentang"), button:has-text("About"), div[role="tab"]:has-text("Tentang"), div[role="tab"]:has-text("About")';
  const aboutTab = await page.$(aboutTabSelectors);
  
  if (aboutTab) {
    await aboutTab.click();
    await page.waitForTimeout(3000);
    
    const htmlInfo = await page.evaluate(() => {
      const results = [];
      const h2s = document.querySelectorAll('h2');
      for (const h2 of h2s) {
        if (!h2.textContent.includes('Aksesibilitas') && !h2.textContent.includes('Keunggulan') && !h2.textContent.includes('Opsi layanan')) continue;
        
        let current = h2.nextElementSibling;
        const items = [];
        
        // Sometimes it's wrapped in a ul, sometimes div, etc.
        if (current && current.tagName === 'UL') {
           const lis = current.querySelectorAll('li');
           for(const li of lis) items.push(li.textContent);
        } else {
           while (current && current.tagName !== 'H2') {
             if (current.tagName === 'UL') {
               const lis = current.querySelectorAll('li');
               for(const li of lis) items.push(li.textContent);
             } else if (current.tagName === 'LI') {
               items.push(current.textContent);
             }
             const lis = current.querySelectorAll('li');
             if (lis.length > 0 && current.tagName !== 'UL') {
                for(const li of lis) items.push(li.textContent);
             }
             current = current.nextElementSibling;
           }
        }
        
        results.push({
           title: h2.textContent,
           parentHTML: h2.parentElement.outerHTML.substring(0, 300),
           items
        });
      }
      return results;
    });
    
    console.log('Extracted elements:', JSON.stringify(htmlInfo, null, 2));
    
  } else {
    console.log('About tab not found.');
  }

  await browser.close();
})();
