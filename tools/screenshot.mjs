import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { launchBrowser } from './browser.mjs';

const root = path.resolve(process.cwd());
const url = pathToFileURL(path.join(root, 'index.html')).href;

const browser = await launchBrowser();

const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
});

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[console:${msg.type()}]`, msg.text());
  }
});
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

console.log('loading', url);
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__CASA__, null, { timeout: 60000 });
await page.waitForTimeout(4200);

await page.screenshot({ path: path.join(root, 'preview.png') });
console.log('saved preview.png');

await page.evaluate(() => window.__CASA__.setModeInstant(true));
await page.waitForTimeout(1600);
await page.screenshot({ path: path.join(root, 'preview-night.png') });
console.log('saved preview-night.png');

// close-up, architecture detail
await page.evaluate(() => {
  const { camera, controls } = window.__CASA__;
  camera.position.set(9.5, 5.2, 12.5);
  controls.target.set(-1.2, 3.1, -1.0);
  controls.update();
});
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(root, 'preview-detail.png') });
console.log('saved preview-detail.png');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(root, 'preview-mobile.png') });
console.log('saved preview-mobile.png');

const metrics = await page.evaluate(() => ({
  webgl: !!document.querySelector('canvas'),
  drawCalls: window.__CASA__.renderer.info.render.calls,
  triangles: window.__CASA__.renderer.info.render.triangles,
  textures: window.__CASA__.renderer.info.memory.textures,
  geometries: window.__CASA__.renderer.info.memory.geometries,
}));
console.log(metrics);

await browser.close();
