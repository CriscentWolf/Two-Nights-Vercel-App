import test from 'node:test';
import assert from 'node:assert/strict';
import {leaderboard,validateEvidence,assessSchedule} from '../lib/ranking.mjs';
import {summarizeActivity} from '../lib/sessions.mjs';
import {normalizeRankings} from '../lib/raider.mjs';

const now = Date.parse('2026-10-27T12:00:00Z');
function record(name='Example', extra={}) {return {region:'us',realm:'area-52',name,raid:'test-raid',team:'Main',days:['Tue','Thu'],hours:6,timeZone:'America/New_York',extraRequiredNights:false,logsConsistent:true,sourceUrl:'https://example.com/schedule',checkedAt:'2026-10-20',...extra};}
function guild(name,rank) {return {region:'us',realm:'area-52',name,sourceRank:rank,kills:4};}

test('unknown, stale and inconsistent evidence never silently qualifies',()=>{
  assert.equal(assessSchedule(undefined,'test-raid',now).status,'unknown');
  assert.equal(assessSchedule(record('A',{checkedAt:'2026-01-01'}),'test-raid',now).status,'review');
  assert.equal(assessSchedule(record('A',{logsConsistent:false}),'test-raid',now).status,'review');
  assert.equal(assessSchedule(record(),'different-raid',now).status,'unknown');
  assert.equal(assessSchedule(record('A',{days:['Tue','Wed','Thu']}),'test-raid',now).status,'excluded');
});
test('ranking preserves source order, exposes higher unresolved guilds, and obeys extra-night toggle',()=>{
  const gs=[guild('C',3),guild('A',1),guild('B',2),guild('D',4)];
  const ev=[record('C'),record('B'),record('D',{extraRequiredNights:true})];
  const strict=leaderboard(gs,ev,{raid:'test-raid',now});
  assert.deepEqual(strict.qualified.map(g=>g.name),['B','C']);
  assert.equal(strict.unresolved,1);
  assert.deepEqual(strict.qualified.map(g=>g.twoDayRank),[1,2]);
  assert.equal(leaderboard(gs,ev,{raid:'test-raid',now,strict:false}).qualified.length,3);
});
test('top 100 caps qualified list and ignores unresolved candidates below cutoff',()=>{
  const gs=Array.from({length:105},(_,i)=>guild('Guild '+i,i+1));
  const ev=gs.slice(0,101).map(g=>record(g.name));
  const r=leaderboard(gs,ev,{raid:'test-raid',now});
  assert.equal(r.qualified.length,100);assert.equal(r.unresolved,0);
});
test('evidence validator rejects unsafe links, duplicate teams and malformed schedules',()=>{
  assert.equal(validateEvidence([record()]).length,1);
  assert.throws(()=>validateEvidence([record('A',{sourceUrl:'javascript:alert(1)'})]));
  assert.throws(()=>validateEvidence([record(),record()]));
  assert.throws(()=>validateEvidence([record('A',{days:['Tue','Tue']})]));
  assert.throws(()=>validateEvidence([record('A',{timeZone:'bogus'})]));
  assert.throws(()=>validateEvidence([record('A',{hours:-2})]));
});
test('duplicate and split reports across midnight count as one session; Heroic is ignored',()=>{
  const startTime=Date.parse('2026-10-21T03:30:00Z');
  const f={encounterID:123,difficulty:5,startTime:0,endTime:1800000};
  const reports=[{startTime,fights:[f]},{startTime,fights:[f]},{startTime:startTime+3600000,fights:[f]},{startTime:startTime+86400000,fights:[{...f,difficulty:4}]},{startTime:startTime+2*86400000,fights:[f]}];
  const s=summarizeActivity(reports,'America/New_York');
  assert.equal(s.length,2);assert.equal(s[0].hours,1.5);
});
test('provider normalization preserves rank and rejects changed response shapes',()=>{
  const g=normalizeRankings({raidRankings:[{rank:12,guild:{name:'A B',realm:{slug:'area-52',name:'Area 52'}},encountersDefeated:[{},{}]}]},'us')[0];
  assert.equal(g.sourceRank,12);assert.equal(g.kills,2);assert.match(g.url,/A%20B$/);
  assert.throws(()=>normalizeRankings({},'us'));
});
test('activity API blocks unauthenticated quota use before network access', async()=>{
  const {POST}=await import('../app/api/activity/route.js');
  const response=await POST(new Request('http://localhost/api/activity',{method:'POST'}));
  assert.equal(response.status,401);
});
test('rankings API rejects invalid query values before making upstream requests',async()=>{
  const {GET}=await import('../app/api/rankings/route.js');
  assert.equal((await GET(new Request('http://localhost/api/rankings?region=invalid&raid=test'))).status,400);
  assert.equal((await GET(new Request('http://localhost/api/rankings?region=us&raid=test&page=-1'))).status,400);
});
