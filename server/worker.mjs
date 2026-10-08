import {generateStudioPlan} from './studio.mjs';
import {referenceRows,cleanReferenceEdits,suggestEdit} from './ai-editor.mjs';
import {storeGenerated,serveGenerated} from './generated.mjs';
import {storePreview,servePreview} from './preview.mjs';
import {generateVoice,generateSceneImage,reserveFreeTest,fromBase64} from './free-media.mjs';
import {buildProduction,reconcileProductionChoices} from './production.mjs';
import {providers,submitModelTask,pollModelTask,proxyModelMedia} from './providers.mjs';
import {buildBriefOptions,resolveBriefSelections} from './evidence.mjs';
import {POLICY,evaluateScope,normalizeRow,salesLower,makeDraft,templates} from './domain.mjs';
const enc=new TextEncoder();
const now=()=>new Date().toISOString();
function json(data,status=200,headers={}) { return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}}); }
function fail(message,status=400){return json({error:message},status);}
async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function body(req){if(Number(req.headers.get('content-length')||0)>6_000_000)throw new Error('文件过大，请控制在6MB以内');const text=await req.text();if(text.length>6_000_000)throw new Error('文件过大');return JSON.parse(text);}
async function results(db,sql,...args){return (await db.prepare(sql).bind(...args).all()).results;}
async function visibleSamples(db){return (await results(db,'SELECT * FROM samples')).filter(r=>evaluateScope(r.product,r.category).allowed);}
function summarize(samples,favorites){const groups=new Map();for(const r of samples){if(!groups.has(r.product_key))groups.set(r.product_key,{key:r.product_key,product:r.product,category:r.category,samples:[],buyer:null,sourceWindows:[],favorite:favorites.has(r.product_key)});const p=groups.get(r.product_key);p.samples.push({id:r.id,account:r.account,salesBand:r.sales_band,videoId:r.video_id,hasBody:!!r.body,hasFrames:referenceRows(r).some(f=>f.imageUrl),buyerAvailable:buildBriefOptions(r).ready,publishedAt:r.published_at,snapshotId:r.snapshot_id});if(r.buyer_json)p.buyer=JSON.parse(r.buyer_json);if(!p.sourceWindows.includes(r.source_window))p.sourceWindows.push(r.source_window);}
return [...groups.values()].map(p=>{p.samples.sort((a,b)=>(salesLower(b.salesBand)||0)-(salesLower(a.salesBand)||0));return {...p,identity:p.buyer?.product_id?'已匹配商品ID，ISBN待核':'按商品名称分组，SKU待核',bestSalesBand:p.samples[0]?.salesBand||'未知'};}).sort((a,b)=>(salesLower(b.bestSalesBand)||0)-(salesLower(a.bestSalesBand)||0));}
async function syncRun(env,source='manual') {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
 const id=source==='cron'?`daily-${today}`:crypto.randomUUID();
 const existing=await env.DB.prepare('SELECT * FROM sync_runs WHERE id=?').bind(id).first();if(existing)return existing;
 const run={id,requested_at:now(),status:'awaiting_source',lookback_days:30,excluded_category:'教辅与应试资料',message:'待灰豚数据入口接入；未拉取或伪造新榜单。可导入近30天官方导出文件。'};
 await env.DB.prepare('INSERT INTO sync_runs(id,requested_at,status,lookback_days,excluded_category,message) VALUES(?,?,?,?,?,?)').bind(...Object.values(run)).run();return run;
}
async function storedJob(env,id){const job=await env.DB.prepare('SELECT * FROM jobs WHERE id=?').bind(id).first();if(!job)throw new Error('制作任务不存在');const sample=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(job.sample_id).first();if(!sample||!evaluateScope(sample.product,sample.category).allowed)throw new Error('商品不在非教辅制作范围');return {job,sample};}
async function imageSourceHash(pack,shot){return hash(JSON.stringify({title:pack.title,kind:shot.kind,visual:shot.visual,vo:shot.vo}));}
async function productionHash(job){return hash(job.script+'|'+job.brief_json);}
async function writeProduction(env,job,sample,brief,choices={}){const old=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('production:'+job.id).first();const normalized=reconcileProductionChoices(old?JSON.parse(old.value):null,choices);const pack=buildProduction(job,sample,brief,normalized);pack.sourceHash=await productionHash(job);pack.planHash=await hash(pack.sourceHash+JSON.stringify(pack.planChoices));await env.DB.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind('production:'+job.id,JSON.stringify(pack)).run();return pack;}
async function readProduction(env,id){const {job,sample}=await storedJob(env,id);const row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('production:'+id).first();if(!row)return {pack:null,job,sample};const pack=JSON.parse(row.value);let localRender=null;
 try{const root='/generated/'+encodeURIComponent(id)+'/';const response=await env.ASSETS.fetch(new Request('https://assets.local'+root+'render.json'));if(response.headers.get('content-type')?.includes('application/json')){const render=await response.json();if(render.jobId===id&&render.planHash===pack.planHash)localRender={...render,previewUrl:root+'preview.mp4',voiceUrl:root+'narration.wav',subtitleUrl:root+'subtitles-rough.srt'};}}catch{}
 const imageHashes=new Map(await Promise.all(pack.shots.map(async shot=>[shot.id,await imageSourceHash(pack,shot)])));
 const generated=(await results(env.DB,"SELECT key,json_extract(value,'$.jobId') AS jobId,json_extract(value,'$.sourceHash') AS sourceHash,json_extract(value,'$.contentHash') AS contentHash,json_extract(value,'$.shotId') AS shotId,json_extract(value,'$.kind') AS kind,json_extract(value,'$.model') AS model,json_extract(value,'$.mime') AS mime FROM settings WHERE key LIKE 'generated:%'")).filter(r=>r.jobId===id&&(r.sourceHash===pack.planHash||(r.kind==='image'&&r.contentHash===imageHashes.get(r.shotId)))).map(r=>({...r,id:r.key.slice(10),url:'/api/generated/'+r.key.slice(10)}));
 const previewRows=(await results(env.DB,"SELECT value FROM settings WHERE key LIKE 'preview:%'")).map(r=>JSON.parse(r.value)).filter(r=>r.jobId===id&&r.sourceHash===pack.planHash).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const savedPreview=previewRows.length?{...previewRows[0],url:'/api/previews/'+previewRows[0].id}:null;
 const edits=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('reference-edits:'+id).first();
 return {pack:{...pack,referenceRows:referenceRows(sample),referenceEdits:edits?JSON.parse(edits.value):[],localRender,generated,savedPreview,stale:pack.sourceHash!==await productionHash(job)},job,sample};}
