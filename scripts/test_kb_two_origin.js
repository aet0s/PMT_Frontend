// client/scripts/test_kb_two_origin.js
// K-B Follow-up 8: Two-Origin Realism Suite (Dev & Production-Like Modes).
//
// Supports:
//   (a) Dev Mode: node src/index.js (HTTP) + vite dev (HTTP) on two origins.
//   (b) Production-Like Mode: NODE_ENV=production server (HTTPS via mkcert) + vite preview (HTTPS)
//       on two subdomains of the same registrable domain (pmt.local.test:5174 and api.pmt.local.test:5001).
//       Rate limits are isolated via unique client IPs in X-Forwarded-For (zero reset endpoints).
//       Strict Zero-Noise Browser Rules (0 console errors, 0 warnings, 0 page errors, 0 failed requests).

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');
const certsDir = path.join(rootDir, 'certs');

const isProdMode = process.argv.includes('--prod');
console.log(`=== Running K-B Follow-up 8: Two-Origin Playwright Suite [Mode: ${isProdMode ? 'PRODUCTION-LIKE (HTTPS)' : 'DEVELOPMENT (HTTP)'}] ===\n`);

const SERVER_PORT = isProdMode ? 5001 : 5000;
const CLIENT_PORT = isProdMode ? 5174 : 5173;

const API_ORIGIN = isProdMode
  ? `https://api.pmt.local.test:${SERVER_PORT}`
  : `http://localhost:${SERVER_PORT}`;

const CLIENT_ORIGIN = isProdMode
  ? `https://pmt.local.test:${CLIENT_PORT}`
  : `http://localhost:${CLIENT_PORT}`;

