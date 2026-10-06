import {evaluateScope,templates} from './domain.mjs';
export const shootingStyles={
 reading:{name:'旁白讲解 + 图卡',description:'VO负责讲述，图卡表达问题与选书标准，真实书页负责证明。',steps:['阅读问题','选择标准','真实章节','书目承接']},
 classic:{name:'经典解释 + 原创情境',description:'用一个问题切入，原创场景说明理解方法，再核对原文和注释。',steps:['现实困惑','解释框架','原文核查','版本承接']},
 tool:{name:'操作演示 + 旁白',description:'先呈现问题，再录屏演示；图卡讲步骤，真实操作负责证明。',steps:['操作问题','查找步骤','真实录屏','工具书承接']},
 gift:{name:'实物展示 + 旁白',description:'先讲使用场景，再展示实物细节；场景可生成，书籍实物需匹配本版。',steps:['自用或礼赠','选择标准','真实实物','规格承接']}
};
export const observedReference={
 'D60-0003':{method:'本地原视频12个时间点抽帧 + 完整机器正文与既有结构卡',visualStatus:'sampled_frames_reviewed',durationSeconds:287.4,observedAt:'2026-10-06',frames:[
 {seconds:[0,5,15],observation:'手持纸盒与《中国神仙》书名，近景展示包装、封面；字幕位于下方。',function:'商品先出现，用上一款的带货经历引入新书；讲述内容由正文支持。'},
 {seconds:[30,50,75],observation:'连续翻页、手指指向内页和目录，镜头贴近纸面。',function:'让文化问题落到可见内容，目录组织成为选择理由。'},
 {seconds:[100,130,160],observation:'粉色结构图页与目录近景，手指指示章节和人物分组。',function:'信息组织与阅读路径是主要证据。'},
 {seconds:[200,240,280],observation:'书盒、书签、展开内页、人物图版和两本封面细节。',function:'正文中的收藏与配套价值落到具体实物。'}],
 transfer:['保留“提出问题→展示信息组织→让观众看具体细节→商品承接”的顺序。','我们的账号不能直接继承原博主的专业声誉或销售经历。','先试一条约40秒的紧凑版本，集中验证一个购买任务；长度与转化收益仍是待测假设。','生成画面用于解释和气氛，真实目录与书页承担商品证明。'],limits:'抽帧不是完整逐镜头切分；镜头边界、字幕全稿和声音节奏尚未逐帧校准。'}
};
const xml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function lines(s,n,max=9){const chars=Array.from(String(s));const result=[];for(let i=0;i<chars.length&&result.length<max;i+=n)result.push(chars.slice(i,i+n).join(''));if(chars.length>n*max)result[max-1]=result[max-1].slice(0,-1)+'…';return result;}
function textBlock(value,x,y,size,width,max=9,color='#193e32'){return lines(value,width,max).map((line,i)=>`<text x="${x}" y="${y+i*size*1.5}" font-size="${size}" fill="${color}">${xml(line)}</text>`).join('');}
function card(label,headline,detail,number){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#f5f2e8"/><path d="M750 0h330v1920H920z" fill="#e4ead9"/><circle cx="950" cy="1330" r="330" fill="#d6e1cf"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif"><text x="96" y="180" font-size="32" letter-spacing="8" fill="#607457">BOOK NOTES / ${number}</text><rect x="96" y="254" width="190" height="7" rx="3" fill="#385a43"/>${textBlock(label,96,356,42,18,2,'#657a5b')}${textBlock(headline,96,520,70,12,8)}<rect x="80" y="1410" width="920" height="260" rx="24" fill="#fffdf6"/>${textBlock(detail,120,1480,34,23,3,'#60705c')}<text x="96" y="1790" font-size="28" fill="#6d7b62">读一本书 · 先看它如何回应问题</text></g></svg>`;
}
function storyboardSketch(kind,purpose,vo){
 const figures=kind==='comic_scene'?'<circle cx="350" cy="790" r="92" fill="#eee2cc" stroke="#426447" stroke-width="8"/><path d="M350 890v300M220 1030l130-100 160 110M350 1190l-130 160M350 1190l150 170" fill="none" stroke="#426447" stroke-width="16" stroke-linecap="round"/><circle cx="760" cy="790" r="80" fill="#eee2cc" stroke="#426447" stroke-width="8"/><path d="M760 880v290M640 1010l120-90 130 80M760 1170l-100 170M760 1170l100 170" fill="none" stroke="#426447" stroke-width="16"/><ellipse cx="730" cy="535" rx="200" ry="115" fill="#fffdf4" stroke="#b3c4a2" stroke-width="5"/><text x="695" y="560" font-size="72" fill="#426447">?</text>':kind==='generated_scene'?'<rect x="180" y="780" width="720" height="400" rx="20" fill="#d5c6ac"/><rect x="280" y="840" width="230" height="290" rx="10" fill="#fffbee" stroke="#5c765a" stroke-width="8"/><path d="M395 845v280" stroke="#b9c4a5" stroke-width="5"/><ellipse cx="740" cy="1000" rx="75" ry="100" fill="#eae4d4"/><path d="M200 710h700M835 660l70 50-70 50" stroke="#70876b" stroke-width="9" fill="none"/>':'<rect x="160" y="665" width="760" height="160" rx="30" fill="#e3ead7"/><rect x="160" y="920" width="760" height="160" rx="30" fill="#e3ead7"/><rect x="160" y="1175" width="760" height="160" rx="30" fill="#e3ead7"/><path d="M540 830v70m-35-25 35 25 35-25M540 1080v70m-35-25 35 25 35-25" fill="none" stroke="#78926b" stroke-width="10"/>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#f8f4e8"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif">${textBlock(purpose,90,190,54,17,2)}<text x="90" y="350" font-size="32" fill="#7a8b69">${xml(kind==='comic_scene'?'漫画情境构图':kind==='generated_scene'?'场景视频构图':'图卡信息构图')}</text>${figures}${textBlock(vo||'无旁白，仅安排画面',90,1510,40,22,4,'#57694e')}<text x="90" y="1800" font-size="28" fill="#879779">分镜示意 · 非模型生成画面</text></g></svg>`;
}
const titleNames={'D60-0002':'豆豆三部曲','D60-0003':'中国神仙 / 中国妖鬼','D60-0009':'它们是如何运转的','D60-0012':'漫画讲透易经','D60-0024':'三联生活周刊','D60-0045':'你缺失的那门计算机课','D60-0039':'中国人的血脂管理指南'};
const demoChecks={reading:'先看目录怎样组织主题，再看一页内容能否回应你的问题。',classic:'先把原文与解释分开，再看这个版本是否适合你的阅读习惯。',tool:'先找到对应目录，再完整复现一次操作，看看方法能否照着做。',gift:'先核对版本与规格，再看装帧、实物和内容是否适合使用场景。'};
const time=x=>`00:${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')},000`;
export function buildProduction(job,sample,brief,choices={}){
 if(!evaluateScope(sample.product,sample.category).allowed)throw new Error('教辅或无效商品不能制作');
 const style=shootingStyles[brief.template];if(!style)throw new Error('请选择视频拍法');
 const title=titleNames[sample.id]||sample.product;
 const targetDurationSeconds=Number(choices.durationSeconds||15);if(![15,30].includes(targetDurationSeconds))throw new Error('成片时长请选择15秒或30秒');
 const format=choices.format||'mixed';if(!['mixed','comic','live'].includes(format))throw new Error('请选择图文混合、漫画或实拍感');
 const decisions=choices.shots||[];if(!Array.isArray(decisions)||decisions.some(d=>!/^(shot-[1-4]|extra-[1-8])$/.test(d.id)||!['graphic','generated_scene','comic_scene','real_product'].includes(d.kind)))throw new Error('分镜选项无效');
 const referenceChoices=choices.referenceChoices||{};
 const extraShots=choices.extraShots||[];if(!Array.isArray(extraShots)||extraShots.length>8||extraShots.some(d=>!/^extra-[1-8]$/.test(d.id)||String(d.vo||'').length>1000||String(d.visual||'').length>1000))throw new Error('额外分镜需要有效编号和不超过1000字的内容');
 if(decisions.some(d=>(d.vo!=null&&String(d.vo).length>1000)||(d.visual!=null&&String(d.visual).length>1000)))throw new Error('单镜头文字请控制在1000字以内');


 const isStructureDraft=/制作顺序：|【待补真实证据】/.test(job.script);
 const cleanParas=job.script.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
 const defaultVO=[brief.opener||cleanParas[0],demoChecks[brief.template],'真正要判断适不适合自己，还是要看这个版本的实际内容。',`本次选书是《${title}》。先确认版本、目录和规格，再决定是否适合你。`];
 const shortGuide={reading:'先看目录，再看一页内容。',classic:'分清原文与解释。',tool:'找到步骤，复现操作。',gift:'看版本，也看实物。'};
 const shorter=[(brief.opener||cleanParas[0]||'').split(/[。？！]/)[0]+'？',shortGuide[brief.template],'用真实素材核对内容。',`本次书目：《${title}》。`];
 const vo=choices.narrationOverride?String(choices.narrationOverride).split(/\n\s*\n/).filter(Boolean):isStructureDraft?(targetDurationSeconds===15?shorter:defaultVO):cleanParas;
 if(vo.join('').length>2000)throw new Error('VO试稿请控制在2000字以内');
 if(!vo.length)throw new Error('口播内容为空，不能制作');
 
 const groupCount=Math.min(4,vo.length);const chunks=Array.from({length:groupCount},(_,i)=>vo.filter((_,n)=>Math.floor(n*groupCount/vo.length)===i).join('\n')).filter(Boolean);
 const active=[...chunks.map((v,i)=>({v,i,id:'shot-'+(i+1),decision:decisions.find(d=>d.id==='shot-'+(i+1))})),...extraShots.map((extra,i)=>({v:String(extra.vo||''),i:i+4,id:extra.id,extra,decision:decisions.find(d=>d.id===extra.id)}))].filter(r=>r.decision?.enabled!==false);
 if(!active.length)throw new Error('至少保留一个镜头');if(targetDurationSeconds===30&&active.length<2)throw new Error('30秒请至少保留两个镜头，单个模型片段最长15秒');
 const base=targetDurationSeconds===15?[3,4,5,3]:[5,8,10,7];let cursor=0;
 const weights=active.map(r=>base[r.i]||4),weightSum=weights.reduce((a,b)=>a+b,0);
 const lengths=weights.map(w=>Math.round(w/weightSum*targetDurationSeconds));lengths[lengths.length-1]+=targetDurationSeconds-lengths.reduce((a,b)=>a+b,0);

 const frames=[
  {purpose:'开头与代入',visual:'原创问题图卡，少量图形运动，保留清晰的文字区。',kind:'graphic',move:'轻推近，1秒内出现主题',ref:'提炼对标的进入问题方式，不继承原作者身份。'},
  {purpose:'解释与场景',visual:brief.template==='tool'?'桌面与电脑操作场景，画面表达“遇到问题→查找方法”；真实操作另录。':brief.template==='classic'?'原创现实情境和简洁解释图形，解释阅读门槛；不生成书中原文。':'暖色桌面、阅读动作与原创信息组织图形，不使用虚构书页文字。',kind:'generated_scene',move:'固定机位或轻微侧移，动作完整',ref:'借鉴问题到解释的顺序，用我们的场景重写。'},
  {purpose:'可见证据',visual:brief.contentEvidence?.material?.label||brief.materialPlan||'当前版本的真实目录、书页或实物',kind:'real_product',move:'俯拍或近景，停留在一个能验证的细节',ref:'迁移证据的位置；需要真实素材，模型图不能替代商品内页。'},
  {purpose:'书目与下一步',visual:`原创书目卡：${title}。版本和购买信息另核，图卡不是官方封面。`,kind:'graphic',move:'稳定画面，字幕与图卡保持安全区',ref:'保留商品承接，删掉未核实的促销、作者背书与效果承诺。'}
 ];
 const shots=active.map(({v,i,id,decision,extra},n)=>{v=decision?.includeVO===false?'':String(decision?.vo??v);let f=extra?{purpose:extra.purpose||'补充镜头',visual:extra.visual||'围绕当前文字生成原创画面',kind:extra.kind||'graphic',move:'完整动作，清晰构图',ref:'用户新增分镜，画面用途尚待测试。'}:{...(frames[i]||frames[3])};f.kind=decision?.kind||(format==='comic'&&f.kind==='generated_scene'?'comic_scene':f.kind);
 if(decision?.visual)f.visual=String(decision.visual);
 if(!decision?.visual&&f.kind==='graphic')f.visual='原创图卡，图形与文字表达这一段VO；不是本书实际内页。';
 if(!decision?.visual&&f.kind==='comic_scene')f.visual='原创漫画情境表达这一段VO，以简洁人物动作和视觉隐喻连接问题与解释；不把虚构画面当成本书图版。';
 if(!decision?.visual&&f.kind==='generated_scene'&&i===2)f.visual='原创解释场景；这张画面不承担商品内页证明。';
 const start=cursor;cursor+=lengths[n];const generationSeconds=Math.max(4,Math.min(15,lengths[n]));
 if(referenceChoices['ref-'+(i+1)]===false)f.ref='不沿用参考这一段，按当前购买任务重写画面。';
 return {id,...f,includeVO:decision?.includeVO!==false,startSeconds:start,endSeconds:cursor,timelineDurationSeconds:lengths[n],durationSeconds:generationSeconds,imageId:decision?.imageId||(['hook','guide','guide','book'][i]||'book'),vo:v,subtitle:v,
  prompt:`9:16竖屏短视频，${generationSeconds}秒素材，最终剪辑使用${lengths[n]}秒。${f.visual} 摄影：${f.move}。暖白与松绿色调，真实材质，主体清晰，字幕在后期添加，不生成任何文字。画面功能：${f.purpose}。主题：${title}。文案语义：${v}（只用于设计画面，不朗读）。不生成虚假商品封面、内页、ISBN或价格；不复刻参考博主的脸、声音与个人身份。${f.kind==='real_product'?'此镜头需真实商品素材，目前只形成拍摄计划。':'VO独立制作，画面中不说话，不添加音乐或旁白。'}`,
  status:f.kind==='real_product'?'needs_real_asset':f.kind==='graphic'?'generated_graphic':'awaiting_model',modelEligible:['generated_scene','comic_scene'].includes(f.kind)};});
 const ref=observedReference[sample.id]||{method:'已有机器正文与结构卡',visualStatus:'not_reviewed',frames:[],transfer:['借鉴问题、证据与商品承接顺序；画面结构尚待原视频核对。'],limits:'尚无逐镜头视觉分析，不据正文推断已观察到的机位、演员或转场。'};
 for(const shot of shots)shot.candidates=['graphic','comic_scene','generated_scene'].map(kind=>({id:shot.id+'-'+kind,kind,label:({graphic:'图卡说明',comic_scene:'漫画情境',generated_scene:'场景视频'})[kind],svg:storyboardSketch(kind,shot.purpose,shot.vo),basis:'依据当前VO与镜头功能形成的构图提案；非原视频实拍帧，非模型出图。'}));
 const cards=[{id:'hook',name:'01-开头问题卡.svg',label:'开头问题卡',svg:card('从一个问题开始',(shots[0]?.vo||'这本书适合怎样的阅读任务？').slice(0,96),'把你的问题说清楚，再决定怎样选书。','01')},{id:'guide',name:'02-选书判断卡.svg',label:'选书判断卡',svg:card('怎样判断适不适合',demoChecks[brief.template],'目录 → 具体内容 → 自己的阅读任务','02')},{id:'book',name:'03-书目介绍卡.svg',label:'书目介绍卡',svg:card('本次书目',title,'本图为原创介绍图卡；具体版本与规格以实际商品为准。','03')}];
 const srt=shots.map((s,i)=>`${i+1}\n${time(s.startSeconds)} --> ${time(s.endSeconds)}\n${s.vo}\n`).join('\n');
 return {version:1,jobId:job.id,sampleId:sample.id,skuId:brief.audienceEvidence?.skuId||null,title,template:brief.template,style,generatedAt:new Date().toISOString(),generationMethod:'规则编排与SVG生成；未调用写作或视频模型',targetDurationSeconds,format,planChoices:{durationSeconds:targetDurationSeconds,format,shots:decisions,referenceChoices,extraShots,scriptLocked:choices.scriptLocked===true,...(choices.narrationOverride?{narrationOverride:String(choices.narrationOverride)}:{})},scriptLocked:choices.scriptLocked===true,sourceNarration:vo.join('\n\n'),sourceScript:job.script,narration:shots.map(s=>s.vo).join('\n\n'),narrationBasis:isStructureDraft?'从结构简报提取开头，并生成独立VO试稿；制作指令与人群比例不朗读。':'用户编辑稿，按段落编排；没有额外事实核验。',voStatus:'text_ready',timing:'按成片目标分配节奏，尚未根据录音逐词对齐',voLengthWarning:shots.map(s=>s.vo).join('').length>targetDurationSeconds*5?'当前VO可能超时，录音前建议进一步压缩。':'',estimatedDurationSeconds:cursor,reference:{...ref,videoUrl:sample.video_id?'https://www.douyin.com/video/'+sample.video_id:null,analysis:sample.analysis||'',body:sample.body||''},shots,cards,srt,realAssets:shots.filter(s=>s.kind==='real_product').map(s=>({shotId:s.id,needed:s.visual,status:'pending'})),optimization:{keep:ref.transfer,adjust:['每条只验证一个购买任务，不一次堆叠多个买书理由。','生成场景承担代入，真实素材承担证明，文字图卡承担信息。','先测试开头留存、商品点击和订单，再决定是否批量。'],notProven:'长度、人群方向、拍法及开头均是实验假设，未由参考销量证明因果。'}};
}
export function storyboardText(pack){return `视频制作方案：${pack.title}\n拍法：${pack.style.name}\n${pack.style.description}\n${pack.timing}\n\n${pack.shots.map(s=>`${s.id} / ${s.startSeconds}–${s.endSeconds}秒 / ${s.purpose}\nVO：${s.vo}\n画面：${s.visual}\n镜头：${s.move}\n参考迁移：${s.ref}\n状态：${s.status}\n提示词：${s.prompt}`).join('\n\n')}\n\nVO试稿：\n${pack.narration}\n\n待真实素材：\n${pack.realAssets.map(s=>s.needed).join('\n')}\n\n参考拆解范围：${pack.reference.method}\n${pack.reference.limits}\n`}
export function reconcileProductionChoices(previous,next){const before=previous?.planChoices?.narrationOverride??previous?.sourceNarration;if(previous&&typeof next.narrationOverride==='string'&&next.narrationOverride!==before){return {...next,shots:(next.shots||[]).map(s=>{if(!s.id?.startsWith('shot-'))return s;const {vo,...rest}=s;return rest;})};}return next;}
