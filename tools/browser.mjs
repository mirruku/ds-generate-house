import { chromium } from 'playwright-core';

/**
 * Launch a local Chromium-based browser without hard-coding an install path.
 *
 * Resolution order:
 *   1. BROWSER_PATH   — explicit executable path (useful on CI or unusual installs)
 *   2. BROWSER_CHANNEL — e.g. "msedge" or "chrome"
 *   3. Playwright's installed Edge channel
 *   4. Playwright's installed Chrome channel
 */
export async function launchBrowser() {
  const args = [
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--allow-file-access-from-files',
  ];

  if (process.env.BROWSER_PATH) {
    return chromium.launch({
      executablePath: process.env.BROWSER_PATH,
      headless: true,
      args,
    });
  }

  const channels = [
    process.env.BROWSER_CHANNEL,
    'msedge',
    'chrome',
  ].filter(Boolean);

  let lastError;
  for (const channel of [...new Set(channels)]) {
    try {
      return await chromium.launch({ channel, headless: true, args });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    'No Chromium-based browser found. Install Edge/Chrome, or set ' +
      'BROWSER_PATH to the browser executable (or BROWSER_CHANNEL=msedge). ' +
      `Last error: ${lastError?.message ?? 'unknown'}`
  );
}
