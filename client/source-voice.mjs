// Reuse actual source audio. This does not transcribe, interpret, or rewrite media.
export function voiceRoute(row,hasSource){
 if(row.voiceMode==='tts')return 'tts';
 if(hasSource&&String(row.vo||'').trim()===String(row.originalText||'').trim())return 'original';
 return row.vo?.trim()?'tts':'silent';
}
export function copyAudioRange(audio,start,end,createBuffer){
 const rate=audio.sampleRate;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||start>=audio.duration||end>audio.duration+.1)throw Error('原声时间范围无效，请核对原片');
 const from=Math.round(start*rate),to=Math.min(audio.length,Math.round(end*rate));
 const out=createBuffer(audio.numberOfChannels,to-from,rate);
 for(let c=0;c<audio.numberOfChannels;c++)out.getChannelData(c).set(audio.getChannelData(c).subarray(from,to));
 return out;
}
