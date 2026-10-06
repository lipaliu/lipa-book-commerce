import {POLICY,evaluateScope,normalizeRow,salesLower,makeDraft,templates} from './domain.mjs';
const enc=new TextEncoder();
const now=()=>new Date().toISOString();
function json(data,status=200,headers={}) { return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}}); }
function fail(message,status=400){return json({error:message},status);}
async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
async function authenticated(req,env){if(!env.SESSION_SECRET)return false;const raw=req.headers.get('Cookie')?.match(/(?:^|;\s*)book_session=([^;]+)/)?.[1];if(!raw)return false;const [expiry,nonce,signature]=raw.split('.');if(Number(expiry)<Date.now()||!nonce||!signature)return false;return equal(signature,await sign(`${expiry}.${nonce}`,env.SESSION_SECRET));}
function cookie(req,value,maxAge){return `book_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
async function body(req){if(Number(req.headers.get('content-length')||0)>6_000_000)throw new Error('文件过大，请控制在6MB以内');const text=await req.text();if(text.length>6_000_000)throw new Error('文件过大');return JSON.parse(text);}
async function results(db,sql,...args){return (await db.prepare(sql).bind(...args).all()).results;}
async function visibleSamples(db){return (await results(db,'SELECT * FROM samples')).filter(r=>evaluateScope(r.product,r.category).allowed);}
function summarize(samples,favorites){const groups=new Map();for(const r of samples){if(!groups.has(r.product_key))groups.set(r.product_key,{key:r.product_key,product:r.product,category:r.category,samples:[],buyer:null,sourceWindows:[],favorite:favorites.has(r.product_key)});const p=groups.get(r.product_key);p.samples.push({id:r.id,account:r.account,salesBand:r.sales_band,videoId:r.video_id,hasBody:!!r.body,publishedAt:r.published_at,snapshotId:r.snapshot_id});if(r.buyer_json)p.buyer=JSON.parse(r.buyer_json);if(!p.sourceWindows.includes(r.source_window))p.sourceWindows.push(r.source_window);}
return [...groups.values()].map(p=>{p.samples.sort((a,b)=>(salesLower(b.salesBand)||0)-(salesLower(a.salesBand)||0));return {...p,identity:p.buyer?.product_id?'已匹配商品ID，ISBN待核':'按商品名称分组，SKU待核',bestSalesBand:p.samples[0]?.salesBand||'未知'};}).sort((a,b)=>(salesLower(b.bestSalesBand)||0)-(salesLower(a.bestSalesBand)||0));}
async function syncRun(env,source='manual') {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
 const id=source==='cron'?`daily-${today}`:crypto.randomUUID();
 const existing=await env.DB.prepare('SELECT * FROM sync_runs WHERE id=?').bind(id).first();if(existing)return existing;
 const run={id,requested_at:now(),status:'awaiting_source',lookback_days:30,excluded_category:'教辅与应试资料',message:'待灰豚数据入口接入；未拉取或伪造新榜单。可导入近30天官方导出文件。'};
 await env.DB.prepare('INSERT INTO sync_runs(id,requested_at,status,lookback_days,excluded_category,message) VALUES(?,?,?,?,?,?)').bind(...Object.values(run)).run();return run;
}
async function api(req,env) {
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/api/health')return json({ok:true,app:'图书带货工作台',version:'0.1.0'});
 if(!env.DB)return fail('数据库尚未配置',503);
 if(method!=='GET' && req.headers.get('Origin')!==url.origin)return fail('请求来源不一致',403);
 if(path==='/api/login'&&method==='POST'){
  if(!env.APP_PASS || !env.SESSION_SECRET)return fail('访问配置尚未完成',503);
  const key=await hash((req.headers.get('cf-connecting-ip')||'local')+env.SESSION_SECRET);const attempt=await env.DB.prepare('SELECT * FROM auth_attempts WHERE key=?').bind(key).first();
  if(attempt&&attempt.expires>Date.now()&&attempt.failures>=8)return fail('尝试次数过多，请15分钟后再试',429);
  const input=await body(req);if(!equal(await hash(String(input.password||'')),await hash(env.APP_PASS))){const failures=attempt&&attempt.expires>Date.now()?attempt.failures+1:1;await env.DB.prepare('INSERT OR REPLACE INTO auth_attempts(key,failures,expires) VALUES(?,?,?)').bind(key,failures,Date.now()+900000).run();return fail('访问码不正确',401);}
  await env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key).run();const val=`${Date.now()+604800000}.${crypto.randomUUID()}`;return json({ok:true},200,{'set-cookie':cookie(req,val+'.'+await sign(val,env.SESSION_SECRET),604800)});
 }
 if(!await authenticated(req,env))return fail('请输入访问码',401);
 if(path==='/api/logout'&&method==='POST')return json({ok:true},200,{'set-cookie':cookie(req,'',0)});
 if(path==='/api/bootstrap'){
  const samples=await visibleSamples(env.DB), favorites=new Set((await results(env.DB,'SELECT product_key FROM favorites')).map(x=>x.product_key));const products=summarize(samples,favorites),snapshots=await results(env.DB,'SELECT * FROM snapshots ORDER BY captured_at DESC LIMIT 15');
  const currentSnapshotId=snapshots.find(x=>x.window_days===30)?.id||null;
  return json({policy:POLICY,products,currentSnapshotId,stats:{products:products.length,samples:samples.length,bodies:samples.filter(x=>x.body).length,buyers:products.filter(x=>x.buyer?.available_distribution).length},snapshots,jobs:await results(env.DB,'SELECT * FROM jobs ORDER BY updated_at DESC'),syncRuns:await results(env.DB,'SELECT * FROM sync_runs ORDER BY requested_at DESC LIMIT 20'),integration:{huitun:'import_ready',automaticFetch:'not_connected',textGeneration:'structure_template',voice:'not_connected',render:'not_connected',settlement:'import_pending'}});
 }
 if(path.startsWith('/api/samples/')&&method==='GET'){
  const r=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(decodeURIComponent(path.split('/').pop())).first();if(!r||!evaluateScope(r.product,r.category).allowed)return fail('该参考不在非教辅候选范围',404);return json({...r,buyer:r.buyer_json?JSON.parse(r.buyer_json):null});
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
 if(path==='/api/jobs'&&method==='POST'){
  const input=await body(req);const s=await env.DB.prepare('SELECT * FROM samples WHERE id=?').bind(String(input.sampleId)).first();if(!s||!evaluateScope(s.product,s.category).allowed)return fail('教辅或无效商品不能进入制作');
  const brief=input.brief||{};if(!templates[brief.template])return fail('请选择有效制作模板');const script=makeDraft(s,brief);const stamp=now(),id=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO jobs(id,sample_id,product_key,title,status,template,brief_json,script,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,s.id,s.product_key,s.product,'draft',brief.template,JSON.stringify(brief),script,stamp,stamp).run();return json({id,script,status:'draft'});
 }
 if(path.startsWith('/api/jobs/')&&method==='PATCH'){
  const id=path.split('/').pop(),input=await body(req);const j=await env.DB.prepare('SELECT * FROM jobs WHERE id=?').bind(id).first();if(!j)return fail('任务不存在',404);
  if(input.status && !['draft','awaiting_assets','archived'].includes(input.status))return fail('配音和渲染尚未接入，不能标记成片完成');
  const s=await env.DB.prepare('SELECT product,category FROM samples WHERE id=?').bind(j.sample_id).first();if(!s||!evaluateScope(s.product,s.category).allowed)return fail('该商品不在制作范围');
  await env.DB.prepare('UPDATE jobs SET script=?,status=?,updated_at=? WHERE id=?').bind(String(input.script??j.script).slice(0,60000),input.status||j.status,now(),id).run();return json({ok:true});
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
 async fetch(req,env){try{let response;if(new URL(req.url).pathname.startsWith('/api/'))response=await api(req,env);else response=await env.ASSETS.fetch(req);const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('X-Frame-Options','DENY');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");return new Response(response.body,{status:response.status,headers});}catch(e){console.error('Request failed',e.message);return fail('处理失败：'+e.message,400);}},
 async scheduled(controller,env,ctx){ctx.waitUntil(syncRun(env,'cron'));}
};
