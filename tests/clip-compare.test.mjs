import test from 'node:test';
import assert from 'node:assert/strict';
import {bindComparison} from '../client/clip-compare.mjs';
class Media extends EventTarget {
 constructor(duration){super();this.duration=duration;this.currentTime=0;this.paused=true;this.readyState=4;this.muted=false;}
 async play(){this.paused=false;}
 pause(){this.paused=true;}
 fire(type){this.dispatchEvent(new Event(type));}
}
function setup(){const ui={left:new Media(96),right:new Media(15),start:30,duration:15,toggle:{},seek:{},clock:{},sound:{value:'original'},status:{}};const close=bindComparison(ui);return {...ui,close};}
test('comparison maps original 30–45 to generated 0–15, seeks both and stops at range end',async()=>{
 const p=setup();await p.toggle.onclick();assert.equal(p.left.currentTime,30);assert.equal(p.right.currentTime,0);assert.equal(p.left.paused,false);
 p.left.currentTime=35;p.right.currentTime=3;p.left.fire('timeupdate');assert.equal(p.right.currentTime,5);
 p.seek.value=8;p.seek.oninput();assert.equal(p.left.currentTime,38);assert.equal(p.right.currentTime,8);assert.ok(p.left.paused&&p.right.paused);
 await p.toggle.onclick();p.left.currentTime=45.1;p.left.fire('timeupdate');assert.ok(p.left.paused&&p.right.paused);assert.equal(p.left.currentTime,45);assert.equal(p.right.currentTime,15);
 await p.toggle.onclick();assert.equal(p.left.currentTime,30);assert.equal(p.right.currentTime,0);p.close();
});
test('audio is exclusive and shorter media bounds comparison without changing playback speed',async()=>{
 const p=setup();assert.equal(p.left.muted,false);assert.equal(p.right.muted,true);p.sound.value='generated';p.sound.onchange();assert.equal(p.left.muted,true);assert.equal(p.right.muted,false);
 p.sound.value='none';p.sound.onchange();assert.ok(p.left.muted&&p.right.muted);
 p.right.duration=10;p.right.fire('loadedmetadata');assert.equal(p.seek.max,10);
 await p.toggle.onclick();p.right.currentTime=10;p.right.fire('timeupdate');assert.ok(p.left.paused&&p.right.paused);assert.equal(p.left.currentTime,40);p.close();
});
test('closing removes controls and prevents pending play from continuing',async()=>{
 const p=setup();await p.toggle.onclick();p.right.fire('waiting');assert.match(p.status.textContent,/缓冲/);await p.toggle.onclick();
 let resolve;p.right.play=()=>new Promise(r=>{resolve=r;});const pending=p.toggle.onclick();p.close();resolve();await pending;assert.ok(p.left.paused&&p.right.paused);assert.equal(p.toggle.onclick,null);
});
test('initial seek buffering does not cancel the first play request',async()=>{
 const p=setup();p.right.play=async()=>{p.right.fire('waiting');p.right.paused=false;};await p.toggle.onclick();assert.equal(p.left.paused,false);assert.equal(p.right.paused,false);assert.equal(p.toggle.textContent,'暂停两边');p.close();
});
