import test from 'node:test';
import assert from 'node:assert/strict';
import {validateQuickVO,parseQuickVO,quickVOPlan} from '../server/quick-vo.mjs';
const response=segments=>({choices:[{message:{content:JSON.stringify({segments})}}]});
test('VO planning preserves every original word and rejects model rewriting',()=>{
 const input=validateQuickVO({text:'读一本书。想一件事。'});
 assert.equal(parseQuickVO(response([{vo:'读一本书，',prompt:'书桌前看书'},{vo:'想一件事。',prompt:'放下书思考'}]),input).length,2);
 assert.throws(()=>parseQuickVO(response([{vo:'多读书。',prompt:'看书'}]),input),/遗漏/);
});
test('audio fixes total duration including a very short final remainder',()=>{
 const rows=parseQuickVO(response([{vo:'甲',prompt:'甲画面'},{vo:'乙',prompt:'乙画面'}]),{text:'甲乙',duration:15.2});
 assert.equal(rows[0].seconds+rows[1].seconds,15.2);assert.equal(rows[1].seconds,.5);
 assert.throws(()=>parseQuickVO(response([{vo:'甲乙',prompt:'画面'}]),{text:'甲乙',duration:30}),/段数/);
});
test('planning calls understanding model rather than local text splitting',async()=>{
 let calls=0;
 const result=await quickVOPlan({model:'qwen3.5-plus',provider:'alibaba',run:async(model,payload)=>{calls++;assert.equal(model,'qwen3.5-plus');assert.match(payload.messages[1].content,/读书/);return response([{vo:'读书',prompt:'一个人靠窗读书'}]);}},validateQuickVO({text:'读书'}));
 assert.equal(calls,1);assert.equal(result.rows[0].seconds,15);
});
test('invalid VO and incomplete prompt results are rejected',()=>{
 assert.throws(()=>validateQuickVO({text:''}));assert.throws(()=>validateQuickVO({text:'读书',duration:601}));
 assert.throws(()=>parseQuickVO(response([{vo:'读书',prompt:''}]),{text:'读书'}));
});
