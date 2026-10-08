import test from 'node:test';import assert from 'node:assert/strict';
import {generateStudioPlan,parseStudioPlan,validateStudioInput} from '../server/studio.mjs';
import {buildProduction} from '../server/production.mjs';
const source={id:'test',product:'中国神仙',category:'科普',body:'先看书的目录。再看一个具体例子。最后确认版本。根据需要选择。'};
const input={mode:'book',formatId:'quote',duration:60};
test('reference creation preserves source wording without forcing an AI rewrite',async()=>{const r=await generateStudioPlan(null,source,{...input,mode:'reference'},{});assert.equal(r.shots.map(s=>s.vo).join(''),source.body);assert.equal(r.model,'original_reference');assert.equal(r.excerpt,false);});
test('unavailable AI and invalid or overlong output do not pretend a plan was generated',async()=>{await assert.rejects(generateStudioPlan(null,source,input,{}),/尚未连接/);assert.throws(()=>parseStudioPlan('not json',30),/格式/);assert.throws(()=>parseStudioPlan(JSON.stringify({shots:[{vo:'a',visual:'b'}]}),30),/分镜/);assert.throws(()=>validateStudioInput({...input,duration:999}),/请选择/);});
test('AI receives source, chosen form and actual audience fields, and returns editable shots',async()=>{const mock={run:async(model,args)=>{assert.match(args.messages[1].content,/中国神仙/);assert.match(args.messages[1].content,/经典语录/);return {response:JSON.stringify({shots:[{vo:'先看目录。',visual:'人在书桌前翻阅真实书籍。',kind:'real_product'},{vo:'再看内容。',visual:'一个人在书桌边思考。',kind:'generated_scene'}]})};}};const r=await generateStudioPlan(mock,source,input,{});assert.equal(r.shots.length,2);assert.equal(r.shots[0].kind,'real_product');});
test('longer finished videos retain their total duration without expanding model clip limits',()=>{for(const duration of [60,90]){const p=buildProduction({id:'q',script:'一。\n\n二。\n\n三。\n\n四。'},source,{template:'reading'},{durationSeconds:duration});assert.equal(p.estimatedDurationSeconds,duration);assert.equal(p.shots.reduce((n,s)=>n+s.timelineDurationSeconds,0),duration);assert.ok(p.shots.every(s=>s.durationSeconds<=15));}});

import {modelText} from '../server/ai-editor.mjs';
test('Cloudflare structured response does not hide OpenAI message content',()=>{assert.equal(modelText({response:{shots:[]},choices:[{message:{content:'{"shots":[]}'}}]}),'{"shots":[]}');assert.equal(modelText({response:'旁白'}),'旁白');assert.equal(modelText({response:{shots:[]}}),'{"shots":[]}');});

test('known reference keeps captured text aligned with its actual source frame',async()=>{const r=await generateStudioPlan(null,{...source,id:'D60-0003'},{...input,mode:'reference'},{});assert.equal(r.shots.length,12);assert.equal(r.sourceFrames.length,12);assert.equal(r.sourceFrames[4].shotId,'extra-1');assert.match(r.shots[0].vo,/科普博主/);assert.equal(r.sourceFrames[0].referenceId,'ref-1');});
