// client/scripts/test_security_console.js
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
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

async function main() {
  console.log('=== K-A.8.8: Testing Account > Security page with Playwright ===');

  const port = 5199;
  const devProcess = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe'
  });

  devProcess.stderr.on('data', (d) => {
    const s = d.toString();
    if (!s.includes('deprecated') && !s.includes('warning')) {
      console.error('[vite stderr]', s);
    }
  });

  const appUrl = `http://localhost:${port}`;

  try {
    await waitForServer(appUrl);
    console.log(`✓ Vite dev server ready at ${appUrl}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text });
      console.log(`[Browser ${type}] ${text}`);
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error('[Browser PageError]', err.message);
    });

    await page.route('**/socket.io/**', (route) => route.abort());

    // Mock API responses for authentication so Account page loads smoothly
    await page.route((url) => {
      const u = typeof url === 'string' ? url : url.href;
      return (u.includes('localhost:5000/api/') || u.includes('127.0.0.1:5000/api/')) && !u.endsWith('.js') && !u.endsWith('.jsx');
    }, async (route) => {
      const url = route.request().url();
      if (url.includes('/api/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 1,
              name: 'Test Administrator',
              email: 'admin@solarman.in',
              two_factor_enabled: false,
              created_at: new Date().toISOString()
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
          body: JSON.stringify({ user: { id: 1, name: 'Test Administrator', email: 'admin@solarman.in' } })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // Navigate to Account page with /account/security
    console.log('Navigating to /account/security ...');
    await page.goto(`${appUrl}/account/security`, { waitUntil: 'load' });
    console.log('Loaded. Waiting for Security tab to render... URL:', page.url());

    // Ensure the Security tab password form is rendered
    await page.waitForSelector('#current-password', { timeout: 8000 });
    console.log('✓ Current password input found in DOM');
    console.log('✓ Current password input found in DOM');

    const newPwd = await page.$('#new-password');
    const confirmPwd = await page.$('#confirm-new-password');
    if (!newPwd || !confirmPwd) {
      throw new Error('New password inputs not found in DOM');
    }
    console.log('✓ All password inputs rendered in Security tab');

    // Check for password / autocomplete warnings
    const passwordWarnings = consoleMessages.filter((m) =>
      m.text.toLowerCase().includes('password field is not contained in a form') ||
      (m.text.toLowerCase().includes('password') && m.text.toLowerCase().includes('form')) ||
      m.text.toLowerCase().includes('autocomplete')
    );

    console.log('\n--- Console Message Inspection ---');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Password / autocomplete warnings found: ${passwordWarnings.length}`);

    if (passwordWarnings.length > 0) {
      console.error('FAILED: Found password/autocomplete warnings in browser console:');
      passwordWarnings.forEach((w) => console.error(`  - [${w.type}] ${w.text}`));
      process.exit(1);
    }

    console.log('✓ Confirmed: ZERO "Password field is not contained in a form" warnings');
    console.log('✓ Confirmed: ZERO autocomplete warnings');
    console.log('=== K-A.8.8 PASS ===');

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

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
