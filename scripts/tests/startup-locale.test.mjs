import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function localeHarness(fetcher) {
  const state = { language: 'auto', messages: null };
  const exports = {};
  const browser = {
    runtime: { getURL: path => path },
    i18n: { getUILanguage: () => 'en', getMessage: key => key },
  };
  const source = fs.readFileSync(new URL('../../src/lib/utils/i18n.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, fetch: fetcher, console,
    require: name => name === 'wxt/browser' ? { browser } : { localeState: state },
  });
  return exports;
}
const response = message => ({ ok: true, json: async () => ({ greeting: { message } }) });

test('startup language requests reuse in-flight and completed locale data', async () => {
  let requests = 0;
  const locale = localeHarness(async () => { requests++; return response('Hello'); });
  await Promise.all([locale.setLanguage('auto'), locale.setLanguage('en')]);
  await locale.setLanguage('en');
  assert.equal(requests, 1);
  assert.equal(locale.t('greeting'), 'Hello');
});

test('slower locale response cannot replace a newer language choice', async () => {
  let finishEnglish;
  const locale = localeHarness(url => url.includes('/en/')
    ? new Promise(resolve => { finishEnglish = resolve; })
    : Promise.resolve(response('你好')));
  const english = locale.setLanguage('en');
  await locale.setLanguage('zh_CN');
  finishEnglish(response('Hello'));
  await english;
  assert.equal(locale.t('greeting'), '你好');
  assert.equal(locale.getLanguage(), 'zh_CN');
});

test('failed locale request retains visible text and can be retried', async () => {
  let fail = true;
  const locale = localeHarness(async url => {
    if (url.includes('/en/')) return response('Hello');
    if (fail) throw new Error('Temporary failure');
    return response('你好');
  });
  await locale.setLanguage('en');
  await locale.setLanguage('zh_CN');
  assert.equal(locale.t('greeting'), 'Hello');
  fail = false;
  await locale.setLanguage('zh_CN');
  assert.equal(locale.t('greeting'), '你好');
});
