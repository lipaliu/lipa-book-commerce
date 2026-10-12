import {generationError,providerReason} from '../shared/model-errors.mjs';
import {sessionCookie,clearModelCookie} from './model-session.mjs';
import {SEEDANCE_DEFAULTS,MINIMAX_DEFAULTS,TOAPIS_DEFAULTS} from '../shared/video-defaults.mjs';
import {modelRequest,submitModelTask,pollModelTask,proxyModelMedia} from './providers.mjs';
import {evaluateScope} from './domain.mjs';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'private, no-store',...headers}});
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
export function videoConnection(input,key){
 if(typeof key!=='string'||key.length<12||key.length>4096||/[\s]/.test(key))throw Error('请在连接窗口填写有效的API Key');
 const provider=input.provider,model=String(input.model||(provider==='seedance'?SEEDANCE_DEFAULTS.model:MINIMAX_DEFAULTS.model));
 if(provider==='toapis'){
  if(model!==TOAPIS_DEFAULTS.model)throw Error('当前ToAPIs入口使用MiniMax-H3');
  if(input.resolution&&input.resolution!==TOAPIS_DEFAULTS.resolution)throw Error('当前ToAPIs H3使用768p');
  return {provider,model,resolution:TOAPIS_DEFAULTS.resolution,env:{TOAPIS_API_KEY:key,TOAPIS_MODEL:model}};
 }
 if(provider==='minimax'){
  if(!['MiniMax-H3','MiniMax-H3-Max'].includes(model))throw Error('请选择支持的MiniMax视频模型');
  return {provider,model,resolution:'768P',env:{MINIMAX_API_KEY:key,MINIMAX_MODEL:model}};
 }
 if(provider==='seedance'){
  if(!/^(doubao-seedance-[\w.-]+|ep-[\w-]+)$/.test(model))throw Error('请填写方舟控制台已开通的Seedance模型ID或推理接入点ID');
  if(input.resolution&&input.resolution!==SEEDANCE_DEFAULTS.resolution)throw Error('当前Seedance工作台固定使用480p');
  return {provider,model,resolution:SEEDANCE_DEFAULTS.resolution,env:{SEEDANCE_API_KEY:key,SEEDANCE_MODEL:model,SEEDANCE_RESOLUTION:SEEDANCE_DEFAULTS.resolution}};
 }
 throw Error('请选择ToAPIs、MiniMax或Seedance');
}
export function validateVideoShot(input,connection){
 const seconds=Number(input.seconds),prompt=String(input.prompt||'').trim();
 const max=connection.provider==='seedance'&&/seedance-1-/.test(connection.model)?12:15;
 if(!Number.isFinite(seconds)||seconds<.5||seconds>max)throw Error(`本模型每段最多${max}秒，请先缩短分段`);
 if(!prompt||prompt.length>6000)throw Error('请填写旁白或画面提示词，最多6000字');
 const min=connection.model==='MiniMax-H3-Max'?5:4;
 return {prompt,durationSeconds:Math.max(min,Math.ceil(seconds)),modelEligible:true};
}
const safeError=generationError;
function publicTask(t){return {id:t.id,provider:t.provider,model:t.model,resolution:t.resolution,providerTaskId:t.providerTaskId,status:t.status,error:t.error||null,durationSeconds:t.durationSeconds,httpStatus:t.httpStatus||null};}
export async function clipModelRoute(req,env,fetcher=fetch){
 const path=new URL(req.url).pathname;if(!path.startsWith('/api/clip-model/'))return null;
 if(req.method!=='POST')return json({error:'请使用POST请求'},405);
 if(Number(req.headers.get('content-length')||0)>16000)return json({error:'请求过大'},413);
 const text=await req.text();if(text.length>16000)return json({error:'请求过大'},413);
 const input=JSON.parse(text),key=req.headers.get('X-Video-Api-Key');
 let c;try{c=videoConnection(input,key);}catch(e){return json({error:e.message},400);}
 const owner=await digest(c.provider+'|'+key);
 const officialFetch=(url,options={})=>fetcher(url,{...options,redirect:'manual',signal:AbortSignal.timeout(55000)});
 if(path.endsWith('/diagnostics')){
  if(c.provider!=='toapis')return json({error:'当前检查入口用于ToAPIs'},400);
  try{const r=await officialFetch('https://toapis.cn/v1/balance',{headers:{Authorization:'Bearer '+key}});const d=await r.json().catch(()=>({}));if(!r.ok)return json({error:safeError(r.status,providerReason(d,key))},400);if(d.success!==true)return json({error:'ToAPIs未确认账号有效：'+providerReason(d,key)},400);const credit=d.remain_credits??d.data?.remain_credits;return json({hasCredits:credit!==undefined&&Number.isFinite(Number(credit))?Number(credit)>0:null,message:'ToAPIs账号认证正常'+(credit!==undefined?'；剩余额度：'+String(credit):'；服务商未返回剩余额度')+'。具体视频请求是否可用，以服务商生成返回为准。'});}catch{return json({error:'暂时无法读取服务商账号状态，已保留全部任务'},502);}
 }
 if(path.endsWith('/connect')){
  const url=c.provider==='toapis'?'https://toapis.cn/v1/balance':c.provider==='minimax'?'https://api.minimax.io/v2/query/video_generation?page_num=1&page_size=1':'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks?page_size=1';
  try{const r=await officialFetch(url,{headers:{Authorization:'Bearer '+key}});if(!r.ok)return json({error:safeError(r.status)},400);const data=await r.json();if(c.provider==='toapis'?data.success!==true:!Array.isArray(data.items))return json({error:'平台未验证此API Key，请核对令牌是否有效'},400);const cookie=input.remember?await sessionCookie({provider:c.provider,model:c.model,resolution:c.resolution,key},(env.MODEL_SESSION_SECRET||env.SESSION_SECRET)):clearModelCookie();return json({remembered:!!input.remember,authenticated:true,provider:c.provider,model:c.model,resolution:c.resolution,note:'已验证API身份；生成权限及额度以首次生成结果为准。验证连接不提交生成任务。'},200,{'set-cookie':cookie});}catch{return json({error:'暂时无法连接模型服务，请稍后重试'},502);}
 }
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId||''))return json({error:'缺少有效的生成请求编号'},400);
 const id=await digest(owner+'|'+input.requestId),dbKey='clip-model:'+id;
 const get=async()=>{const r=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(dbKey).first();return r?JSON.parse(r.value):null;};
 const write=task=>env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(task),dbKey).run();
 let task=await get();
 if(path.endsWith('/submit')){
  let shot;try{shot=validateVideoShot(input,c);}catch(e){return json({error:e.message},400);}
  const sample=await env.DB.prepare('SELECT product,category FROM samples WHERE id=?').bind(String(input.sampleId||'')).first();
  if(input.workflow!=='quick-vo'&&(!sample||!evaluateScope(sample.product,sample.category).allowed))return json({error:'请先选择可制作的非教辅图书'},400);
  const fingerprint=await digest(JSON.stringify({shot,model:c.model,resolution:c.resolution,sampleId:input.sampleId}));
  if(task){if(task.fingerprint!==fingerprint)return json({error:'本请求内容已改变，请重新准备生成任务'},409);return json(publicTask(task));}
  // Validate before atomic claim. Once claimed, an uncertain POST is never retried.
  modelRequest(c.provider,shot,c.env);
  task={id,provider:c.provider,model:c.model,resolution:c.resolution,durationSeconds:shot.durationSeconds,fingerprint,status:'submitting',createdAt:new Date().toISOString()};
  const claim=await env.DB.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(dbKey,JSON.stringify(task)).run();
  if(!claim.meta.changes)return json(publicTask(await get()));
  try{Object.assign(task,await submitModelTask(c.provider,shot,c.env,officialFetch));}
  catch(error){const status=error.httpStatus;task.httpStatus=status||null;task.status=status&&status>=400&&status<500?'rejected':'submission_uncertain';task.error=status?safeError(status,error.providerReason):'提交结果未确认，请先核对服务商任务记录；本请求不会自动重复扣费。';}
  await write(task);return json(publicTask(task));
 }
 if(!task)return json({error:'未找到当前API账号的生成任务'},404);
 if(task.provider!==c.provider||task.model!==c.model)return json({error:'请连接创建这段视频时使用的账号与模型'},409);
 if(path.endsWith('/status')){
  if(task.providerTaskId&&!['succeeded','failed','cancelled','expired'].includes(task.status)){
   try{const update=await pollModelTask(task,c.env,officialFetch);Object.assign(task,update,{error:update.error?'服务商生成失败，请在控制台查看该任务的原因':null});await write(task);}catch{return json({error:'进度查询暂时失败，已保留任务，可继续查询，无需重新生成'},502);}
  }
  return json(publicTask(task));
 }
 if(path.endsWith('/media')){
  try{const response=await proxyModelMedia(task,null,fetcher);const headers=new Headers(response.headers);headers.set('cache-control','private, no-store');return new Response(response.body,{status:response.status,headers});}catch{return json({error:'视频暂时无法取回，已保留任务，请稍后继续；不会重新提交生成'},502);}
 }
 return json({error:'接口不存在'},404);
}
