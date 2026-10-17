import test from 'node:test';
import assert from 'node:assert/strict';
import {experienceRoleCategories,experienceView} from '../assets/js/experience-data.js';
import {collections,validateCollection} from '../admin/schema.js';
import {movePhoto} from '../admin/photo-order.js';

test('Role filters include every experience by default and use explicit categories before legacy titles',()=>{
  const items=[
    {title:'Back End Developer',highlighted:false},
    {title:'Machine Learning Engineer Lead',highlighted:true},
    {title:'Custom position',roles:['Data Analyst','Software Engineer']},
    {title:'Software Engineer',roles:[]}
  ];
  assert.deepEqual(experienceView(items),items);
  assert.deepEqual(experienceRoleCategories(items[1]),['AI/ML Engineer','Leadership']);
  assert.deepEqual(experienceView(items,'Software Engineer'),[items[0],items[2]]);
  assert.deepEqual(experienceView(items,'Data Analyst'),[items[2]]);
  const record={...collections.experience.create(),id:'role-demo',roles:['Data Analyst','Data Engineer']};
  assert.deepEqual(validateCollection('experience',[record]),[]);
  assert.ok(validateCollection('experience',[{...record,roles:['Invalid role']}]).length);
  assert.ok(validateCollection('experience',[{...record,roles:['Data Analyst','Data Analyst']}]).length);
});

test('Photo ordering moves the entire item with link, preview, label, and extra metadata intact',()=>{
  const photos=['one.webp',{src:'two.webp',mode:'github',url:'https://github.com/user/repo',label:'Repo',alt:'Two',custom:{keep:true}},''];
  const before=structuredClone(photos),reordered=movePhoto(photos,0,2);
  assert.deepEqual(reordered,[photos[1],photos[2],photos[0]]);
  assert.deepEqual(movePhoto(reordered,2,0),photos);
  assert.deepEqual(photos,before);
  for(const [from,to] of [[-1,0],[0,3],[0,0],[0.5,1]])assert.equal(movePhoto(photos,from,to),photos);
});