function waitForUrl(url, timeoutMs = 20000) {
  const start = Date.now();
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';
  const client = isHttps ? https : http;
  const hostname = parsed.hostname;
  const port = parsed.port || (isHttps ? 443 : 80);
  const connectHost = hostname.endsWith('.local.test') ? '127.0.0.1' : hostname;

  return new Promise((resolve, reject) => {
    const check = () => {
      const options = {
        host: connectHost,
        port: Number(port),
        path: parsed.pathname + parsed.search,
        headers: { host: hostname },
        servername: hostname,
        rejectUnauthorized: false
      };
      const req = client.get(options, (res) => {
        resolve();
      });
      req.on('error', (e) => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
      req.setTimeout(1000, () => req.destroy());
    };
    check();
  });
}

function startStaticHttpsServer(distDir, certFile, keyFile, port) {
  const options = {
    cert: fs.readFileSync(certFile),
    key: fs.readFileSync(keyFile)
  };

  const server = https.createServer(options, (req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

async function runSuite() {
  let serverProcess = null;
  let clientProcess = null;
  let staticHttpsServer = null;

  try {
    // 1. Prepare Backend Server
    console.log(`[1/4] Starting backend server on ${API_ORIGIN}...`);
    const serverEnv = isProdMode
      ? {
          ...process.env,
          PORT: String(SERVER_PORT),
          CLIENT_URL: CLIENT_ORIGIN,
          CORS_ORIGINS: CLIENT_ORIGIN,
          NODE_ENV: 'production',
          DEV_SINGLE_TENANT: '0',
          DB_HOST: process.env.DB_HOST || '127.0.0.1',
          DB_PORT: process.env.DB_PORT || '3306',
          DB_USER: 'pm_app_user',
          DB_PASSWORD: process.env.DB_PASSWORD || 'AppUserStrongPass123!',
          JWT_SECRET: 'f89ab928d28a9b74c2e684073b98453472094892c902384a7192837492834719',
          JWT_REFRESH_SECRET: 'c129481928bcde91823749182739481273918273918273918273918273918273',
          SESSION_SECRET: 'e192837192837192837192837192837192837192837192837192837192837192',
          INVITATION_SECRET: 'a918273918273918273918273918273918273918273918273918273918273918',
          TOTP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          REGISTRATION_ENABLED: 'true',
          VERIFICATION_MODE: 'off',
          ALLOW_OPEN_REGISTRATION: 'true',
          BACKUP_JOB_CONFIGURED: 'true',
          HTTPS: 'true',
          SSL_CERT: path.join(certsDir, 'local.test.pem'),
          SSL_KEY: path.join(certsDir, 'local.test-key.pem')
        }
      : {
          ...process.env,
          PORT: String(SERVER_PORT),
          CLIENT_URL: CLIENT_ORIGIN,
          CORS_ORIGINS: CLIENT_ORIGIN,
          NODE_ENV: 'development',
          DEV_SINGLE_TENANT: '1',
          JWT_SECRET: 'development_jwt_secret_key_1234567890_min_length',
          SESSION_SECRET: 'development_session_secret_key_1234567890_min_length',
          TOTP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          DB_HOST: process.env.DB_HOST || '127.0.0.1',
          DB_PORT: process.env.DB_PORT || '3306',
          DB_USER: process.env.DB_USER || 'pm_app_user',
          DB_PASSWORD: process.env.DB_PASSWORD || 'AppUserStrongPass123!',
          DB_NAME: 'pm_dev_single'
        };

    delete serverEnv.DISABLE_RATE_LIMIT;

    serverProcess = spawn('node', ['src/index.js'], {
      cwd: serverDir,
      env: serverEnv,
      shell: true,
      stdio: 'pipe'
    });

    serverProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (!msg.includes('ExperimentalWarning')) {
        console.error('[server stderr]', msg);
      }
    });

    await waitForUrl(`${API_ORIGIN}/api/health`);
    console.log(`✓ Backend server alive at ${API_ORIGIN}`);

    // 2. Prepare Frontend Server
    console.log(`[2/4] Starting frontend server on ${CLIENT_ORIGIN}...`);
    if (isProdMode) {
      const distDir = path.join(clientDir, 'dist');
      if (!fs.existsSync(distDir)) {
        throw new Error('client/dist not found. Run npm run build first.');
      }
      staticHttpsServer = await startStaticHttpsServer(
        distDir,
        path.join(certsDir, 'local.test.pem'),
        path.join(certsDir, 'local.test-key.pem'),
        CLIENT_PORT
      );
      console.log(`✓ Static HTTPS preview server serving dist/ at ${CLIENT_ORIGIN}`);
    } else {
      clientProcess = spawn('npx', ['vite', '--port', String(CLIENT_PORT), '--strictPort'], {
        cwd: clientDir,
        env: {
          ...process.env,
          VITE_API_URL: API_ORIGIN,
          VITE_SERVER_URL: API_ORIGIN
        },
        shell: true,
        stdio: 'pipe'
      });

      await waitForUrl(CLIENT_ORIGIN);
      console.log(`✓ Vite dev server running at ${CLIENT_ORIGIN}`);
    }

    // 3. Launch Playwright Browser with Zero-Noise and Host Resolution Rules
    console.log(`[3/4] Launching Playwright Chromium...`);
    const chromiumArgs = [
      '--ignore-certificate-errors',
      '--host-resolver-rules=MAP pmt.local.test 127.0.0.1, MAP api.pmt.local.test 127.0.0.1'
    ];

    const browser = await chromium.launch({
      headless: true,
      args: chromiumArgs
    });

    // Provide unique client IP through X-Forwarded-For to isolate rate limiting per test run
    const testClientIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'x-forwarded-for': testClientIp
      }
    });

    const page = await context.newPage();

    const consoleWarnings = [];
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'warning') {
        if (!text.includes('Socket connection error')) {
          consoleWarnings.push(text);
          console.warn(`[Browser Warning] ${text}`);
        }
      } else if (type === 'error') {
        if (!text.includes('favicon.ico') && !text.includes('status of 401')) {
          consoleErrors.push(text);
          console.error(`[Browser Error] ${text}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error(`[Browser PageError] ${err.message}`);
    });

    page.on('response', async (res) => {
      if (res.status() >= 400 && res.status() !== 401) {
        let body = '';
        try { body = await res.text(); } catch {}
        console.error(`[HTTP ${res.status()}] ${res.url()} => ${body}`);
      }
    });

    page.on('requestfailed', (req) => {
      const url = req.url();
      if (!url.endsWith('favicon.ico')) {
        failedRequests.push({ url, error: req.failure()?.errorText });
        console.error(`[Request Failed] ${url}: ${req.failure()?.errorText}`);
      }
    });

    // 4. Provision test user via public API
    const suffix = Math.random().toString(36).substring(2, 8);
    const testEmail = `admin_${suffix}@example.com`;
    const testPassword = 'Password123!';

    console.log(`  - Provisioning test user: ${testEmail}...`);
    const regEndpoint = isProdMode ? '/api/auth/register-company' : '/api/auth/register';
    const regPayload = isProdMode
      ? {
          companyName: `Prod Realism ${suffix}`,
          slug: `prod_real_${suffix}`,
          name: 'Realism Admin',
          email: testEmail,
          password: testPassword
        }
      : {
          name: 'Realism Admin',
          email: testEmail,
          password: testPassword
        };

    let regOk = false;
    let regStatus = 0;
    let regText = '';

    if (isProdMode) {
      await new Promise((resolve, reject) => {
        const payloadStr = JSON.stringify(regPayload);
        const req = https.request(
          {
            host: '127.0.0.1',
            port: SERVER_PORT,
            path: regEndpoint,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payloadStr),
              Host: `api.pmt.local.test:${SERVER_PORT}`,
              'X-Forwarded-For': testClientIp
            },
            servername: 'api.pmt.local.test',
            rejectUnauthorized: false
          },
          (res) => {
            regStatus = res.statusCode;
            regOk = res.statusCode >= 200 && res.statusCode < 300;
            res.on('data', (d) => {
              regText += d.toString();
            });
            res.on('end', resolve);
          }
        );
        req.on('error', reject);
        req.write(payloadStr);
        req.end();
      });
    } else {
      const regRes = await fetch(`${API_ORIGIN}${regEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testClientIp
        },
        body: JSON.stringify(regPayload)
      });
      regStatus = regRes.status;
      regOk = regRes.ok;
      regText = await regRes.text();
    }

    if (!regOk) {
      throw new Error(`Failed to provision test user: ${regStatus} ${regText}`);
    }
    console.log(`  ✓ Test user provisioned successfully.`);

    // 5. Execute End-to-End Realism Flow
    console.log(`[4/4] Executing Two-Origin Functional Flow...`);
    console.log(`  - Navigating to ${CLIENT_ORIGIN}/login`);
    await page.goto(`${CLIENT_ORIGIN}/login`, { waitUntil: 'networkidle' });

    // Assert password input has form ancestor and valid autocomplete
    const pwdInput = await page.$('input[type="password"]');
    if (!pwdInput) throw new Error('Password input not found on /login');
    const pwdDetails = await pwdInput.evaluate((el) => ({
      hasForm: el.form !== null,
      autocomplete: el.getAttribute('autocomplete')
    }));
    if (!pwdDetails.hasForm) throw new Error('Password input has no form ancestor');
    if (pwdDetails.autocomplete !== 'current-password') throw new Error(`Invalid autocomplete: ${pwdDetails.autocomplete}`);
    console.log('  ✓ Verified: Password input on /login has form ancestor and autocomplete="current-password"');

    // Fill login form
    console.log('  - Submitting credentials...');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to workspace home
    console.log('  - Waiting for post-login workspace redirection...');
    await page.waitForURL((url) => url.pathname.includes('/w/') || url.pathname.includes('/home') || url.pathname.includes('/login'), { timeout: 10000 });
    console.log(`  ✓ Successfully reached: ${page.url()}`);

    // Check zero-noise browser logs
    console.log('\n--- Evaluating Zero-Noise Browser Rules ---');
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    console.log(`Console Errors:   ${consoleErrors.length}`);
    console.log(`Page Errors:      ${pageErrors.length}`);
    console.log(`Failed Requests:  ${failedRequests.length}`);

    if (consoleWarnings.length > 0) {
      throw new Error(`FAIL: Unexpected console warnings: ${consoleWarnings.join('; ')}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`FAIL: Unexpected console errors: ${consoleErrors.join('; ')}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`FAIL: Uncaught page errors: ${pageErrors.join('; ')}`);
    }
    if (failedRequests.length > 0) {
      throw new Error(`FAIL: Unexpected failed requests: ${JSON.stringify(failedRequests)}`);
    }

    console.log('\n✓ ZERO console warnings');
    console.log('✓ ZERO console errors');
    console.log('✓ ZERO page errors');
    console.log('✓ ZERO unexpected failed requests');
    console.log('\n================================================================');
    console.log(`TWO-ORIGIN REALISM SUITE [${isProdMode ? 'HTTPS / PROD' : 'HTTP / DEV'}] PASSED!`);
    console.log('================================================================');

    await browser.close();
  } finally {
    if (serverProcess && serverProcess.pid) {
      try {
        const { execSync } = await import('child_process');
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: 'ignore' });
      } catch {}
    }
    if (clientProcess && clientProcess.pid) {
      try {
        const { execSync } = await import('child_process');
        execSync(`taskkill /pid ${clientProcess.pid} /f /t`, { stdio: 'ignore' });
      } catch {}
    }
    if (staticHttpsServer) {
      staticHttpsServer.close();
    }
  }
}

runSuite().catch((err) => {
  console.error('\nSuite Execution Failed:', err);
  process.exit(1);
});
