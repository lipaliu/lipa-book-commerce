import test from 'node:test';
import assert from 'node:assert/strict';
import {videoConnection,validateVideoShot,clipModelRoute} from '../server/clip-model.mjs';
import {videoPrompt,videoTaskFingerprint} from '../client/video-model.mjs';
const key='unit-test-secret-12345',config={provider:'minimax',model:'MiniMax-H3'};
function request(action,input={},apiKey=key){return new Request('https://studio.example/api/clip-model/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Video-Api-Key':apiKey},body:JSON.stringify({...config,...input})});}
function database(){const entries=new Map();return {entries,prepare(sql){let args;return {bind(...a){args=a;return this;},async first(){if(sql.includes('FROM samples'))return {product:'庄子',category:'人文社科'};return entries.has(args[0])?{value:entries.get(args[0])}:null;},async run(){if(sql.startsWith('INSERT')){if(entries.has(args[0]))return {meta:{changes:0}};entries.set(args[0],args[1]);}else entries.set(args[1],args[0]);return {meta:{changes:1}};}};}};}
const input={requestId:'test-request-12345678',sampleId:'sample1',prompt:'云海中的山峰，镜头慢慢向前',seconds:5.57};
test('connection restricts official providers/models; duration rounds up and guards limits',()=>{
 const c=videoConnection(config,key);assert.equal(validateVideoShot(input,c).durationSeconds,6);
 assert.equal(validateVideoShot({...input,seconds:.5},c).durationSeconds,4);
 assert.throws(()=>videoConnection({provider:'other',model:'x'},key));
 assert.throws(()=>videoConnection(config,'short'));
 assert.throws(()=>validateVideoShot({...input,seconds:16},c));
 const seed=videoConnection({provider:'seedance',model:'doubao-seedance-1-5-pro-example'},key);
 assert.throws(()=>validateVideoShot({...input,seconds:15},seed));
});
test('connection check is read-only, forwards key only as auth and reveals no task list',async()=>{
 let observed;const r=await clipModelRoute(request('connect'),{DB:database()},async(url,opts)=>{observed={url,opts};return Response.json({items:[{private:'history'}]});});
 const body=await r.json();assert.equal(body.authenticated,true);assert.equal(observed.opts.headers.Authorization,'Bearer '+key);assert.equal(observed.opts.method,undefined);assert.ok(!JSON.stringify(body).includes('history'));
 const denied=await clipModelRoute(request('connect'),{DB:database()},async()=>new Response('',{status:401}));assert.equal(denied.status,400);
});
test('paid submit is claimed once, task can resume and media is private',async()=>{
 const DB=database();let submissions=0;
 const provider=async(url,opts)=>{if(opts.method==='POST'){submissions++;assert.ok(!opts.body.includes(key));return Response.json({task_id:'vendor-123'});}return Response.json({task:{status:'succeeded',content:{url:'https://cdn.hailuoai.com/video.mp4'}}});};
 const first=await (await clipModelRoute(request('submit',input),{DB},provider)).json();assert.equal(first.status,'submitted');
 await clipModelRoute(request('submit',input),{DB},provider);assert.equal(submissions,1);
 assert.ok(!JSON.stringify([...DB.entries]).includes(key));assert.ok(!JSON.stringify([...DB.entries]).includes(input.prompt));
 const status=await (await clipModelRoute(request('status',input),{DB},provider)).json();assert.equal(status.status,'succeeded');
 const media=await clipModelRoute(request('media',input),{DB},async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'video/mp4'}}));assert.equal(media.status,200);assert.equal(media.headers.get('cache-control'),'private, no-store');
 const other=await clipModelRoute(request('status',input,'a-different-api-secret'),{DB},provider);assert.equal(other.status,404);
 const changed=await clipModelRoute(request('submit',{...input,prompt:'changed'}),{DB},provider);assert.equal(changed.status,409);
});
test('uncertain submissions never automatically retry; 402 produces actionable rejection',async()=>{
 const DB=database();let calls=0;const failing=async()=>{calls++;throw Error('connection lost');};
 const response=await (await clipModelRoute(request('submit',input),{DB},failing)).json();assert.equal(response.status,'submission_uncertain');
 await clipModelRoute(request('submit',input),{DB},failing);assert.equal(calls,1);
 const rejected=await (await clipModelRoute(request('submit',{...input,requestId:'different-request-1234567'}),{DB},async()=>Response.json({error:{}},{status:402}))).json();assert.equal(rejected.status,'rejected');assert.match(rejected.error,/额度/);
});
test('prompt uses narration and custom direction, task fingerprint changes on edits',()=>{
 const row={kind:'comic_scene',vo:'人生要有所取舍',visual:'山间一位古人放下行囊',seconds:10};const prompt=videoPrompt(row,'漫画故事');assert.ok(prompt.includes(row.visual)&&prompt.includes(row.vo));
 assert.notEqual(videoTaskFingerprint(row,prompt,config),videoTaskFingerprint({...row,seconds:5},prompt,config));
 assert.throws(()=>videoPrompt({...row,kind:'real_product'}));
});
test('Seedance defaults and submitted request use 2.0 at 480p, not just UI copy',async()=>{
 const DB=database();let payload;
 const r=await clipModelRoute(request('submit',{...input,provider:'seedance',model:'',resolution:'480p'}),{DB},async(url,opts)=>{payload=JSON.parse(opts.body);return Response.json({id:'seed-task'});});
 assert.equal((await r.json()).status,'submitted');assert.equal(payload.model,'doubao-seedance-2-0-260128');assert.equal(payload.resolution,'480p');assert.equal(payload.ratio,'9:16');
 assert.throws(()=>videoConnection({provider:'seedance',resolution:'720p'},key));
});
test('ToAPIs balance probe is read-only and rejects logical auth failure',async()=>{
 const config={provider:'toapis',model:'MiniMax-H3',resolution:'768p'};
 const c=videoConnection(config,key);assert.equal(c.env.TOAPIS_API_KEY,key);
 assert.throws(()=>videoConnection({...config,model:'unknown'},key));
 const ok=await clipModelRoute(request('connect',config),{DB:database()},async(url,opts)=>{assert.equal(url,'https://toapis.cn/v1/balance');assert.equal(opts.method,undefined);return Response.json({success:true,remain_credits:100});});
 assert.equal((await ok.json()).authenticated,true);
 const bad=await clipModelRoute(request('connect',config),{DB:database()},async()=>Response.json({success:false,message:'invalid'}));assert.equal(bad.status,400);
});
test('ToAPIs H3 contract: create once, poll unified task, retrieve private media',async()=>{
 const DB=database(),params={...input,provider:'toapis',model:'MiniMax-H3',resolution:'768p'};let submissions=0;
 const api=async(url,opts)=>{
  assert.equal(opts.headers.Authorization,'Bearer '+key);
  if(opts.method==='POST'){
   submissions++;assert.equal(url,'https://toapis.cn/v1/videos/generations');
   assert.deepEqual(JSON.parse(opts.body),{model:'MiniMax-H3',prompt:input.prompt,duration:6,resolution:'768p',aspect_ratio:'9:16'});
   return Response.json({id:'vid_123',object:'generation.task',status:'queued'});
  }
  assert.equal(url,'https://toapis.cn/v1/videos/generations/vid_123');
  return Response.json({id:'vid_123',status:'completed',result:{type:'video',data:[{url:'https://files.toapis.com/result.mp4'}]}});
 };
 const created=await (await clipModelRoute(request('submit',params),{DB},api)).json();assert.equal(created.providerTaskId,'vid_123');
 await clipModelRoute(request('submit',params),{DB},api);assert.equal(submissions,1);
 const done=await (await clipModelRoute(request('status',params),{DB},api)).json();assert.equal(done.status,'succeeded');
 const media=await clipModelRoute(request('media',params),{DB},async(url,opts)=>{assert.equal(url,'https://files.toapis.com/result.mp4');assert.ok(!opts.headers.Authorization);return new Response(new Uint8Array([1,2,3]));});
 assert.equal(media.status,200);assert.equal(media.headers.get('cache-control'),'private, no-store');
 assert.ok(!JSON.stringify([...DB.entries]).includes(key));
 const foreign=await clipModelRoute(request('status',params,'other-api-token-secret'),{DB},api);assert.equal(foreign.status,404);
});
test('video generation uses edited prompts without any image prerequisite',()=>{
 const row={kind:'generated_scene',vo:'旁白原文',visual:'夜晚母亲推开房门，镜头缓缓推进',seconds:15};
 const text=videoPrompt(row,'情境画面');assert.ok(text.includes(row.visual));
 assert.equal(videoTaskFingerprint(row,text,config),videoTaskFingerprint({...row,image:new Blob(['preview'])},text,config));
 assert.throws(()=>videoPrompt({...row,visual:''}));
});
test('quick VO can generate without library selection while normal workflow still requires a book',async()=>{
 const base=database(),DB={prepare(sql){if(sql.includes('FROM samples'))return {bind(){return this;},async first(){return null;}};return base.prepare(sql);}};
 let calls=0;const provider=async()=>{calls++;return Response.json({task_id:'quick-vo-task'});};
 const denied=await clipModelRoute(request('submit',{...input,sampleId:''}),{DB},provider);assert.equal(denied.status,400);assert.equal(calls,0);
 const quick={...input,sampleId:undefined,workflow:'quick-vo'};
 const first=await clipModelRoute(request('submit',quick),{DB},provider);assert.equal(first.status,200);assert.equal((await first.json()).status,'submitted');
 await clipModelRoute(request('submit',quick),{DB},provider);assert.equal(calls,1);
});
test('read-only diagnostics returns account credit without submitting or changing credentials',async()=>{
 let calls=0;const r=await clipModelRoute(request('diagnostics',{provider:'toapis',model:'MiniMax-H3',resolution:'768p'}),{DB:database()},async(url,opts)=>{calls++;assert.equal(url,'https://toapis.cn/v1/balance');assert.equal(opts.method,undefined);return Response.json({success:true,remain_credits:0});});assert.match((await r.json()).message,/剩余额度：0/);assert.equal(calls,1);assert.equal(r.headers.get('set-cookie'),null);
});
test('403 preserves sanitized provider reason instead of inventing a permission failure',async()=>{
 const r=await clipModelRoute(request('submit',input),{DB:database()},async()=>Response.json({error:{message:'Token credit limit exceeded '+key}},{status:403}));const task=await r.json();assert.equal(task.httpStatus,403);assert.match(task.error,/Token credit limit exceeded/);assert.ok(!task.error.includes(key));assert.equal(task.status,'rejected');
});
