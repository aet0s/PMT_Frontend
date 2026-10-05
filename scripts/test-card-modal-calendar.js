// client/scripts/test-card-modal-calendar.js
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

async function runTest() {
  console.log('--- Starting Card Modal & Calendar Popover Verification ---');
  await fetch(`${SERVER_URL}/api/dev/reset-rate-limit`, { method: 'POST' }).catch(() => {});

  const suffix = Math.random().toString(36).substring(2, 8);
  const regRes = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: `CardTest Co ${suffix}`,
      slug: `cardtest_${suffix}`,
      name: 'Card Tester',
      email: `card_${suffix}@test.com`,
      password: 'Password123!'
    })
  });
  const regData = await regRes.json();
  const workspaceId = regData.initial_workspace_id;
  const token = regData.token;

  // Create a board with a list and card
  const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ workspace_id: workspaceId, name: 'Testing Card Modal' })
  });
  const boardData = await boardRes.json();
  const boardId = boardData.board ? boardData.board.id : boardData.id;

  const listRes = await fetch(`${SERVER_URL}/api/lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ board_id: boardId, name: 'In Progress', position: 1000 })
  });
  const listData = await listRes.json();
  const listId = listData.list ? listData.list.id : listData.id;

  const cardRes = await fetch(`${SERVER_URL}/api/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ list_id: listId, title: 'Refactor UI Components', position: 1000 })
  });
  const cardData = await cardRes.json();
  const cardId = cardData.card ? cardData.card.id : cardData.id;
  console.log(`✓ Test workspace (${workspaceId}), board (${boardId}), card (${cardId}) ready.`);

  const browser = await chromium.launch({ headless: true });

  // Ensure docs/ui exists for screenshots
  const outDir = path.resolve('..', 'docs', 'ui');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Viewport (1440x900)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop (1440x900) ---');
    const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await contextDesktop.newPage();

    // Login
    await pageDesktop.goto(`${CLIENT_URL}/login`);
    await pageDesktop.waitForSelector('input[type="email"]');
    await pageDesktop.fill('input[type="email"]', `card_${suffix}@test.com`);
    await pageDesktop.fill('input[type="password"]', 'Password123!');
    await pageDesktop.click('button[type="submit"]');
    await pageDesktop.waitForSelector('aside', { timeout: 20000 });

    // Go to Board
    await pageDesktop.goto(`${CLIENT_URL}/w/${workspaceId}/p/${boardId}/board`);
    await pageDesktop.waitForSelector(`text="Refactor UI Components"`, { timeout: 15000 });
    console.log('✓ Board page loaded.');

    // Click on Card to open Modal
    await pageDesktop.click(`text="Refactor UI Components"`);
    await pageDesktop.waitForSelector('div[role="dialog"]', { timeout: 10000 });
    console.log('✓ Card details modal opened.');

    // Count close buttons in the modal
    const closeButtons = await pageDesktop.locator('button[aria-label="Close dialog"]').all();
    console.log(`✓ Number of close dialog buttons found: ${closeButtons.length}`);
    if (closeButtons.length !== 1) {
      throw new Error(`Expected exactly 1 close button, but found ${closeButtons.length}!`);
    }

    // Capture screenshot of Card Modal
    await pageDesktop.screenshot({ path: path.join(outDir, 'test-01-card-modal-desktop.png') });
    console.log('✓ Saved desktop card modal screenshot.');

    // Click "Dates" quick add button inside modal
    await pageDesktop.locator('div[role="dialog"] button:has-text("Dates")').click();
    await pageDesktop.waitForSelector('h4:has-text("Dates")', { timeout: 5000 });
    console.log('✓ Dates Popover opened.');

    // Measure Popover Bounding Box
    const popover = pageDesktop.locator('.z-\\[900\\]:has-text("Dates")');
    const popBox = await popover.boundingBox();
    console.log(`✓ Popover Box: x=${popBox.x}, y=${popBox.y}, width=${popBox.width}, height=${popBox.height}`);

    if (popBox.y + popBox.height > 900) {
      throw new Error(`Popover overflows off bottom of screen: bottom=${popBox.y + popBox.height} > 900`);
    }
    if (popBox.y < 0) {
      throw new Error(`Popover overflows off top of screen: top=${popBox.y} < 0`);
    }

    // Verify Save and Remove buttons are visible in viewport
    const saveBtn = popover.locator('button:has-text("Save")');
    const removeBtn = popover.locator('button:has-text("Remove")');
    const saveVisible = await saveBtn.isVisible();
    const removeVisible = await removeBtn.isVisible();
    console.log(`✓ Save button visible: ${saveVisible}, Remove button visible: ${removeVisible}`);
    if (!saveVisible || !removeVisible) {
      throw new Error('Save or Remove button is not visible!');
    }

    const saveBox = await saveBtn.boundingBox();
    if (saveBox.y + saveBox.height > 900) {
      throw new Error(`Save button is clipped below screen: ${saveBox.y + saveBox.height} > 900`);
    }
    console.log(`✓ Save button is safely within viewport at y=${saveBox.y}`);

    // Take screenshot with Date Picker open
    await pageDesktop.screenshot({ path: path.join(outDir, 'test-02-datepicker-desktop.png') });
    console.log('✓ Saved desktop DatePicker screenshot.');

    // Click "Tomorrow" preset and click Save
    await popover.locator('button:has-text("Tomorrow")').click();
    await saveBtn.click();
    await pageDesktop.waitForSelector('h4:has-text("Dates")', { state: 'detached', timeout: 5000 });
    console.log('✓ Saved date and Popover closed.');

    // Verify Due badge is displayed on card modal
    await pageDesktop.waitForSelector('text="Due"', { timeout: 5000 });
    console.log('✓ Due date badge displayed on card modal.');

    // Close the card modal with Esc
    await pageDesktop.keyboard.press('Escape');
    await pageDesktop.waitForSelector('div[role="dialog"]', { state: 'detached', timeout: 5000 });
    console.log('✓ Card modal closed with Esc.');

    // -------------------------------------------------------------
    // Test 2: Laptop Short Viewport (1024x720)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Short Laptop (1024x720) ---');
    const contextShort = await browser.newContext({ viewport: { width: 1024, height: 720 } });
    const pageShort = await contextShort.newPage();

    await pageShort.goto(`${CLIENT_URL}/login`);
    await pageShort.fill('input[type="email"]', `card_${suffix}@test.com`);
    await pageShort.fill('input[type="password"]', 'Password123!');
    await pageShort.click('button[type="submit"]');
    await pageShort.waitForSelector('aside', { timeout: 20000 });

    await pageShort.goto(`${CLIENT_URL}/w/${workspaceId}/p/${boardId}/board`);
    await pageShort.waitForSelector(`text="Refactor UI Components"`);
    await pageShort.click(`text="Refactor UI Components"`);
    await pageShort.waitForSelector('div[role="dialog"]');

    // Click "Dates" inside modal
    await pageShort.locator('div[role="dialog"] button:has-text("Dates")').click();
    await pageShort.waitForSelector('h4:has-text("Dates")');

    const popoverShort = pageShort.locator('.z-\\[900\\]:has-text("Dates")');
    const popBoxShort = await popoverShort.boundingBox();
    console.log(`✓ Short Viewport Popover Box: y=${popBoxShort.y}, height=${popBoxShort.height}, bottom=${popBoxShort.y + popBoxShort.height}`);

    if (popBoxShort.y + popBoxShort.height > 720) {
      throw new Error(`Popover overflows off bottom of 720px screen: bottom=${popBoxShort.y + popBoxShort.height} > 720`);
    }

    const saveBtnShort = popoverShort.locator('button:has-text("Save")');
    const saveBoxShort = await saveBtnShort.boundingBox();
    if (saveBoxShort.y + saveBoxShort.height > 720) {
      throw new Error(`Save button overflows off bottom of 720px screen: ${saveBoxShort.y + saveBoxShort.height} > 720`);
    }
    console.log(`✓ Save button perfectly in view at y=${saveBoxShort.y} on 720px height screen!`);

    await pageShort.screenshot({ path: path.join(outDir, 'test-03-datepicker-short-720.png') });
    console.log('✓ Saved short viewport DatePicker screenshot.');

    // -------------------------------------------------------------
    // Test 3: Mobile Viewport (390x844)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Mobile (390x844) ---');
    const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageMobile = await contextMobile.newPage();

    await pageMobile.goto(`${CLIENT_URL}/login`);
    await pageMobile.fill('input[type="email"]', `card_${suffix}@test.com`);
    await pageMobile.fill('input[type="password"]', 'Password123!');
    await pageMobile.click('button[type="submit"]');
    await pageMobile.waitForSelector('text="Testing Card Modal"', { timeout: 20000 });

    await pageMobile.goto(`${CLIENT_URL}/w/${workspaceId}/p/${boardId}/board`);
    await pageMobile.waitForSelector(`text="Refactor UI Components"`);
    await pageMobile.click(`text="Refactor UI Components"`);
    await pageMobile.waitForSelector('div[role="dialog"]');
    console.log('✓ Card modal opened on mobile.');

    await pageMobile.screenshot({ path: path.join(outDir, 'test-04-card-modal-mobile.png') });
    console.log('✓ Saved mobile card modal screenshot.');

    // Open Dates on mobile
    await pageMobile.locator('div[role="dialog"] button:has-text("Dates")').click();
    await pageMobile.waitForSelector('h4:has-text("Dates")');
    console.log('✓ Mobile bottom sheet opened for Dates.');

    // Save screenshot of Mobile Date Picker
    await pageMobile.screenshot({ path: path.join(outDir, 'test-05-datepicker-mobile.png') });
    console.log('✓ Saved mobile DatePicker screenshot.');

    // Verify Save button is visible on mobile
    const saveMobile = pageMobile.locator('button:has-text("Save")');
    if (!(await saveMobile.isVisible())) {
      throw new Error('Save button not visible on mobile!');
    }
    console.log('✓ Save button visible on mobile bottom sheet.');

    // Accessibility Audit (Target: 0 serious/critical violations)
    console.log('\n--- 4. Running axe-core accessibility audit ---');
    const results = await new AxeBuilder({ page: pageDesktop })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousViolations = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    console.log(`✓ Serious/Critical violations: ${seriousViolations.length}`);
    if (seriousViolations.length > 0) {
      console.log('Violations:', JSON.stringify(seriousViolations, null, 2));
      throw new Error(`Accessibility violations found: ${seriousViolations.length}`);
    }

    console.log('\nALL CARD MODAL & CALENDAR CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
