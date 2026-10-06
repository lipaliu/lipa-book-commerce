from pathlib import Path
import hashlib,json,re,subprocess

vault=Path('/Users/lipaliu/Documents/图书带货')
scope=json.loads((vault/'00-原始数据/非教辅范围筛查-20261006.json').read_text())
scope_passed=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {evaluateScope,classify} from './server/domain.mjs';let s='';for await(const c of process.stdin)s+=c;console.log(JSON.stringify(Object.fromEntries(JSON.parse(s).filter(r=>evaluateScope(r.product,r.scope_rule_category).allowed).map(r=>[r.id,classify(r.product)]))));"],input=json.dumps(scope['candidates'],ensure_ascii=False).encode()))
original=json.loads((vault/'00-原始数据/近60天-20261004/records.json').read_text())
by_id={r['记录编号']:r for r in original}
profiles=json.loads((vault/'00-原始数据/近60天-20261004/商品成交画像-近60天榜单核对.json').read_text())
buyers={r['record']:{k:r.get(k) for k in ['record','selected_control_verified','sample_size','gender_distribution','age_distribution','product_id','source_url','profile_type','observed_at','profile_period','eight_segments','summary','available_distribution','source_type','observed_price','public_commission_pct']} for r in profiles}
def q(value):
    if value is None:return 'NULL'
    return "'"+str(value).replace("'","''")+"'"
sql=[]
audit=[]
for r in scope['candidates']:
    if r['id'] not in scope_passed:continue
    body_path=Path(r['machine_body_path'])
    assert body_path.exists(),body_path
    body=body_path.read_text()
    analysis=next((p.read_text() for p in (vault/'20-案例与索引/近60天文案案例').glob(r['id']+'-*')),None)
    if analysis:
        analysis=re.sub(r'file:///[^\s\)]+','本地原资料',analysis)
        analysis=re.sub(r'/Users/[^\n]+','（见原始资料库）',analysis)
    row=by_id[r['id']]
    key=hashlib.sha256(__import__('unicodedata').normalize('NFKC',re.sub(r'\s','',r['product'])).encode()).hexdigest()[:20]
    buyer=buyers.get(r['id'])
    category=scope_passed[r['id']]
    values=[r['id'],key,r['product'],category,r['account'],row.get('销售额'),row.get('销量'),str(row.get('视频ID') or r.get('source_video_id') or ''),row.get('发布时间'),body,analysis,json.dumps(buyer,ensure_ascii=False) if buyer else None,'pending',60,'2026-10-04T23:31:19+08:00','research-20261004']
    sql.append('INSERT OR IGNORE INTO samples(id,product_key,product,category,account,sales_band,volume_band,video_id,published_at,body,analysis,buyer_json,scope_status,source_window,captured_at,snapshot_id) VALUES('+','.join(q(x) for x in values)+');')
    audit.append({'id':r['id'],'product':r['product'],'category':category,'bodyLength':len(body)})
sql.append("INSERT OR IGNORE INTO snapshots(id,captured_at,data_as_of,window_days,source,imported,excluded,quarantined,fingerprint,note) VALUES('research-20261004','2026-10-04T23:31:19+08:00','2026-10-04',60,'历史研究：灰豚榜单与离线正文',"+str(len(audit))+","+str(527-len(audit))+",0,'initial-research-20261004','原527份经非教辅筛查后保留候选，非人工逐条SKU确认；不是最新近30天榜单');")
Path('seed.sql').write_text('\n'.join(sql)+'\n')
Path('seed-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print('Prepared',len(audit),'real non-teaching candidate records; original snapshot remains 60 days.')
