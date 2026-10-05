// client/scripts/test_kb_forms_console.js
// K-B Follow-up 3: Comprehensive Playwright Password Form, Autocomplete, and Console Integrity Suite.
// Asserts that every input[type=password] on every page and state has:
//   1. An enclosing form ancestor (input.form !== null)
//   2. A valid autocomplete attribute ('current-password' or 'new-password')
//   3. Zero console warnings/errors
//   4. Zero unhandled 'pageerror' exceptions
//   5. Zero unexpected 'requestfailed' network aborts

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, () => resolve()).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for server at ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function verifyPasswordInputs(page, pageDescription) {
  const passwordInputs = await page.$$('input[type="password"]');
  if (passwordInputs.length === 0) {
    throw new Error(`Expected at least one password input on ${pageDescription}, found none.`);
  }

  console.log(`\nVerifying ${passwordInputs.length} password input(s) on ${pageDescription}...`);

  for (let i = 0; i < passwordInputs.length; i++) {
    const input = passwordInputs[i];
    const details = await input.evaluate((el) => ({
      id: el.id,
      name: el.name,
      hasForm: el.form !== null,
      formTagName: el.form ? el.form.tagName : null,
      autocomplete: el.getAttribute('autocomplete')
    }));

    console.log(`  [Input #${i + 1}] id="${details.id}", name="${details.name}":`);
    console.log(`    - Form ancestor: ${details.hasForm ? `YES (<${details.formTagName.toLowerCase()}>)` : 'NO (FAILED)'}`);
    console.log(`    - autocomplete: "${details.autocomplete}"`);

    // 1. Assert form ancestor
    if (!details.hasForm) {
      throw new Error(`FAIL: input[type=password] (id: "${details.id}") on ${pageDescription} has NO form ancestor (input.form is null).`);
    }

    // 2. Assert valid autocomplete value
    const validAutocompletes = ['current-password', 'new-password'];
    if (!details.autocomplete || !validAutocompletes.includes(details.autocomplete)) {
      throw new Error(`FAIL: input[type=password] (id: "${details.id}") on ${pageDescription} has invalid autocomplete: "${details.autocomplete}". Must be one of: ${validAutocompletes.join(', ')}.`);
    }
  }

  console.log(`✓ All ${passwordInputs.length} password inputs on ${pageDescription} have valid form ancestors and autocomplete values.`);
}

