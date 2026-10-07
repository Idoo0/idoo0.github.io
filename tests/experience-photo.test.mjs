import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {experiencePhotos} from '../assets/js/experience-photo-data.js';
import {collections,validateCollection} from '../admin/schema.js';
import {createPortfolioServer} from '../admin/server.mjs';

test('Experience collages keep populated photos and links while hiding empty slots without changing saved data',()=>{
  const images=['assets/experience/photo.webp',{mode:'link',src:'assets/experience/repo.webp',url:' https://github.com/example/project ',label:' Project repo ',alt:'Repository'},''];
  const before=structuredClone(images),result=experiencePhotos(images);
  assert.equal(result[0].mode,'photo');assert.equal(result[0].src,images[0]);
  assert.deepEqual(result[1],{mode:'link',src:'assets/experience/repo.webp',url:'https://github.com/example/project',label:'Project repo',alt:'Repository'});
  assert.equal(result.length,2);
  assert.deepEqual(images,before);
  assert.equal(experiencePhotos([]).length,0);
  assert.equal(experiencePhotos(undefined).length,0);
  assert.equal(experiencePhotos(['',null,{src:'  '}]).length,0);
  assert.equal(experiencePhotos(['', ' assets/experience/photo.webp ', '']).length,1);
  assert.equal(experiencePhotos(['assets/experience/one.webp', '', {src:'assets/experience/two.webp'}]).length,2);
  assert.equal(experiencePhotos(['one.webp','two.webp','three.webp']).length,3);
});

test('Link mode requires a usable destination and hover label, while stored links can be kept in photo mode',()=>{
  const item={...collections.experience.create(),id:'demo',start:'2025-01'};
  const card={mode:'link',src:'',url:'https://github.com/example/project',label:'Project repo'};
  assert.deepEqual(validateCollection('experience',[{...item,images:[card]}]),[],'Redirects work without a thumbnail.');
  for(const url of ['', 'javascript:alert(1)','data:text/html,hello','//example.com','../data/contact.json']) {
    assert.ok(validateCollection('experience',[{...item,images:[{...card,url}]}]).length,url);
    assert.equal(experiencePhotos([{...card,url}]).length,0,'Malformed JSON never creates an active unsafe link.');
  }
  assert.ok(validateCollection('experience',[{...item,images:[{...card,label:'  '}]}]).length);
  assert.ok(validateCollection('experience',[{...item,images:[{...card,mode:'unknown'}]}]).length);
  assert.deepEqual(validateCollection('experience',[{...item,images:[{...card,mode:'photo'}]}]),[]);
});

test('Admin saves persist redirect settings and preserve them when switching back to photo mode',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ridho-admin-test-'));
  await fs.mkdir(path.join(root,'data'));
  const item={...collections.experience.create(),id:'demo',start:'2025-01'};
  const filename=path.join(root,'data','experience.json');await fs.writeFile(filename,JSON.stringify([item]));
  const server=createPortfolioServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/admin/api/data/experience';
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    const cleanup=path.resolve(root);
    if(path.dirname(cleanup)!==path.resolve(os.tmpdir())||!path.basename(cleanup).startsWith('ridho-admin-test-'))throw new Error('Unexpected test cleanup directory.');
    await fs.rm(cleanup,{recursive:true,force:true});
  });
  let loaded=await(await fetch(url)).json();
  const card={mode:'link',src:'assets/experience/repo.webp',alt:'Repo thumbnail',url:'https://github.com/example/project',label:'Project repo'};
  const save=async mode=>{
    const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({revision:loaded.revision,data:[{...item,images:[{...card,mode}]}]})});
    assert.equal(response.status,200);loaded=await response.json();
  };
  await save('link');
  const publicData=await(await fetch(origin+'/data/experience.json')).json();
  assert.deepEqual(experiencePhotos(publicData[0].images)[0],card);
  await save('github');
  const repoData=await(await fetch(origin+'/data/experience.json')).json();
  assert.equal(experiencePhotos(repoData[0].images)[0].mode,'github');
  assert.equal(experiencePhotos(repoData[0].images)[0].url,card.url);
  assert.equal(repoData[0].images[0].src,card.src);
  await save('photo');
  const stored=JSON.parse(await fs.readFile(filename,'utf8'))[0].images[0];
  assert.equal(stored.mode,'photo');assert.equal(stored.url,card.url);assert.equal(stored.label,card.label);
});
