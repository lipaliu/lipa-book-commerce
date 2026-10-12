// Playback boundaries only: these do not analyze or alter the source video.
export function bindReferencePlayer(wrapper){
 const video=wrapper.querySelector('video'),toggle=wrapper.querySelector('[data-source-toggle]'),seek=wrapper.querySelector('[data-source-seek]'),clock=wrapper.querySelector('[data-source-clock]'),mute=wrapper.querySelector('[data-source-mute]');
 const start=Number(video.dataset.start),end=Number(video.dataset.end),duration=end-start;
 const time=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const update=()=>{const elapsed=Math.max(0,Math.min(duration,video.currentTime-start));seek.value=elapsed;clock.textContent=time(elapsed)+' / '+time(duration);toggle.textContent=video.paused?'播放本段':'暂停';mute.textContent=video.muted?'打开原声':'静音';};
 const play=async()=>{if(!video.paused){video.pause();return;}try{if(video.currentTime<start||video.currentTime>=end-.05)video.currentTime=start;await video.play();}catch{clock.textContent='加载失败，请重新播放';}};
 toggle.onclick=play;video.onclick=play;
 mute.onclick=()=>{video.muted=!video.muted;update();};
 seek.oninput=()=>{video.currentTime=start+Number(seek.value);update();};
 video.addEventListener('loadedmetadata',()=>{if(video.currentTime<start)video.currentTime=start;update();});
 video.addEventListener('play',()=>{if(video.currentTime<start||video.currentTime>=end-.05)video.currentTime=start;update();});
 video.addEventListener('pause',update);video.addEventListener('volumechange',update);
 video.addEventListener('seeking',()=>{if(video.currentTime<start-.05)video.currentTime=start;if(video.currentTime>end)video.currentTime=end;});
 video.addEventListener('timeupdate',()=>{if(video.currentTime>=end){video.pause();if(video.currentTime>end+.1)video.currentTime=end;}update();});
 video.addEventListener('error',()=>{clock.textContent='原视频加载失败，请重试';},{once:true});
 update();
}
