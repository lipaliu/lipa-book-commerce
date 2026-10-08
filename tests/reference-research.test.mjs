import test from 'node:test';import assert from 'node:assert/strict';
import {rankReferences,validateDirections} from '../server/reference-research.mjs';
import {generateStudioPlan} from '../server/studio.mjs';
test('reference directions require literal evidence from the same supplied books and deduplicate references',()=>{
 const samples=[{id:'a',body:'普通人读不懂古文，可以从漫画开始。'},{id:'b',body:'家庭教育需要具体沟通，不是只靠道理。'}];
 const d=validateDirections(JSON.stringify({directions:[{name:'漫画入门',evidence:[{sampleId:'a',quote:'读不懂古文，可以从漫画开始'}]},{name:'虚构方向',evidence:[{sampleId:'a',quote:'这本书每年销售一亿本'}]},{name:'其他书',evidence:[{sampleId:'other',quote:'普通人读不懂古文，可以从漫画开始。'}]},{name:'重复方向',evidence:[{sampleId:'a',quote:'读不懂古文，可以从漫画开始'}]}]}),samples);
 assert.equal(d.length,1);assert.equal(d[0].evidence[0].sampleId,'a');
});
test('rank keeps unknown metrics last without mutating the input',()=>{const input=[{id:'a',sales_band:'未取得'},{id:'b',sales_band:'1w-2.5w'},{id:'c',sales_band:'10w-25w'}];assert.deepEqual(rankReferences(input).map(x=>x.id),['c','b','a']);assert.equal(input[0].id,'a');});
test('candidate reference storyboard plans use actual AI and preserve the requested variant',async()=>{
 let prompt;const ai={run:async(model,args)=>{prompt=JSON.parse(args.messages[1].content.split('\n/no_think')[0]);return {response:JSON.stringify({shots:[{vo:'读这本书，先看具体的问题。',visual:'桌前读者打开一本无字样书本。'},{vo:'对照自己的生活，理解这个意思。',visual:'读者在窗边笔记本上记下问题。'}]})}}};
 const plan=await generateStudioPlan(ai,{product:'测试书',body:'读者提问以后，再用现实中的具体情况去解释。'},{mode:'reference',formatId:'quote',duration:30,adaptReference:true,variant:3},{});
 assert.notEqual(plan.model,'original_reference');assert.equal(prompt.variant,3);assert.equal(plan.shots.length,2);
});