async function run() {
  console.log('=== Running K-B Follow-up 3: Form Ancestry, Autocomplete & Console Integrity Suite ===\n');

  const port = 5198;
  const devProcess = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe'
  });

  const appUrl = `http://localhost:${port}`;

  try {
    await waitForServer(appUrl);
    console.log(`✓ Test frontend server running at ${appUrl}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleWarnings = [];
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    // Listen to console events
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'warning') {
        // Exclude socket reconnect info if disconnected
        if (!text.includes('Socket connection error')) {
          consoleWarnings.push(text);
          console.warn(`[Console Warning] ${text}`);
        }
      } else if (type === 'error') {
        // Exclude intentional socket disconnect, favicon, or expected 401 unauthenticated check
        if (
          !text.includes('ERR_CONNECTION_REFUSED') &&
          !text.includes('favicon.ico') &&
          !text.includes('status of 401')
        ) {
          consoleErrors.push(text);
          console.error(`[Console Error] ${text}`);
        }
      }
    });

    // Listen to uncaught exceptions in page
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error(`[Page Error] ${err.message}`);
    });

    // Listen to failed requests
    page.on('requestfailed', (req) => {
      const url = req.url();
      // Exclude intentional socket.io polling/ws or favicon
      if (!url.includes('/socket.io/') && !url.endsWith('favicon.ico')) {
        failedRequests.push({ url, failure: req.failure()?.errorText });
        console.error(`[Request Failed] ${url}: ${req.failure()?.errorText}`);
      }
    });

    // Mock API requests for consistent offline page rendering
    let currentUser = null;
    let twoFactorEnabled = false;
    await page.route((url) => {
      const u = typeof url === 'string' ? url : url.href;
      return (u.includes('localhost:5000/api/') || u.includes('127.0.0.1:5000/api/')) && !u.endsWith('.js') && !u.endsWith('.jsx');
    }, async (route) => {
      const url = route.request().url();
      if (url.includes('/api/auth/me')) {
        if (!currentUser) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              ...currentUser,
              two_factor_enabled: twoFactorEnabled
            }
          })
        });
      }
      if (url.includes('/api/workspaces')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ workspaces: [{ id: 1, name: 'Default Workspace', role: 'Owner' }] })
        });
      }
      if (url.includes('/api/notifications')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notifications: [], unreadCount: 0 })
        });
      }
      if (url.includes('/api/auth/profile')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { id: 1, name: 'Test Admin', email: 'admin@solarman.in' } })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // =========================================================================
    // Page 1: /login
    // =========================================================================
    console.log('--- Testing Page 1: /login ---');
    await page.goto(`${appUrl}/login`, { waitUntil: 'load' });
    await page.waitForSelector('input[type="password"]', { timeout: 8000 });
    await verifyPasswordInputs(page, 'Login Page (/login)');

    // =========================================================================
    // Page 2: /register
    // =========================================================================
    console.log('\n--- Testing Page 2: /register ---');
    await page.goto(`${appUrl}/register`, { waitUntil: 'load' });
    await page.waitForSelector('input[type="password"]', { timeout: 8000 });
    await verifyPasswordInputs(page, 'Registration Page (/register)');

    // =========================================================================
    // Page 3: /account/security (State 1: 2FA Disabled -> Password Change Form)
    // =========================================================================
    console.log('\n--- Testing Page 3: /account/security (State 1: Change Password Form) ---');
    currentUser = { id: 1, name: 'Test Admin', email: 'admin@solarman.in' };
    await page.goto(`${appUrl}/account/security`, { waitUntil: 'load' });
    await page.waitForSelector('#current-password', { timeout: 8000 });
    await verifyPasswordInputs(page, 'Account Security Page - Change Password Form');

    // =========================================================================
    // Page 3: /account/security (State 2: 2FA Enabled -> Disable 2FA Password Form)
    // =========================================================================
    console.log('\n--- Testing Page 3: /account/security (State 2: Disable 2FA Form) ---');
    twoFactorEnabled = true;
    await page.goto(`${appUrl}/account/security`, { waitUntil: 'load' });
    await page.waitForSelector('button:has-text("Disable Two-Factor Authentication")', { timeout: 8000 });
    // Click "Disable Two-Factor Authentication" button to reveal password prompt
    await page.click('button:has-text("Disable Two-Factor Authentication")');
    await page.waitForSelector('#disable-2fa-password', { timeout: 5000 });
    await verifyPasswordInputs(page, 'Account Security Page - Disable 2FA Password Prompt');

    // =========================================================================
    // Assertions: Zero Console Warnings, Zero PageErrors, Zero Failed Requests
    // =========================================================================
    console.log('\n--- Final Browser Health & Noise Audit ---');
    console.log(`Console Warnings count: ${consoleWarnings.length}`);
    console.log(`Console Errors count: ${consoleErrors.length}`);
    console.log(`PageErrors count: ${pageErrors.length}`);
    console.log(`Failed Requests count: ${failedRequests.length}`);

    if (consoleWarnings.length > 0) {
      throw new Error(`FAIL: Unexpected console warnings detected:\n${consoleWarnings.map((w) => '  - ' + w).join('\n')}`);
    }

    if (consoleErrors.length > 0) {
      throw new Error(`FAIL: Unexpected console errors detected:\n${consoleErrors.map((e) => '  - ' + e).join('\n')}`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`FAIL: Uncaught page errors detected:\n${pageErrors.map((e) => '  - ' + e).join('\n')}`);
    }

    if (failedRequests.length > 0) {
      throw new Error(`FAIL: Unexpected failed network requests:\n${JSON.stringify(failedRequests, null, 2)}`);
    }

    console.log('\n✓ Confirmed: ZERO console warnings');
    console.log('✓ Confirmed: ZERO console errors');
    console.log('✓ Confirmed: ZERO uncaught page errors');
    console.log('✓ Confirmed: ZERO unexpected failed network requests');
    console.log('\n=================================================================');
    console.log('K-B FOLLOW-UP 3 PASSWORD FORMS & CONSOLE AUDIT PASSED (ALL PASS)!');
    console.log('=================================================================');

    await browser.close();
  } finally {
    if (devProcess && devProcess.pid) {
      try {
        const { execSync } = await import('child_process');
        execSync(`taskkill /pid ${devProcess.pid} /f /t`, { stdio: 'ignore' });
      } catch {}
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('\nSuite Execution Failed:', err);
  process.exit(1);
});
