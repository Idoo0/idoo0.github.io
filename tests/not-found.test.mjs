import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createPortfolioServer} from '../admin/server.mjs';

test('Missing browser pages show the custom 404 while APIs retain JSON errors',async t=>{
  const server=createPortfolioServer({root:fileURLToPath(new URL('../',import.meta.url))});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const headers={Accept:'text/html'};
  const preview=await fetch(origin+'/404.html',{headers});
  assert.equal(preview.status,200);
  const page=await preview.text();
  for(const pathname of ['/nothing','/nothing/deeper/','/nothing/deeper?from=example','/assets/missing.html']) {
    const response=await fetch(origin+pathname,{headers});
    assert.equal(response.status,404);
    assert.match(response.headers.get('content-type'),/^text\/html/);
    assert.equal(await response.text(),page);
  }
  const head=await fetch(origin+'/nothing',{method:'HEAD',headers});
  assert.equal(head.status,404);
  assert.match(head.headers.get('content-type'),/^text\/html/);
  assert.equal(await head.text(),'');
  for(const pathname of ['/admin/api/data/unknown','/admin/api/unknown']) {
    const response=await fetch(origin+pathname,{headers});
    assert.equal(response.status,404);
    assert.match(response.headers.get('content-type'),/^application\/json/);
    assert.ok((await response.json()).error);
  }
  const asset=await fetch(origin+'/assets/missing.js');
  assert.equal(asset.status,404);
  assert.match(asset.headers.get('content-type'),/^application\/json/);
  const home=await fetch(origin+'/');
  assert.equal(home.status,200);
});
