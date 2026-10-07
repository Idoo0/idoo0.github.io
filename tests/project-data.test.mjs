import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCategories,projectStatuses,projectFilterCategories,projectView,projectPeriod} from '../assets/js/project-data.js';
import {collections,validateCollection} from '../admin/schema.js';

const projects=()=>Array.from({length:13},(_,index)=>({...collections.projects.create(),id:`project-${index}`,title:`Project ${index}`,category:'Custom product',categories:[projectCategories[index%projectCategories.length]],selected:index>=2 && index%2===0}));

test('Selected shows only marked projects with the six-project limit, while All includes unselected projects',()=>{
  const data=projects();
  assert.deepEqual(projectView(data,'Selected').map(project=>project.id),['project-2','project-4','project-6','project-8','project-10','project-12']);
  assert.equal(projectView(data,'All').length,13);
  assert.deepEqual(projectView(data.map(project=>({...project,selected:false})),'Selected'),[]);
  assert.deepEqual(projectView(data.map(project=>({...project,selected:true})),'Selected').map(project=>project.id),data.slice(0,6).map(project=>project.id));
  assert.deepEqual(validateCollection('projects',data),[]);
  data[0].selected=true;
  assert.ok(validateCollection('projects',data).some(error=>error.includes('Maksimal 6 project')));
  data[0].selected='true';
  assert.ok(validateCollection('projects',data).some(error=>error.includes('true atau false')));
  assert.equal(collections.projects.create().selected,false);
});

test('Selected projects sort by latest end month, put ongoing work first, and preserve selection and source data',()=>{
  const data=[
    {id:'old',selected:true,start:'2024-01',end:'2024-12'},
    {id:'unselected',selected:false,start:'2026-01',end:'2026-10'},
    {id:'ongoing-old',selected:true,start:'2025-01',end:null},
    {id:'tie-old-start',selected:true,start:'2025-01',end:'2025-12'},
    {id:'ongoing-new',selected:true,start:'2026-01',end:''},
    {id:'tie-new-start',selected:true,start:'2025-04',end:'2025-12'},
    {id:'legacy',selected:true,year:'2023'},
    {id:'beyond-limit',selected:true,start:'2026-01',end:'2026-09'}
  ];
  const before=structuredClone(data);
  assert.deepEqual(projectView(data,'Selected').map(item=>item.id),['ongoing-new','ongoing-old','tie-new-start','tie-old-start','old','legacy']);
  assert.deepEqual(projectView(data,'All').map(item=>item.id),['ongoing-new','ongoing-old','unselected','beyond-limit','tie-new-start','tie-old-start','old','legacy']);
  assert.deepEqual(data,before);
});

test('All and category views sort the full list before pagination, keep ties stable, and leave source data untouched',()=>{
  const data=[
    {id:'old',categories:['Web'],start:'2024-01',end:'2024-12'},
    {id:'new',categories:['Web'],start:'2025-04',end:'2025-06'},
    {id:'other-category',categories:['Mobile'],start:'2026-01',end:'2026-09'},
    {id:'ongoing',categories:['Web'],start:'2026-01',end:null},
    {id:'tie-first',categories:['Web'],start:'2025-01',end:'2025-06'},
    {id:'legacy',categories:['Web'],year:'2023'},
    {id:'undated',categories:['Web']},
    {id:'tie-second',categories:['Web'],start:'2025-01',end:'2025-06'},
    {id:'newest-completed',categories:['Web'],start:'2026-01',end:'2026-10'}
  ];
  const before=structuredClone(data);
  Object.freeze(data);
  const all=projectView(data,'All');
  assert.deepEqual(all.map(item=>item.id),['ongoing','newest-completed','other-category','new','tie-first','tie-second','old','legacy','undated']);
  assert.deepEqual(all.slice(0,6).map(item=>item.id),['ongoing','newest-completed','other-category','new','tie-first','tie-second']);
  assert.deepEqual(all.slice(6).map(item=>item.id),['old','legacy','undated']);
  assert.deepEqual(projectView(data,'Web').map(item=>item.id),['ongoing','newest-completed','new','tie-first','tie-second','old','legacy','undated']);
  assert.deepEqual(data,before);
});

test('Category filters use selected categories independently of the free-text product type',()=>{
  const data=projects();data[0].categories=['AI/ML','Web'];
  assert.deepEqual(projectFilterCategories(data[0]),['AI/ML','Web']);
  assert.ok(projectView(data,'AI/ML').includes(data[0]));
  assert.equal(projectView(data,'Web').filter(project=>project.id===data[0].id).length,1);
  assert.deepEqual(projectFilterCategories({category:'Mobile',categories:[]}),[]);
  assert.deepEqual(projectFilterCategories({category:'Data',categories:['unknown','Data']}),['Data']);
  assert.deepEqual(projectFilterCategories({category:'Recommendation system',categories:['AI/ML']}),['AI/ML']);
  const product={...data[0],category:'Mobile',categories:['Data']};
  assert.deepEqual(projectView([product],'Mobile'),[]);
  assert.deepEqual(projectView([product],'Data'),[product]);
});

test('Project dropdowns validate supported categories and statuses, including research and experiments',()=>{
  const item={...collections.projects.create(),id:'demo',title:'Demo'};
  for(const status of projectStatuses)assert.deepEqual(validateCollection('projects',[{...item,status}]),[]);
  for(const category of projectCategories)assert.deepEqual(validateCollection('projects',[{...item,category:'A custom product name',categories:[category]}]),[]);
  for(const category of ['Chatbot','Dashboard analitik','Aplikasi mobile',''])assert.deepEqual(validateCollection('projects',[{...item,category}]),[]);
  for(const patch of [{category:123},{status:'unknown'},{categories:['unknown']},{categories:['Web','Web']}])assert.ok(validateCollection('projects',[{...item,...patch}]).length);
  assert.equal(collections.projects.create().category,'');
});

test('Project periods display month ranges, ongoing work, and legacy years without timezone conversion',()=>{
  assert.equal(projectPeriod({start:'2023-07',end:'2024-01',year:'2023–2024'}),'Jul 2023 – Jan 2024');
  assert.equal(projectPeriod({start:'2024-03',end:'2024-03'}),'Mar 2024 – Mar 2024');
  for(const end of [null,'',undefined])assert.equal(projectPeriod({start:'2025-01',end}),'Jan 2025 – Present');
  assert.equal(projectPeriod({year:'2024'}),'2024');
  assert.equal(projectPeriod({end:'2025-12'}),'Dec 2025');
  assert.equal(projectPeriod({start:'2025-13',end:'invalid',year:'2025'}),'2025');
  assert.equal(projectPeriod({start:'2025-01',end:'invalid'}),'Jan 2025');
  assert.equal(projectPeriod({}),'');
});

test('Project month fields accept optional and ongoing periods while rejecting invalid months and reversed ranges',()=>{
  const item={...collections.projects.create(),id:'period-demo'};
  for(const patch of [{},{start:'2025-01',end:null},{start:'2025-01',end:''},{start:'2025-01',end:'2025-01'},{start:'2024-12',end:'2025-02'}])assert.deepEqual(validateCollection('projects',[{...item,...patch}]),[]);
  for(const patch of [{start:'2025-13'},{end:'2025-00'},{start:'Jan 2025'},{start:123},{end:123}])assert.ok(validateCollection('projects',[{...item,...patch}]).length);
  assert.ok(validateCollection('projects',[{...item,start:'2025-02',end:'2025-01'}]).some(error=>error.includes('mendahului')));
});
