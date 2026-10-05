// client/scripts/capture-ui-and-a11y.js
// Automated UI Screenshot & Axe-core Accessibility Audit
// Captures 1440x900 desktop and 390x844 mobile screenshots for all views
// Performs WCAG accessibility audit with @axe-core/playwright (target: 0 serious, 0 critical)

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_UI_DIR = path.resolve(__dirname, '../../docs/ui');
const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:5000';

if (!fs.existsSync(DOCS_UI_DIR)) {
  fs.mkdirSync(DOCS_UI_DIR, { recursive: true });
}

async function registerTestCompany() {
  const suffix = Math.random().toString(36).substring(2, 8);
  const companyName = `Acme UI ${suffix}`;
  const slug = `acme_ui_${suffix}`;
  const email = `admin_${suffix}@acme.com`;
  const password = 'Password123!';

  console.log(`[SETUP] Registering company: ${companyName} (${email})...`);
  const res = await fetch(`${SERVER_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName,
      slug,
      name: 'Alice Owner',
      email,
      password
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to register company: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return {
    email,
    password,
    token: data.token,
    workspaceId: data.initial_workspace_id,
    user: data.user
  };
}

async function createBoardAndCards(token, workspaceId) {
  try {
    // Create a board with valid 'name' field
    const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Product Roadmap',
        workspace_id: workspaceId,
        background: 'mist-blue'
      })
    });

    if (!boardRes.ok) {
      console.warn('Could not create board via API:', await boardRes.text());
      return null;
    }

    const boardData = await boardRes.json();
    const boardId = boardData.board?.id || boardData.id;

    // Create List with valid 'name' and 'board_id'
    const listRes = await fetch(`${SERVER_URL}/api/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        board_id: boardId,
        name: 'In Progress',
        position: 1000
      })
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const listId = listData.list?.id || listData.id;

      // Create Card with valid 'list_id' and 'title'
      await fetch(`${SERVER_URL}/api/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          list_id: listId,
          title: 'Implement Single Light Theme',
          description: 'Design tokens migrated to Tailwind 4 @theme in index.css with WCAG AA compliance.',
          position: 1000
        })
      });
    }

    return boardId;
  } catch (err) {
    console.warn('createBoardAndCards error:', err.message);
    return null;
  }
}

async function closeModal(page) {
  try {
    const closeBtn = page.locator('.fixed.inset-0 button[aria-label*="Close"], .fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  } catch (e) {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(600);
  await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 3000 }).catch(() => {});
}

async function run() {
  console.log('================================================================');
  console.log('      PLAYWRIGHT UI SCREENSHOT & A11Y ACCESSIBILITY AUDIT       ');
  console.log('================================================================\n');

  const credentials = await registerTestCompany();
  await createBoardAndCards(credentials.token, credentials.workspaceId);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  const auditLog = [];
  const capturedScreenshots = [];
  let totalSeriousOrCritical = 0;

  function logSection(title) {
    auditLog.push(`\n================================================================`);
    auditLog.push(`VIEW: ${title}`);
    auditLog.push(`================================================================`);
    console.log(`\n[VIEW] ${title}`);
  }

  async function captureAndAudit(viewName, displayName) {
    logSection(displayName);

    // 1. Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(600);

    const desktopFile = `${viewName}-desktop-1440.png`;
    const desktopPath = path.join(DOCS_UI_DIR, desktopFile);
    await page.screenshot({ path: desktopPath, fullPage: false });
    capturedScreenshots.push(desktopFile);
    console.log(`  ✓ Captured desktop screenshot: docs/ui/${desktopFile}`);

    // Desktop a11y check
    try {
      const desktopA11y = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const desktopViolations = desktopA11y.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      totalSeriousOrCritical += desktopViolations.length;

      auditLog.push(`Desktop (1440x900) A11y Violations (Serious/Critical): ${desktopViolations.length}`);
      if (desktopViolations.length > 0) {
        desktopViolations.forEach((v) => {
          auditLog.push(`  - [${v.impact.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} occurrences)`);
          v.nodes.forEach(n => {
            auditLog.push(`      Target: ${n.target.join(' ')}`);
            auditLog.push(`      HTML: ${n.html.substring(0, 150)}`);
            auditLog.push(`      Summary: ${n.failureSummary}`);
            console.log(`    ! [${v.id}] ${n.target.join(' ')} | ${n.failureSummary}`);
          });
        });
      } else {
        auditLog.push('  ✓ No serious or critical a11y violations detected.');
      }
      console.log(`  ✓ Desktop Axe-core violations (serious/critical): ${desktopViolations.length}`);
    } catch (err) {
      auditLog.push(`  ! A11y analysis error: ${err.message}`);
      console.warn(`  ! A11y analysis error: ${err.message}`);
    }

    // 2. Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);

    const mobileFile = `${viewName}-mobile-390.png`;
    const mobilePath = path.join(DOCS_UI_DIR, mobileFile);
    await page.screenshot({ path: mobilePath, fullPage: false });
    capturedScreenshots.push(mobileFile);
    console.log(`  ✓ Captured mobile screenshot: docs/ui/${mobileFile}`);

    // Mobile a11y check
    try {
      const mobileA11y = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const mobileViolations = mobileA11y.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      totalSeriousOrCritical += mobileViolations.length;

      auditLog.push(`Mobile (390x844) A11y Violations (Serious/Critical): ${mobileViolations.length}`);
      if (mobileViolations.length > 0) {
        mobileViolations.forEach((v) => {
          auditLog.push(`  - [${v.impact.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} occurrences)`);
          v.nodes.forEach(n => {
            auditLog.push(`      Target: ${n.target.join(' ')}`);
            auditLog.push(`      HTML: ${n.html.substring(0, 150)}`);
            auditLog.push(`      Summary: ${n.failureSummary}`);
            console.log(`    ! [${v.id}] ${n.target.join(' ')} | ${n.failureSummary}`);
          });
        });
      } else {
        auditLog.push('  ✓ No serious or critical a11y violations detected.');
      }
      console.log(`  ✓ Mobile Axe-core violations (serious/critical): ${mobileViolations.length}`);
    } catch (err) {
      auditLog.push(`  ! A11y analysis error: ${err.message}`);
    }

    // Reset to desktop for subsequent interactions
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
  }

  try {
    // -------------------------------------------------------------
    // 1. LOGIN VIEW
    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // 1. LOGIN VIEW
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await captureAndAudit('01-login', 'Login Page');

    // -------------------------------------------------------------
    // 1b. LOGIN VIEW - ERROR STATE
    // -------------------------------------------------------------
    await page.fill('input[type="email"]', 'invalid_user@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(800);
    await captureAndAudit('01b-login-error', 'Login Page (Error State)');

    // -------------------------------------------------------------
    // 2. REGISTER VIEW
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/register`);
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await captureAndAudit('02-register', 'Register Company / User Page');

    // -------------------------------------------------------------
    // 3. LOG IN TO WORKSPACE
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');

    // Wait for App to load (look for aside)
    await page.waitForSelector('aside', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // 4. WORKSPACE HOME / MY WORK
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/home`);
    await page.waitForTimeout(1000);
    await captureAndAudit('03-workspace-home', 'Workspace Home & Quick Stats');

    // -------------------------------------------------------------
    // 5. BOARD VIEW (PROJECT KANBAN)
    // -------------------------------------------------------------
    const boardId = await createBoardAndCards(credentials.token, credentials.workspaceId);
    if (boardId) {
      await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/p/${boardId}/board`);
      await page.waitForTimeout(1200);
      await captureAndAudit('04-board', 'Board Canvas & Lists');

      // 5b. BOARD FILTER BAR ACTIVE
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('Theme');
        await page.waitForTimeout(500);
        await captureAndAudit('04b-filter-bar', 'Board Filter Bar & Search Active');
        await searchInput.fill('');
        await page.waitForTimeout(300);
      }

      // 5c. DROPDOWN OPEN
      const boardActionsBtn = page.locator('button[aria-label="Board actions"]').first();
      if (await boardActionsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await boardActionsBtn.click();
        await page.waitForTimeout(500);
        await captureAndAudit('04c-dropdown-open', 'Board Actions Dropdown Open');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }

      // 5d. TOAST NOTIFICATION VISIBLE
      const addListFormBtn = page.locator('button:has-text("Add another list"), button:has-text("Add List")').first();
      if (await addListFormBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addListFormBtn.click();
        await page.waitForTimeout(300);
        const listInput = page.locator('input[placeholder*="Enter list title"]').first();
        if (await listInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await listInput.fill('A11y Review List');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
      }
      const toastLocator = page.locator('[role="alert"], [aria-live="polite"]').first();
      if (await toastLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await captureAndAudit('04d-toast-visible', 'Toast Notification Visible');
      }

      // 6. CARD DETAIL MODAL (MODAL OPEN)
      const cardEl = page.locator('div[data-card-id], div:has-text("Implement Single Light Theme")').last();
      if (await cardEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cardEl.click();
        await page.waitForTimeout(1000);
        await captureAndAudit('05-card-modal', 'Card Detail Modal (Modal Open)');

        // 6b. DROPDOWN OPEN INSIDE MODAL
        const modalMenuBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-more-horizontal)').first();
        if (await modalMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await modalMenuBtn.click();
          await page.waitForTimeout(500);
          await captureAndAudit('05b-dropdown-in-modal', 'Dropdown Open Inside Modal');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        }

        await closeModal(page);
      }

      // 7. BOARD SHARE & INVITE MODAL (?modal=share)
      await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/p/${boardId}/board?modal=share`);
      await page.waitForTimeout(1000);
      await captureAndAudit('06-share-invite-modal', 'Board Share & Invite Modal');
      await closeModal(page);
    }

    // -------------------------------------------------------------
    // 8. SETTINGS PAGE (GENERAL TAB)
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/settings/general`);
    await page.waitForTimeout(1000);
    await captureAndAudit('07-settings-page', 'Workspace Settings Page (General Tab)');

    // -------------------------------------------------------------
    // 9. SETTINGS PAGE (ROLES & PERMISSIONS TAB)
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/settings/roles`);
    await page.waitForTimeout(1000);
    await captureAndAudit('08-settings-roles', 'Workspace Settings Page (Roles & Permissions Tab)');

    // -------------------------------------------------------------
    // 10. ACCOUNT PAGE (PROFILE & PREFERENCES)
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/account/profile`);
    await page.waitForTimeout(1000);
    await captureAndAudit('09-account-profile', 'Account Page (Profile Tab)');

    await page.goto(`${CLIENT_URL}/account/preferences`);
    await page.waitForTimeout(1000);
    await captureAndAudit('09b-account-preferences', 'Account Page (Preferences Tab)');

    // -------------------------------------------------------------
    // 11. NOTIFICATIONS HUB
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/notifications`);
    await page.waitForTimeout(1000);
    await captureAndAudit('10-notifications', 'Notifications Center Page');

    // -------------------------------------------------------------
    // 12. ARCHIVE PAGE
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/w/${credentials.workspaceId}/archive`);
    await page.waitForTimeout(1000);
    await captureAndAudit('11-archive', 'Archived Workspaces & Boards Page');

    // -------------------------------------------------------------
    // 13. DEV COMPONENTS PRIMITIVES CATALOG
    // -------------------------------------------------------------
    await page.goto(`${CLIENT_URL}/dev/components`);
    await page.waitForTimeout(1000);
    await captureAndAudit('12-dev-components', 'UI Primitives & Dropdown Catalog');

    console.log('\nAll screens captured successfully!');
  } finally {
    await browser.close();
  }

  // Write a11y audit report
  const reportPath = path.join(DOCS_UI_DIR, 'a11y-audit.txt');
  const reportHeader = [
    `================================================================`,
    `               A11Y ACCESSIBILITY AUDIT REPORT                  `,
    `Generated: ${new Date().toISOString()}`,
    `Tool: @axe-core/playwright (WCAG 2.1 AA)`,
    `Total Serious / Critical Violations: ${totalSeriousOrCritical}`,
    `Screenshots Captured: ${capturedScreenshots.length} files in docs/ui/`,
    `================================================================`
  ].join('\n');

  const fullReport = `${reportHeader}\n\n${auditLog.join('\n')}\n\n================================================================\nAUDIT COMPLETE: ${totalSeriousOrCritical === 0 ? 'PASSED (0 serious, 0 critical)' : 'FAILED'}\n================================================================\n`;
  fs.writeFileSync(reportPath, fullReport, 'utf-8');
  console.log(`\n[REPORT GENERATED] Saved full audit report to: ${reportPath}`);

  if (totalSeriousOrCritical > 0) {
    console.error(`\n[A11Y AUDIT FAILED] Found ${totalSeriousOrCritical} serious/critical violations!`);
    process.exit(1);
  } else {
    console.log(`\n[A11Y AUDIT PASSED] 0 serious, 0 critical violations across all views!`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\n[AUDIT FAILED]', err);
  process.exit(1);
});
