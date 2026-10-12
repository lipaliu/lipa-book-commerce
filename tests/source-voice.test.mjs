import test from 'node:test';import assert from 'node:assert/strict';
import {voiceRoute,copyAudioRange} from '../client/source-voice.mjs';
test('unchanged narration reuses source without TTS; edits never silently reuse mismatched audio',()=>{
 assert.equal(voiceRoute({vo:'原文',originalText:'原文'},true),'original');
 assert.equal(voiceRoute({vo:'修改文字',originalText:'原文',voiceMode:'original'},true),'tts');
 assert.equal(voiceRoute({vo:'原文',originalText:'原文',voiceMode:'tts'},true),'tts');
 assert.equal(voiceRoute({vo:'原文',originalText:'原文'},false),'tts');
 assert.equal(voiceRoute({vo:'',originalText:'原文'},true),'silent');
});
test('audio reuse copies exact source range and channels, without moving source or truncating silently',()=>{
 const a={sampleRate:10,duration:4,length:40,numberOfChannels:2,getChannelData:c=>Float32Array.from({length:40},(_,i)=>i+c*100)};
 const create=(channels,length,rate)=>{const pcm=Array.from({length:channels},()=>new Float32Array(length));return{length,sampleRate:rate,getChannelData:c=>pcm[c]};};
 const out=copyAudioRange(a,1,2.5,create);assert.equal(out.length,15);assert.deepEqual([...out.getChannelData(0)],Array.from({length:15},(_,i)=>i+10));assert.equal(out.getChannelData(1)[0],110);
 assert.throws(()=>copyAudioRange(a,1,5,create));assert.throws(()=>copyAudioRange(a,-1,1,create));
});
