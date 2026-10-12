import test from 'node:test';import assert from 'node:assert/strict';
import {understandingAI,analysisCapabilities,readChatResult,ALIBABA_TEXT_MODEL} from '../server/understanding.mjs';
test('understanding uses configured Volcengine, otherwise Alibaba only',async()=>{
 let chosen;const fallback=understandingAI({AI:{run:async model=>{chosen=model;return {};}}});await fallback.run('untrusted-model',{});assert.equal(chosen,ALIBABA_TEXT_MODEL);assert.equal(fallback.provider,'alibaba');
 const volc=understandingAI({ARK_API_KEY:'test-secret',ARK_TEXT_MODEL:'doubao-seed-2-0-lite-260428'},async(url,opt)=>{assert.match(url,/ark.cn-beijing.volces.com/);assert.equal(JSON.parse(opt.body).model,'doubao-seed-2-0-lite-260428');return Response.json({choices:[]});});await volc.run('untrusted-model',{});assert.equal(volc.provider,'volcengine');
});
test('vision-only and other vendors cannot silently stand in for audio-video analysis',async()=>{
 const result=await analysisCapabilities('test',async()=>Response.json({data:[{id:'qwen3.5-plus'},{id:'gemini-2.5-flash-official'},{id:'doubao-seedream-4-5'}]}));assert.equal(result.videoReady,false);assert.equal(result.videoModel,null);
});
test('streaming understanding rejects interrupted and truncated responses',async()=>{
 const res=text=>new Response(text,{headers:{'content-type':'text/event-stream'}});
 const data='data: '+JSON.stringify({choices:[{delta:{content:'hello'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n';assert.equal((await readChatResult(res(data))).choices[0].message.content,'hello');
 await assert.rejects(()=>readChatResult(res('data: '+JSON.stringify({choices:[{delta:{content:'partial'}}]})+'\n')),/中断/);
});
test('ToAPIs connection routes understanding to Alibaba Qwen without changing video model',async()=>{let sent;const ai=understandingAI({TOAPIS_TEXT_KEY:'test-only'},async(url,opt)=>{assert.equal(url,'https://toapis.cn/v1/chat/completions');sent=JSON.parse(opt.body);return Response.json({choices:[{message:{content:'完成'}}]});});const result=await ai.run('MiniMax-H3',{messages:[{role:'user',content:'test'}]});assert.equal(sent.model,'qwen3.5-plus');assert.equal(sent.enable_thinking,false);assert.equal(ai.provider,'alibaba');assert.equal(result.choices[0].message.content,'完成');});
