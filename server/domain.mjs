export const POLICY = Object.freeze({refreshIntervalDays:1,lookbackDays:30,excludeTeaching:true,timezone:'Asia/Shanghai',dailyTime:'09:00'});
const blocked = /教辅|教材|辅导|同步训练|同步练习|练习册|试卷|题库|习题|刷题|真题|模拟题|备考|题解|学霸速记|学霸笔记|考点|押题|中考|高考|考研|考公|公务员|行测|申论|描红|控笔|字帖|练字|考级|月考|领跑卷|提分|必考|培优|总复习|幼小衔接|看图说话|看图写话|写作训练|写作提升|作文素材|默写|拼音|识字|语法|单词|助力教学/;
export function evaluateScope(product,category='') {
  if(!product || typeof product!=='string' || product.length>600) return {allowed:false,reason:'缺少有效商品名称'};
  if(/知识服务|网课|视频课程|读书卡|会员课程/.test(product)) return {allowed:false,reason:'非实体图书或知识服务'};
  if(/学科教辅|教材配套|成人考试|应试|教辅/.test(category) || blocked.test(product)) return {allowed:false,reason:'教辅或应试资料，强制排除'};
  if(/(小学|初中|高中|[一二三四五六七八九]年级|[1-9]年级).*(教材|语文|数学|英语|同步|作文)/.test(product)) return {allowed:false,reason:'学科教材与教辅用途'};
  return {allowed:true,reason:'非教辅候选，版本与用途待核实'};
}
export function classify(product) {
  const rules=[['国学与社会规则',/易经|道德经|老子|庄子|论语|阳明|豆豆|遥远的救世主|天幕红尘/],['科普与文化图鉴',/科普|神仙|妖鬼|百科|动物|天文|科技|植物|图鉴|博物|如何运转|福尔摩吃/],['家庭教育与青春期',/家庭教育|养育|青春期|父母|叛逆|点醒孩子/],['童书故事与社交成长',/绘本|童话|儿童|少儿|孩子|少年|獾和臭鼬/],['专业技能与工作工具',/计算机|电脑|人工智能|编程|家装|装修|施工|经济学|金融|经营|管理|职场|法律/],['杂志与文摘阅读',/杂志|周刊|订阅|读者|意林/],['健康与饮食工具书',/健康|血脂|养生|食谱|饮食|穴位|营养/],['情绪与个人成长',/焦虑|内耗|心理|情绪|疗愈|成长|自我/],['文化礼赠与日历',/日历|礼盒|签名|刷边/]];
  return rules.find(([,pattern])=>pattern.test(product))?.[0] || '文学历史与文化阅读';
}
export function salesLower(band) {
  const m=String(band||'').match(/^(\d+(?:\.\d+)?)(w|万|k|千)?/i);
  if(!m) return null;
  return Number(m[1])*({w:10000,'万':10000,k:1000,'千':1000}[m[2]?.toLowerCase()]||1);
}
export function normalizeRow(row) {
  const product=String(row.product||row['关联商品']||row['商品名称']||'').trim();
  const category=String(row.category||row['商品分类']||classify(product));
  const scope=evaluateScope(product,category);
  const video=String(row.video_id||row['视频ID']||'').replace(/\.0$/,'');
  return {product,category,scope,video_id:/^\d{10,25}$/.test(video)?video:'',account:String(row.account||row['播主']||row['达人']||''),sales_band:String(row.sales_band||row['销售额']||''),volume_band:String(row.volume_band||row['销量']||''),published_at:String(row.published_at||row['发布时间']||''),body:String(row.body||row['口播正文']||'').slice(0,60000)};
}
export const templates={tool:'操作演示',classic:'经典入门',gift:'实物与礼赠',reading:'阅读推荐'};
export function makeDraft(sample,brief) {
  const title=sample.product;
  const task=String(brief.task||'').trim(), audience=String(brief.audience||'').trim();
  if(!task || !audience) throw new Error('请填写内容对象和一条具体购买任务');
  const evidence=String(brief.evidence||'').trim();
  const organization={tool:'先呈现一个真实操作问题，再完整演示解决过程，最后展示本书如何查用同类问题。',classic:'先提出一个读者困惑，解释一个已核实概念，用原创例子连接现实，再展示本版原文、注释或图解。',gift:'先明确送给谁或怎样自用，展示包装、规格与实际细节，再解释这个版本为什么适合该场景。',reading:'先提出一个阅读问题，展示真实章节与内容组织，再用自己的阅读判断解释适合什么读者。'}[brief.template||'tool'];
  if([task,audience,evidence,String(brief.opener||'')].some(x=>x.length>3000))throw new Error('单个简报字段请控制在3000字以内');
  const opener=String(brief.opener||`如果你也遇到“${task}”，选书时可以先看它怎样解释这个问题。`).trim();
  return `${opener}\n\n这条内容讲给${audience}，围绕“${task}”展开。\n\n制作顺序：${organization}\n\n${evidence ? `演示段：${evidence}。请核对这段材料确实属于当前商品版本，再用自己的示范解释。` : `【待补真实证据】${brief.materialPlan||'选一页实际书页、一个可复现操作或一个实物细节'}。取得并核实后，在这里展示它怎样回应这个问题。`}\n\n商品承接：本次候选是《${title}》。补齐ISBN、版本和对应页码后，讲清这个版本适合谁，以及观众如何继续查阅。\n\n【购买信息待核】按当前商品页确认价格、佣金与规格后填写；不承诺未经验证的效果。`;
}
