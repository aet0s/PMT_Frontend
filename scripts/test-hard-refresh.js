// client/scripts/test-hard-refresh.js
import { chromium } from 'playwright';

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

async function testHardRefresh() {
  console.log('Testing Hard Refresh and URL persistence...');
  try {
    await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' });
  } catch (e) {
    // Ignore if not in dev mode
  }
  const suffix = Math.random().toString(36).substring(2, 8);
  const res = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Refresh Co ${suffix}`,
      slug: `refresh_${suffix}`,
      name: 'Refresh Tester',
      email: `refresh_${suffix}@test.com`,
      password: 'Password123!'
    })
  });
  const data = await res.json();
  const token = data.token;
  const workspaceId = data.initial_workspace_id;

  // Create board and card
  const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Refresh Board', workspace_id: workspaceId })
  });
  const boardData = await boardRes.json();
  const boardId = boardData.board?.id || boardData.id;

  const listRes = await fetch(`${SERVER_URL}/api/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ board_id: boardId, name: 'Refresh List', position: 1000 })
  });
  const listData = await listRes.json();
  const listId = listData.list?.id || listData.id;

  const cardRes = await fetch(`${SERVER_URL}/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ list_id: listId, title: 'Card To Refresh', position: 1000 })
  });
  const cardData = await cardRes.json();
  const cardId = cardData.card?.id || cardData.id;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[PAGE ERROR]: ${msg.text()}`);
    else if (msg.type() === 'warn') console.log(`[PAGE WARN]: ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE UNCAUGHT]: ${err.message}`));

  // 1. Log in to establish session & storage tokens
  console.log(`Navigating to /login...`);
  await page.goto(`${CLIENT_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', `refresh_${suffix}@test.com`);
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('aside', { timeout: 25000 });
  console.log('✓ Logged in successfully.');

  const testUrls = [
    {
      name: 'Card Detail Modal deep link',
      url: `${CLIENT_URL}/w/${workspaceId}/p/${boardId}/board?card=${cardId}`,
      expectedSelector: '.fixed.inset-0',
      expectedText: 'Card To Refresh'
    },
    {
      name: 'Workspace Settings General tab',
      url: `${CLIENT_URL}/w/${workspaceId}/settings/general`,
      expectedSelector: 'h1',
      expectedText: 'Workspace Settings'
    },
    {
      name: 'Account Profile page',
      url: `${CLIENT_URL}/account/profile`,
      expectedSelector: 'h1',
      expectedText: 'Account'
    },
    {
      name: 'Dev Components Catalog',
      url: `${CLIENT_URL}/dev/components`,
      expectedSelector: 'h1',
      expectedText: 'UI Component Catalog'
    }
  ];

  for (const test of testUrls) {
    console.log(`\nNavigating directly to: ${test.url}`);
    await page.goto(test.url);
    await page.waitForTimeout(500);

    // Hard refresh page
    console.log(`Performing page.reload() (hard refresh)...`);
    await page.reload();
    await page.waitForTimeout(800);

    // Verify current URL didn't bounce to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Failed! Hard refresh flashed or bounced to /login for ${test.name}`);
    }

    // Verify expected element is rendered
    await page.waitForSelector(test.expectedSelector, { timeout: 10000 });
    const content = await page.textContent('body');
    if (!content.includes(test.expectedText)) {
      throw new Error(`Failed! Content missing "${test.expectedText}" in ${test.name}`);
    }
    console.log(`✓ ${test.name} preserved exact state and URL on hard refresh: ${currentUrl}`);
  }

  await browser.close();
  console.log('\n[HARD REFRESH TEST] ALL CHECKS PASSED CLEANLY (NO LOGIN FLASH, STATE PRESERVED)!');
}

testHardRefresh().catch((err) => {
  console.error('[HARD REFRESH FAILED]', err);
  process.exit(1);
});
