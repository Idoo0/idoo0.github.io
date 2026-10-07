import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectDetails,achievementDetails,isDetailLinkUrl,detailLinks,editableDetailRecord,detailCopyBlocks} from '../assets/js/detail-data.js';
import {validateCollection} from '../admin/schema.js';

test('Detail links allow arbitrary labels and asset files while rejecting unsafe destinations',()=>{
  for(const url of ['https://example.com/deck','http://localhost:8765/demo','assets/documents/pitch-deck.pdf','./assets/documents/certificate.pdf#page=2'])assert.equal(isDetailLinkUrl(url),true,url);
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.com/deck','file:///C:/private.txt','../data/contact.json','assets/../data/contact.json','assets/%2e%2e/data/contact.json','assets/%5cprivate.txt','assets/%2eprivate/file','https://'])assert.equal(isDetailLinkUrl(url),false,url);
  assert.deepEqual(detailLinks({links:[{label:'Pitch deck',url:'assets/documents/deck.pdf'},{label:'Unsafe',url:'javascript:alert(1)'},{label:'',url:'https://example.com'}]}),[{label:'Pitch deck',url:'assets/documents/deck.pdf'}]);
  assert.deepEqual(detailLinks({links:[],demoUrl:'https://example.com'},[{label:'Live demo',url:'https://example.com'}]),[]);
  const item={id:'demo',title:'Demo'};
  for(const name of ['projects','achievements']){
    assert.deepEqual(validateCollection(name,[{...item,links:[{label:'Pitch deck',url:'assets/documents/deck.pdf'}]}]),[]);
    assert.ok(validateCollection(name,[{...item,links:[{label:'',url:'https://example.com'}]}]).length);
    assert.ok(validateCollection(name,[{...item,links:[{label:'Link',url:123}]}]).length);
  }
});

test('Current details use revised copy and retain compatibility with existing content',()=>{
  const project=projectDetails({challenge:'Problem',solution:'Approach',overview:'Outcome',features:['Feature'],demoUrl:'https://example.com',images:['']});
  assert.equal(project.challengeApproach,'Problem\n\nApproach');assert.equal(project.result,'Outcome\n\n- Feature');
  assert.equal(project.links[0].label,'Live demo');assert.deepEqual(project.images,[{src:'',alt:''}]);
  const revised=projectDetails({challengeApproach:'Combined',challenge:'Old',result:'New result',overview:'Old',contributions:['Built API'],links:[]});
  assert.equal(revised.challengeApproach,'Combined');assert.equal(revised.result,'New result');assert.deepEqual(revised.links,[]);
  const achievement=achievementDetails({overview:'Story',details:['Contribution'],credentialUrl:'https://example.com/certificate'});
  assert.equal(achievement.problemApproach,'Story');assert.deepEqual(achievement.contributions,['Contribution']);assert.equal(achievement.links[0].label,'View credential');
});

test('Project galleries preserve every photo beyond three while validating all entries',()=>{
  const images=['assets/projects/first.webp',{src:'assets/projects/second.webp',alt:'Second screenshot'},'',
    {src:'assets/projects/fourth.webp',alt:'Fourth screenshot'},'assets/projects/fifth.webp','assets/projects/sixth.webp'];
  const item={id:'gallery-demo',title:'Gallery demo',images};
  const before=structuredClone(item);
  assert.deepEqual(validateCollection('projects',[item]),[]);
  assert.deepEqual(projectDetails(item).images,images.map(photo=>typeof photo==='string'?{src:photo,alt:''}:photo));
  assert.deepEqual(editableDetailRecord('projects',item).images,images);
  assert.deepEqual(item,before);
  for(const invalid of [123,{src:123},{src:'assets/projects/fourth.webp',alt:123}]) {
    assert.ok(validateCollection('projects',[{...item,images:[...images.slice(0,3),invalid]}]).length);
  }
  assert.ok(validateCollection('achievements',[item]).length);
  assert.equal(achievementDetails(item).images.length,3);
});

test('One result field preserves old results and features, survives repeated edits, and supports readable lists',()=>{
  const legacy={id:'project',title:'Demo',result:'A measurable result.',features:['First feature.','Second feature.'],customField:{keep:true}};
  const merged=editableDetailRecord('projects',legacy);
  assert.equal(merged.result,'A measurable result.\n\n- First feature.\n- Second feature.');
  assert.equal(Object.hasOwn(merged,'features'),false);
  assert.deepEqual(merged.customField,legacy.customField);
  assert.deepEqual(legacy.features,['First feature.','Second feature.']);
  assert.deepEqual(editableDetailRecord('projects',merged),merged);
  assert.deepEqual(detailCopyBlocks(projectDetails(merged).result),[
    {type:'paragraph',text:'A measurable result.'},
    {type:'list',items:['First feature.','Second feature.']}
  ]);
  const edited={...merged,result:'A new result.\n\n- Only the new feature.'};
  assert.deepEqual(detailCopyBlocks(projectDetails(edited).result),[
    {type:'paragraph',text:'A new result.'},
    {type:'list',items:['Only the new feature.']}
  ]);
  assert.equal(projectDetails({...merged,result:''}).result,'');
});

test('Legacy details are editable in the admin form without dropping content or reviving explicitly cleared fields',()=>{
  const legacy={id:'legacy',title:'Legacy',challenge:'Problem',approach:'Approach',overview:'Outcome',customField:{keep:true}};
  const editable=editableDetailRecord('projects',legacy);
  assert.equal(editable.challengeApproach,'Problem\n\nApproach');
  assert.equal(editable.result,'Outcome');
  assert.deepEqual(editable.customField,legacy.customField);
  assert.equal(legacy.challengeApproach,undefined);
  assert.deepEqual(projectDetails(editable),projectDetails(legacy));
  const cleared=editableDetailRecord('projects',{...legacy,challengeApproach:'',contributions:[],result:''});
  assert.equal(projectDetails(cleared).challengeApproach,'');
  assert.equal(projectDetails(cleared).result,'');
  const award=editableDetailRecord('achievements',{id:'award',title:'Award',problem:'Problem',solution:'Approach',details:['Worked on it'],result:'Won',recognition:'Gold'});
  assert.equal(award.problemApproach,'Problem\n\nApproach');
  assert.deepEqual(award.contributions,['Worked on it']);
  assert.equal(award.recognition,'Gold');
  assert.equal(achievementDetails(award).problemApproach,award.problemApproach);
});

test('Portfolio data satisfies the revised project and achievement schemas',async()=>{
  for(const name of ['projects','achievements']){
    const data=JSON.parse(await fs.readFile(new URL(`../data/${name}.json`,import.meta.url),'utf8'));
    assert.deepEqual(validateCollection(name,data),[]);
    for(const item of data){assert.ok(Array.isArray(item.links));assert.ok(Array.isArray(item.images));assert.ok(Array.isArray(item.contributions));assert.equal(typeof item.result,'string');}
  }
});
