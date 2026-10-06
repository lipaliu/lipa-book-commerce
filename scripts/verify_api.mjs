import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8787';
const password=JSON.parse(await readFile('access.credentials.json','utf8')).accessCode;
let cookie='';const checked=[];
async function request(path,method='GET',data,origin=base){const res=await fetch(base+'/api/'+path,{method,headers:{...(data?{'content-type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const payload=await res.json();return {res,payload};}
let r=await request('bootstrap');assert.equal(r.res.status,401);checked.push('anonymous data access denied');
r=await request('login','POST',{password},'https://invalid.example');assert.equal(r.res.status,403);checked.push('cross-origin login rejected');
r=await request('login','POST',{password:'incorrect'});assert.equal(r.res.status,401);checked.push('incorrect access code rejected');
r=await request('login','POST',{password});assert.equal(r.res.status,200);cookie=r.res.headers.get('set-cookie').split(';')[0];checked.push('login session created');
r=await request('bootstrap');assert.equal(r.res.status,200);assert.equal(r.payload.stats.samples,190);assert.equal(r.payload.policy.lookbackDays,30);assert.equal(r.payload.snapshots[0].window_days,60);checked.push('190 real historical samples with honest 60-day provenance');
const dataset=r.payload;
r=await request('samples/D60-0001');assert.equal(r.res.status,404);checked.push('teaching reference cannot be retrieved');
r=await request('jobs','POST',{sampleId:'D60-0001',brief:{template:'tool',audience:'人群',task:'任务'}});assert.equal(r.res.status,400);checked.push('teaching task cannot be created');
r=await request('import','POST',{rows:[{product:'漫画易经',account:'参考作者',published_at:'2026-10-04'}],windowDays:60,asOf:'2026-10-04'});assert.equal(r.res.status,400);checked.push('60-day upload cannot masquerade as the 30-day selection feed');
if(base.includes('127.0.0.1')){
 r=await request('jobs','POST',{sampleId:'D60-0045',brief:{template:'tool',audience:'职场电脑操作初学者',task:'按目录查找一种真实操作方法',evidence:'【QA】尚未取得样书，仅测试结构工作台'}});assert.equal(r.res.status,200);const id=r.payload.id;assert.match(r.payload.script,/购买信息待核/);checked.push('draft creation saved to D1');
 r=await request('jobs/'+id,'PATCH',{script:r.payload.script+'\n【QA】编辑保存核对',status:'awaiting_assets'});assert.equal(r.res.status,200);
 r=await request('bootstrap');assert.ok(r.payload.jobs.some(x=>x.id===id&&x.status==='awaiting_assets'&&x.script.includes('编辑保存核对')));checked.push('editing and queued status persisted');
 r=await request('jobs/'+id,'PATCH',{status:'completed'});assert.equal(r.res.status,400);checked.push('unconnected render cannot be marked complete');
 r=await request('jobs/'+id,'PATCH',{status:'archived'});assert.equal(r.res.status,200);
 const input={rows:[{'关联商品':'【QA导入核对】文化散文集','播主':'QA作者','发布时间':'2026-10-06 00:01:00'},{'关联商品':'【QA排除】高一月考真题试卷','播主':'QA作者','发布时间':'2026-10-06 00:01:00'}],windowDays:30,asOf:'2026-10-06'};
 r=await request('import','POST',input);assert.equal(r.res.status,200);assert.equal(r.payload.imported,1);assert.equal(r.payload.excluded,1);
 const snapId=r.payload.snapshotId;
 r=await request('import','POST',input);assert.equal(r.payload.duplicate,true);checked.push('import excludes schoolware and repeat imports are idempotent');
 await writeFile('/tmp/book-local-qa-cleanup.sql',`DELETE FROM samples WHERE snapshot_id='${snapId}';\nDELETE FROM snapshot_rows WHERE snapshot_id='${snapId}';\nDELETE FROM snapshots WHERE id='${snapId}';\nDELETE FROM jobs WHERE id='${id}';\n`);
}
await mkdir('verification',{recursive:true});await writeFile('verification/'+(base.includes('127.0.0.1')?'local-api':'production-api')+'.json',JSON.stringify({base,checked,stats:dataset.stats,verifiedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({base,checks:checked.length,stats:dataset.stats},null,2));
