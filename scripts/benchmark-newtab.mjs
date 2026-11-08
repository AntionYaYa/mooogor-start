// Build first. Example:
// PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/benchmark-newtab.mjs /path/to/.output/chrome-mv3
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(moduleName).href : 'playwright-core');
const extension = path.resolve(process.argv[2] ?? '.output/chrome-mv3');
const output = path.resolve(process.argv[3] ?? '/tmp/mooogor-newtab-benchmark.json');
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mooogor-benchmark-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: process.env.HEADED !== '1',
  viewport: { width: 1440, height: 1000 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  // Complete first-install migration before timing normal new-tab opens.
  const setup = await context.newPage();
  await setup.goto(`chrome-extension://${extensionId}/newtab.html`);
  await setup.locator('.website_tile').first().waitFor();
  await setup.close();
  await context.addInitScript(() => {
    const events = [];
    window.__startupBenchmark = { events, inputs: [] };
    const note = (name, detail) => events.push({ name, at: performance.now(), detail });
    const seen = new Set();
    const observer = new MutationObserver(() => {
      for (const [name, selector] of [['input', 'input[name="Search"]'], ['engines', '.engine[data-engine-id]'], ['sites', '.website_tile']]) {
        const element = document.querySelector(selector);
        if (element && !seen.has(element)) {
          seen.add(element);
          note(name);
          if (name === 'input') window.__startupBenchmark.inputs.push(element);
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    // Observe the real API calls without changing their results or timing them artificially.
    if (globalThis.chrome?.runtime?.sendMessage) {
      const original = chrome.runtime.sendMessage.bind(chrome.runtime);
      chrome.runtime.sendMessage = (...args) => {
        if (args[0]?.type === 'ensureConfigReady') note('ensureConfigReady');
        return original(...args);
      };
    }
  });
  const samples = [];
  const errors = [];
  for (const cold of [false, true]) {
    for (let run = 0; run < 8; run++) {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      if (cold) {
        const session = await context.newCDPSession(page);
        await session.send('ServiceWorker.enable');
        await session.send('ServiceWorker.stopAllWorkers');
        await session.detach();
      }
      await page.goto('chrome://newtab/');
      const input = page.locator('input[name="Search"]');
      await input.waitFor();
      await input.fill('startup input retained');
      await page.locator('.engine[data-engine-id]').first().waitFor();
      await page.locator('.website_tile').first().waitFor();
      // Wait for painting and any immediate remounts after configuration settles.
      await page.waitForTimeout(150);
      const sample = await page.evaluate(() => ({
        url: location.href,
        events: window.__startupBenchmark.events.map(({ name, at }) => ({ name, at: Math.round(at * 10) / 10 })),
        inputMounts: window.__startupBenchmark.inputs.length,
        retainedInput: document.querySelector('input[name="Search"]').value,
        firstPaint: performance.getEntriesByType('paint').map(({ name, startTime }) => ({ name, at: Math.round(startTime * 10) / 10 })),
      }));
      assert(sample.url.startsWith(`chrome-extension://${extensionId}/`), 'real new-tab override must be installed');
      samples.push({ cold, run, ...sample });
      await page.close();
    }
  }
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = [false, true].map(cold => {
    const group = samples.filter(sample => sample.cold === cold);
    return {
      mode: cold ? 'service-worker-stopped' : 'warm',
      runs: group.length,
      inputMs: median(group.map(sample => sample.events.find(event => event.name === 'input').at)),
      enginesMs: median(group.map(sample => sample.events.find(event => event.name === 'engines').at)),
      sitesMs: median(group.map(sample => sample.events.find(event => event.name === 'sites').at)),
      retainedInputRuns: group.filter(sample => sample.retainedInput === 'startup input retained').length,
      maxInputMounts: Math.max(...group.map(sample => sample.inputMounts)),
    };
  });
  await fs.writeFile(output, JSON.stringify({ extension, browser: context.browser().version(), summary, errors, samples }, null, 2));
  console.log(JSON.stringify({ output, summary, errors }, null, 2));
} finally {
  await context.close();
  await fs.rm(profile, { recursive: true, force: true });
}
