// Requires a production build and PLAYWRIGHT_MODULE pointing to playwright-core/index.mjs.
// All generated data and additional test permissions live in disposable profiles/build copies.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const extension = path.resolve(process.argv[2] ?? '.output/chrome-mv3');
const output = path.resolve(process.argv[3] ?? '/tmp/mooogor-volume.json');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mooogor-volume-'));
const copy = path.join(temporary, 'extension');
await fs.cp(extension, copy, { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(copy, 'manifest.json'), 'utf8'));
manifest.permissions = [...new Set([...manifest.permissions, 'bookmarks', 'history'])];
manifest.optional_permissions = (manifest.optional_permissions ?? []).filter(p => !['bookmarks', 'history'].includes(p));
await fs.writeFile(path.join(copy, 'manifest.json'), JSON.stringify(manifest));
const tiers = [
  { sites: 20, engines: 20, bookmarks: 200, history: 1000 },
  { sites: 500, engines: 100, bookmarks: 5000, history: 10000 },
  { sites: 2000, engines: 300, bookmarks: 20000, history: 30000 },
];
const results = [];
try {
  for (const [tier, counts] of tiers.entries()) {
    console.log('seeding', JSON.stringify(counts));
    const context = await chromium.launchPersistentContext(path.join(temporary, `profile-${tier}`), {
      channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${copy}`, `--load-extension=${copy}`],
    });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const id = new URL(worker.url()).host;
      const setup = await context.newPage();
      await setup.goto(`chrome-extension://${id}/newtab.html`);
      await setup.locator('.website_tile').first().waitFor();
      await setup.evaluate(async counts => {
        await chrome.storage.sync.set({ 'mooogor.data-sync-enabled.v1': { enabled: false } });
        const folder = { id: '1' };
        // One large folder intentionally tests worst-case list rendering.
        const batch = async (count, create) => {
          for (let offset = 0; offset < count; offset += 100) {
            await Promise.all(Array.from({ length: Math.min(100, count - offset) }, (_, index) => create(offset + index)));
          }
        };
        await batch(counts.bookmarks, i => chrome.bookmarks.create({ parentId: folder.id, title: `Benchmark ${i}`, url: `https://github.com/volume/bookmark/${i}` }));
        await batch(counts.history, i => chrome.history.addUrl({ url: `https://github.com/volume/history/${i}` }));
        const stored = await chrome.storage.local.get('mooogor.metadata.v1');
        const metadata = stored['mooogor.metadata.v1'];
        await chrome.storage.local.set({
          'mooogor.websites.v1': Array.from({ length: counts.sites }, (_, i) => ({ id: i + 1, domain: 'github.com', title: `Site ${i}`, url: `https://github.com/volume/site/${i}`, order: i })),
          'mooogor.website-folders.v1': [],
          'mooogor.engines.v1': Array.from({ length: counts.engines }, (_, i) => ({ id: i + 1, title: `Engine ${i}`, category: 'volume', enabled: true, engineUrl: `https://github.com/search?q=%s&engine=${i}`, order: i })),
          'mooogor.engine-categories.v1': [{ id: 'volume', name: 'Benchmark', order: 0 }],
          'mooogor.metadata.v1': { ...metadata, settings: { ...metadata.settings, defaultOpen: 'common', lastOpenTab: 'common', defaultBookmarkFolderId: folder.id, lastBookmarkFolderId: folder.id, autoFocusSearch: false, searchBookmarks: true, searchHistory: true } },
        });
      }, counts);
      await setup.close();
      await context.addInitScript(() => {
        window.__volume = { events: [], tasks: [] };
        const observer = new MutationObserver(() => {
          for (const [name, selector] of [['input', 'input[name="Search"]'], ['sites', '.website_tile'], ['engines', '.engine[data-engine-id]'], ['bookmarks', '[data-bookmark-id]'], ['history', '.history_group a.item']]) {
            if (!window.__volume.events.some(e => e.name === name) && document.querySelector(selector)) window.__volume.events.push({ name, at: performance.now() });
          }
        });
        observer.observe(document, { childList: true, subtree: true });
        new PerformanceObserver(list => window.__volume.tasks.push(...list.getEntries().map(t => ({ start: t.startTime, duration: t.duration })))).observe({ type: 'longtask', buffered: true });
      });
      const runs = [];
      const errors = [];
      for (let run = 0; run < 3; run++) {
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto('chrome://newtab/');
        await page.locator('input[name="Search"]').waitFor();
        const before = performance.now();
        await page.locator('input[name="Search"]').fill('typing');
        const fillMs = performance.now() - before;
        await page.locator('.website_tile').first().waitFor();
        await page.locator('.engine[data-engine-id]').first().waitFor();
        await page.waitForTimeout(250);
        const startup = await page.evaluate(() => ({ ...window.__volume, domNodes: document.querySelectorAll('*').length, siteNodes: document.querySelectorAll('.website_tile').length }));
        // Clear search before testing other tabs.
        await page.locator('input[name="Search"]').fill('');
        const bookmarkStart = await page.evaluate(() => { const start = performance.now(); document.querySelectorAll('.tabs .center button')[1].click(); return start; });
        await page.locator('[data-bookmark-id]').first().waitFor();
        const bookmarks = await page.evaluate(start => ({ ms: performance.now() - start, rows: document.querySelectorAll('[data-bookmark-id]').length }), bookmarkStart);
        await page.evaluate(() => document.querySelectorAll('.tabs .center button')[0].click());
        await page.locator('.website_tile').first().waitFor();
        await page.waitForTimeout(250);
        const historyStart = await page.evaluate(() => { const start = performance.now(); document.querySelectorAll('.tabs .center button')[2].click(); return start; });
        await page.locator('.history_group a.item').first().waitFor();
        const history = await page.evaluate(start => ({ ms: performance.now() - start, rows: document.querySelectorAll('.history_group a.item').length }), historyStart);
        runs.push({ fillMs, startup, bookmarks, history });
        await page.close();
      }
      const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const result = { counts, summary: {
        inputMs: median(runs.map(r => r.startup.events.find(e => e.name === 'input').at)),
        sitesMs: median(runs.map(r => r.startup.events.find(e => e.name === 'sites').at)),
        enginesMs: median(runs.map(r => r.startup.events.find(e => e.name === 'engines').at)),
        fillMs: median(runs.map(r => r.fillMs)),
        maxStartupTaskMs: Math.max(...runs.flatMap(r => r.startup.tasks.map(t => t.duration)), 0),
        domNodes: median(runs.map(r => r.startup.domNodes)),
        bookmarkOpenMs: median(runs.map(r => r.bookmarks.ms)),
        bookmarkRows: median(runs.map(r => r.bookmarks.rows)),
        historyOpenMs: median(runs.map(r => r.history.ms)),
        historyRows: median(runs.map(r => r.history.rows)),
      }, errors, runs };
      results.push(result); console.log(JSON.stringify(result.summary));
      await fs.writeFile(output, JSON.stringify({ extension, notes: ['Real extension APIs. Test-copy manifest pregrants bookmarks/history.', 'Sync disabled. Built-in GitHub icons; no screenshot blobs or remote image network.', 'All sites and bookmarks in one folder/root, all history added today.', 'Three warm runs per tier; navigation timings, not physical + click.', 'Fill timing includes automation overhead; long-task measurements are separate.'], results }, null, 2));
    } finally { await context.close(); }
  }
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
