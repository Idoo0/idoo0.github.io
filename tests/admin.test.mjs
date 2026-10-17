import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createPortfolioServer} from '../admin/server.mjs';
import {collections,validateCollection} from '../admin/schema.js';
import {projectDetails,achievementDetails} from '../assets/js/detail-data.js';

test('Local saves persist JSON, preserve unknown fields, back up the previous version, and reject stale/invalid writes',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ridho-admin-test-'));
  await fs.mkdir(path.join(root,'data'));await fs.mkdir(path.join(root,'admin'));
  const original={email:'hello@example.com',linkedin:'',github:'',cv:'',cvFilename:'CV.pdf',customField:{keep:true}};
  const file=path.join(root,'data/contact.json');const originalBytes=JSON.stringify(original,null,2)+'\n';await fs.writeFile(file,originalBytes);
  await fs.writeFile(path.join(root,'index.html'),'<main>Static portfolio</main>');
  await fs.writeFile(path.join(root,'admin','access.js'),'export const localAccess = true;');
  await fs.writeFile(path.join(root,'admin','photo-order.js'),'export const ordering = true;');
  const server=createPortfolioServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/admin/api/data/contact';
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    const cleanupTarget=path.resolve(root);
    if(path.dirname(cleanupTarget)!==path.resolve(os.tmpdir())||!path.basename(cleanupTarget).startsWith('ridho-admin-test-'))throw new Error('Unexpected temporary test directory.');
    await fs.rm(cleanupTarget,{recursive:true,force:true});
  });
  const loaded=await(await fetch(url)).json();assert.deepEqual(loaded.data,original);
  const edited={...loaded.data,email:'updated@example.com'};
  const put=async(data,revision=loaded.revision,headers={})=>fetch(url,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify({data,revision})});
  const response=await put(edited);assert.equal(response.status,200);const saved=await response.json();assert.notEqual(saved.revision,loaded.revision);
  assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),edited);
  assert.equal(await fs.readFile(path.join(root,'admin/.backups/contact.json'),'utf8'),originalBytes);
  assert.deepEqual((await(await fetch(url)).json()).data.customField,{keep:true});
  assert.equal((await put({...edited,email:'stale@example.com'})).status,409);
  assert.equal((await put({...edited,email:'not-an-email'},saved.revision)).status,400);
  assert.equal((await put([],saved.revision)).status,400);
  assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),edited);
  assert.equal((await put(edited,saved.revision,{Origin:'https://other.example'})).status,403);
  const invalidHostStatus=await new Promise((resolve,reject)=>{
    const request=http.get(url,{headers:{Host:'evil.example'}},response=>{response.resume();resolve(response.statusCode);});
    request.on('error',reject);
  });
  assert.equal(invalidHostStatus,403);
  assert.equal((await fetch(origin+'/admin/api/data/unknown')).status,404);
  assert.equal((await fetch(origin+'/admin/.backups/contact.json')).status,404);
  assert.equal((await fetch(origin+'/server.mjs')).status,404);
  assert.equal((await fetch(origin+'/admin/access.js')).status,200);
  assert.equal((await fetch(origin+'/admin/photo-order.js')).status,200);
  assert.equal((await fetch(origin+'/admin/server.mjs')).status,404);
  assert.equal((await fetch(origin+'/')).status,200);
  const adminRedirect=await fetch(origin+'/admin',{redirect:'manual'});
  assert.equal(adminRedirect.status,308);assert.equal(adminRedirect.headers.get('location'),'/admin/');
  const competing=await Promise.all([put({...edited,email:'first@example.com'},saved.revision),put({...edited,email:'second@example.com'},saved.revision)]);
  assert.deepEqual(competing.map(result=>result.status).sort(),[200,409]);
  assert.equal((await fs.readdir(path.join(root,'data'))).some(name=>name.endsWith('.tmp')),false);
});

