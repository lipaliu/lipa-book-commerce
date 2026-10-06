// Choices are bound to one observed SKU and one reference. Unknown data stays unknown.
const catalogs={
 'D60-0002':{templates:['reading'],tasks:[['real-choice','判断这组小说是否适合自己的现实议题阅读','参考正文以故事与现实选择引入阅读理由。'],['story-reading','了解作品中的人物冲突与阅读顺序','已有结构卡记录了长故事与三部作品的承接。']],materials:['chapter'],openers:['reading-question','version-first']},
 'D60-0003':{templates:['reading','gift'],tasks:[['knowledge-map','查看图鉴如何组织人物与文化知识','参考正文介绍人物关系、插画和内容组织。'],['collection','判断这个版本是否适合自用收藏','已有结构卡记录了装帧与收藏用途。']],materials:['diagram','physical'],openers:['knowledge-question','version-first']},
 'D60-0009':{templates:['reading'],tasks:[['mechanism','判断图解能否讲清一个机械原理','参考正文围绕硬核技术、剖面图与原理展开。'],['shared-reading','测试用图解回应共读中的科学问题','共读属于基于科普结构的任务假设，付款者用途未核实。']],materials:['diagram'],openers:['knowledge-question','version-first']},
 'D60-0012':{templates:['classic'],tasks:[['entry-barrier','判断漫画与注释是否降低经典阅读门槛','参考正文明确提出文言文难读，并介绍漫画、注释与解析。'],['concept','测试一个经典概念的解释是否适合初学阅读','已有结构卡记录了现实问题到经典阅读的顺序；概念原意待查书。']],materials:['classic-page'],openers:['entry-question','version-first']},
 'D60-0024':{templates:['reading'],tasks:[['reading-routine','测试怎样形成固定的一期阅读安排','参考正文从碎片信息进入，介绍全年订阅与固定阅读场景。'],['subscription','判断订阅内容与寄送规格是否适合自己','参考正文介绍订阅期数与规格，当前版本仍需另核。']],materials:['periodical'],openers:['reading-question','version-first']},
 'D60-0045':{templates:['tool'],tasks:[['office-lookup','判断能否按目录查找日常电脑操作方法','参考正文展示文档、对齐与表格等操作问题，再引入查用内容。'],['computer-entry','判断内容是否适合电脑基础入门','参考正文提到电脑基础操作与入门使用场景；用途仍是任务假设。']],materials:['screen-index'],openers:['operation-question','version-first']},
 'D60-0039':{templates:['reading'],tasks:[['health-lookup','判断目录和索引是否方便查阅一个健康主题','参考正文以信息冲突与查阅目录引入工具书。'],['source-check','查看书中信息出处与查阅方式','基于健康工具书的研究结构提出核查任务，不作疗效或治疗承诺。']],materials:['index-source'],openers:['index-question','version-first']}
};
const materialDefs={
 chapter:['当前版本的真实章节与阅读笔记','用实际章节与自己的阅读判断支撑作品介绍。'],
 diagram:['当前版本的真实图解与目录页','参考依赖图解的知识组织；需取得对应版本实际页面。'],
 physical:['当前版本的实物、装帧与内页','参考依赖实物细节；需独立拍摄，不能用生成假内页替代。'],
 'classic-page':['当前版本的原文、注释或漫画页','参考强调理解门槛；需核实原意与本版解释。'],
 periodical:['实际期刊、栏目目录与订阅规格','参考强调固定阅读和订阅；需取得当前规格。'],
 'screen-index':['独立操作录屏与本书对应目录','参考强调可见操作；需自行复现，并核实章节对应。'],
 'index-source':['当前版本目录、索引与资料依据页','健康主题先展示查阅与出处，不直接复述未经核实的结论。']
};
export function openerChoices(options,taskId,selection={}){
 const task=options.tasks?.find(t=>t.id===taskId);if(!task)return [];
 const labels={
  'real-choice':'一本小说能否让你把现实中的选择看得更清楚？先看它怎样展开一个冲突。',
  'story-reading':'读一组小说之前，先找一个你想追下去的人物问题。',
  'knowledge-map':'名字听过很多，关系却总记混？选图鉴时先看它怎么组织信息。',
  collection:'买一本文物或文化图鉴收藏，先别只看封面，把一个实物细节看清楚。',
  mechanism:'你有没有好奇过，一个看似简单的机械结构到底怎样运转？',
  'shared-reading':'遇到一个科学问题时，一张图能不能帮你把过程讲清楚？',
  'entry-barrier':'想读经典却被文言文劝退？选版本时，先看这一页怎样解释。',
  concept:'一个经典概念到底是什么意思？先把它的原意和这个版本的解释分开看。',
  'reading-routine':'一直收藏文章，却很少读完一篇？先安排一次能完成的阅读。',
  subscription:'选全年订阅之前，先确认你会怎么读，以及它到底寄送什么。',
  'office-lookup':'电脑操作遇到问题时，你是反复试，还是能找到一条清楚的方法？',
  'computer-entry':'想补电脑基础，先看看这本书的目录能不能对应你真正遇到的问题。',
  'health-lookup':'选健康工具书时，先看看你想查的主题能不能从目录找到。',
  'source-check':'一本健康工具书值不值得读，先把信息出处和查阅方式看清楚。'
 };
 const first=labels[task.id]||`你正在考虑“${task.label}”吗？先看这本书怎样回应这个问题。`;
 const title=({'D60-0002':'豆豆三部曲','D60-0003':'中国神仙','D60-0009':'它们是如何运转的','D60-0012':'漫画讲透易经','D60-0024':'三联生活周刊','D60-0045':'你缺失的那门计算机课','D60-0039':'中国人的血脂管理指南'})[task.referenceId]||options.referenceProduct;
 const topic=({'real-choice':'故事里的现实选择','story-reading':'小说中的人物冲突','knowledge-map':'人物与文化知识的关系','collection':'这个版本的装帧与内页','mechanism':'一个机械结构怎样运转','shared-reading':'一个科学问题的解释','entry-barrier':'难读的经典原文','concept':'一个经典概念的含义','reading-routine':'一次能完成的阅读','subscription':'订阅的内容与寄送规格','office-lookup':'日常电脑操作问题','computer-entry':'电脑基础知识','health-lookup':'健康主题的目录查阅','source-check':'健康信息的出处'})[task.id];
 const rows=[
  ['problem-first','从具体问题开始',first],
  ['version-first','从版本选择开始',`买《${title}》之前，先别只看书名：翻一页，看看它是不是适合你现在的需求。`],
  ['use-scene','从使用场景开始',`碰到${topic}，先别急着买书。看看这本书能不能对应你眼前的问题。`],
  ['evidence-first','从证据检查开始',`这本书怎么讲${topic}？我们先翻到一处具体内容，看完这一处再做判断。`],
  ['question-first','从选择标准开始',`同样讲${topic}，该怎么选？先比较目录和一页内容，比只看封面更有用。`]
 ];
 return rows.map(([id,label,text])=>({id,label,text,referenceId:task.referenceId,videoId:task.videoId,evidenceType:'original_opening_variant',reason:task.reason,audienceFocus:[...(options.audience?.genders||[]),...(options.audience?.ages||[])].filter(x=>[selection.genderId,selection.ageId].includes(x.id)),note:'依据同一参考结构与所选任务提出的原创变体；不是5次成交验证，不在开头朗读后台比例。'}));
}
function profileOf(sample){try{return typeof sample.buyer_json==='string'?JSON.parse(sample.buyer_json):sample.buyer||null;}catch{return null;}}
function validPercent(value){const n=Number(value);return value!==null&&value!==''&&Number.isFinite(n)&&n>=0&&n<=100?n:null;}
function distribution(profile,key,dimension){
 const data=profile[key];let entries=[];
 if(Array.isArray(data))entries=data.map(r=>[r.label??r.name,r.percent??r.percentage]);
 else if(data&&typeof data==='object')entries=Object.entries(data);
 if(!entries.length){for(const s of profile.summary||[]){const m=dimension==='gender'?String(s).match(/(男性|女性).*?占比([\d.]+)%/):String(s).match(/(\d+\s*[-–至]\s*\d+岁|\d+岁以上).*?占比([\d.]+)%/);if(m)entries.push([m[1],m[2]]);}}
 return entries.map(([label,value])=>({label:String(label||''),percent:validPercent(value)})).filter(r=>r.label&&r.percent!==null).sort((a,b)=>b.percent-a.percent).map(r=>({id:`${dimension}:${r.label}:${r.percent}`,label:r.label,percent:r.percent,evidenceType:'sku_purchase_distribution'}));
}
export function buildBriefOptions(sample){
 const profile=profileOf(sample);
 const isPurchase=profile?.profile_type==='成交画像'&&profile?.selected_control_verified===true;
 const matched=profile?.product_id&&profile?.record===sample.id;
 if(!isPurchase||!matched||!profile.available_distribution)return {ready:false,reason:'这个参考尚无已核对的具体SKU成交分布。先补成交画像，不能借用同名商品或粉丝画像。',audience:null,tasks:[],templates:[],materials:[],openers:[]};
 const genders=distribution(profile,'gender_distribution','gender'),ages=distribution(profile,'age_distribution','age');
 if(!genders.length&&!ages.length)return {ready:false,reason:'成交页没有可用的占比数据，暂不能生成有依据的人群选项。',audience:null,tasks:[],templates:[],materials:[],openers:[]};
 const catalog=catalogs[sample.id];
 const sourceVersion=JSON.stringify([sample.id,profile.product_id,profile.observed_at,profile.profile_period,genders,ages]);
 const provenance={recordId:sample.id,skuId:profile.product_id,sourceUrl:profile.source_url,observedAt:profile.observed_at,period:profile.profile_period??null,sampleSize:profile.sample_size??null,sourceType:profile.source_type,scope:'成交画像',coverage:profile.gender_distribution&&profile.age_distribution?'已保存页面分布':'仅保存页面主要性别与最大年龄组；不是完整分布',jointDistribution:'未取得性别与年龄的联合分布',nativeEightSegments:profile.eight_segments??null};
 const basis={referenceId:sample.id,videoId:sample.video_id,evidenceType:'reference_content_hypothesis',review:'基于已有结构阅读与机器正文；关键事实待核'};
 const option=(id,label,reason)=>({id,label,reason,...basis});
 return {ready:!!catalog&&!!sample.body,reason:!catalog||!sample.body?'该SKU的成交选项可用，对标结构仍待整理；暂不补造任务选项。':'',sourceVersion,provenance,referenceProduct:sample.product,
  audience:{genders:[{id:'gender:overall',label:'不限定性别',percent:null,evidenceType:'same_sku_overall'},...genders],ages:[{id:'age:overall',label:'不限定年龄',percent:null,evidenceType:'same_sku_overall'},...ages],nativeEightSegments:profile.eight_segments??null},
  tasks:(catalog?.tasks||[]).map(([id,label,reason])=>option(id,label,reason)),
  templates:(catalog?.templates||[]).map(id=>option(id,({tool:'操作演示',classic:'经典入门',gift:'实物与礼赠',reading:'阅读推荐'})[id],'该参考的内容结构可支持此模板；不是成交效果证明。')),
  materials:(catalog?.materials||[]).map(id=>({...option(id,...materialDefs[id]),status:'pending',label:materialDefs[id][0]+'（待补）'})),
  openers:[],freeOpenerAllowed:true};
}
export function resolveBriefSelections(sample,input){
 const options=buildBriefOptions(sample);if(!options.ready)throw new Error(options.reason);
 if(input.sourceVersion!==options.sourceVersion)throw new Error('成交依据已变化或不属于当前SKU，请重新选择');
 const choose=(list,id,name)=>{const item=list.find(x=>x.id===id);if(!item)throw new Error('请选择有依据的'+name);return item;};
 const gender=choose(options.audience.genders,input.genderId,'性别方向'),age=choose(options.audience.ages,input.ageId,'年龄方向');
 const task=choose(options.tasks,input.taskId,'购买任务'),template=choose(options.templates,input.templateId,'制作模板'),material=input.materialId?choose(options.materials,input.materialId,'证据素材计划'):options.materials[0];
 let opener;
 if(input.openerId==='free'){
  const text=String(input.freeOpener||'').trim();if(!text||text.length>1000)throw new Error('自由开头需要填写1至1000字');
  opener={id:'free',label:'自由填写',text,evidenceType:'user_supplied_hypothesis',reason:'用户自写开头；未冒充成交数据或原参考原话。'};
 }else if(!input.openerId)opener={...openerChoices(options,task.id,{genderId:gender.id,ageId:age.id})[0],id:'automatic',label:'自动采用问题开头'};
 else opener=choose(openerChoices(options,task.id,{genderId:gender.id,ageId:age.id}),input.openerId==='automatic'?'problem-first':input.openerId,'开头');
 const target=[gender.id==='gender:overall'?null:gender.label,age.id==='age:overall'?null:age.label].filter(Boolean);
 const audience=target.length?'这款SKU的成交买家，内容侧重'+target.join('、'):'这款SKU的整体成交买家，不按年龄或性别缩窄';
 const openerText=opener.text;
 return {template:template.id,audience,task:task.label,evidence:'',materialPlan:material.label,opener:openerText,
  selections:{sourceVersion:input.sourceVersion,genderId:gender.id,ageId:age.id,taskId:task.id,templateId:template.id,materialId:material.id,openerId:opener.id,...(opener.id==='free'?{freeOpener:opener.text}:{})},
  audienceEvidence:{...options.provenance,sourceVersion:options.sourceVersion,gender,age,jointPercent:null,note:'比例分别来自性别和年龄边际分布；不代表交叉人群占比，不推断职业或八大标签。'},
  contentEvidence:{task,template,material,opener,note:'任务与开头是参考结构支持的内容假设，素材计划仍待实际获取；不是已确认的购买原因。'}};
}
