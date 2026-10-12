import test from 'node:test';import assert from 'node:assert/strict';
import {referenceVideoResponse} from '../server/reference-video-response.mjs';
const assets={fetch:async()=>new Response(Uint8Array.from([0,1,2,3,4]),{headers:{'content-type':'video/mp4'}})};
test('reference playback supports exact byte seeking, suffix requests and invalid ranges',async()=>{
 const request=range=>new Request('https://test/reference-videos/a.mp4',{headers:{Range:range}});
 const r=await referenceVideoResponse(request('bytes=1-3'),assets);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 1-3/5');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[1,2,3]);
 const last=await referenceVideoResponse(request('bytes=-2'),assets);assert.deepEqual([...new Uint8Array(await last.arrayBuffer())],[3,4]);
 assert.equal((await referenceVideoResponse(request('bytes=7-9'),assets)).status,416);
});
