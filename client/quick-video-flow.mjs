// Orchestrate model work; no local transcription or semantic segmentation.
export async function runReferenceFlow(draft,{analyze,prepareAudio,persist,generate,compose,progress}){
 if(!draft.source)throw Error('请先选择或上传一条对标视频');
 if(!draft.audioReady){progress('正在保留原视频声音…');const a=await prepareAudio(draft.source);draft.audio=a.blob;draft.audioDuration=a.duration;draft.audioReady=true;await persist();}
 if(!draft.rows?.length){progress('AI正在读取原片声音与画面，自动准备15秒提示词…');const result=await analyze(draft.source);if(!result.rows?.length)throw Error('原片尚未返回分段，未提交视频生成');draft.rows=result.rows;draft.analysis=result.analysis;draft.warning=result.warning||'';draft.duration=result.duration;await persist();}
 if(draft.rows.some(r=>!r.visual?.trim()))throw Error('部分画面提示词未返回，尚未提交生成。请展开提示词补齐后继续。');
 // Preserve the audio tail if the container has a slightly longer audio track.
 const total=draft.rows.reduce((n,r)=>n+r.seconds,0);if(draft.audioDuration>total){draft.rows.at(-1).seconds+=draft.audioDuration-total;await persist();}
 await generate(draft.rows);
 const clips=draft.rows.flatMap(r=>(r.modelParts||[]).map(p=>({blob:p.modelRaw,start:0,seconds:p.seconds,muteSource:true})));
 if(!clips.length||draft.rows.some(r=>!r.modelParts?.length)||clips.some(c=>!c.blob))throw Error('仍有视频片段未完成，已完成结果保留，不会用原片补入');
 progress('正在合成新视频与原声…');draft.film=await compose(clips,progress,{voiceBlob:draft.audio});await persist();progress('新视频已完成，可以播放和下载');
}
export function encodeWav(buffer){
 const n=buffer.length,c=buffer.numberOfChannels,ab=new ArrayBuffer(44+n*c*2),v=new DataView(ab),str=(p,s)=>[...s].forEach((x,i)=>v.setUint8(p+i,x.charCodeAt(0)));
 str(0,'RIFF');v.setUint32(4,36+n*c*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,c,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*c*2,true);v.setUint16(32,c*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*c*2,true);for(let i=0;i<n;i++)for(let j=0;j<c;j++)v.setInt16(44+(i*c+j)*2,Math.max(-1,Math.min(1,buffer.getChannelData(j)[i]))*32767,true);return new Blob([ab],{type:'audio/wav'});
}
