// client/scripts/test-unsaved-changes.js
import { chromium } from 'playwright';

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

async function runUnsavedChangesTests() {
  console.log('================================================================');
  console.log('   PLAYWRIGHT TEST: UNSAVED CHANGES GUARD & ROUTER BLOCKER      ');
  console.log('================================================================\n');

  try {
    await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' });
  } catch (e) {
    // Ignore if not in test/dev
  }

  const suffix = Math.random().toString(36).substring(2, 8);
  const companyEmail = `unsaved_${suffix}@test.com`;
  const companyPassword = 'Password123!';

  console.log(`[SETUP] Registering company for unsaved changes test: ${companyEmail}...`);
  const regRes = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Unsaved Corp ${suffix}`,
      slug: `unsaved_${suffix}`,
      name: 'Unsaved Tester',
      email: companyEmail,
      password: companyPassword
    })
  });

  const regData = await regRes.json();
  const workspaceId = regData.initial_workspace_id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[PAGE ERROR]: ${msg.text()}`);
  });

  try {
    // 1. Log in
    console.log('[1/4] Logging into TaskFlow...');
    await page.goto(`${CLIENT_URL}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', companyEmail);
    await page.fill('input[type="password"]', companyPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes('/w/'), { timeout: 15000 });
    console.log('  ✓ Logged in successfully.');

    // 2. Navigate to Account Profile
    console.log('\n[2/4] Navigating to Account Profile (/account/profile)...');
    await page.goto(`${CLIENT_URL}/account/profile`);
    await page.waitForSelector('#full-name', { timeout: 10000 });
    console.log('  ✓ Account profile loaded.');

    // Type in name to make form dirty
    const nameInput = page.locator('#full-name');
    await nameInput.fill('Unsaved Tester Modified');
    console.log('  ✓ Edited name field. Form is now dirty.');

    // 3. Test Sidebar navigation interception
    console.log('\n[3/4] Testing navigation blocker on sidebar link click...');
    // Click "Security & 2FA" tab
    await page.click('button:has-text("Security & 2FA")');

    // Confirm ConfirmDialog appears
    const dialog = page.locator('text=Discard unsaved changes?');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ ConfirmDialog popped up on sidebar tab click.');

    // Click "Keep editing"
    await page.click('button:has-text("Keep editing")');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('  ✓ Clicked "Keep editing" — dialog closed.');

    // Verify still on Profile page with dirty input
    let currentUrl = page.url();
    if (!currentUrl.includes('/account/profile')) {
      throw new Error(`Expected URL to remain /account/profile, got: ${currentUrl}`);
    }
    const val = await page.inputValue('#full-name');
    if (!val.includes('Modified')) {
      throw new Error(`Expected form input to retain dirty value, got: ${val}`);
    }
    console.log('  ✓ Verified URL unchanged and dirty edits preserved.');

    // Click tab again -> click "Discard changes"
    await page.click('button:has-text("Security & 2FA")');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    await page.click('button:has-text("Discard changes")');
    await page.waitForURL((url) => url.pathname.includes('/account/security'), { timeout: 5000 });
    console.log('  ✓ Clicked "Discard changes" — navigation proceeded to /account/security.');

    // 4. Test Browser Back button interception
    console.log('\n[4/4] Testing navigation blocker on browser Back button...');
    // In Security tab, click "Profile" tab via sidebar to create a history entry
    await page.click('button:has-text("Profile")');
    await page.waitForURL((url) => url.pathname.includes('/account/profile'), { timeout: 5000 });
    await page.waitForSelector('#full-name', { timeout: 10000 });

    // Make Profile form dirty
    await page.fill('#full-name', 'Dirty Back Test Name');
    console.log('  ✓ Form is dirty on Profile.');

    // Trigger browser Back (page.goBack) - this POPs to /account/security
    console.log('  Triggering browser Back (page.goBack)...');
    await page.goBack();

    // Confirm dialog appears
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ ConfirmDialog intercepted browser Back navigation.');

    // Cancel Back
    await page.click('button:has-text("Keep editing")');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('  ✓ Clicked "Keep editing" — stayed on profile page.');

    // Trigger Back again and discard
    await page.goBack();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    await page.click('button:has-text("Discard changes")');
    await page.waitForURL((url) => url.pathname.includes('/account/security'), { timeout: 5000 });
    console.log('  ✓ Clicked "Discard changes" — browser Back proceeded successfully to /account/security.');

    console.log('\n================================================================');
    console.log('   ALL UNSAVED CHANGES GUARD TESTS PASSED (0 FAILURES)');
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runUnsavedChangesTests().catch((err) => {
  console.error('\n❌ Unsaved Changes Test Failed:', err);
  process.exit(1);
});
