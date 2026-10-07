import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createPortfolioServer} from '../admin/server.mjs';
import {webpDimensions} from '../admin/webp.mjs';
import {projectDetails} from '../assets/js/detail-data.js';

test('Image uploads save unique WebP assets, preserve originals, and persist paths through JSON saves',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ridho-admin-test-'));
  await fs.mkdir(path.join(root,'data'));await fs.mkdir(path.join(root,'admin'));
  const original=[{id:'demo',title:'Engineer',start:'2025-01',end:null,images:[''],logo:''}];
  const filename=path.join(root,'data/experience.json');await fs.writeFile(filename,JSON.stringify(original));
  const server=createPortfolioServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    const target=path.resolve(root);
    if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith('ridho-admin-test-'))throw new Error('Unexpected test path.');
    await fs.rm(target,{recursive:true,force:true});
  });
  const bytes=await fs.readFile(new URL('../assets/company_icon/bangkit.webp',import.meta.url));
  assert.deepEqual(webpDimensions(bytes),{width:256,height:256});
  const upload=(field,body=bytes,headers={},item='demo')=>fetch(origin+`/admin/api/images/experience/${field}?item=${encodeURIComponent(item)}`,{method:'POST',headers:{'Content-Type':'image/webp',Origin:origin,...headers},body});
  const response=await upload('images');assert.equal(response.status,201);const first=await response.json();
  assert.match(first.path,/^assets\/experience\/demo-images-[a-f0-9-]+\.webp$/);assert.equal(first.width,256);assert.equal(first.height,256);assert.equal(first.bytes,bytes.length);
  assert.deepEqual(await fs.readFile(path.join(root,first.path)),bytes);
  assert.deepEqual(JSON.parse(await fs.readFile(filename,'utf8')),original,'Upload does not overwrite the JSON draft automatically.');
  const second=await(await upload('images')).json();assert.notEqual(first.path,second.path);
  assert.deepEqual(await fs.readFile(path.join(root,first.path)),bytes,'Replacing a photo leaves the previous image available.');
  const previewOf=first.path.split('/').pop();
  const previewUpload=(source=previewOf,body=bytes)=>fetch(origin+`/admin/api/images/experience/images?item=demo&previewOf=${encodeURIComponent(source)}`,{method:'POST',headers:{'Content-Type':'image/webp',Origin:origin},body});
  const previewResponse=await previewUpload();assert.equal(previewResponse.status,201);
  const preview=await previewResponse.json();assert.equal(preview.path,first.path.replace(/\.webp$/,'.preview.webp'));
  assert.deepEqual(await fs.readFile(path.join(root,preview.path)),bytes);
  assert.deepEqual(await fs.readFile(path.join(root,first.path)),bytes,'Thumbnail upload must preserve the full-resolution file.');
  assert.equal((await previewUpload('../outside.webp')).status,400);
  assert.equal((await previewUpload(previewOf.replace('demo-images-','other-images-'))).status,400);
  assert.equal((await previewUpload('demo-images-00000000-0000-0000-0000-000000000000.webp')).status,404);
  const oversized=await fs.readFile(new URL('../assets/images/hero-landscape.webp',import.meta.url));
  assert.equal((await previewUpload(previewOf,oversized)).status,400,'Preview dimensions are limited independently of originals.');
  assert.equal((await previewUpload(previewOf,Buffer.from('not WebP'))).status,400);
  const logo=await(await upload('logo')).json();assert.match(logo.path,/^assets\/company_icon\//);
  const imageResponse=await fetch(origin+'/'+first.path);assert.equal(imageResponse.headers.get('Content-Type'),'image/webp');assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()),bytes);
  const loaded=await(await fetch(origin+'/admin/api/data/experience')).json();
  const edited=[{...original[0],logo:logo.path,images:[{src:first.path,alt:'Uploaded photo'}]}];
  const saved=await fetch(origin+'/admin/api/data/experience',{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({data:edited,revision:loaded.revision})});
  assert.equal(saved.status,200);assert.deepEqual(JSON.parse(await fs.readFile(filename,'utf8')),edited);
  assert.equal((await upload('images',bytes,{'Content-Type':'image/png'})).status,415);
  assert.equal((await upload('images',Buffer.from('not an image'))).status,400);
  assert.equal((await upload('images',Buffer.concat([bytes,Buffer.from('invalid suffix')]))).status,400);
  assert.equal((await upload('unknown')).status,404);
  assert.equal((await upload('constructor')).status,404);
  assert.equal((await upload('images',bytes,{},'../outside')).status,400);
  assert.equal((await upload('images',bytes,{Origin:'https://other.example'})).status,403);
  assert.equal((await fetch(origin+'/admin/api/images/experience/images')).status,405);
  assert.equal((await fetch(origin+'/admin/webp.mjs')).status,404);
});

test('Projects upload and save more than three gallery photos and expose them all to the public detail view',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ridho-admin-test-'));
  await fs.mkdir(path.join(root,'data'));await fs.mkdir(path.join(root,'admin'));
  const original=[{id:'gallery-demo',title:'Gallery demo',images:[]}];
  const filename=path.join(root,'data/projects.json');await fs.writeFile(filename,JSON.stringify(original));
  const server=createPortfolioServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    const target=path.resolve(root);
    if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith('ridho-admin-test-'))throw new Error('Unexpected test path.');
    await fs.rm(target,{recursive:true,force:true});
  });
  const bytes=await fs.readFile(new URL('../assets/company_icon/bangkit.webp',import.meta.url));
  const images=[];
  for(let index=0;index<4;index++) {
    const response=await fetch(origin+'/admin/api/images/projects/images?item=gallery-demo',{method:'POST',headers:{'Content-Type':'image/webp',Origin:origin},body:bytes});
    assert.equal(response.status,201);
    const uploaded=await response.json();images.push({src:uploaded.path,alt:`Photo ${index+1}`});
    assert.deepEqual(await fs.readFile(path.join(root,uploaded.path)),bytes);
  }
  assert.equal(new Set(images.map(photo=>photo.src)).size,4);
  const url=origin+'/admin/api/data/projects',loaded=await(await fetch(url)).json();
  const edited=[{...original[0],images}];
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({data:edited,revision:loaded.revision})});
  assert.equal(saved.status,200);
  assert.deepEqual(JSON.parse(await fs.readFile(filename,'utf8')),edited);
  const reloaded=await(await fetch(url)).json();assert.deepEqual(reloaded.data,edited);
  const publicData=await(await fetch(origin+'/data/projects.json')).json();
  assert.deepEqual(projectDetails(publicData[0]).images,images);
});

test('WebP dimensions are decoded from the existing normalized company logos',async()=>{
  const folder=new URL('../assets/company_icon/',import.meta.url);
  for(const name of (await fs.readdir(folder)).filter(name=>name.endsWith('.webp'))){
    assert.deepEqual(webpDimensions(await fs.readFile(new URL(name,folder))),{width:256,height:256},name);
  }
});
