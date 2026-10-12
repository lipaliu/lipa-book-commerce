import test from 'node:test';
import assert from 'node:assert/strict';
import {splitTimedReference} from '../server/clip-segments.mjs';
test('fixed intervals preserve the complete source duration and select actual in-range frames',()=>{
 const source={duration:60,segments:[{words:[{start:9,end:11,text:'边界'},{start:20,end:21,text:'下一段'}]}]};
 const rows=splitTimedReference(source,[{time:10,imageUrl:'/real.jpg'}],10);
 assert.equal(rows.length,6);assert.equal(rows.reduce((n,r)=>n+r.seconds,0),60);
 assert.equal(rows[0].vo,'');assert.equal(rows[1].vo,'边界');assert.equal(rows[2].vo,'下一段');
 assert.equal(rows[0].frame,null);assert.equal(rows[1].frame.imageUrl,'/real.jpg');
 assert.ok(rows.every(r=>r.included));assert.equal(splitTimedReference(source,[],15).length,4);
});
test('remainder is retained and missing speech remains empty instead of invented',()=>{
 const rows=splitTimedReference({duration:25.7,segments:[]},[],10);
 assert.deepEqual(rows.map(r=>r.seconds),[10,10,5.7]);
 assert.ok(rows.every(r=>r.vo===''&&r.transcriptStatus==='not_recognized'));
 assert.throws(()=>splitTimedReference({duration:0}));
 assert.throws(()=>splitTimedReference({duration:60},[],0));
});
test('new references default to 15 seconds and preserve a short tail',()=>{
 const rows=splitTimedReference({duration:61.5,segments:[]});
 assert.deepEqual(rows.map(r=>r.seconds),[15,15,15,15,1.5]);
 assert.equal(rows.at(-1).end,61.5);
});
