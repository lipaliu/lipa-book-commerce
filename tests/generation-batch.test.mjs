import test from 'node:test';import assert from 'node:assert/strict';import {generateRows} from '../client/generation-batch.mjs';
test('model batch caps concurrency, calls each row once and waits for successes before reporting failure',async()=>{
 let running=0,peak=0;const called=[],done=[];
 await assert.rejects(generateRows([{id:'a'},{id:'b'},{id:'c'}],async r=>{called.push(r.id);running++;peak=Math.max(peak,running);await new Promise(ok=>setTimeout(ok,5));running--;if(r.id==='a')throw Error('provider rejected');done.push(r.id);}),/未用原片替补/);
 assert.equal(peak,2);assert.deepEqual(called.sort(),['a','b','c']);assert.deepEqual(done.sort(),['b','c']);assert.equal(running,0);
});
test('account rejection stops remaining submissions and identifies row numbers',async()=>{
 const called=[];await assert.rejects(generateRows([{id:'uuid-a'},{id:'uuid-b'},{id:'uuid-c'}],async r=>{called.push(r.id);throw Object.assign(Error('quota'),{httpStatus:403});},1),e=>/第1段/.test(e.message)&&/暂停/.test(e.message)&&!e.message.includes('uuid'));
 assert.deepEqual(called,['uuid-a']);
});
