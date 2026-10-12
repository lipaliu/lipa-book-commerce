export function filmPlan(rows,hasOriginal,{allowOriginal=false}={}){
 const selected=rows.filter(r=>r.included);
 if(!selected.length)throw Error('请至少选中一段');
 const missingOriginal=[],needsGeneration=[];
 selected.forEach(r=>{if(allowOriginal&&r.outputMode==='original'){if(!hasOriginal(r))missingOriginal.push(r.id);}else if(!r.video||r.videoKind!=='model')needsGeneration.push(r.id);});
 return {rows:selected,seconds:selected.reduce((n,r)=>n+r.seconds,0),missingOriginal,needsGeneration,allowOriginal};
}
// Final output is built from result blobs, never the comparison player or its source URL.
export function filmClips(plan,sourceMedia){
 return plan.rows.map(r=>{
  if(plan.allowOriginal&&r.outputMode==='original'){const m=sourceMedia(r);if(!m)throw Error('原片尚未取得');return {url:m.url,start:m.start,seconds:r.seconds};}
  if(!r.video||r.videoKind!=='model')throw Error('第'+(plan.rows.indexOf(r)+1)+'段新视频尚未生成，不能用原片补入成片');
  return {blob:r.video,start:0,seconds:r.seconds};
 });
}
export function filmSignature(d){return JSON.stringify({rows:d.rows.filter(r=>r.included).map(r=>({id:r.id,mode:r.outputMode,start:r.start,end:r.end,seconds:r.seconds,vo:r.vo,visual:r.visual,video:r.video?.size,revision:r.videoRevision})),source:d.originalVideo?{size:d.originalVideo.size,name:d.originalVideo.name,modified:d.originalVideo.lastModified}:null});}
