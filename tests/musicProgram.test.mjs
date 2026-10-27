import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/features/program/musicProgram.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const p=m.DEFAULT_PROGRAM;
const at=(day,hour,minute=0)=>new Date(2026,9,day,hour,minute,0);
test('default schedule has no gaps, including midnight and exact boundaries',()=>{
  for(const [hour,minute,expected] of [[0,0,'dj'],[3,59,'dj'],[4,0,'lobby'],[19,59,'lobby'],[20,0,'singer'],[23,59,'singer']])assert.equal(m.modeAt(at(27,hour,minute),p),expected);
  for(let n=0;n<1440;n++)assert(m.MUSIC_MODES.includes(m.modeAt(at(27,Math.floor(n/60),n%60),p)));
});
test('staff schedule supports wrapped windows and rejects overlap/order mistakes',()=>{
  const changed={...p,starts:{lobby:'06:00',singer:'18:00',dj:'23:00'}};
  assert(m.validProgram(changed));assert.equal(m.modeAt(at(27,23),changed),'dj');assert.equal(m.modeAt(at(28,5),changed),'dj');assert.equal(m.modeAt(at(28,6),changed),'lobby');
  assert(!m.validProgram({...p,starts:{...p.starts,lobby:'20:00'}}));assert(!m.validProgram({...p,starts:{...p.starts,dj:'25:00'}}));assert(!m.validProgram({...p,starts:{lobby:'04:00',singer:'01:00',dj:'20:00'}}));
});
test('session dates use local dates and handle cross-midnight sessions',()=>{
  const changed={...p,starts:{lobby:'06:00',singer:'18:00',dj:'23:00'}};
  assert.equal(m.localDate(m.sessionStart('dj',at(28,1),changed)),'2026-10-27');
  assert.equal(m.localDate(m.nextSession('singer',at(27,21),p)),'2026-10-28');
  assert.equal(m.localDate(m.nextSession('singer',at(27,10),p)),'2026-10-27');
});
test('requests cannot leak between experiences or session dates; legacy singer requests remain available only in their current session',()=>{
  const r={service:'music',meta:{'Music mode':'dj','Session date':'2026-10-28'}};
  assert(m.sessionMatches(r,'dj','2026-10-28'));assert(!m.sessionMatches(r,'singer','2026-10-28'));assert(!m.sessionMatches(r,'dj','2026-10-27'));
  assert(m.sessionMatches({service:'music',meta:{}},'singer','2026-10-27','2026-10-27'));
  assert(!m.sessionMatches({service:'music',meta:{}},'singer','2026-10-28','2026-10-27'));
});
test('preferred time must be inside the selected session, excluding its end boundary',()=>{
  assert(m.timeInSession('21:30','singer',p));assert(!m.timeInSession('00:00','singer',p));assert(m.timeInSession('00:00','dj',p));assert(!m.timeInSession('04:00','dj',p));assert(!m.timeInSession('25:00','dj',p));
  const choices=m.quickTimes('dj','2026-10-27',at(27,3,30),p,false);assert(choices.every(c=>m.timeInSession(c.value,'dj',p)));
});
test('missing or corrupt saved settings recover without changing request data',()=>{
  assert.deepEqual(m.readProgram(null),p);assert.deepEqual(m.readProgram('{broken'),p);
  const restored=m.readProgram(JSON.stringify({starts:p.starts,experiences:{dj:{advanceEnabled:true}}}));assert(restored.experiences.dj.advanceEnabled);assert.equal(restored.experiences.singer.title,p.experiences.singer.title);
});
