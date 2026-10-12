// Time buckets are editorial units, not detected camera cuts.
export function splitTimedReference(source,frames=[],seconds=15){
 if(!Number.isFinite(seconds)||seconds<5||seconds>30)throw Error('每段时长需为5至30秒');
 const duration=Number(source?.duration);if(!Number.isFinite(duration)||duration<=0||duration>1800)throw Error('缺少可核对的原视频时长');
 const rows=Array.from({length:Math.ceil(duration/seconds)},(_,i)=>({id:'clip-'+(i+1),start:i*seconds,end:Math.min(duration,(i+1)*seconds),text:'',included:true}));
 for(const s of source.segments||[]){const units=s.words?.length?s.words:[s];for(const w of units){const t=(Number(w.start)+Number(w.end))/2;if(!Number.isFinite(t)||t<0||t>duration)continue;const row=rows[Math.min(rows.length-1,Math.floor(t/seconds))];row.text+=w.text||'';}}
 return rows.map(r=>{const frame=frames.filter(f=>f.time>=r.start&&f.time<r.end).sort((a,b)=>a.time-b.time)[0];return {...r,seconds:Math.round((r.end-r.start)*100)/100,originalText:r.text,vo:r.text,visual:'',kind:'generated_scene',frame:frame||null,transcriptStatus:r.text?'machine_unreviewed':'not_recognized'};});
}
