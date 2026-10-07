import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {githubRepository} from '../assets/js/github-repo-data.js';
import {experiencePhotos} from '../assets/js/experience-photo-data.js';
import {collections,validateCollection} from '../admin/schema.js';
import {fetchGithubPreview} from '../admin/github-preview.mjs';
import {createPortfolioServer} from '../admin/server.mjs';

test('Pasted repository URLs normalize clone suffixes, trailing slashes, and sharing parameters',()=>{
  const expected={name:'example/project',url:'https://github.com/example/project',thumbnail:'https://opengraph.githubassets.com/1/example/project'};
  for (const url of ['https://github.com/example/project',' https://github.com/example/project.git/ ','http://www.github.com/example/project?tab=readme-ov-file#readme']) assert.deepEqual(githubRepository(url),expected);
  for (const url of ['',null,'https://github.com/example','https://github.com/example/project/issues','https://github.com.evil.test/example/project','https://user:pass@github.com/example/project','https://github.com:8080/example/project','javascript:alert(1)','https://example.com/example/project','https://github.com/example/.git','https://github.com/example/repo%2Fhidden','https://github.com\\@evil.test/example/project']) assert.equal(githubRepository(url),null,String(url));
});

test('Static GitHub cards need only a URL, retain custom labels and previews, and never activate invalid destinations',()=>{
  const card={mode:'github',src:'',url:'https://github.com/example/project.git'};
  const before=structuredClone(card),photo=experiencePhotos([card])[0];
  assert.equal(photo.mode,'github');assert.equal(photo.url,'https://github.com/example/project');
  assert.equal(photo.src,'https://opengraph.githubassets.com/1/example/project');assert.equal(photo.label,'example/project');
  assert.equal(photo.alt,'GitHub repository example/project');assert.deepEqual(card,before);
  const custom={...card,src:'https://repository-images.githubusercontent.com/123/custom',label:'Source code',alt:'Project repository'};
  assert.equal(experiencePhotos([custom])[0].src,custom.src);assert.equal(experiencePhotos([custom])[0].label,custom.label);
  assert.equal(experiencePhotos([{...card,url:'https://evil.test/repo'}]).length,0);
  const item={...collections.experience.create(),id:'demo',start:'2025-01',images:[card]};
  assert.deepEqual(validateCollection('experience',[item]),[]);
  assert.ok(validateCollection('experience',[{...item,images:[{...card,url:'https://github.com/example'}]}]).length);
  assert.ok(validateCollection('experience',[{...item,images:[{...card,label:12}]}]).length);
});

test('GitHub previews use the repository social image and fall back when metadata is absent or unsafe',async()=>{
  for (const [html,expected] of [
    ['<head><meta content="https://repository-images.githubusercontent.com/123/custom?x=1&amp;y=2" property="og:image" /></head>','https://repository-images.githubusercontent.com/123/custom?x=1&y=2'],
    ["<head><meta property='og:image' content='https://opengraph.githubassets.com/hash/example/project'></head>",'https://opengraph.githubassets.com/hash/example/project'],
    ['<head><meta property="og:image" content="https://evil.test/tracker.png"></head>','https://opengraph.githubassets.com/1/example/project'],
    ['<head><title>Repository</title></head>','https://opengraph.githubassets.com/1/example/project']
  ]) {
    const result=await fetchGithubPreview('https://github.com/example/project',{request:async(url,options)=>{
      assert.equal(url,'https://github.com/example/project');assert.equal(options.redirect,'manual');assert.ok(options.signal);
      return new Response(html,{headers:{'Content-Type':'text/html'}});
    }});
    assert.deepEqual(result,{url:'https://github.com/example/project',label:'example/project',src:expected});
  }
});

test('Preview requests follow repository renames but reject external redirects and explain private repos and network failures',async()=>{
  const calls=[];
  const renamed=await fetchGithubPreview('https://github.com/example/old',{request:async url=>{
    calls.push(url);
    return calls.length===1?new Response(null,{status:301,headers:{Location:'/example/new'}}):new Response('<head></head>');
  }});
  assert.deepEqual(calls,['https://github.com/example/old','https://github.com/example/new']);assert.equal(renamed.url,'https://github.com/example/old');
  await assert.rejects(fetchGithubPreview('https://evil.test/repo',{request:()=>assert.fail('Must not fetch non-GitHub URLs')}),{status:400});
  await assert.rejects(fetchGithubPreview('https://github.com/example/project',{request:async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/repo'}})}),{status:502});
  await assert.rejects(fetchGithubPreview('https://github.com/example/private',{request:async()=>new Response(null,{status:404})}),error=>error.status===404 && error.message.includes('private'));
  await assert.rejects(fetchGithubPreview('https://github.com/example/project',{request:async()=>{throw new TypeError('fetch failed');}}),{status:502});
});

test('Local preview endpoint exposes JSON errors and enforces method and origin restrictions',async t=>{
  const server=createPortfolioServer({root:process.cwd(),githubPreview:input=>fetchGithubPreview(input,{request:async()=>new Response('<head></head>')})});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`,url=`${origin}/admin/api/github-preview?${new URLSearchParams({url:'https://github.com/example/project'})}`;
  const response=await fetch(url);assert.equal(response.status,200);
  assert.equal((await response.json()).src,'https://opengraph.githubassets.com/1/example/project');
  assert.equal((await fetch(origin+'/admin/api/github-preview?url=https://evil.test/repo')).status,400);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
  assert.equal((await fetch(url,{headers:{Origin:'https://evil.test'}})).status,403);
});
