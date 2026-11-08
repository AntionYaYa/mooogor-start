// Manual real-extension regression: build, then run with PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright-core');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'bookmark-browser-'));
const extension=path.join(root,'extension');
await fs.cp(path.resolve('.output/chrome-mv3'),extension,{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(extension,'manifest.json')));
manifest.permissions.push('bookmarks');manifest.optional_permissions=manifest.optional_permissions.filter(p=>p!=='bookmarks');
await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
const context=await chromium.launchPersistentContext(path.join(root,'profile'),{channel:'chromium',headless:true,viewport:{width:1440,height:1000},args:[`--load-extension=${extension}`,`--disable-extensions-except=${extension}`]});
try {
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const setup=await context.newPage();await setup.goto(`chrome-extension://${id}/newtab.html`);await setup.locator('.website_tile').first().waitFor();
 const seeded=await setup.evaluate(async()=>{
  await chrome.storage.sync.set({'mooogor.data-sync-enabled.v1':{enabled:false}});
  const nodes=[];for(let offset=0;offset<500;offset+=100)nodes.push(...await Promise.all(Array.from({length:100},(_,i)=>chrome.bookmarks.create({parentId:'1',title:`Item ${offset+i}`,url:`https://github.com/bookmark/${offset+i}`}))));
  const folder=await chrome.bookmarks.create({parentId:'1',title:'Child folder'});await chrome.bookmarks.create({parentId:folder.id,title:'Inside',url:'https://github.com/inside'});
  const metadata=(await chrome.storage.local.get('mooogor.metadata.v1'))['mooogor.metadata.v1'];
  await chrome.storage.local.set({'mooogor.metadata.v1':{...metadata,settings:{...metadata.settings,language:'en',defaultOpen:'bookmark',defaultBookmarkFolderId:'1',autoFocusSearch:false}}});
  return {first:nodes[0].id,last:nodes[499].id,second:nodes[1].id,third:nodes[2].id,folder:folder.id};
 });
 await setup.close();
 await context.addInitScript(()=>{window.__treeReads=0;const original=chrome.bookmarks.getTree.bind(chrome.bookmarks);chrome.bookmarks.getTree=(...args)=>{window.__treeReads++;return original(...args)}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('chrome://newtab/');await page.locator('[data-bookmark-id]').first().waitFor();
 const row=id=>page.locator(`[data-bookmark-id="${id}"]`);
 const bounded=async()=>assert(await page.locator('[data-bookmark-id]').count()<150);
 await bounded();assert.equal(await page.evaluate(()=>window.__treeReads),0);
 await row(seeded.first).locator('a').focus();await page.keyboard.press('End');
 await row(seeded.folder).waitFor();await bounded();
 assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-bookmark-id]')?.dataset.bookmarkId),seeded.folder);
 await page.keyboard.press('Home');await row(seeded.first).waitFor();await bounded();
 // Native drag along the edge reorders rather than combining the icon centers.
 const source=await row(seeded.first).boundingBox();const target=await row(seeded.third).boundingBox();
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
 await page.mouse.down();await page.mouse.move(source.x+source.width/2+12,source.y+source.height/2,{steps:5});
 await page.mouse.move(target.x+target.width-5,target.y+target.height-5,{steps:12});await page.mouse.up();
 await page.waitForFunction(async first=>(await chrome.bookmarks.getChildren('1'))[0].id!==first,seeded.first,{timeout:5000});
 assert.equal(await page.evaluate(async()=> (await chrome.bookmarks.getChildren('1'))[0].title),'Item 1');
 // Scroll to the last folder, open it and return via Escape.
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});await row(seeded.folder).waitFor();
 await row(seeded.folder).getByRole('button').click();await page.getByText('Inside',{exact:true}).waitFor();
 await page.keyboard.press('Escape');await row(seeded.folder).waitFor();await bounded();
 await row(seeded.folder).getByRole('button').focus();await page.keyboard.press('Home');await row(seeded.second).waitFor();
 // Switch to list layout; keyboard navigation still reaches the final entry.
 await page.getByRole('button').filter({has:page.locator('svg')}).count();
 await page.locator('.tabs .side-right button').last().click();
 await row(seeded.second).locator('a').focus();await page.keyboard.press('End');await row(seeded.folder).waitFor();await bounded();
 // Multi-select uses original absolute indices even across virtual windows.
 await page.keyboard.press('Home');await row(seeded.second).locator('a').click({button:'right'});
 await page.getByRole('button',{name:'Multi-select',exact:true}).click();
 await page.locator('.batch_bar').waitFor({state:'visible'});
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});await row(seeded.last).waitFor();
 await row(seeded.last).locator('.bkmk_h').click({modifiers:['Shift']});
 const countText=await page.locator('.batch_bar').innerText();assert(countText.includes('500'),countText);
 await page.keyboard.press('Escape');
 // A drag source remains mounted while a virtual window scrolls to the end.
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=0});await row(seeded.second).waitFor();
 const from=await row(seeded.second).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 await page.mouse.move(from.x+from.width/2+15,from.y+from.height/2,{steps:5});
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});await row(seeded.last).waitFor();
 assert.equal(await row(seeded.second).count(),1,'source stays mounted across virtual windows');
 const to=await row(seeded.last).boundingBox();
 await page.mouse.move(to.x+to.width-5,to.y+to.height-5,{steps:15});await page.mouse.up();
 await page.waitForFunction(async moved=>{const order=await chrome.bookmarks.getChildren('1');return order[order.length-2].id===moved},seeded.second);
 // Dropping on another bookmark's icon still combines them into a folder.
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=0});await row(seeded.third).waitFor();
 const a=await row(seeded.third).boundingBox();const b=await row(seeded.first).boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
 await page.mouse.move(a.x+a.width/2+15,a.y+a.height/2,{steps:5});
 await page.mouse.move(b.x+20,b.y+b.height/2,{steps:15});await page.mouse.up();
 await page.waitForFunction(async ids=>{const [a,b]=await chrome.bookmarks.get(ids);return a.parentId===b.parentId&&a.parentId!=='1'},[seeded.third,seeded.first]);
 // Multi-drag across windows into an existing folder moves the entire selection.
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=0});
 const selected=await page.evaluate(async()=>{const rows=await chrome.bookmarks.getChildren('1');return rows.filter(row=>row.title==='Item 3'||row.title==='Item 4').map(row=>row.id)});
 await row(selected[0]).locator('a').click({button:'right'});await page.getByRole('button',{name:'Multi-select',exact:true}).click();await page.locator('.batch_bar').waitFor({state:'visible'});
 await row(selected[1]).locator('.bkmk_h').click({modifiers:['Shift']});
 assert((await page.locator('.batch_bar').innerText()).includes('2'));
 const start=await row(selected[0]).boundingBox();
 await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(start.x+start.width/2+15,start.y+start.height/2,{steps:5});
 await page.locator('.bookmark_scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});await row(seeded.folder).waitFor();
 const finish=await row(seeded.folder).boundingBox();await page.mouse.move(finish.x+20,finish.y+finish.height/2,{steps:15});await page.mouse.up();
 await page.waitForFunction(async ({selected,folder})=>(await chrome.bookmarks.get(selected)).every(node=>node.parentId===folder),{selected,folder:seeded.folder});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['bounded grid/list','no full tree read','keyboard end/home','native drag persistence','drag across virtual windows','combine bookmarks','folder/back scroll restoration','cross-window shift selection','multi-drag into folder'],errors}));
} finally {await context.close();await fs.rm(root,{recursive:true,force:true})}
