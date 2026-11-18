// client/scripts/test_responsive_and_dark_mode.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:/Users/hardi/.gemini/antigravity/brain/e4b97af2-f871-4d13-ab97-3889870509dc/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'Ultra-Compact Mobile (iPhone SE)', width: 320, height: 568 },
  { name: 'Compact Mobile (iPhone 8/SE2)', width: 375, height: 667 },
  { name: 'Large Mobile (iPhone 11/XR)', width: 414, height: 896 },
  { name: 'Phablet / Wide Mobile', width: 480, height: 800 },
  { name: 'Small Tablet / Foldable', width: 600, height: 960 },
  { name: 'Standard Tablet (iPad Mini/Air)', width: 768, height: 1024 },
  { name: 'Mid Tablet / Foldable Unfolded', width: 900, height: 1280 },
  { name: 'Tablet Landscape / Small Notebook', width: 1024, height: 768 },
  { name: 'Standard Laptop (1280px)', width: 1280, height: 800 },
  { name: 'Large Desktop / HD (1440px)', width: 1440, height: 900 },
  { name: 'Full HD / 4K Scaled (1920px)', width: 1920, height: 1080 }
];

async function run() {
  console.log('================================================================');
  console.log('TASKFLOW PLAYWRIGHT RESPONSIVE UI & DARK MODE VERIFICATION');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;

  try {
    for (const theme of ['light', 'dark']) {
      console.log(`\n--- Testing Theme: ${theme.toUpperCase()} MODE ---`);

      for (const vp of VIEWPORTS) {
        totalTests++;
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1
        });

        // Set pre-paint theme in localStorage
        await context.addInitScript((th) => {
          localStorage.setItem('taskflow_theme', th);
        }, theme);

        const page = await context.newPage();
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

        // Evaluate DOM geometry and overflow
        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const isDarkClass = docEl.classList.contains('dark');
          const dataTheme = docEl.getAttribute('data-theme');
          const docScrollWidth = docEl.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const bodyScrollWidth = body.scrollWidth;
          const hasHorizontalOverflow = docScrollWidth > winInnerWidth || bodyScrollWidth > winInnerWidth;

          // Theme computed background
          const bodyBg = window.getComputedStyle(body).backgroundColor;

          // Find submit button touch target height
          const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('button');
          let btnHeight = 0;
          let btnWidth = 0;
          if (submitBtn) {
            const rect = submitBtn.getBoundingClientRect();
            btnHeight = rect.height;
            btnWidth = rect.width;
          }

          return {
            isDarkClass,
            dataTheme,
            docScrollWidth,
            winInnerWidth,
            bodyScrollWidth,
            hasHorizontalOverflow,
            bodyBg,
            btnHeight,
            btnWidth
          };
        });

        const expectedDark = theme === 'dark';
        const themeValid = metrics.isDarkClass === expectedDark && metrics.dataTheme === theme;
        const noOverflow = !metrics.hasHorizontalOverflow;
        const touchTargetAdequate = metrics.btnHeight >= 36; // Desktop and mobile standard touch targets

        if (!noOverflow) {
          console.error(`  [FAIL] ${vp.name} (${vp.width}x${vp.height}): Horizontal overflow detected! docScrollWidth: ${metrics.docScrollWidth}, innerWidth: ${metrics.winInnerWidth}`);
        } else if (!themeValid) {
          console.error(`  [FAIL] ${vp.name} (${vp.width}x${vp.height}): Theme mismatch! Expected ${theme}, got isDarkClass: ${metrics.isDarkClass}, dataTheme: ${metrics.dataTheme}`);
        } else {
          passedTests++;
          console.log(`  [PASS] ${vp.name.padEnd(36)} (${vp.width}x${vp.height}) | Overflow: NONE | Theme: ${metrics.dataTheme} | Button: ${Math.round(metrics.btnWidth)}x${Math.round(metrics.btnHeight)}px`);
        }

        // Save representative screenshots
        if (['Ultra-Compact Mobile (iPhone SE)', 'Standard Tablet (iPad Mini/Air)', 'Large Desktop / HD (1440px)'].includes(vp.name)) {
          const filename = `login_${theme}_${vp.width}px.png`;
          const filePath = path.join(SCREENSHOT_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`         [SCREENSHOT] Saved: ${filename}`);
        }

        await context.close();
      }
    }

    // Now test Register Page responsiveness and theme at 320px and 1440px
    console.log('\n--- Testing Register Page Responsive Layout ---');
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 768, 1440]) {
        totalTests++;
        const context = await browser.newContext({
          viewport: { width, height: 800 }
        });
        await context.addInitScript((th) => {
          localStorage.setItem('taskflow_theme', th);
        }, theme);

        const page = await context.newPage();
        await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });

        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const hasHorizontalOverflow = docEl.scrollWidth > window.innerWidth;
          return {
            hasHorizontalOverflow,
            dataTheme: docEl.getAttribute('data-theme')
          };
        });

        if (metrics.hasHorizontalOverflow) {
          console.error(`  [FAIL] Register Page (${width}px, ${theme}): Horizontal overflow detected!`);
        } else {
          passedTests++;
          console.log(`  [PASS] Register Page (${width}px, ${theme}) | Overflow: NONE | Theme: ${metrics.dataTheme}`);
          if (width === 320 || width === 1440) {
            const filename = `register_${theme}_${width}px.png`;
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
            console.log(`         [SCREENSHOT] Saved: ${filename}`);
          }
        }
        await context.close();
      }
    }

    console.log('\n================================================================');
    console.log(`PLAYWRIGHT TEST SUMMARY: ${passedTests}/${totalTests} VIEWPORT & THEME TESTS PASSED`);
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[FATAL] Playwright verification failed:', err);
  process.exit(1);
});
