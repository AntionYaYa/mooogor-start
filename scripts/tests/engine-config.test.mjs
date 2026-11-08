import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../..');
const codeCache = new Map();
function harness(initial) {
  let data = initial ? structuredClone(initial) : {};
  const writes = [];
  const reads = [];
  const cache = new Map();
  const browser = {
    runtime: { getURL: value => `chrome-extension://test/${value}` },
    storage: { local: {
      get: async keys => {
        reads.push(keys);
        return structuredClone(keys == null ? data : Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).filter(key => key in data).map(key => [key, data[key]]),
        ));
      },
      set: async parts => { writes.push(structuredClone(parts)); Object.assign(data, structuredClone(parts)); },
      remove: async key => { delete data[key]; },
    } },
  };
  const background = { PRESET_BACKGROUNDS: [], cloneBackgroundItem: x => x, normalizeBackgroundItems: x => x ?? [] };
  const table = { toArray: async () => [], clear: async () => {} };
  const mocks = {
    'wxt/browser': { browser },
    'src/lib/background/background.ts': background,
    'src/lib/storage/localStorageHealth.ts': { clearLocalStorageWriteFailure: async () => {}, reportLocalStorageWriteFailure: async () => {} },
    'src/lib/utils/i18n.ts': { t: key => key, getEffectiveLanguage: lang => lang === 'auto' || !lang ? 'en' : lang },
    'src/lib/utils/settings.ts': { DEFAULT_SETTINGS: {} },
    'src/lib/config/defaultWebSites.ts': { buildDefaultWebSites: () => [] },
    'src/lib/DB/websiteScreenshots.ts': { clearWebSiteScreenshots: async () => {} },
    'src/lib/DB/database.ts': { db: {
      webSites: table, webSiteFolders: table, engines: table, engineCategories: table, settings: table,
      transaction: async (...args) => args.at(-1)(),
    } },
  };
  function load(relative) {
    if (relative in mocks) return mocks[relative];
    if (cache.has(relative)) return cache.get(relative);
    const file = path.join(root, relative);
    if (relative.endsWith('.json')) return { default: JSON.parse(fs.readFileSync(file, 'utf8')) };
    if (!codeCache.has(relative)) codeCache.set(relative, ts.transpileModule(fs.readFileSync(file, 'utf8') + (relative === 'src/lib/sync/dataSync.ts' ? '\nexport { applyRemoteData, buildSyncedData };' : ''), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
    const exports = {};
    cache.set(relative, exports);
    vm.runInNewContext(codeCache.get(relative), {
      exports, structuredClone, queueMicrotask, console, URL, crypto: globalThis.crypto,
      require: name => {
        if (name in mocks) return mocks[name];
        let resolved = name.startsWith('@/') ? `src/${name.slice(2)}` : path.posix.join(path.posix.dirname(relative), name);
        if (!path.extname(resolved)) resolved += '.ts';
        return load(resolved);
      },
    }, { filename: file });
    return exports;
  }
  return { load, writes, reads, snapshot: () => structuredClone(data) };
}
const keys = {
  engines: 'mooogor.engines.v1', categories: 'mooogor.engine-categories.v1', metadata: 'mooogor.metadata.v1',
};
function fixture(engines = [{ id: 1, category: 'a', enabled: true }, { id: 2, category: 'a', enabled: true }]) {
  return {
    'mooogor.websites.v1': [], [keys.engines]: engines,
    [keys.categories]: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], [keys.metadata]: {},
    'mooogor.config-migration.v1': { status: 'completed', source: 'fresh', completedAt: 1 },
  };
}

test('concurrent disabling can disable every engine, and errors do not block later writes', async () => {
  const h = harness(fixture());
  const engines = h.load('src/lib/DB/engines.ts');
  await Promise.all([engines.setEngineEnabled(1, false), engines.setEngineEnabled(2, false)]);
  assert.equal(h.snapshot()[keys.engines].filter(x => x.enabled).length, 0);
  await assert.rejects(engines.setEngineEnabled(999, true), /does not exist/);
  await engines.setEngineEnabled(1, true);
  assert.equal(h.snapshot()[keys.engines].filter(x => x.enabled).length, 1);
});

