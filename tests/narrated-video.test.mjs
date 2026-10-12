import test from 'node:test';import assert from 'node:assert/strict';
import {narratedPlan,fitNarrationDuration,obtainNarratedParts} from '../client/narrated-video.mjs';
import {videoTaskFingerprint} from '../client/video-model.mjs';
const connection={provider:'toapis',model:'MiniMax-H3',resolution:'768p'};
const makeRow=()=>({id:'r1',start:0,end:15,seconds:15,vo:'完整旁白不能删除',visual:'固定机位讲述',voice:new Blob(['audio']),voiceSeconds:32.12});
test('long voice uses bounded requests and preserves narration and original source range',()=>{
 const row=makeRow(),plan=narratedPlan(row,connection);assert.equal(plan.seconds,32.3);assert.deepEqual(plan.parts,[{offset:0,seconds:15},{offset:15,seconds:15},{offset:30,seconds:2.3}]);assert.equal(row.vo,'完整旁白不能删除');assert.equal(row.end,15);assert.equal(row.seconds,15);
 const seed=narratedPlan(row,{provider:'seedance',model:'doubao-seedance-1-0'});assert.ok(seed.parts.every(p=>p.seconds<=12));assert.equal(seed.parts.reduce((n,p)=>n+p.seconds,0),32.3);
 assert.equal(narratedPlan({...row,voiceSeconds:12},connection).seconds,15);
 assert.throws(()=>narratedPlan({...row,voiceSeconds:NaN},connection),/时长/);
});
test('retry after a transient failure retains successes and retries only the same request ID',async()=>{
 const row=makeRow(),calls=[],saved=[];let n=0,fail=true;
 const options={sampleId:'test',uuid:()=>`stable-request-id-${++n}`,progress:()=>{},persist:async()=>saved.push(structuredClone(row)),request:async(action,b)=>{calls.push([action,b.requestId,b.seconds]);if(action==='submit'&&b.requestId.endsWith('2')&&fail){fail=false;throw Error('network');}return action==='media'?new Blob(['video']):{status:'succeeded'};}};
 await assert.rejects(()=>obtainNarratedParts(row,connection,'prompt',options),/network/);
 assert.equal(row.modelParts[0].modelRaw.size,5);assert.equal(saved[0].modelParts.length,3);
 await obtainNarratedParts(row,connection,'prompt',options);
 assert.equal(calls.filter(x=>x[0]==='submit'&&x[1].endsWith('1')).length,1);assert.equal(calls.filter(x=>x[0]==='submit'&&x[1].endsWith('2')).length,2);assert.equal(n,3);
 const count=calls.length;await obtainNarratedParts(row,connection,'prompt',options);assert.equal(calls.length,count);
});
test('a completed legacy single-clip task is reused without another model request',async()=>{
 const row={...makeRow(),voiceSeconds:10};row.modelTask={requestId:'legacy-request-id',status:'succeeded',fingerprint:videoTaskFingerprint(row,'prompt',connection)};row.modelRaw=new Blob(['existing']);
 const parts=await obtainNarratedParts(row,connection,'prompt',{sampleId:'test',persist:async()=>{},progress:()=>{},request:()=>{throw Error('must not call');}});assert.equal(parts[0].modelRaw.size,8);
});
test('uncertain submission blocks automatic re-submission with progress preserved',async()=>{
 const row=makeRow();let calls=0;const opts={sampleId:'test',persist:async()=>{},progress:()=>{},uuid:()=> 'stable-request-id',request:async()=>{calls++;return {status:'submission_uncertain'};}};
 await assert.rejects(()=>obtainNarratedParts(row,connection,'prompt',opts),/尚未成功/);await assert.rejects(()=>obtainNarratedParts(row,connection,'prompt',opts),/待核对/);assert.equal(calls,1);
});

test('an existing overlong voice recovers on reload without another voice request or repeated extension',()=>{
 const row=makeRow(),voice=row.voice;fitNarrationDuration(row,connection);assert.equal(row.seconds,32.3);assert.equal(row.autoDuration.from,15);assert.equal(row.voice,voice);fitNarrationDuration(row,connection);assert.equal(row.seconds,32.3);assert.equal(row.autoDuration.from,15);
});
