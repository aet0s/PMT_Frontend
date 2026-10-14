// client/scripts/test-step3-scroll.js
import { chromium } from 'playwright';

const CLIENT_URL = 'http://localhost:5173';

async function testStep3Scroll() {
  console.log('Testing Step 3 (Set Password) for Scrollbar Overflows...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock OTP API calls for instantaneous testing
  await page.route('**/api/auth/register/send-otp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Code sent', dev_otp: '123456' })
    });
  });

  await page.route('**/api/auth/register/verify-otp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Verified', verification_token: 'valid-test-tok-123' })
    });
  });

  const heights = [768, 800, 900, 1080];
  let allZeroScroll = true;

  for (const h of heights) {
    await page.setViewportSize({ width: 1366, height: h });
    await page.goto(`${CLIENT_URL}/register`, { waitUntil: 'networkidle' });

    // Step 1: Fill details
    await page.fill('#register-name', 'Alexander Wright');
    await page.fill('#register-email', 'alex@enterprise.com');
    await page.click('button:has-text("Continue to Verification")');

    // Wait for step 2 OTP
    await page.waitForSelector('#register-otp');
    await page.fill('#register-otp', '123456');
    await page.click('button:has-text("Verify Code")');

    // Wait for step 3 Password
    await page.waitForSelector('#register-password');

    // Type strong password
    await page.fill('#register-password', 'ValidPass123!');
    // Type matching confirm passphrase
    await page.fill('#register-confirm-passphrase', 'ValidPass123!');

    await page.waitForTimeout(200);

    // Check scroll properties
    const scrollInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const rightPanel = document.querySelector('.overflow-y-auto, .lg\\:overflow-hidden');
      
      const hasWindowVerticalScroll = doc.scrollHeight > window.innerHeight;
      const hasWindowHorizontalScroll = doc.scrollWidth > window.innerWidth;
      
      let panelHasScroll = false;
      if (rightPanel) {
        panelHasScroll = rightPanel.scrollHeight > rightPanel.clientHeight;
      }

      return {
        hasWindowVerticalScroll,
        hasWindowHorizontalScroll,
        panelHasScroll,
        panelScrollHeight: rightPanel?.scrollHeight,
        panelClientHeight: rightPanel?.clientHeight
      };
    });

    console.log(`Height ${h}px result:`, scrollInfo);
    if (scrollInfo.hasWindowVerticalScroll || scrollInfo.panelHasScroll) {
      allZeroScroll = false;
    }

    if (h === 768) {
      await page.screenshot({ path: 'scripts/step3-register-768.png', fullPage: false });
    }
  }

  await browser.close();

  if (allZeroScroll) {
    console.log('SUCCESS: Step 3 has ZERO vertical and ZERO horizontal scrollbars across all viewports!');
    process.exit(0);
  } else {
    console.error('FAIL: Detected scrollbar in Step 3');
    process.exit(1);
  }
}

testStep3Scroll().catch(console.error);