test('delete, edit, batch state, and move can empty an active category without removing it', async () => {
  for (const action of [
    e => e.deleteEngine(1),
    e => e.updateEngine({ id: 1, category: 'a', enabled: false }),
    e => e.updateEngineCategory(1, 'b'),
    e => e.updateEnginesLayout([{ id: 1, category: 'b' }]),
    e => e.updateEnginesState([], [{ id: 1 }]),
  ]) {
    const h = harness(fixture([{ id: 1, category: 'a', enabled: true }]));
    await action(h.load('src/lib/DB/engines.ts'));
    assert.equal(h.snapshot()[keys.engines].filter(e => e.category === 'a' && e.enabled).length, 0);
    assert.ok(h.snapshot()[keys.categories].some(c => c.id === 'a'));
  }
});

test('batch deletion removes all selected engines in a single write', async () => {
  const h = harness(fixture());
  await h.load('src/lib/DB/engines.ts').deleteEngines([1, 2]);
  assert.equal(h.snapshot()[keys.engines].length, 0);
  assert.equal(h.writes.length, 1);
  assert.equal(h.snapshot()[keys.categories].length, 2);
});

test('whole-category deletion is allowed, but the final category is protected', async () => {
  const h = harness(fixture()); const c = h.load('src/lib/DB/engineCategories.ts');
  await c.deleteEngineCategory('a');
  assert.equal(h.snapshot()[keys.engines].length, 0);
  assert.equal(h.snapshot()[keys.categories].length, 1);
  await assert.rejects(c.deleteEngineCategory('b'), /At least one search category/);
});

test('startup and unrelated settings writes preserve all-disabled configurations exactly', async () => {
  const old = fixture([{ id: 1, category: 'a', enabled: false }]); const h = harness(old);
  await h.load('src/lib/DB/configMigration.ts').initializeStoredConfig();
  await h.load('src/lib/DB/defaultSearchConfig.ts').initializeDefaultSearchConfig([{ id: '1', name: 'General' }], [{ category: '1', enabled: true }]);
  await h.load('src/lib/DB/configStorage.ts').updateStoredConfig(c => { c.metadata.preference = 'new'; });
  assert.deepEqual(h.snapshot()[keys.engines], old[keys.engines]);
  assert.deepEqual(h.snapshot()[keys.categories], old[keys.categories]);
});

test('sync-style configuration replacement preserves incoming disabled states', async () => {
  const h = harness(fixture());
  await h.load('src/lib/DB/configStorage.ts').updateStoredConfig(c => {
    c.engines = [{ id: 1, category: 'a', enabled: false }];
  });
  assert.equal(h.snapshot()[keys.engines][0].enabled, false);
});

test('fresh install and reset use valid defaults in every language', async () => {
  for (const language of ['en', 'zh_CN', 'zh_TW']) {
    const h = harness();
    await h.load('src/lib/DB/configMigration.ts').initializeFreshStoredConfig();
    const categories = h.load('src/lib/config/engineCategories.ts').buildDefaultEngineCategories();
    const engines = h.load('src/lib/DB/defaultEnginesFactory.ts').buildDefaultEngines(language);
    await h.load('src/lib/DB/defaultSearchConfig.ts').initializeDefaultSearchConfig(categories, engines);
    for (const category of categories) assert.ok(h.snapshot()[keys.engines].some(e => e.category === category.id && e.enabled));
    await h.load('src/lib/DB/configStorage.ts').updateStoredConfig(c => { c.metadata.preference = 'keep'; });
    await h.load('src/lib/DB/resetSearchEngines.ts').resetSearchEnginesToDefault(categories, engines);
    assert.equal(h.snapshot()[keys.metadata].preference, 'keep');
    assert.equal(h.snapshot()[keys.engines].length, 37);
    await h.load('src/lib/DB/configRecovery.ts').resetConfigurationToDefaults(language);
    assert.equal(h.snapshot()[keys.metadata].settings.language, language);
    assert.equal(h.snapshot()[keys.engines].length, 37);
  }
});

