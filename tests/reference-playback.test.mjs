import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveReferenceClip} from '../client/reference-playback.mjs';
const source={url:'/source.mp4',clips:[{start:10,end:20,url:'/10-20.mp4'}]};
test('actual cut files play from zero and use source duration independently of output seconds',()=>{
 assert.deepEqual(resolveReferenceClip({start:10,end:20,seconds:6},source),{url:'/10-20.mp4',start:0,end:10,duration:10,isFile:true});
});
test('custom intervals keep their range; uploaded file overrides a hosted reference; manual rows have no fake source',()=>{
 assert.deepEqual(resolveReferenceClip({start:7,end:14},source),{url:'/source.mp4',start:7,end:14,duration:7,isFile:false});
 assert.equal(resolveReferenceClip({start:10,end:20},source,'blob:local').url,'blob:local');
 assert.equal(resolveReferenceClip({start:null,end:null},source),null);
 assert.equal(resolveReferenceClip({start:10,end:20},null),null);
});
