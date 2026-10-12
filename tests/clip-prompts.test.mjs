import test from 'node:test';
import assert from 'node:assert/strict';
import {fillPromptRows} from '../client/clip-prompts.mjs';
test('automatic prompt fill preserves edits and never processes excluded or reused rows',async()=>{
 const rows=[{included:true,visual:'自己写的'},{included:true,visual:''},{included:false,visual:''},{included:true,outputMode:'original',visual:''}];let calls=0;
 await fillPromptRows(rows,async()=>{calls++;return '模型描述';},{automatic:true});
 assert.equal(calls,1);assert.equal(rows[0].visual,'自己写的');assert.equal(rows[1].visual,'模型描述');
 await fillPromptRows(rows,async()=>{calls++;},{automatic:true});assert.equal(calls,1);
});
test('partial failures save success and require explicit retry rather than repeated entry calls',async()=>{
 const rows=[{included:true,visual:''},{included:true,visual:''}];let saved=0,calls=0;
 const errors=await fillPromptRows(rows,async r=>{calls++;if(r===rows[0])throw Error('临时失败');return '已完成';},{automatic:true,persist:async()=>{saved++;}});
 assert.equal(errors.length,1);assert.equal(rows[1].visual,'已完成');assert.equal(saved,4);
 await fillPromptRows(rows,async()=>{calls++;},{automatic:true});assert.equal(calls,2);
 await fillPromptRows(rows,async()=>{calls++;return '重试成功';});assert.equal(calls,3);assert.equal(rows[0].visual,'重试成功');assert.equal(rows[0].promptError,undefined);
});
test('leaving the workbench stops starting subsequent model calls',async()=>{
 let current=true,calls=0;const rows=[{included:true},{included:true}];
 await fillPromptRows(rows,async()=>{calls++;current=false;return '第一段';},{isCurrent:()=>current});assert.equal(calls,1);
});