test('reset replaces custom categories and engines atomically without editing restrictions', async () => {
  const h = harness(fixture());
  await h.load('src/lib/DB/resetSearchEngines.ts').resetSearchEnginesToDefault(
    [{ id: '1', name: 'General' }], [{ title: 'Default', engineUrl: 'https://example.com/?q=%s', category: '1', enabled: true }],
  );
  assert.equal(h.writes.length, 1);
  assert.ok(keys.categories in h.writes[0] && keys.engines in h.writes[0]);
  assert.equal(h.snapshot()[keys.engines][0].title, 'Default');
});


test('restart preserves an empty user category and does not resurrect preset engines', async () => {
  const h = harness(fixture());
  await h.load('src/lib/DB/engineCategories.ts').deleteEngineCategory('a');
  const before = h.snapshot();
  await h.load('src/lib/DB/defaultSearchConfig.ts').initializeDefaultSearchConfig(
    [{ id: '1', name: 'General' }], [{ category: '1', enabled: true }],
  );
  assert.deepEqual(h.snapshot(), before);
});

test('reset assigns new identities and rejects a stale editor without changing new defaults', async () => {
  const h = harness(fixture());
  const oldIds = new Set(h.snapshot()[keys.engines].map(e => e.id));
  await h.load('src/lib/DB/resetSearchEngines.ts').resetSearchEnginesToDefault(
    [{ id: 'a', name: 'A' }], [{ title: 'New default', category: 'a', enabled: true }],
  );
  const before = h.snapshot();
  assert.ok(before[keys.engines].every(e => !oldIds.has(e.id)));
  await assert.rejects(h.load('src/lib/DB/engines.ts').updateEngine({ id: 1, title: 'Stale edit', category: 'a' }), /does not exist/);
  assert.deepEqual(h.snapshot(), before);
  await h.load('src/lib/DB/configRecovery.ts').resetConfigurationToDefaults('en');
  const newIds = new Set(before[keys.engines].map(e => e.id));
  assert.ok(h.snapshot()[keys.engines].every(e => !newIds.has(e.id)));
});

test('deleted category cannot receive new, edited, or moved engines from stale windows', async () => {
  const h = harness(fixture([{ id: 1, category: 'a', enabled: true }, { id: 2, category: 'b', enabled: true }]));
  await h.load('src/lib/DB/engineCategories.ts').deleteEngineCategory('a');
  const before = h.snapshot(); const e = h.load('src/lib/DB/engines.ts');
  for (const action of [
    () => e.addEngine({ title: 'Orphan', category: 'a' }),
    () => e.updateEngine({ id: 2, title: 'Orphan', category: 'a' }),
    () => e.updateEngineCategory(2, 'a'),
    () => e.updateEnginesLayout([{ id: 2, category: 'a' }]),
  ]) await assert.rejects(action(), /category no longer exists/);
  assert.deepEqual(h.snapshot(), before);
});

test('deleting the highest ID and adding another engine does not reuse sequential IDs', async () => {
  const h = harness(fixture()); const e = h.load('src/lib/DB/engines.ts');
  await e.deleteEngine(2);
  const id = await e.addEngine({ title: 'New', category: 'a' });
  assert.ok(Number.isSafeInteger(id) && id > 0);
  assert.notEqual(id, 1); assert.notEqual(id, 2);
});

test('same-address engines have separate IDs and persist selection independently', async () => {
  const h = harness(fixture([])); const e = h.load('src/lib/DB/engines.ts');
  const draft = { title: 'Same address', category: 'a', engineUrl: 'https://example.com/?q=%s', enabled: true };
  const first = await e.addEngine(draft); const second = await e.addEngine(draft);
  assert.notEqual(first, second);
  const ui = h.load('src/lib/search/searchStorage.ts');
  await ui.hydrateSearchStorage();
  ui.persistSelectedEngineId(second, 'a');
  await new Promise(setImmediate);
  assert.equal(ui.readSelectedEngineId('a'), second);
  const reopened = harness(h.snapshot()).load('src/lib/search/searchStorage.ts');
  await reopened.hydrateSearchStorage();
  assert.equal(reopened.readSelectedEngineId('a'), second);
});