async function api(req,env) {
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/api/health')return json({ok:true,app:'图书带货工作台',version:'0.1.0'});
 if(!env.DB)return fail('数据库尚未配置',503);
 if(method!=='GET' && req.headers.get('Origin')!==url.origin)return fail('请求来源不一致',403);
 if(path==='/api/bootstrap'){
  const samples=await visibleSamples(env.DB), favorites=new Set((await results(env.DB,'SELECT product_key FROM favorites')).map(x=>x.product_key));const products=summarize(samples,favorites),snapshots=await results(env.DB,'SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT 15');
  const currentSnapshotId=snapshots.find(x=>x.window_days===30)?.id||null;
  return json({policy:POLICY,products,currentSnapshotId,stats:{products:products.length,samples:samples.length,bodies:samples.filter(x=>x.body).length,buyers:products.filter(x=>x.buyer?.available_distribution).length},snapshots,jobs:await results(env.DB,"SELECT j.*,json_extract(p.value,'$.sourceHash') AS productionHash FROM jobs j LEFT JOIN settings p ON p.key='production:'||j.id ORDER BY j.updated_at DESC"),syncRuns:await results(env.DB,'SELECT * FROM sync_runs ORDER BY requested_at DESC LIMIT 20'),integration:{huitun:'import_ready',automaticFetch:'not_connected',textGeneration:env.AI?'ai_plan_ready':'not_connected',voice:env.AI?'test_api_ready':'not_connected',render:'browser_preview',settlement:'import_pending',production:'rule_storyboard_graphics',imageGeneration:env.AI?'test_api_ready':'not_connected',videoProviders:providers(env)}});
 }
 if(path.startsWith('/api/samples/')&&method==='GET'){
  const r=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(decodeURIComponent(path.split('/').pop())).first();if(!r||!evaluateScope(r.product,r.category).allowed)return fail('该参考不在非教辅候选范围',404);return json({...r,briefOptions:buildBriefOptions(r),buyer:r.buyer_json?JSON.parse(r.buyer_json):null});
 }
 if(path==='/api/favorites'&&method==='POST'){const {key,active}=await body(req);const r=await env.DB.prepare('SELECT product FROM samples WHERE product_key=? LIMIT 1').bind(String(key)).first();if(!r)return fail('商品不存在',404);await env.DB.prepare(active?'INSERT OR IGNORE INTO favorites(product_key,created_at) VALUES(?,?)':'DELETE FROM favorites WHERE product_key=?').bind(...(active?[key,now()]:[key])).run();return json({ok:true});}
 if(path==='/api/sync'&&method==='POST')return json(await syncRun(env));
 if(path==='/api/import'&&method==='POST'){
  const input=await body(req);if(!Array.isArray(input.rows)||input.rows.length>2500||!input.rows.length)return fail('请导入1至2500条记录');
  if(Number(input.windowDays)!==30)return fail('当前选品库仅接收近30天榜单；历史60天资料单独保留');
  const asOf=String(input.asOf||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf))return fail('请填写数据截止日期');
  const fingerprint=await hash(JSON.stringify({rows:input.rows,asOf,window:30}));const existing=await env.DB.prepare('SELECT * FROM snapshots WHERE fingerprint=?').bind(fingerprint).first();if(existing)return json({duplicate:true,snapshot:existing});
  const id=crypto.randomUUID(),stamp=now(),statements=[],seen=new Set();let excluded=0,quarantined=0;
  for(const raw of input.rows){const r=normalizeRow(raw);if(!r.scope.allowed){excluded++;continue;}if(!r.account||!r.published_at){quarantined++;continue;}
   const identity=r.video_id?'video-'+r.video_id:'row-'+await hash(r.product+'|'+r.account+'|'+r.published_at);if(seen.has(identity))continue;seen.add(identity);
   const pk=(await hash(r.product.normalize('NFKC').replace(/\s/g,''))).slice(0,20);
   statements.push(env.DB.prepare(`INSERT INTO samples(id,product_key,product,category,account,sales_band,volume_band,video_id,published_at,body,scope_status,source_window,captured_at,snapshot_id) VALUES(?,?,?,?,?,?,?,?,?,?,'pending',30,?,?) ON CONFLICT DO UPDATE SET sales_band=excluded.sales_band,volume_band=excluded.volume_band,captured_at=excluded.captured_at,snapshot_id=excluded.snapshot_id,source_window=30`).bind(identity,pk,r.product,r.category,r.account,r.sales_band,r.volume_band,r.video_id,r.published_at,r.body,stamp,id));
  }
  for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
  await env.DB.prepare('INSERT INTO snapshots(id,captured_at,data_as_of,window_days,source,imported,excluded,quarantined,fingerprint,note) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,stamp,asOf,30,'灰豚导出文件',statements.length,excluded,quarantined,fingerprint,'非教辅规则筛查；商品用途与指标周期仍需核对').run();
  await env.DB.prepare("UPDATE sync_runs SET status='imported',message=? WHERE status='awaiting_source'").bind('已收到人工导入，自动采集仍待接入').run();
  return json({imported:statements.length,excluded,quarantined,snapshotId:id});
 }
 if(path==='/api/reference-jobs'&&method==='POST'){
  const input=await body(req),s=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(String(input.sampleId)).first();
  if(!s||!evaluateScope(s.product,s.category).allowed)return fail('教辅或无效商品不能进入制作');
  const existing=await env.DB.prepare("SELECT id FROM jobs WHERE sample_id=? AND status!='archived' ORDER BY updated_at DESC LIMIT 1").bind(s.id).first();
  if(existing)return json({id:existing.id,reused:true});
  const brief={mode:'reference',template:'reading',task:'原视频分镜编辑'},script=String(s.body||'原片旁白待采集。').slice(0,900),stamp=now();
  const id='reference-'+s.id;
  await env.DB.prepare("INSERT INTO jobs(id,sample_id,product_key,title,status,template,brief_json,script,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='draft',updated_at=excluded.updated_at").bind(id,s.id,s.product_key,s.product,'draft',brief.template,JSON.stringify(brief),script,stamp,stamp).run();
  return json({id});
 }
 if(path==='/api/studio/plan'&&method==='POST'){
  const input=await body(req);const sample=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(String(input.sampleId)).first();
  if(!sample||!evaluateScope(sample.product,sample.category).allowed)return fail('该商品不在非教辅范围');
  const options=buildBriefOptions(sample),audience={};
  for(const [key,list] of [['genderId',options.audience?.genders],['ageId',options.audience?.ages]]){
   if(input[key]){const selected=list?.find(x=>x.id===input[key]);if(!selected)return fail('人群选项不属于此商品');audience[key]=selected;}
  }
  const plan=await generateStudioPlan(env.AI,sample,input,audience);
  const id=crypto.randomUUID(),stamp=now(),brief={mode:'reference',template:plan.format.template,task:'AI默认方案',studio:{mode:plan.mode,formatId:plan.format.id,duration:plan.duration,audience,model:plan.model,excerpt:plan.excerpt||false,excerptNote:plan.excerptNote||null,sourceFrames:plan.sourceFrames||[]}};
  const script=plan.shots.map(s=>s.vo).join('\n\n');
  const job={id,script,brief_json:JSON.stringify(brief)};
  const choices={durationSeconds:plan.duration,format:'mixed',scriptLocked:false,narrationOverride:plan.shots.slice(0,4).map(s=>s.vo).join('\n\n'),shots:plan.shots.map((s,i)=>({...s,id:i<4?'shot-'+(i+1):'extra-'+(i-3),enabled:true,includeVO:true})),extraShots:plan.shots.slice(4).map((s,i)=>({...s,id:'extra-'+(i+1),purpose:'补充内容'}))};
  // Validate the full plan before storing a job, so invalid AI output leaves no broken task.
  buildProduction(job,sample,brief,choices);
  await env.DB.prepare('INSERT INTO jobs(id,sample_id,product_key,title,status,template,brief_json,script,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,sample.id,sample.product_key,sample.product,'draft',brief.template,JSON.stringify(brief),script,stamp,stamp).run();
  await writeProduction(env,job,sample,brief,choices);return json({id,model:plan.model});
 }
 if(path==='/api/jobs'&&method==='POST'){
  const input=await body(req);const s=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(String(input.sampleId)).first();if(!s||!evaluateScope(s.product,s.category).allowed)return fail('教辅或无效商品不能进入制作');
  const brief=resolveBriefSelections(s,input.brief||{});const script=makeDraft(s,brief);const stamp=now(),id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO jobs(id,sample_id,product_key,title,status,template,brief_json,script,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,s.id,s.product_key,s.product,'draft',brief.template,JSON.stringify(brief),script,stamp,stamp).run();const pack=await writeProduction(env,{id,script,brief_json:JSON.stringify(brief)},s,brief);return json({id,script,status:'draft',production:pack});
 }
 if(/^\/api\/jobs\/[^/]+\/production$/.test(path)&&['GET','POST'].includes(method)){
  const id=path.split('/')[3],{pack,job,sample}=await readProduction(env,id);
  const modelTasks=(await results(env.DB,"SELECT value FROM settings WHERE key LIKE 'model-task:%'")).map(r=>JSON.parse(r.value)).filter(t=>t.jobId===id);
  if(method==='GET')return json({pack,providers:providers(env),modelTasks});
  const savedBrief=JSON.parse(job.brief_json);const brief=savedBrief.mode==='reference'?savedBrief:resolveBriefSelections(sample,savedBrief.selections||{});const input=await body(req);
  await writeProduction(env,job,sample,brief,input.choices||pack?.planChoices||{});const updated=await readProduction(env,id);return json({pack:updated.pack,providers:providers(env),modelTasks});
 }
 if(/^\/api\/jobs\/[^/]+\/reference-edits$/.test(path)&&method==='POST'){
  const id=path.split('/')[3],{sample}=await storedJob(env,id),input=await body(req),edits=cleanReferenceEdits(referenceRows(sample),input.edits);
  await env.DB.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind('reference-edits:'+id,JSON.stringify(edits)).run();return json({edits});
 }
 if(/^\/api\/jobs\/[^/]+\/ai-edit$/.test(path)&&method==='POST'){
  if(!env.AI)return fail('文本模型尚未连接',503);
  const id=path.split('/')[3],{sample,pack}=await readProduction(env,id),input=await body(req);
  if(!pack)return fail('请先建立制作方案');
  const source=input.referenceId?referenceRows(sample).find(r=>r.id===input.referenceId):pack.shots.find(r=>r.id===input.shotId);
  if(!source)return fail('需要有效的参考段落或分镜');
  if(!['vo','visual'].includes(input.field)||String(input.currentText??'').length>2500||String(input.narration??'').length>2500||String(input.instruction??'').length>300)return fail('编辑内容或要求过长');
  const seconds=Number(input.seconds??5);if(!Number.isFinite(seconds)||seconds<0.5||seconds>30)return fail('请输入0.5至30秒');
  await reserveFreeTest(env.DB,'text');
  const suggestion=await suggestEdit(env.AI,{...input,seconds,title:pack.title,originalText:input.referenceId?source.text:(sample.body||'').slice(0,2000)});
  const suggestionId=crypto.randomUUID();await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('ai-edit:'+suggestionId,JSON.stringify({...suggestion,jobId:id,sourceId:source.id,sourceText:input.currentText||''})).run();return json({...suggestion,id:suggestionId});
 }
 if(/^\/api\/jobs\/[^/]+\/previews$/.test(path)&&method==='POST'){
  const input=await body(req),{pack}=await readProduction(env,path.split('/')[3]);if(!pack||pack.stale||!pack.scriptLocked||input.planHash!==pack.planHash)return fail('分镜方案已变化，请按当前选择重新录制');
  const bytes=fromBase64(String(input.base64||''));return json(await storePreview(env.DB,pack,bytes,String(input.mime||''),input.hasVO));
 }
 if(/^\/api\/previews\/[a-f0-9]{32}$/.test(path)&&method==='GET')return servePreview(env.DB,path.split('/')[3],req.headers.get('Range'),url.searchParams.get('download')==='1');
 if(/^\/api\/jobs\/[^/]+\/(voice|images)$/.test(path)&&method==='POST'){
  if(!env.AI)return fail('图片与旁白测试API尚未配置',503);
  const jobId=path.split('/')[3],type=path.endsWith('/voice')?'voice':'image',input=await body(req),{pack}=await readProduction(env,jobId);if(!pack||pack.stale)return fail('请先保存当前分镜');if(type==='voice'&&!pack.scriptLocked)return fail('请先确认当前旁白');if(input.planHash&&input.planHash!==pack.planHash)return fail('分镜已变化，请保存当前选择后重新生成');
  const shot=type==='image'?pack.shots.find(s=>s.id===input.shotId):null;if(type==='image'&&!['comic_scene','generated_scene'].includes(shot?.kind))return fail('图卡无需模型出图；真实商品素材应自行拍摄');
  const contentHash=type==='image'?await imageSourceHash(pack,shot):null;
  const mediaId=(await hash(jobId+'|'+(contentHash||pack.planHash)+'|'+type+'|'+(shot?.id||''))).slice(0,32),key='generated:'+mediaId;
  const old=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();if(old){const r=JSON.parse(old.value);return json({id:mediaId,url:'/api/generated/'+mediaId,mime:r.mime,model:r.model,cached:true});}
  await reserveFreeTest(env.DB,type);const result=type==='voice'?await generateVoice(env.AI,pack.narration):await generateSceneImage(env.AI,shot,pack.title);
  await storeGenerated(env.DB,mediaId,{jobId,sourceHash:pack.planHash,contentHash,shotId:shot?.id||null,kind:type,mime:result.mime,model:result.model,createdAt:now()},result.bytes);return json({id:mediaId,url:'/api/generated/'+mediaId,mime:result.mime,model:result.model,cached:false});
 }
 if(/^\/api\/generated\/[a-f0-9]{32}$/.test(path)&&method==='GET'){
  return serveGenerated(env.DB,path.split('/')[3]);
 }
 if(/^\/api\/jobs\/[^/]+\/model-tasks$/.test(path)&&method==='POST'){
  const id=path.split('/')[3],input=await body(req),{pack}=await readProduction(env,id);if(!pack||pack.stale)return fail('先按当前稿件生成或更新制作方案');if(!pack.scriptLocked)return fail('请先确认VO文案，再准备模型请求');
  const shot=pack.shots.find(s=>s.id===input.shotId);if(!shot?.modelEligible)return fail('这个镜头使用图卡或真实素材，无需调用视频模型');
  const provider=providers(env).find(p=>p.id===input.provider);if(!provider)return fail('请选择Seedance或MiniMax入口');
  const taskId=(await hash(id+'|'+pack.planHash+'|'+shot.id+'|'+provider.id)).slice(0,32),key='model-task:'+taskId;
  const existing=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();if(existing)return json(JSON.parse(existing.value));
  const task={id:taskId,jobId:id,sourceHash:pack.planHash,shotId:shot.id,firstFrameUrl:pack.generated?.find(r=>r.kind==='image'&&r.shotId===shot.id)?url.origin+pack.generated.find(r=>r.kind==='image'&&r.shotId===shot.id).url:null,provider:provider.id,prompt:shot.prompt,durationSeconds:shot.durationSeconds,status:provider.configured?'awaiting_execution':'awaiting_connection',createdAt:now(),note:'已准备请求；尚未提交或扣除模型额度。'};
  await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind(key,JSON.stringify(task)).run();return json(task);
 }
 if(/^\/api\/model-tasks\/[^/]+\/execute$/.test(path)&&method==='POST'){
  if(!env.MODEL_EXECUTION_TOKEN||req.headers.get('X-Model-Execution-Token')!==env.MODEL_EXECUTION_TOKEN)return fail('模型执行需要配置现有账号的受保护执行端；公开页面仅准备请求',403);
  const id=path.split('/')[3],key='model-task:'+id,row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();if(!row)return fail('模型请求不存在',404);const task=JSON.parse(row.value);
  if(!['awaiting_connection','awaiting_execution'].includes(task.status))return json(task);
  const {pack}=await readProduction(env,task.jobId);if(!pack||pack.stale||pack.planHash!==task.sourceHash)return fail('稿件或制作方案已变化，请准备新任务');
  const shot=pack.shots.find(s=>s.id===task.shotId);if(!shot?.modelEligible)return fail('镜头不允许生成');
  // Claim before network submission; never automatically retry an uncertain submission.
  task.status='submitting';task.updatedAt=now();
  const claim=await env.DB.prepare("UPDATE settings SET value=? WHERE key=? AND json_extract(value,'$.status') IN ('awaiting_connection','awaiting_execution')").bind(JSON.stringify(task),key).run();if(!claim.meta.changes)return fail('该请求正在提交，避免重复扣费',409);
  try{Object.assign(task,await submitModelTask(task.provider,{...shot,firstFrameUrl:task.firstFrameUrl||((pack.generated?.find(r=>r.kind==='image'&&r.shotId===shot.id))?url.origin+pack.generated.find(r=>r.kind==='image'&&r.shotId===shot.id).url:null)},env),{updatedAt:now(),note:'服务商已返回任务ID'});}catch(error){task.status='submission_uncertain';task.note=error.message;await env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(task),key).run();return fail('提交结果未确认，请核对服务商记录，系统不会自动重试');}
  await env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(task),key).run();return json(task);
 }
 if(/^\/api\/model-tasks\/[a-f0-9]{32}\/media$/.test(path)&&method==='GET'){
  const row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('model-task:'+path.split('/')[3]).first();if(!row)return fail('模型任务不存在',404);return proxyModelMedia(JSON.parse(row.value),req.headers.get('Range'));
 }
 if(/^\/api\/model-tasks\/[^/]+\/status$/.test(path)&&method==='POST'){
  const key='model-task:'+path.split('/')[3],row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();if(!row)return fail('模型请求不存在',404);const task=JSON.parse(row.value);
  if(task.providerTaskId&&!['succeeded','failed','cancelled'].includes(task.status)){Object.assign(task,await pollModelTask(task,env),{updatedAt:now()});await env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(task),key).run();}return json(task);
 }
 if(path.startsWith('/api/jobs/')&&method==='PATCH'){
  const id=path.split('/').pop(),input=await body(req);const j=await env.DB.prepare('SELECT * FROM jobs WHERE id=?').bind(id).first();if(!j)return fail('任务不存在',404);
  if(input.status && !['draft','awaiting_assets','archived'].includes(input.status))return fail('配音和渲染尚未接入，不能标记成片完成');
  const s=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(j.sample_id).first();if(!s||!evaluateScope(s.product,s.category).allowed)return fail('该商品不在制作范围');
  if(input.sampleId&&input.sampleId!==j.sample_id)return fail('任务与当前商品不一致');
  let brief=JSON.parse(j.brief_json);
  if(input.brief)brief=resolveBriefSelections(s,input.brief);
  if(input.status==='awaiting_assets')brief=resolveBriefSelections(s,brief.selections||{});
  await env.DB.prepare('UPDATE jobs SET script=?,status=?,template=?,brief_json=?,updated_at=? WHERE id=?').bind(String(input.script??j.script).slice(0,60000),input.status||j.status,brief.template||j.template,JSON.stringify(brief),now(),id).run();return json({ok:true});
 }
 if(path==='/api/experiments'&&method==='POST'){
  const input=await body(req);if(!input.jobId)return fail('请选择制作任务');const j=await env.DB.prepare('SELECT id FROM jobs WHERE id=?').bind(input.jobId).first();if(!j)return fail('任务不存在');
  for(const key of ['plays','clicks','paidOrders','refundOrders','settledCommission','cost'])if(input[key]!==''&&input[key]!=null&&(!Number.isFinite(Number(input[key]))||Number(input[key])<0))return fail('指标必须为非负数字或留空');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date||'')))return fail('请填写观察日期');
  const experiment={...input,id:crypto.randomUUID(),recordedAt:now()};await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('experiment:'+experiment.id,JSON.stringify(experiment)).run();return json(experiment);
 }
 if(path==='/api/experiments'&&method==='GET')return json((await results(env.DB,"SELECT value FROM settings WHERE key LIKE 'experiment:%'")).map(r=>JSON.parse(r.value)));
 return fail('接口不存在',404);
}
export default {
 async fetch(req,env){try{let response;if(new URL(req.url).pathname.startsWith('/api/'))response=await api(req,env);else response=await env.ASSETS.fetch(req);const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('X-Frame-Options','DENY');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");return new Response(response.body,{status:response.status,headers});}catch(e){console.error('Request failed',e.message);return fail('处理失败：'+e.message,400);}},
 async scheduled(controller,env,ctx){ctx.waitUntil(syncRun(env,'cron'));}
};
