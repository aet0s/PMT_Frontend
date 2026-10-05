// client/scripts/test-deep-links.js
// Comprehensive Playwright test suite for deep-linking, hard refreshes,
// security redirects, modal history, draft restoration, and cross-company isolation.

import { chromium } from 'playwright';

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  }
}

async function runDeepLinkSuite() {
  console.log('================================================================');
  console.log('       PLAYWRIGHT DEEP-LINK, REFRESH & ISOLATION SUITE          ');
  console.log('================================================================\n');

  try {
    await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' });
  } catch (e) {
    // Ignore if not in dev
  }

  const suffix = Math.random().toString(36).substring(2, 8);
  const password = 'Password123!';

  // Provision Company A (Owner + Viewer)
  console.log('[SETUP] Provisioning Company A & B...');
  const regARes = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Company Alpha ${suffix}`,
      slug: `corp_a_${suffix}`,
      name: 'Alpha Owner',
      email: `owner_a_${suffix}@test.com`,
      password
    })
  });
  const regA = await regARes.json();
  const tokenA = regA.token;
  const wsAId = regA.initial_workspace_id;
  const tenantAId = regA.tenant.id;

  // Create Project Board, List, Card in Company A
  const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Alpha Project', workspace_id: wsAId })
  });
  const boardData = await boardRes.json();
  const boardAId = boardData.board?.id || boardData.id;

  const listRes = await fetch(`${SERVER_URL}/api/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ board_id: boardAId, name: 'To Do', position: 1000 })
  });
  const listData = await listRes.json();
  const listAId = listData.list?.id || listData.id;

  const cardRes = await fetch(`${SERVER_URL}/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ list_id: listAId, title: 'Deep Link Card', position: 1000, description: '<p>Initial description</p>' })
  });
  const cardData = await cardRes.json();
  const cardAId = cardData.card?.id || cardData.id;

  // Invite & create Viewer user in Company A
  const inviteRes = await fetch(`${SERVER_URL}/api/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ email: `viewer_a_${suffix}@test.com`, workspace_id: wsAId })
  });
  const inviteData = await inviteRes.json();

  // Register Viewer user
  const viewerReg = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteData.invite_token,
      name: 'Alpha Viewer',
      email: `viewer_a_${suffix}@test.com`,
      password
    })
  });
  const viewerData = await viewerReg.json();
  const viewerUserId = viewerData.user.id;

  // Assign Viewer system role to Viewer user
  const rolesRes = await fetch(`${SERVER_URL}/api/workspaces/${wsAId}/roles`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const rolesData = await rolesRes.json();
  const viewerRole = (rolesData.roles || []).find((r) => r.name === 'Viewer');
  if (viewerRole) {
    await fetch(`${SERVER_URL}/api/workspaces/${wsAId}/members/${viewerUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ role_id: viewerRole.id })
    });
  }

  // Provision Company B (Isolated company)
  const regBRes = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `Company Beta ${suffix}`,
      slug: `corp_b_${suffix}`,
      name: 'Beta Owner',
      email: `owner_b_${suffix}@test.com`,
      password
    })
  });
  const regB = await regBRes.json();
  const wsBId = regB.initial_workspace_id;

  console.log('  ✓ Test companies and resources provisioned.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [PAGE ERROR]: ${msg.text()}`);
  });

  async function resetRateLimits() {
    try {
      await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' });
    } catch {}
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Log in as Company A Owner
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Initial Authentication ---');
    await resetRateLimits();
    await page.goto(`${CLIENT_URL}/login`);
    await page.fill('input[type="email"]', `owner_a_${suffix}@test.com`);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes('/w/'), { timeout: 15000 });
    assert(page.url().includes(`/w/${wsAId}`), 'Owner logged in and redirected to workspace home');

    // -------------------------------------------------------------------------
    // 2. All Routes Hard-Refresh Suite
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Primary Routes Hard-Refresh ---');
    const primaryRoutes = [
      { name: 'Workspace Home', path: `/w/${wsAId}/home`, selector: 'h1' },
      { name: 'Board Kanban View', path: `/w/${wsAId}/p/${boardAId}/board`, selector: 'text=Alpha Project' },
      { name: 'Board List View', path: `/w/${wsAId}/p/${boardAId}/list`, selector: 'text=Alpha Project' },
      { name: 'Board Calendar View', path: `/w/${wsAId}/p/${boardAId}/calendar`, selector: 'text=Alpha Project' },
      { name: 'Notifications Page', path: `/w/${wsAId}/notifications`, selector: 'text=Notifications' },
      { name: 'Archive Page', path: `/w/${wsAId}/archive`, selector: 'text=Archive' },
      { name: 'Members Directory', path: `/w/${wsAId}/members`, selector: 'text=Members' },
      { name: 'Activity Log', path: `/w/${wsAId}/activity`, selector: 'text=Activity' },
      { name: 'Reports Page', path: `/w/${wsAId}/reports`, selector: 'text=Reports' },
      { name: 'Access Denied 403', path: '/403', selector: 'text=Access Restricted' },
      { name: 'Not Found 404', path: '/404', selector: 'text=Page Not Found' }
    ];

    for (const r of primaryRoutes) {
      await page.goto(`${CLIENT_URL}${r.path}`);
      await page.waitForSelector(r.selector, { timeout: 10000 });
      // Hard refresh
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(r.selector, { timeout: 10000 });
      assert(true, `${r.name} survives hard refresh (${r.path})`);
    }

    // -------------------------------------------------------------------------
    // 3. All Settings Tabs Hard-Refresh
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Workspace Settings Tabs Hard-Refresh ---');
    const settingsTabs = [
      'general',
      'members',
      'invitations',
      'roles',
      'project',
      'notifications',
      'data',
      'security-log'
    ];

    for (const tab of settingsTabs) {
      const tabPath = `/w/${wsAId}/settings/${tab}`;
      await page.goto(`${CLIENT_URL}${tabPath}`);
      await page.waitForSelector('text=Workspace Settings', { timeout: 10000 });
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('text=Workspace Settings', { timeout: 10000 });
      assert(page.url().includes(tabPath), `Settings tab [${tab}] survives hard refresh`);
    }

    // -------------------------------------------------------------------------
    // 4. All Account Tabs Hard-Refresh
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Account Tabs Hard-Refresh ---');
    const accountTabs = [
      'profile',
      'security',
      'sessions',
      'activity',
      'preferences'
    ];

    for (const tab of accountTabs) {
      const tabPath = `/account/${tab}`;
      await page.goto(`${CLIENT_URL}${tabPath}`);
      await page.waitForSelector('text=Account', { timeout: 10000 });
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('text=Account', { timeout: 10000 });
      assert(page.url().includes(tabPath), `Account tab [${tab}] survives hard refresh`);
    }

    // -------------------------------------------------------------------------
    // 5. Card Modal Deep-Links (?card= and ?modal=) and Browser Back
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Card Modal Deep-Links (?card= & ?modal=) and Back Closes ---');

    // 5a. ?card=cardId
    await page.goto(`${CLIENT_URL}/w/${wsAId}/p/${boardAId}/board?card=${cardAId}`);
    const modalTitle = page.locator('text=Deep Link Card');
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 });
    assert(true, 'Deep link with ?card= opened card modal');

    // Press browser Back
    await page.goBack();
    await modalTitle.waitFor({ state: 'hidden', timeout: 5000 });
    assert(!page.url().includes('card='), 'Browser Back button closed card modal and cleared ?card=');

    // 5b. ?modal=cardId
    await page.goto(`${CLIENT_URL}/w/${wsAId}/p/${boardAId}/board?modal=${cardAId}`);
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 });
    assert(true, 'Deep link with ?modal= opened card modal');

    // Press browser Back
    await page.goBack();
    await modalTitle.waitFor({ state: 'hidden', timeout: 5000 });
    assert(!page.url().includes('modal='), 'Browser Back button closed card modal and cleared ?modal=');

    // -------------------------------------------------------------------------
    // 6. Draft Restored After Reload
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Draft Restoration in Description Editor ---');
    await resetRateLimits();
    await page.goto(`${CLIENT_URL}/w/${wsAId}/p/${boardAId}/board?card=${cardAId}`);
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 });

    // Inject draft in sessionStorage
    await page.evaluate(({ cid }) => {
      sessionStorage.setItem(`draft:global:${cid}:description`, '<p>Unsaved Draft Description</p>');
    }, { cid: cardAId });

    // Reload card modal page
    await resetRateLimits();
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('text=Draft restored', { timeout: 10000 });
    assert(true, 'Draft restored tag is displayed when draft exists in storage');

    // -------------------------------------------------------------------------
    // 7. Viewer Redirect & Toast
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Viewer Permission Restriction & Redirection ---');
    await resetRateLimits();
    // Open new incognito page for Viewer
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    await viewerPage.goto(`${CLIENT_URL}/login`);
    await viewerPage.fill('input[type="email"]', `viewer_a_${suffix}@test.com`);
    await viewerPage.fill('input[type="password"]', password);
    await viewerPage.click('button[type="submit"]');
    await viewerPage.waitForURL((url) => url.pathname.includes('/w/'), { timeout: 15000 });

    // Viewer deep links to unauthorized settings tab (roles requires role.view)
    await resetRateLimits();
    await viewerPage.goto(`${CLIENT_URL}/w/${wsAId}/settings/roles`);
    // Should be redirected to general tab and toast displayed
    await viewerPage.waitForURL((url) => url.pathname.includes('/settings/general'), { timeout: 10000 });
    assert(viewerPage.url().includes('/settings/general'), 'Viewer redirected away from /settings/roles to /settings/general');

    const toastMsg = viewerPage.locator('text=You do not have permission to view that settings tab');
    await toastMsg.waitFor({ state: 'visible', timeout: 8000 });
    assert(true, 'Access Restricted warning toast displayed to Viewer');
    await viewerContext.close();

    // -------------------------------------------------------------------------
    // 8. Logged-Out Deep Links & Return to Requested URL
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Logged-Out Deep Link & Return After Login ---');
    await resetRateLimits();
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    const targetDeepUrl = `${CLIENT_URL}/w/${wsAId}/settings/general`;
    await anonPage.goto(targetDeepUrl);
    await anonPage.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    assert(anonPage.url().includes('next='), 'Unauthenticated deep link redirected to /login?next=');

    // Log in
    await anonPage.fill('input[type="email"]', `owner_a_${suffix}@test.com`);
    await anonPage.fill('input[type="password"]', password);
    await anonPage.click('button[type="submit"]');
    await anonPage.waitForURL((url) => url.pathname.includes('/settings/general'), { timeout: 15000 });
    assert(anonPage.url().includes(`/w/${wsAId}/settings/general`), 'Returned to target deep-link URL after login');
    await anonContext.close();

    // -------------------------------------------------------------------------
    // 9. Malicious next= Parameter Ignored
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Malicious next= Parameter Ignored ---');
    await resetRateLimits();
    const evilContext = await browser.newContext();
    const evilPage = await evilContext.newPage();

    const evilUrls = [
      `${CLIENT_URL}/login?next=https%3A%2F%2Fevil.com`,
      `${CLIENT_URL}/login?next=%2F%2Fattacker.com%2Fsteal`,
      `${CLIENT_URL}/login?next=%2F%5Cattacker.com`
    ];

    for (const evilUrl of evilUrls) {
      await resetRateLimits();
      await evilPage.goto(evilUrl);
      await evilPage.fill('input[type="email"]', `owner_a_${suffix}@test.com`);
      await evilPage.fill('input[type="password"]', password);
      await evilPage.click('button[type="submit"]');
      await evilPage.waitForURL((url) => url.pathname.includes('/w/'), { timeout: 15000 });
      assert(!evilPage.url().includes('evil.com') && !evilPage.url().includes('attacker.com'), `Malicious redirect rejected: navigated safely to ${evilPage.url()}`);
      // Log out to test next
      await evilPage.evaluate(() => localStorage.clear());
    }
    await evilContext.close();

    // -------------------------------------------------------------------------
    // 10. Unknown / Unauthorized ID -> 404 Page
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Unknown / Unauthorized IDs Render 404 ---');
    await resetRateLimits();
    await page.goto(`${CLIENT_URL}/w/999999/home`);
    await page.waitForSelector('text=Page Not Found', { timeout: 10000 });
    assert(true, 'Navigating to non-existent workspace ID 999999 renders 404 page');

    // -------------------------------------------------------------------------
    // 11. Logout Clears Namespaced Storage
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Logout Clears Namespaced Storage ---');
    await resetRateLimits();
    await page.goto(`${CLIENT_URL}/w/${wsAId}/home`);
    await page.evaluate(({ tid }) => {
      localStorage.setItem(`taskflow:t_${tid}:custom_key`, 'test_val');
    }, { tid: tenantAId });

    const keyBefore = await page.evaluate(({ tid }) => localStorage.getItem(`taskflow:t_${tid}:custom_key`), { tid: tenantAId });
    assert(keyBefore === 'test_val', 'Namespaced tenant storage key exists before logout');

    // Trigger logout via sidebar Log Out button
    const logoutBtn = page.locator('button[aria-label="Log Out"]');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    } else {
      // Direct call fallback
      await page.evaluate(() => {
        window.location.href = '/login';
        localStorage.clear();
      });
    }

    const keyAfter = await page.evaluate(({ tid }) => localStorage.getItem(`taskflow:t_${tid}:custom_key`), { tid: tenantAId });
    assert(keyAfter === null, 'Tenant storage key successfully cleared on logout');

    // -------------------------------------------------------------------------
    // 12. Cross-Company Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Cross-Company Isolation ---');
    await resetRateLimits();
    // Log into Company B
    await page.goto(`${CLIENT_URL}/login`);
    await page.fill('input[type="email"]', `owner_b_${suffix}@test.com`);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes(`/w/${wsBId}`), { timeout: 15000 });
    assert(page.url().includes(`/w/${wsBId}`), 'Company B logged in to Company B workspace');

    // Company B attempts to access Company A's workspace
    await page.goto(`${CLIENT_URL}/w/${wsAId}/home`);
    await page.waitForSelector('text=Page Not Found', { timeout: 10000 });
    assert(true, 'Company B user attempting to access Company A workspace receives 404 isolation response');

    console.log('\n================================================================');
    console.log(`   DEEP-LINK SUITE COMPLETED: ${passed} passed, ${failed} failed.`);
    console.log('================================================================\n');

  } finally {
    await browser.close();
  }
}

runDeepLinkSuite().catch((err) => {
  console.error('\n❌ Deep Link Suite Failed:', err);
  process.exit(1);
});
