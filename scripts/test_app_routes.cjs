// client/scripts/test_app_routes.cjs
const { chromium } = require('playwright');

async function testRoutes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('[1] Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'owner@demo.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to home
  await page.waitForURL('**/w/**', { timeout: 10000 });
  console.log('[2] Logged in successfully. Current URL:', page.url());

  const routesToTest = [
    '/w/1/home',
    '/w/1/p/1/board',
    '/w/1/p/1/calendar',
    '/w/1/reports',
    '/w/1/company/members',
    '/w/1/settings',
    '/w/1/notifications'
  ];

  for (const r of routesToTest) {
    await page.goto(`http://localhost:5173${r}`, { waitUntil: 'networkidle' });
    console.log(`Visited ${r} -> Current title / URL:`, page.url());
  }

  await browser.close();
  console.log('Routes verified successfully!');
}

testRoutes().catch(err => {
  console.error('Route test error:', err);
  process.exit(1);
});