test('category editor can rename A to B and back to A in one open dialog', async () => {
  const component = fs.readFileSync(path.join(root, 'src/lib/ManageEngineCategories.svelte'), 'utf8');
  const script = component.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1];
  const renamed = [];
  const props = { categories: [{ id: 'a', name: 'A' }], onRename: async (id, name) => renamed.push(name) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(script + '\nexport { setDraftName, handleCategoryBlur }; export const getDrafts = () => draftCategories;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, $state: x => x, $props: () => props, require: () => ({ t: key => key }), console });
  exports.setDraftName('a', 'B');
  await exports.handleCategoryBlur(exports.getDrafts()[0]);
  exports.setDraftName('a', 'A');
  await exports.handleCategoryBlur(exports.getDrafts()[0]);
  assert.deepEqual(renamed, ['B', 'A']);
  assert.equal(exports.getDrafts()[0].name, 'A');
});


test('concurrent partial reads share one storage call and omit unrelated data', async () => {
  const h = harness(fixture());
  const config = h.load('src/lib/DB/configStorage.ts');
  const [engines, metadata] = await Promise.all([
    config.getStoredConfigParts('engines'), config.getStoredConfigParts('metadata'),
  ]);
  assert.equal(engines.engines.length, 2);
  assert.deepEqual(Object.keys(metadata), ['metadata']);
  assert.equal(h.reads.length, 1);
  assert.deepEqual([...h.reads[0]].sort(), [keys.engines, keys.metadata, 'mooogor.config-migration.v1'].sort());
  await config.updateStoredConfig(value => { value.engines = []; });
  assert.equal((await config.getStoredConfigParts('engines')).engines.length, 0);
});

test('partial reads reject uninitialized and invalid stores and allow legacy optional folders', async () => {
  const empty = harness();
  await assert.rejects(empty.load('src/lib/DB/configStorage.ts').getStoredConfigParts('engines'), /not ready/);
  const data = fixture(); delete data[keys.engines];
  const invalid = harness(data);
  await assert.rejects(invalid.load('src/lib/DB/configStorage.ts').getStoredConfigParts('engines'), /Invalid configuration/);
  const valid = harness(fixture());
  assert.equal((await valid.load('src/lib/DB/configStorage.ts').getStoredConfigParts('websiteFolders')).websiteFolders.length, 0);
});

test('sync does not overwrite edits made while its remote snapshot was loading', async () => {
  const h = harness(fixture());
  const config = h.load('src/lib/DB/configStorage.ts');
  const sync = h.load('src/lib/sync/dataSync.ts');
  const expected = JSON.stringify(sync.buildSyncedData(await config.getStoredConfig()));
  await config.updateStoredConfig(value => { value.engines[0].title = 'Local edit'; });
  const before = h.snapshot();
  const remote = { manifest: { contentHash: 'remote' }, data: {
    websites: [], websiteFolders: [], engines: [], engineCategories: [], settings: {},
  } };
  assert.equal(await sync.applyRemoteData(remote, expected), null);
  assert.deepEqual(h.snapshot(), before);
  // A conflict must not mark the remote hash as applied: retry remains possible.
  const latest = JSON.stringify(sync.buildSyncedData(await config.getStoredConfig()));
  assert.equal(await sync.applyRemoteData(remote, latest), true);
  assert.equal(h.snapshot()[keys.engines].length, 0);
});


test('settings-only transaction reads and writes only metadata and respects full-write ordering', async () => {
  const h = harness(fixture()); const config = h.load('src/lib/DB/configStorage.ts');
  await config.updateStoredMetadata(metadata => { metadata.settings = { language: 'en' }; });
  assert.deepEqual([...h.reads[0]].sort(), [keys.metadata, 'mooogor.config-migration.v1'].sort());
  assert.deepEqual(Object.keys(h.writes[0]), [keys.metadata]);
  await Promise.all([
    config.updateStoredMetadata(metadata => { metadata.settings.theme = 'ocean'; }),
    config.updateStoredConfig(value => { value.engines = []; }),
  ]);
  assert.equal(h.snapshot()[keys.metadata].settings.theme, 'ocean');
  assert.equal(h.snapshot()[keys.engines].length, 0);
});