test('Content validation protects timeline dates, unique IDs, image limits, and fixed hero artwork roles',()=>{
  const valid={id:'exp-1',title:'Engineer',start:'2025-01',end:null,images:[''],highlighted:true};
  assert.deepEqual(validateCollection('experience',[valid]),[]);
  assert.ok(validateCollection('experience',[valid,{...valid}]).some(error=>error.includes('unik')));
  assert.ok(validateCollection('experience',[{...valid,end:'2024-12'}]).some(error=>error.includes('mendahului')));
  assert.ok(validateCollection('experience',[{...valid,images:['','','','']}]).length);
  assert.ok(validateCollection('hero',{name:123,roles:[]}).length);
  assert.ok(validateCollection('projects',[{id:'project-1',title:'Demo',categories:['AI'],links:[{label:'Pitch deck',url:'javascript:alert(1)'}]}]).length);
});

test('Custom detail links persist with their labels, local attachments, and achievement gallery',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ridho-admin-test-'));
  await fs.mkdir(path.join(root,'data'));await fs.mkdir(path.join(root,'admin'));
  const project={...collections.projects.create(),id:'demo-project',title:'Demo project'};
  const achievement={...collections.achievements.create(),id:'demo-award',title:'Demo award'};
  for(const [name,item] of [['projects',project],['achievements',achievement]])await fs.writeFile(path.join(root,'data',name+'.json'),JSON.stringify([item]));
  const server=createPortfolioServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{
    await new Promise(resolve=>server.close(resolve));
    const cleanupTarget=path.resolve(root);
    if(path.dirname(cleanupTarget)!==path.resolve(os.tmpdir())||!path.basename(cleanupTarget).startsWith('ridho-admin-test-'))throw new Error('Unexpected temporary test directory.');
    await fs.rm(cleanupTarget,{recursive:true,force:true});
  });
  const links=[{label:'Pitch deck',url:'assets/documents/pitch-deck.pdf'},{label:'Read the paper',url:'https://example.com/paper'}];
  const revisions={};
  for(const name of ['projects','achievements']){
    const url=origin+'/admin/api/data/'+name;
    const loaded=await(await fetch(url)).json();
    const combinedKey=name==='projects'?'challengeApproach':'problemApproach';
    const resultText=name==='projects'?'A working prototype.\n\n- Upload and preview images.':'A working prototype.';
    const edited=[{...loaded.data[0],links,images:[{src:'assets/achievements/photo.webp',alt:'Award ceremony'},''],[combinedKey]:'The problem.\n\nThe approach.',contributions:['Built the prototype.'],result:resultText}];
    if(name==='projects'){edited[0].category='Agentic chatbot';edited[0].categories=['AI/ML','Web'];edited[0].start='2024-12';edited[0].end='2025-02';}
    else edited[0].date='2025-11';
    const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({data:edited,revision:loaded.revision})});
    assert.equal(response.status,200);revisions[name]=(await response.json()).revision;
    const saved=JSON.parse(await fs.readFile(path.join(root,'data',name+'.json'),'utf8'))[0];
    assert.deepEqual(saved.links,links);assert.deepEqual(saved.images,edited[0].images);assert.equal(saved.result,resultText);
    const publicData=await(await fetch(origin+'/data/'+name+'.json')).json();
    const details=name==='projects'?projectDetails(publicData[0]):achievementDetails(publicData[0]);
    assert.equal(details[combinedKey],edited[0][combinedKey]);
    assert.deepEqual(details.contributions,edited[0].contributions);
    assert.equal(details.result,edited[0].result);
    if(name==='projects'){assert.equal(publicData[0].category,'Agentic chatbot');assert.deepEqual(publicData[0].categories,['AI/ML','Web']);assert.equal(publicData[0].start,'2024-12');assert.equal(publicData[0].end,'2025-02');}
    else assert.equal(publicData[0].date,'2025-11');
  }
  const invalid=[{...achievement,links:[{label:'Unsafe',url:'../data/contact.json'}]}];
  assert.equal((await fetch(origin+'/admin/api/data/achievements',{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({data:invalid,revision:revisions.achievements})})).status,400);
});
