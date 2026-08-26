import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

/** 图标用听力那一格的主色（#2a78d6），和应用里的科目色是同一套。 */
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <circle cx="256" cy="200" r="86" fill="none" stroke="#2a78d6" stroke-width="30"/>
  <path d="M256 286 V400" stroke="#2a78d6" stroke-width="30" stroke-linecap="round"/>
  <path d="M150 400 h212" stroke="#eda100" stroke-width="30" stroke-linecap="round"/>
</svg>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0">${svg(size)}</body>`,
    { waitUntil: 'load' },
  );
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(`public/icon-${size}.png`, buf);
  await page.close();
  console.log(`public/icon-${size}.png`);
}
await browser.close();
await writeFile('public/favicon.svg', svg(512).trim());
console.log('public/favicon.svg');
