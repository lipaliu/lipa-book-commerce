// Only coordinates existing players. No recognition, generation or network model calls.
export function bindComparison({left,right,toggle,seek,clock,sound,status,start,duration}) {
 let running=false,starting=false,disposed=false,epoch=0;
 const listeners=[];
 const on=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));};
 const limit=()=>Math.max(0,Math.min(duration,Number.isFinite(left.duration)?left.duration-start:duration,Number.isFinite(right.duration)?right.duration:duration));
 const elapsed=()=>Math.max(0,Math.min(limit(),left.currentTime-start));
 const update=()=>{seek.max=limit();seek.value=elapsed();clock.textContent=`${elapsed().toFixed(1)} / ${limit().toFixed(1)} 秒`;toggle.textContent=running||starting?'暂停两边':'同步播放';};
 const audio=()=>{left.muted=sound.value!=='original';right.muted=sound.value!=='generated';};
 const pause=()=>{running=false;starting=false;epoch++;left.pause();right.pause();update();};
 const position=t=>{t=Math.max(0,Math.min(limit(),t));left.currentTime=start+t;right.currentTime=t;update();};
 const play=async()=>{
  if(running||starting){pause();return;}
  if(!limit()){status.textContent='本段视频时长不足，无法对比';return;}
  if(elapsed()>=limit()-.05||left.currentTime<start)position(0);else right.currentTime=elapsed();
  const ticket=++epoch;starting=true;audio();update();status.textContent='';
  try{await Promise.all([left.play(),right.play()]);if(disposed||ticket!==epoch){left.pause();right.pause();}else{starting=false;running=true;update();}}
  catch{if(!disposed){pause();status.textContent='视频未能播放，请检查加载状态后重试';}}
 };
 const tick=()=>{if(!running)return;const t=left.currentTime-start;if(t>=limit()-.025||right.currentTime>=limit()-.025){pause();position(limit());return;}if(Math.abs(right.currentTime-t)>.25&&right.readyState>=3&&left.readyState>=3&&!right.seeking&&!left.seeking)right.currentTime=Math.max(0,t);update();};
 toggle.onclick=play;left.onclick=play;right.onclick=play;sound.onchange=audio;
 seek.oninput=()=>{const t=Number(seek.value);pause();position(t);};
 on(left,'loadedmetadata',()=>{left.currentTime=start;update();});on(right,'loadedmetadata',update);
 on(left,'timeupdate',tick);on(right,'timeupdate',tick);
 for(const v of [left,right]){on(v,'ended',pause);on(v,'error',()=>{pause();status.textContent='视频加载失败，请关闭后重新打开对比';});on(v,'waiting',()=>{if(running||starting)status.textContent='正在缓冲…';});on(v,'playing',()=>{status.textContent='';});}
 if(left.readyState>=1)left.currentTime=start;audio();update();
 return ()=>{disposed=true;pause();listeners.forEach(off=>off());toggle.onclick=seek.oninput=sound.onchange=left.onclick=right.onclick=null;};
}
