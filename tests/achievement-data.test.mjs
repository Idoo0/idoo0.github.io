import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementDate,achievementGroups} from '../assets/js/achievement-data.js';
import {collections,validateCollection} from '../admin/schema.js';

test('Achievement dates use their recorded calendar month, support legacy years, and validate admin month values',()=>{
  assert.equal(achievementDate({date:'2025-01',year:'2024'}),'Jan 2025');
  assert.equal(achievementDate({date:'2025-11'}),'Nov 2025');
  assert.equal(achievementDate({year:'2024'}),'2024');
  assert.equal(achievementDate({date:'2025-13',year:'2025'}),'2025');
  assert.equal(achievementDate({}),'');
  const record={...collections.achievements.create(),id:'award'};
  for(const date of ['',undefined,'2025-01','2026-12'])assert.deepEqual(validateCollection('achievements',[{...record,date}]),[]);
  for(const date of ['2025-00','2025-13','2025-11-01','Nov 2025',123])assert.ok(validateCollection('achievements',[{...record,date}]).length);
});

test('Both achievement groups sort newest first while preserving selection, stable ties, and unknown dates last',()=>{
  const records=[
    {id:'selected-old',date:'2023-04',highlighted:true},
    {id:'unknown'},
    {id:'old',date:'2024-11'},
    {id:'selected-new',date:'2026-05',highlighted:true},
    {id:'tie-first',date:'2025-08'},
    {id:'newest',date:'2026-01'},
    {id:'year-only',year:'2025'},
    {id:'selected-third',date:'2025-02',highlighted:true},
    {id:'tie-second',date:'2025-08'},
    {id:'extra-highlighted',date:'2025-12',highlighted:true}
  ];
  const before=structuredClone(records);
  const {featured,remaining}=achievementGroups(records);
  assert.deepEqual(featured.map(item=>item.id),['selected-new','selected-third','selected-old']);
  assert.deepEqual(remaining.map(item=>item.id),['newest','extra-highlighted','tie-first','tie-second','year-only','old','unknown']);
  assert.deepEqual(records,before);
});
