import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function load(relative, browser = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL('../../' + relative, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, browser });
  return exports;
}
test('folder loading reads only ancestors and immediate children', async () => {
  const nodes = { 0: {id:'0',title:''}, 1: {id:'1',parentId:'0',title:'Bar'}, 2:{id:'2',parentId:'1',title:'Folder'}, 3:{id:'3',parentId:'2',title:'Link',url:'https://example.com'} };
  const gets = [], children = [];
  const api = load('src/lib/browser/bookmarks.ts', { bookmarks: {
    get: async id => { gets.push(id); return [nodes[id]]; },
    getChildren: async id => { children.push(id); return Object.values(nodes).filter(n => n.parentId === id); },
    getTree: () => { throw new Error('Full tree must not be loaded'); },
  } });
  const view = await api.getBookmarkFolderView('2');
  assert.deepEqual([...view.path].map(n => n.id), ['0','1','2']);
  assert.deepEqual([...view.node.children].map(n => n.id), ['3']);
  assert.deepEqual(gets, ['2','1','0']);
  assert.deepEqual(children, ['2']);
  const fallback = await api.getBookmarkFolderView('deleted');
  assert.equal(fallback.node.id, '1');
});
test('virtual grid stays bounded and reaches the final item in both layouts', () => {
  const api = load('src/lib/browser/virtualBookmarks.ts');
  for (const list of [false, true]) {
    for (const width of [320, 1000]) {
      const first = api.bookmarkWindow(20000, width, 600, 0, list);
      assert.equal(first.start, 0);
      assert(first.end < 150);
      const last = api.bookmarkWindow(20000, width, 600, first.height - 600, list);
      assert.equal(last.end, 20000);
      assert(last.start > 19800);
    }
  }
});
test('batch reorder moves only selected nodes and preserves other siblings', async () => {
  for (const [selection, anchor, expected] of [
    [['a'],'d',['b','c','a','d','e']],
    [['d','e'],'a',['d','e','a','b','c']],
    [['a','c'],undefined,['b','d','e','a','c']],
    [['b','d'],'e',['a','c','b','d','e']],
  ]) {
    const order=['a','b','c','d','e']; const moves=[];
    const api = load('src/lib/browser/bookmarks.ts', { bookmarks: {
      getChildren: async () => order.map(id => ({id,title:id})),
      move: async (id, {index}) => {
        moves.push(id); const source=order.indexOf(id);
        order.splice(source,1); const destination=index-(source<index?1:0);
        order.splice(destination,0,id); return {id,index:destination,title:id};
      },
    } });
    await api.moveBookmarksBefore(selection,'1',anchor);
    assert.deepEqual(order, expected);
    assert(moves.every(id => selection.includes(id)));
    assert(moves.length <= selection.length);
  }
});
