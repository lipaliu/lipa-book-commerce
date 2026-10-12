import {videoTaskFingerprint} from './video-model.mjs';
export function narratedPlan(row,connection){
 const requested=Number(row.seconds),voice=row.voice?Number(row.voiceSeconds):0;
 if(!Number.isFinite(requested)||requested<.5||requested>1800)throw Error('本段时长无效');
 if(!Number.isFinite(voice)||voice<0)throw Error('旁白时长尚未读取，请重做旁白后继续');
 const total=voice>requested?Math.ceil((voice+.15)*10)/10:requested;
 const max=connection.provider==='seedance'&&/seedance-1-/.test(connection.model)?12:15;
 const parts=[];for(let offset=0;offset<total-.001;){const seconds=Math.min(max,Math.round((total-offset)*1000)/1000);parts.push({offset,seconds});offset=Math.round((offset+seconds)*1000)/1000;}
 return {seconds:total,parts,extended:total>requested,max};
}
export function fitNarrationDuration(row,connection){
 const plan=narratedPlan(row,connection);
 if(plan.extended){row.autoDuration={from:row.autoDuration?.from||row.seconds,voice:row.voiceSeconds,to:plan.seconds};row.seconds=plan.seconds;}
 return plan;
}
const failed=t=>['failed','rejected','cancelled','expired'].includes(t?.status);
const uncertain=t=>['submission_uncertain','submitting'].includes(t?.status);
// Packaging follows measured audio duration. Narration and source ranges are never rewritten.
export async function obtainNarratedParts(row,connection,prompt,{sampleId,request,persist,progress,sleep=ms=>new Promise(r=>setTimeout(r,ms)),uuid=()=>crypto.randomUUID()}){
 const plan=narratedPlan(row,connection);
 const fingerprint=videoTaskFingerprint({...row,seconds:plan.seconds},prompt,connection);
 if(row.modelPartsFingerprint!==fingerprint){
  const legacy=plan.parts.length===1&&row.modelTask?.fingerprint===fingerprint;
  row.modelParts=plan.parts.map((p,i)=>({...p,modelTask:legacy&&i===0?row.modelTask:undefined,modelRaw:legacy&&i===0?row.modelRaw:undefined}));
  row.modelPartsFingerprint=fingerprint;await persist();
 }
 for(const [i,p] of row.modelParts.entries()){
  if(!p.modelTask){p.modelTask={requestId:uuid(),fingerprint,provider:connection.provider,model:connection.model,resolution:connection.resolution,status:'prepared',inputSnapshot:{vo:row.vo,visual:row.visual,seconds:p.seconds,prompt,sampleId,start:row.start,end:row.end}};await persist();}
  const task=p.modelTask;row.modelTask=task;
  if(failed(task))throw Object.assign(Error(task.error==='该账号尚未开通所选模型权限'?'服务商曾拒绝提交（HTTP 403），旧记录未保存具体原因':task.error||'这段生成失败；已保留其他片段，可重试失败段'),{httpStatus:task.httpStatus});
  if(uncertain(task))throw Error('视频提交结果待核对，已有任务已保留，不会重复提交');
  if(p.modelRaw)continue;
  progress(`正在提交 / 恢复视频片段 ${i+1} / ${plan.parts.length}…`);
  // Each piece has a stable request ID persisted before the first submission.
  Object.assign(task,await request('submit',{requestId:task.requestId,sampleId,prompt,seconds:p.seconds}));await persist();
  for(let attempt=0;task.status!=='succeeded';attempt++){
   if(failed(task)||uncertain(task))throw Object.assign(Error(task.error||'模型任务尚未成功，已保留进度'),{httpStatus:task.httpStatus});
   if(attempt>=120)throw Error('视频仍在生成，任务已保存；稍后继续，无需重新扣费');
   progress(`视频片段 ${i+1} / ${plan.parts.length} 生成中…`);await sleep(5000);
   Object.assign(task,await request('status',{requestId:task.requestId}));await persist();
  }
  progress(`正在取回视频片段 ${i+1} / ${plan.parts.length}…`);
  p.modelRaw=await request('media',{requestId:task.requestId},true);await persist();
 }
 return row.modelParts;
}
