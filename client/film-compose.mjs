// Join existing media locally. No AI request, quota usage, or external upload.
export async function composeFilm(clips,onProgress,{voiceBlob=null}={}){
 if(!clips.length)throw Error('没有可拼接的视频');
 if(!window.MediaRecorder)throw Error('当前浏览器暂不支持完整视频导出，请使用Chrome');
 const mime=['video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('当前浏览器不支持WebM导出');
 const owned=[],players=[],ctx=new AudioContext();let stream,recorder,raf,guard;const chunks=[];
 const canvas=document.createElement('canvas');canvas.width=576;canvas.height=1024;const g=canvas.getContext('2d');let current,voiceNode,fullVoiceNode,fullVoiceDone;
 function draw(){g.fillStyle='#111';g.fillRect(0,0,576,1024);if(current?.readyState>=2){const scale=Math.min(576/current.videoWidth,1024/current.videoHeight),w=current.videoWidth*scale,h=current.videoHeight*scale;g.drawImage(current,(576-w)/2,(1024-h)/2,w,h);}raf=requestAnimationFrame(draw);}
 try{
 await ctx.resume();const dest=ctx.createMediaStreamDestination();if(voiceBlob){const audio=await ctx.decodeAudioData(await voiceBlob.arrayBuffer());if(audio.duration>clips.reduce((n,c)=>n+c.seconds,0)+.05)throw Error('完整旁白长于拼接方案，请重新匹配时长');fullVoiceNode=ctx.createBufferSource();fullVoiceNode.buffer=audio;fullVoiceNode.connect(dest);fullVoiceDone=new Promise(resolve=>fullVoiceNode.onended=resolve);}
 for(let i=0;i<clips.length;i++){
  onProgress(`正在准备第 ${i+1} / ${clips.length} 段…`);
  const c=clips[i],v=document.createElement('video');v.crossOrigin='anonymous';v.playsInline=true;v.preload='auto';v.setAttribute('aria-label','正在合成的第'+(i+1)+'段视频');v.style.cssText='position:fixed;right:18px;bottom:18px;width:180px;max-height:320px;z-index:9999;background:#111;pointer-events:none';document.body.append(v);players.push(v);
  const src=c.blob?URL.createObjectURL(c.blob):c.url;if(c.blob)owned.push(src);v.src=src;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`第${i+1}段视频加载超时`)),45000);v.onloadeddata=()=>{clearTimeout(timer);resolve();};v.onerror=()=>{clearTimeout(timer);reject(Error(`第${i+1}段视频无法读取`));};});
  if(c.start>0)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('视频定位超时')),15000);v.onseeked=()=>{clearTimeout(timer);resolve();};v.currentTime=c.start;});
  if(Number.isFinite(v.duration)&&v.duration+.1<c.start+c.seconds)throw Error(`第${i+1}段视频短于所需时长，请调整秒数`);
  v._audio=ctx.createMediaElementSource(v);
  if(c.voiceBlob){v._voice=await ctx.decodeAudioData(await c.voiceBlob.arrayBuffer());if(v._voice.duration>c.seconds+.05)throw Error(`第${i+1}段旁白超过视频时长`);}
 }
 stream=canvas.captureStream(25);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2400000});
 let recordingError;const stopped=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;recorder.onerror=e=>{recordingError=e.error||Error('视频合成失败');};});
 current=players[0];draw();recorder.start(250);
 for(let i=0;i<players.length;i++){
  const v=players[i],c=clips[i];current=v;const gain=ctx.createGain();gain.gain.value=c.muteSource?0:1;v._audio.connect(gain);gain.connect(dest);if(v._voice){voiceNode=ctx.createBufferSource();voiceNode.buffer=v._voice;voiceNode.connect(dest);}onProgress(`正在合成第 ${i+1} / ${clips.length} 段，请保持页面打开…`);
  await new Promise((resolve,reject)=>{let settled=false;const finish=err=>{if(settled)return;settled=true;clearInterval(guard);v.pause();v._audio.disconnect();gain.disconnect();if(voiceNode){try{voiceNode.stop();}catch{}voiceNode.disconnect();voiceNode=null;}v.onended=null;v.onerror=null;err?reject(err):resolve();};const started=performance.now();v.onended=()=>finish();v.onerror=()=>finish(Error(`第${i+1}段播放失败`));guard=setInterval(()=>{if(recordingError)return finish(recordingError);if(v.currentTime>=c.start+c.seconds-.025)return finish();if(performance.now()-started>(c.seconds+30)*1000)finish(Error('第'+(i+1)+'段播放受阻（'+v.currentTime.toFixed(1)+'/'+(c.start+c.seconds).toFixed(1)+'秒），已保留原文件，可重试合成'));},20);v.play().then(()=>{voiceNode?.start();if(i===0)fullVoiceNode?.start();}).catch(finish);});
 }
 if(fullVoiceDone){onProgress('正在保留完整旁白结尾…');let tailTimer;try{await Promise.race([fullVoiceDone,new Promise((_,reject)=>tailTimer=setTimeout(()=>reject(Error('旁白播放受阻，已保留视频与配音，请重试合成')),15000))]);}finally{clearTimeout(tailTimer);}}
 recorder.stop();await stopped;if(recordingError)throw recordingError;const blob=new Blob(chunks,{type:mime});if(blob.size<100)throw Error('视频合成结果为空');return blob;
 }finally{clearInterval(guard);cancelAnimationFrame(raf);if(recorder&&recorder.state!=='inactive')recorder.stop();try{voiceNode?.stop();}catch{}try{fullVoiceNode?.stop();}catch{}players.forEach(v=>{v.pause();v.removeAttribute('src');v.load();v.remove();});stream?.getTracks().forEach(t=>t.stop());await ctx.close();owned.forEach(u=>URL.revokeObjectURL(u));}
}
