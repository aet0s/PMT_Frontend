const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generateIcons() {
  const publicDir = path.resolve(__dirname, '../public');
  const iconsDir = path.join(publicDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgPath = path.join(publicDir, 'favicon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('favicon.svg not found in public/');
    process.exit(1);
  }

  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const browser = await chromium.launch({ headless: true });

  for (const size of [192, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
            svg { width: ${Math.round(size * 0.85)}px; height: ${Math.round(size * 0.85)}px; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await page.setContent(html);
    const destPath = path.join(iconsDir, `icon-${size}.png`);
    await page.screenshot({ path: destPath, omitBackground: true });
    console.log(`Generated: ${destPath} (${size}x${size})`);
    await page.close();
  }

  await browser.close();
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
