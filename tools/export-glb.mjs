import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { launchBrowser } from './browser.mjs';

const root = path.resolve(process.cwd());
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, acceptDownloads: true });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('console error:', msg.text());
});
await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__CASA__);
await page.waitForTimeout(1500);

const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
const size = await page.evaluate(() => window.__CASA__.downloadGLB('casa-serena.glb'));
console.log('reported size', size);
const download = await downloadPromise;
const dest = path.join(root, 'casa-serena.glb');
await download.saveAs(dest);
console.log('saved', dest);
await browser.close();
