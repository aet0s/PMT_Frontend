// client/scripts/test-settings-tabs.js
import { chromium } from 'playwright';

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

async function testSettingsTabs() {
  console.log('Testing Settings Page Tab Switching...');
  await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' }).catch(() => {});

  const suffix = Math.random().toString(36).substring(2, 8);
  const res = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Tabs Co ${suffix}`,
      slug: `tabs_${suffix}`,
      name: 'Tabs Tester',
      email: `tabs_${suffix}@test.com`,
      password: 'Password123!'
    })
  });
  const data = await res.json();
  const workspaceId = data.initial_workspace_id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[PAGE ERROR]: ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE UNCAUGHT]: ${err.message}`));

  // 1. Log in
  await page.goto(`${CLIENT_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', `tabs_${suffix}@test.com`);
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('aside', { timeout: 25000 });
  console.log('✓ Logged in.');

  // 2. Go to settings/general
  await page.goto(`${CLIENT_URL}/w/${workspaceId}/settings/general`);
  await page.waitForSelector('h1:has-text("Workspace Settings")', { timeout: 10000 });
  console.log('✓ Settings Page loaded.');

  const tabsToTest = [
    { name: 'Members', id: 'members', expectedText: 'Workspace Members' },
    { name: 'Invitations', id: 'invitations', expectedText: 'Active Invitations' },
    { name: 'Roles & Permissions', id: 'roles', expectedText: 'Roles & Permissions' },
    { name: 'Project Defaults', id: 'project', expectedText: 'Project Defaults' },
    { name: 'Notifications', id: 'notifications', expectedText: 'Notification Preferences' },
    { name: 'Data & Export', id: 'data', expectedText: 'Data & Export Controls' },
    { name: 'Security Log', id: 'security-log', expectedText: 'Security Audit Log' },
    { name: 'General', id: 'general', expectedText: 'General Settings' }
  ];

  for (const t of tabsToTest) {
    console.log(`\nClicking tab: "${t.name}"...`);
    const tabButton = page.locator(`aside button:has-text("${t.name}")`).first();
    await tabButton.waitFor({ state: 'visible', timeout: 5000 });
    await tabButton.click();
    await page.waitForTimeout(600);

    // Verify URL updated
    const expectedUrlPart = `/w/${workspaceId}/settings/${t.id}`;
    if (!page.url().includes(expectedUrlPart)) {
      throw new Error(`URL did not update to ${expectedUrlPart}! Current URL: ${page.url()}`);
    }

    // Verify tab content rendered
    await page.waitForSelector(`h2:has-text("${t.expectedText}")`, { timeout: 8000 });
    console.log(`✓ Tab "${t.name}" switched successfully, URL: ${page.url()}, heading found: "${t.expectedText}"`);
  }

  await browser.close();
  console.log('\n[SETTINGS TABS TEST PASSED] All 8 tabs switch cleanly and update URL/content!');
}

testSettingsTabs().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
