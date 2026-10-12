import test from 'node:test';import assert from 'node:assert/strict';
import {analysisRequest,parseAnalysis,clipAnalysisRoute} from '../server/clip-analysis.mjs';
const result=x=>({choices:[{message:{content:JSON.stringify(x)}}]});
const good={duration:21,segments:[{start:0,end:15,narration:'原声',sourceVisual:'男子站在窗边',prompt:'缓缓推进的中景'},{start:15,end:21,narration:'',sourceVisual:'窗外树木',prompt:'树叶随风摇动'}]};
test('analysis sends original video bytes to native API, never a title-only substitute',()=>{const p=analysisRequest('a'.repeat(100),'video/mp4');assert.equal(p.messages[0].content[0].video_url.url,'data:video/mp4;base64,'+'a'.repeat(100));assert.throws(()=>analysisRequest('https://www.douyin.com/video/123','video/mp4'));});
test('only complete model returned segments are accepted, no algorithm fills omissions',()=>{const a=parseAnalysis(result(good));assert.equal(a.rows.length,2);assert.equal(a.rows[1].seconds,6);assert.equal(a.rows[1].vo,'');assert.equal(a.analysis.method,'video_api');assert.throws(()=>parseAnalysis(result({...good,duration:40})));assert.throws(()=>parseAnalysis(result({...good,segments:[{...good.segments[0],start:4}]})));assert.throws(()=>parseAnalysis({}));});
test('gateway uses account auth, accepts video response and reports unsupported routes honestly',async()=>{
 const req=()=>new Request('https://studio/api/clip-model/analyze',{method:'POST',headers:{'X-Video-Api-Key':'unit-test-api-secret'},body:JSON.stringify({provider:'toapis',sampleId:'book',video:'a'.repeat(100),mime:'video/mp4',seconds:15,duration:21})});
 const env={DB:{prepare(){return {bind(){return {first:async()=>({product:'论语导读',category:'国学'})};}}}}};
 const r=await clipAnalysisRoute(req(),env,async(url,opt)=>{if(url.includes('/models?'))return Response.json({data:[{id:'qwen3.5-omni-plus'}]});assert.equal(url,'https://toapis.cn/v1/chat/completions');assert.equal(JSON.parse(opt.body).model,'qwen3.5-omni-plus');assert.equal(opt.headers.Authorization,'Bearer unit-test-api-secret');return Response.json(result(good));});assert.equal((await r.json()).rows.length,2);
 const bad=await clipAnalysisRoute(req(),env,async url=>url.includes('/models?')?Response.json({data:[{id:'qwen3.5-omni-plus'}]}):new Response('',{status:404}));assert.equal(bad.status,502);assert.match((await bad.json()).error,/本次未生成/);
});

test('model cannot silently shorten the supplied video',()=>{assert.throws(()=>parseAnalysis(result(good),15,30),/时长与原片不符/);});

test('missing permitted audio-video model never submits video to another vendor',async()=>{
 let calls=0;const req=new Request('https://studio/api/clip-model/analyze',{method:'POST',headers:{'X-Video-Api-Key':'unit-test-api-secret'},body:JSON.stringify({provider:'toapis',sampleId:'book',video:'a'.repeat(100),mime:'video/mp4',duration:21})});
 const env={DB:{prepare(){return {bind(){return {first:async()=>({product:'论语',category:'国学'})};}}}}};
 const r=await clipAnalysisRoute(req,env,async url=>{calls++;assert.match(url,/models/);return Response.json({data:[{id:'gemini-2.5-flash-official'},{id:'qwen3.5-plus'}]});});assert.equal(r.status,409);assert.equal(calls,1);
});

test('quick video accepts an uploaded original without a selected book; normal analysis still requires one',async()=>{
 const env={DB:{prepare(){return {bind(){return {first:async()=>null};}}}}};
 const req=workflow=>new Request('https://studio/api/clip-model/analyze',{method:'POST',headers:{'X-Video-Api-Key':'unit-test-api-secret'},body:JSON.stringify({provider:'toapis',workflow,video:'a'.repeat(100),mime:'video/mp4',seconds:15,duration:21})});
 let calls=0;const fetcher=async url=>{calls++;return url.includes('/models?')?Response.json({data:[{id:'qwen3.5-omni-plus'}]}):Response.json(result(good));};
 const denied=await clipAnalysisRoute(req(''),env,fetcher);assert.equal(denied.status,400);assert.equal(calls,0);
 const allowed=await clipAnalysisRoute(req('quick-video'),env,fetcher);assert.equal(allowed.status,200);assert.equal((await allowed.json()).rows.length,2);assert.equal(calls,2);
});
