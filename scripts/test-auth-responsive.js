// client/scripts/test-auth-responsive.js
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'Mobile 360px', width: 360, height: 640 },
  { name: 'Mobile 390px (iPhone 13)', width: 390, height: 844 },
  { name: 'Tablet 768px (iPad)', width: 768, height: 1024 },
  { name: 'Small Laptop 1024px', width: 1024, height: 768 },
  { name: 'Standard Laptop 1366px', width: 1366, height: 768 },
  { name: 'Desktop 1440px', width: 1440, height: 900 },
  { name: 'Full HD 1920px', width: 1920, height: 1080 }
];

const PAGES = [
  { name: 'Login Page', path: '/login' },
  { name: 'Register Page', path: '/register' },
  { name: 'Forgot Password Page', path: '/forgot-password' }
];

async function runResponsiveAudit() {
  console.log('================================================================');
  console.log('             AUTHENTICATION RESPONSIVENESS AUDIT                ');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let allPassed = true;
  const failureList = [];

  for (const pageInfo of PAGES) {
    console.log(`\nTesting Page: ${pageInfo.name} (${pageInfo.path})`);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${CLIENT_URL}${pageInfo.path}`, { waitUntil: 'networkidle' });

      // Measure scrollWidth vs innerWidth
      const metrics = await page.evaluate(() => {
        const docElem = document.documentElement;
        const body = document.body;
        const innerW = window.innerWidth;
        const docScrollW = docElem.scrollWidth;
        const bodyScrollW = body.scrollWidth;
        const hasWindowScroll = docScrollW > innerW || bodyScrollW > innerW;

        // Check background computed color
        const main = document.querySelector('main');
        const container = main ? main.parentElement : null;
        const containerBg = container ? window.getComputedStyle(container).backgroundColor : '';
        const mainCardBg = main ? window.getComputedStyle(main).backgroundColor : '';

        return {
          innerW,
          docScrollW,
          bodyScrollW,
          hasWindowScroll,
          containerBg,
          mainCardBg
        };
      });

      const passed = !metrics.hasWindowScroll;
      if (passed) {
        console.log(`  ✓ [${vp.name}]: Passed (Viewport: ${metrics.innerW}px, Scroll: ${metrics.docScrollW}px, Zero Horizontal Scroll)`);
      } else {
        allPassed = false;
        console.error(`  ✗ [${vp.name}]: FAILED HORIZONTAL SCROLL! Inner: ${metrics.innerW}px, DocScroll: ${metrics.docScrollW}px, BodyScroll: ${metrics.bodyScrollW}px`);
        failureList.push({ page: pageInfo.name, viewport: vp.name, metrics });
      }

      // Check contrast between container background and main card
      if (vp.width === 1366) {
        console.log(`    -> Color distinction: Container BG = ${metrics.containerBg}, Form Card BG = ${metrics.mainCardBg}`);
      }
    }
  }

  // Also take high-resolution screenshots for visual verification
  console.log('\nCapturing screenshots for visual design verification...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${CLIENT_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'login-1366.png'), fullPage: false });

  await page.goto(`${CLIENT_URL}/register`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'register-1366.png'), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${CLIENT_URL}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'login-390.png'), fullPage: false });

  await page.goto(`${CLIENT_URL}/register`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve(__dirname, 'register-390.png'), fullPage: false });

  await browser.close();

  console.log('\n================================================================');
  if (allPassed) {
    console.log('AUDIT RESULT: 100% PASSED! Zero horizontal scrollbars across all screen widths.');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error(`AUDIT RESULT: FAILED! Found ${failureList.length} horizontal overflow violations.`);
    console.log('================================================================');
    process.exit(1);
  }
}

runResponsiveAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
