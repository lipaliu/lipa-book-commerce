# 图书带货工作台 · 首版视觉与交互

目标：从真实商品候选进入参考、购买任务与草稿；明确历史数据和当前采集状态。用户已要求开始搭建并部署，第一版按此范围直接实现，视觉待用户评审。

VI：暖白画布 #F6F7F2，深松绿主色 #1B5547，浅绿选中底 #E8F1E9；橙色用于待接入与需要补证据，红色仅用于排除或错误。字体采用系统中文；标题22–30px，正文14px，辅助12px。数字固定宽度；按钮与浮层圆角12–18px，列表以对齐、行距和轻分割组织。

结构：固定侧导航，中央对象列表，选择商品后右侧详情；进入创作后保留商品与参考信息。手机用可横向滚动的导航和单列详情，操作保留。选品页优先可比较字段，编辑页优先当前草稿。

已查看参考：24S / Nicolas Queffelec 的筛选与商品对齐设计板（https://www.queffelec.fr/projets/lvmh-24s-refonte-fonctionnelle-graphique-site-design-system）；Bottega Veneta / Studio 206 公开CMS板（https://studio206.dev/case-studies/bottega-veneta）的列表与当前对象分区。仅借鉴关系，独立实现；未复制原图片、商标或代码，未宣称操作过其后台。

实现为独立HTML/CSS/JS与Cloudflare Worker/D1。Mira目标仓库尚未定位，本版不声称复用其源码。产品数据来自现有非教辅研究视图，正文与画像未全人工确认；生成是明确标注的结构草稿，语音/视频服务接入状态单独显示。

制作方案交互：用可点击的8步流程图展示文案、参考、取舍、分镜和输出之间的关系。文案先确认；分镜中“采用文字”和“保留镜头”独立操作，每个镜头提供3种明确标注为示意的构图。实际图卡、模型图片、声音、视频分别展示生成状态，不能用同一种成功标记替代。15/30秒是最终串联目标，模型原始片段可略长并剪到目标。

2026-10-07 用户明确要求：分镜主视图采用图片加文字的表格，一行一个镜头，图片、可编辑旁白、画面说明与勾选取舍横向对应。图卡素材库和详细生成参数折叠，优先展示分镜内容；沿用既定松绿与暖白。

原片对照页：原画面与机器原文只读，右侧文案与画面说明可编辑，每格AI按钮旁提供清空。AI建议先呈现，采用后才进入文本框；时长在自己的分镜表逐镜头修改。

分镜勾选默认全选，参考表和制作表均提供全选/取消全选及已选数量。镜号下面区分当前时长和自定义秒数；参考段自定义留空即自动分配，采用到制作分镜时继承填写的秒数。已保存的主动取消选择保留。

2026-10-07 简化选书到分镜：选品库和内容工作台选书后直接打开原片分镜，复用已有任务；新参考任务无需先填人群简报。原片表按镜号/秒数、真实抽帧、画面修改、旁白（最右）排列。原始机器旁白保留折叠对照，原片分镜为第一标签，配音在最右标签。未采集原片的参考明确标注缺画面。当前仅 D60-0003 有12个原片抽帧，非精确镜头切点；没有扩大为全库拆解完成。
验证：38项既有测试通过；本地验证缺画像参考可以直接新建与保存制作、重复打开复用任务、教辅仍被拒绝；公网HTML/JS/CSS/原片图片无登录HTTP200，浏览器选书直达原片表，默认12/12，旁白最右。部署 dc80f9c0-4674-4b7e-b1ec-94994322b403。

2026-10-07 生成画面状态修正：制作表不再把SVG火柴人/构图草图显示为待生成场景。未出图显示等待状态，图像生成不再要求先锁定整篇VO；当前表可确认旁白。预览必须有对应的实际图片/模型视频或明确选用的图卡，不再对缺少场景素材偷偷使用图卡。模型图片按镜头内容关联，确认旁白或调整时长不会丢失；画面或旁白变更后旧图不作为当前素材。
验证：40项测试通过；本地验证确认旁白后的响应仍保留匹配图片，修改画面后旧图失效。线上第一镜通过工作台调用FLUX实际生成并保存（2b048ca68f98cf4f4066fee9017383ae），未确认用户整篇稿件、未改用户文案。当前仍为12镜中的1张静态模型图片，其他镜头未生成；动态视频API仍待接入。


2026-10-08 会议逐句复核后的扁平创作入口：以04:23的“图书、形式、数量”、07:49“不懂钩子”、22:31“AI自动分镜”、29分钟后的“逐段审核重做”为依据。首页改为三个框区，一次选择；人群比例、五个开头建议、时长和自由要求折叠可选。模型自动输出旁白与画面方案，审核默认只看内容，需要时展开单段修改；完整编辑器保留。对标入口保留已有原文，已采集抽帧按原段落对应，未采集的画面不补造。
视觉沿用暖白与松绿，顶部扁平导航；框与选项圆角4–6px、清晰选中状态、旁白位于画面右侧。手机改为上下对应。没有重新借用其他站点的图片或源码。
验证：46项测试通过；本地真实Qwen调用已出4段30秒方案，修改第一段旁白与6秒时长后其他内容保留；对标模式12张原片抽帧与机器转写对应；390/768屏宽无横向溢出。可选设置切换后保持展开、刷新恢复选书。图片/语音为既有测试服务；Seedance与MiniMax仍未配置，界面明确显示。

正式部署：58ffcd77-47ce-495e-bf12-be238ee3fec6。无Cookie/Authorization的curl检查根页面、JS、CSS、bootstrap、原片图片均HTTP200且无登录重定向；浏览器确认三个框选区与选书后可用按钮。未测试中国大陆各网络。验收截图：artifacts/2026-10-08-simple-studio-live.jpg。

2026-10-08 用户进一步纠正“扁平化”：每次单个任务占据主页面，信息要完整，不是三个简略选择框同时展示。创作入口改为选品数据→视频形式→制作数量，一次只渲染当前任务；已有选择在任务切换时保留。选品阶段卡片直接显示最高单条参考销售估算、参考数量、购买人群摘要和统计日期，点开后同页展开对应画像比例、来源、商品关联、售价/佣金缺失状态与全部关联对标。确认“用这本书开始制作”才前进。参考销售额没有累加为商品GMV，近60天历史研究不冒充近30天新榜单。
验收：浏览器验证数据详情、形式页、数量页的单任务切换；近30天空态、7款画像筛选；1440桌面及390手机布局。没有新增模型调用。

部署版本984c5ec3-0387-4d84-93a6-f936b38cd07f；46项回归通过，无登录HTTP验证首页、JS、CSS、数据API均200，无跳转。

2026-10-08 再次按用户纠正：默认入口是高密度排行榜，不是书卡或默认详情。112款直接表格展开，紧凑标题与工具条、固定表头、内部滚动；默认按最高单条销售区间下限降序，同区间不推断先后。销售估算、对应同条参考销量、参考数量、账号、购买摘要、数据窗口并排；支持参考数量排序。点分析才进入详情，返回恢复榜单。历史选择不会让首次进入自动打开详情。销量来自现存volume_band字段，未新增采集或编造数据。
验证：46项既有测试通过；真实浏览器112行、排序、详情返回和390手机表格内部横滑通过。

部署d2aa0af3-6b47-4963-802c-06ac9864d682；匿名HTTP首页/JS/CSS/数据均200，无登录跳转，销量字段存在。

## 2026-10-09 — 灰豚式数据入口与同书对标

用户指定参考为已登录灰豚带货视频库。采用白色数据面板、灰色画布、玫红指标和选择状态，保留紧凑排行榜；新增真实来源封面、入库时间、30天窗口及采集范围。区分网络库与本地图书库；本地录入仅保存在浏览器，并明确不跨设备同步。不是把收藏夹改名成本地图书库。

第二步按同商品列出对标，近30天优先、同窗口销售估算降序。方向分析使用已有实际口播，通过逐字原文校验引用；不足10个方向显示缺口，不以其他版本或重复文案凑数。新增同书补采队列 /api/research-queue，供每日本机采集任务优先处理。第三步按1/3/5/10套生成候选分镜，跟对标模式调用实际文字模型形成不同方案，原始正文保留在参考详情。

每日09:00已创建Codex线程定时任务（automationId: automation），依赖本机Codex及灰豚登录；Cloudflare独立直连灰豚API仍未接通。页面不得把计划时间当成功采集时间。今日原始证据见 ../研究工具/captures/2026-10-09；只采集可见榜单部分记录与一次易经关键词搜索，并非完整榜单。

本次未重新生成视频模型成片；图片、VO与原有成片预览路径保留。

## 2026-10-09 — 全文扫描件到原文配图

本地图书新增独立入口“导入全文 / 按原文做图”，不依赖灰豚对标或虚构的样本ID。PDF原文件及多张图片存入IndexedDB；PDF.js逐页读取，有文字层直接提取，扫描页调用本地Tesseract简体/繁体识别。引擎、字体及语言包自托管于本站，OCR不调用付费接口。逐页落盘，支持暂停与继续，保留原文件、原始OCR文字、校对文字、原页预览及文件页码。扫描文件页码不冒充印刷页码。

用户对照原页校对，选择连续原文（每次最多12段、12000字），再生成图文分镜。每镜包含勾选与秒数、可回溯原句、画面描述/真实生成图片、最右侧可编辑旁白。所有镜头默认选用，可全选、改秒数、改画面与旁白，修改内容后旧配图失效。保留历史方案、导出全书已识别文字、导出选用镜头的Markdown/JSON及实际图片。

/api/book-text/plan与/api/book-text/image仅临时处理选中段落或分镜；不将整书、原文或图片写入公开D1图书/任务库。配图返回浏览器本地保存。沿用既有模型测试额度，不开通付费回退。此新增路径目前交付到分镜和图片，没有声称自动合成视频或跨设备同步。

验证：54项测试通过；本地浏览器两页纯扫描PDF及追加PNG实际识别，刷新后文件/选段/方案保留。Qwen实际生成4镜30秒方案，连续引用通过逐字匹配；FLUX实际返回576×1024 JPEG。UI修改第一镜至6秒后合计28秒，修改旁白后ZIP内容与页面一致；图包包含实际JPEG，未把占位图当成果。样张为程序生成测试材料，不是真实全书验收。OCR可出现“累土→黑土”等误识别，因此保留逐页校对步骤。现代横排样张已验收；整本复杂排版与竖排效果待真实扫描件验证。

最终发布版本：240c4bda-20a1-4d78-b954-a323532b7026。普通curl无Cookie/Authorization访问主页、JS、CSS、health及PDF/OCR资源均200，无登录重定向；最终JS/CSS与本地构建SHA-256一致。正式浏览器已刷新并显示新本地图书库文案。验收截图 artifacts/2026-10-09-book-text-storyboard.png 为本地测试样张产生的分镜与实际配图，不代表用户实际书籍已导入或完成制作。

## 2026-10-10：按固定时间拆片的四列工作台

用户确认两个入口（爆款榜 / 已入库图书），选书后在同页选择参考与制作方式。主表固定为序号秒数、原片真实截图、可编辑旁白、生成图片或视频四列。默认10秒且全选，支持15秒与自定义，逐段秒数、增删、文字清空及AI建议；不再先展示抽象图卡或多层制作步骤。

实现：本地ASR时间戳映射193条已公开正文；81张真实定时抽帧覆盖两条参考。缺失时间轴或识别段落明确留空。素材及草稿存当前浏览器IndexedDB；重新拆分有备份恢复入口。支持真实出图、中文配音、静帧WebM逐段合成及ZIP导出。三种声音预设为同一音色的语速变化。动态视频模型未配置，页面明确说明；换形式目前是创作预设，未标成有销量证据的模板。

验收：56项测试通过。匿名HTTP根页、JS、CSS、时间轴API及真实截图均200；最终JS再次200。浏览器实际选择《点醒孩子》→默认12段（115.57秒）→真实出图→3.5678秒配音→10秒静帧视频→单段ZIP下载完成。下载WebM经FFmpeg成功解码为250帧、576×1024、VP9及Opus；完整旁白WAV10秒，独立旁白3.5678秒。刷新后草稿素材保留，页面视频播放按钮可切换为暂停。截图与素材存artifacts/clip-workbench-20261010。未完成移动端实机验收，不声称动态模型视频已接通。

最终部署版本：2faf1194-bd10-4fd4-a3f3-7cd678339c81。

## 2026-10-10：原片分段播放与免费复用

左列改成可播放原片，右列逐段选择“直接用原片 · 不生成”或“重新生成”。复用保留原声、锁定原片时长、跳过批量图片/配音/视频模型调用，打包时取原片MP4；切回生成保留原来的编辑内容。原片和生成视频可并排播放（原片静音，生成片保留声音）。

两条已取得且匹配的本地原视频（D60-0003、人民拾书D60-0671）已发布69个10/15秒独立片段及2个完整预览源。其他参考未取得原视频时明确待补；支持用户本地上传原片。自定义时段限区间播放，导出时本地裁切WebM，无生成调用。视频资源支持HTTP Range。

验收：59项测试通过；匿名HTTP页面/JS/CSS/参考API/MP4均200，Range返回206和1024字节；首段10秒、尾段5.60秒、15秒片段均完整解码。浏览器实际看到左右视频及复用按钮，第三段切为复用后禁用改文/生成配音，保留原声。观察到原片进度推进到2秒、另一原片到3秒。用户正在页面操作，因此未继续切换用户选择或执行下载验收；本次复用ZIP和自定义本地裁切未做端到端浏览器验收。截图：artifacts/clip-workbench-20261010/source-video-reuse.png。

部署版本：35b73339-c381-43ee-ab76-d5afa1e1c360。


## 2026-10-10：一键完整视频

底部统一为“生成完整视频”，将已选原片/已生成视频按顺序拼接，直接预览与下载整条WebM；图片与画面提示词收进可选编辑项，移除强制逐张确认、逐段下载的主流程。需要重做而没有成品视频时，明确提示视频模型API未接入；可直接把选中段改成沿用原片后合成。不用静帧配音冒充动态模型生成。修改段落后旧成片标记为上一版。

验收：61项测试通过。Chrome实际点击生成→显示11段待接模型→选择沿用原片→12段自动合成→播放器实际播放→下载完整视频。下载文件28,744,310字节；FFmpeg完整解码成功，2897帧、115.84秒、576×1024、VP8视频及48kHz立体声Opus音轨。源计划115.57秒，浏览器实时录制存在约0.27秒接缝开销。截图complete-video.png与下载成片归档于artifacts/clip-workbench-20261010。当前草稿和成片保存在该Chrome浏览器IndexedDB；动态视频API尚未配置，没有声称按提示词生成已跑通。

最终部署e0c9e963-dd8a-4831-8e1b-a762744361d2。普通curl不带Cookie/Authorization访问根页、app.js、style.css均200，JS与本地构建一致；Python urllib一次403，curl与实际Chrome访问成功。

## 2026-10-10：工作台视频API连接

新增“连接视频模型”窗口，支持MiniMax国际站H3/H3 Max与火山方舟Seedance模型ID/接入点。Key仅留在当前页面内存，经本站后端用于所选官方平台，不进入IndexedDB、D1或导出文件。连接验证只查询官方任务列表，不提交生成；刷新后需重新填写。

已实现提交、轮询、私有媒体代理、动态视频取回、中文旁白覆盖与完整视频拼接。当前为文生视频，图片草稿只供构思。单段按模型整数秒向上取整，之后本地裁切。空白画面、实书伪造、超长片段及旁白在提交前校验。请求ID先可靠落盘，服务器原子认领；断网继续同一任务，不自动重试不确定提交，明确失败可显式新建重试。不同Key隔离任务。

官方契约依据：<https://platform.minimax.io/docs/api-reference/video-generation-v2-create>、<https://platform.minimax.io/docs/api-reference/video-generation-v2-query>、<https://platform.minimax.io/docs/api-reference/video-generation-v2-list>、<https://docs.volcengine.com/docs/ark/video-generation-tutorial?lang=zh>。

验收：66项自动测试通过。线上IAB真实打开书籍和连接窗口，用无效测试Key得到官方鉴权失败提示；未提交生成或产生视频费用。修复Cloudflare不支持redirect:error的问题，改为manual且不跟随重定向。清除测试值并保留空白连接窗口，截图model-connection.png。

最终部署450e4bcd-c2f0-4e0f-98f2-db7bb3120c78。匿名curl根页、JS、CSS均200，最终浏览器界面已核对。目前没有有效视频API密钥，真实模型生成、动态视频配音及整条合成的端到端验收仍待完成，不能标记为已真实出片。

## 2026-10-10：Seedance 2.0 / 480p 默认设置

根据用户指定，连接窗口默认选择火山方舟，预填 doubao-seedance-2-0-260128；实际API请求分辨率改为480p，保留9:16。客户端与服务端共享默认常量，分辨率纳入任务指纹，防止复用不同画质的请求。官方模型列表核验：<https://docs.volcengine.com/docs/ark/model-list?lang=zh>。新增提交请求测试验证模型ID及480p，67项测试通过。

当前项目.dev.vars只有APP_PASS与SESSION_SECRET；运行环境没有ARK/SEEDANCE/VOLC相关变量。未读取或输出密钥值。已向用户询问方舟Key所在文件或项目，自动填Key仍待明确可读取的来源，不能假称已经连接。

用户随后改用MiniMax，并明确指定MiniMax-H3、稍后输入Key。最终默认已改为MiniMax-H3 / 768P / 9:16；H3不支持480P，已向用户说明，未发起付费生成。Seedance 2.0 / 480p仅保留为备选。最终部署f16de470-7db0-4e24-b539-648bd5ee7d63，67项测试通过，匿名根页/JS/CSS均200，真实浏览器显示H3默认参数且密钥框为空。截图minimax-h3-default.png；密钥与真实出片仍待用户填写。

### 2026-10-10 ToAPIs 接入
- 新增独立 ToAPIs BYOK 视频入口，默认 MiniMax-H3 / 768p / 9:16，固定服务地址 https://toapis.cn。保留 MiniMax 官方与 Seedance 入口。
- 按 ToAPIs H3 官方文档接入 POST /v1/videos/generations、GET /v1/videos/generations/{id}；completed 映射 succeeded，视频读取 result.data[0].url。
- 连接验证使用只读 /v1/balance，不提交生成。实际使用用户已有“图书测试”令牌，公网工作台已显示 API身份已验证；密钥只留当前页面内存，不写文件/数据库/日志。
- 新增 ToAPIs 合同测试：余额验证、逻辑鉴权失败、参数、任务状态、隔离、重复提交、私有媒体获取；69 项测试通过。
- 部署版本 607f2515-231c-46db-bdd0-3481c5635200。无 Cookie/Authorization 的 curl 检查首页、app.js、style.css 均 200，JS/CSS 与本地构建哈希一致；浏览器已验证连接结果。
- 本次未提交付费生成任务，不能视为真实视频生成验收。截图 artifacts/clip-workbench-20261010/toapis-connected.png。
- 文档依据：https://docs.toapis.com/docs/cn/api-reference/videos/minimax-h3/generation.md ，https://docs.toapis.com/docs/cn/api-reference/tasks/video-status.md ，https://docs.toapis.com/docs/cn/api-reference/account/token-balance.md 。

### 2026-10-10 15秒提示词优先工作台
- 沿用现有粉色操作按钮、白底数据表；五列为序号/秒数、原片视频、旁白、画面提示词、可选参考图与生成结果。提示词常驻可编辑，不折叠。
- 新草稿默认15秒；旧草稿保留原划分，重新拆分前备份。原片115.6秒可拆8段，尾段保留10.6秒。
- 一键补齐仅处理选中、重做且提示词为空的段落；已有提示词不覆盖。单段AI结果可先审核再采用。
- 图片按提示词按需生成，不再作为视频前置条件；生参考图不清除已有视频。批量按钮仍沿用已实现的真实模型生成→配音→拼接流程，提交前检查所有待生成段的提示词。
- 71项测试通过，含15秒默认与尾段、无图片时直接使用提示词生成的条件检查。本次无付费视频生成验收。
- 部署版本25716a63-278c-4d64-8e61-cc469f587eaa。
- 最终部署版本6c5225dc-7101-4804-b716-ea1fdd21c08b；改进AI提示词规则，描述人物行为和运镜，禁用虚构封面/内页/可读文字。相邻旁白作为创作衔接参考，未识别旁白仍保持空白。
- 窄窗口改为按段落分区，避免提示词与右侧生图按钮被横向挤出屏幕。桌面保留五列表格。
- 公网无鉴权HTTP首页、JS、CSS均200且与构建哈希一致。当前115.6秒参考已备份旧稿并拆成8段；手写第一段提示词在补齐其余段落时保留。
- 浏览器实际验证：8段提示词全部填入，第一段手写提示词未被批量补齐覆盖，未出现错误；ToAPIs / MiniMax-H3 / 768p 已恢复真实身份验证。未生成参考图、未提交付费视频任务。截图 artifacts/clip-workbench-20261010/prompt-first-15s.png。

### 2026-10-10 自动生成画面提示词
- 选书打开分段工作台、切换参考视频或重新拆分后，自动调用现有文字模型填入空白提示词。无需先点补齐按钮；AI修改提示词继续保留人工采用步骤。
- 保留已有提示词与手写内容；跳过未选、原片沿用及实书素材段。每段成功/失败状态逐段保存，失败不会因刷新自动重复调用，提供“重试未完成提示词”。不自动生图或提交付费视频。
- 增加自动填入、已编辑内容保护、部分失败保存/手动重试、离开页面停止后续调用测试，74项通过。
- 部署版本1dc7b1fc-9abe-4af5-9af4-ec6b94a5492b；公网匿名首页/JS/CSS均200且构建哈希一致。
- 浏览器验收：直接选中“漫画讲透易经”参考，54.1秒按15秒分4段；未点击补齐按钮，4段提示词已自动填入，无错误。原视频缺失仍明确标注，不伪造画面。截图 artifacts/clip-workbench-20261010/auto-prompts.png。原有已连接模型的工作台标签页保留。

### 2026-10-10 改用视频理解API拆解
- 用户明确要求拆解调用API，取代本地算法/ASR。工作台的数据入口不再调用splitTimedReference产生新分段；原有草稿保留且标记旧来源。
- 新增ToAPIs Gemini 2.5 Flash原生视频输入：原片字节直传，模型返回旁白、原画面描述、生成提示词与时间段。无本地转写/抽帧步骤；播放器只提供时长核验。
- 成功前保留原稿并备份；缺原片时明确上传入口，不展示0段空表和可点击的0秒生成。现有完整原片自动送API；上传原片后直接调用。当前15MB以内、最长30分钟、10/15秒单元。
- 实测已有115.567秒原片：首次API正确识别声音但漏报末尾时长（105秒），验收未通过；已增加与真实原片时长核对，不接受模型自行缩短，补充中文输出约束。
- 78项测试通过。部署82291787-9db6-44d7-8e1c-6110fe46c9b2。
- 《论语导读》7683928666719522089：浏览器可播放834.8秒视频，但仅取得blob流式播放地址；浏览器媒体下载失败，页面资源清单无可导出video，未取得可传给API的原片。自动获取任意抖音原片的服务尚未接通，不冒称随机选品均已可拆。

## 2026-10-10 Understanding provider policy
- User priority: Volcengine, then Alibaba. Video generation stays MiniMax H3.
- Text understanding routes now share understandingAI. Configured ARK_API_KEY plus a doubao ARK_TEXT_MODEL selects Volcengine; otherwise Alibaba Qwen hosted on Cloudflare. Actual model metadata is returned. Production currently uses Alibaba.
- New Gemini analysis calls removed. Existing historic drafts remain attributed. The earlier in-flight Gemini test completed with 8 segments / 115.6 seconds; this is not a Volcengine/Alibaba verification.
- Video analysis checks the account model catalog before submitting media, accepts only adapted audio-video models and never substitutes vision-only Qwen or another vendor. Qwen-Omni adapter uses original data URL and streamed text. No suitable model returns 409 and preserves drafts.
- Live browser account check: current ToAPIs token has no adapted Volcengine/Alibaba audio-video model. New video analysis is blocked by model availability; not claimed working. Text analysis and MiniMax video are separate.
- 82 tests passed. Deployed 037657e4-fc77-492c-9ae0-3d221618e1f8. Anonymous curl returned 200 for homepage, JS and CSS; asset hashes match build. Python urllib received 403 once; browser and curl succeeded. No all-network availability claim.
- Live Alibaba Qwen prompt-edit test returned a Chinese suggestion successfully in the deployed browser. Suggestion was dismissed to preserve original text. Browser proof: artifacts/clip-workbench-20261010/model-policy.png. No new Gemini or paid video-generation call was initiated for this verification.

## 2026-10-10 Original segment playback fix
- Screenshot reference identified by transcript and 96.53-second duration as D60-0181, Douyin video 7690590499668905231 (直言财经). The actual downloaded MP4 existed but had no public reference mapping.
- Copied the original 11,639,009-byte MP4 unchanged and added the exact D60-0181 mapping. Source/destination SHA256 match: 71bc7332934de40df433c132b80107714934dcded1df28df0dca10fb732f13c4. No transcoding, ASR, analysis or generation call.
- Added per-segment playback controls: play/pause, relative progress and clock, mute; source range boundaries independent of output seconds. Stop at end, replay from range start. Existing reference clip files still supported.
- 84 tests pass. Deployment 09f63e6f-08a6-47c8-a87e-06fc1ff93f28. Anonymous homepage 200; JS/CSS hashes match build; D60-0181 API mapping correct; MP4 range request 206 with correct content range. Real browser reads original 96.51 seconds, readyState 4, no error.
- Real workbench test on existing saved D60-0671 draft: first segment played, stopped at 15 seconds (0:15 / 0:15), replay started at 0.19 seconds. D60-0181 saved draft is not present in this verification tab; existing user seven-row draft will resolve through the new source mapping on reload. Did not fabricate new analysis rows.
- Proof: artifacts/clip-workbench-20261010/segment-player.png. Legacy preparation script preserves existing manifest entries to avoid removing newly linked originals if rerun.

## 2026-10-10 Original library and persistent model connection
- Matched original media by exact Douyin video ID: 126 reference records across 78 book groups; 122 references across 75 groups also have historical timed transcripts. Other books are explicitly incomplete. Sales-window data and source publish dates remain distinct.
- Published 4.3 GB of original MP4 bytes as <=20 MiB transport assets and a streaming Range endpoint. No transcoding, local ASR, or algorithmic scene recognition. Public cross-part Range for D60-0547 returned 206 and bytes exactly matched source.
- Book selection prefers a same-book reference with original media; user can explicitly select another reference. Added original-ready counts and ready-only filter.
- User explicitly authorized Gemini original audio/visual recognition testing, with creative text routed to Alibaba Qwen3.5-plus and video to MiniMax H3. Native Gemini recognition and separate Qwen prompt stage implemented; live outcome recorded below. Historical transcript analysis strictly validates source retention and timestamp alignment. Misaligned live Cloudflare Qwen output was rejected, not adopted.
- User explicitly authorized 30-day connection persistence. Encrypted AES-GCM, Secure/HttpOnly/SameSite=Strict cookie, domain-separated existing server secret; no plaintext key in browser drafts/localStorage. Disconnect clears cookie. Anonymous model-session returns null. Real browser saved connection and, after reload/reopening the book, visibly restored “API身份已验证 · 保持连接30天”.
- 95 tests pass. Deploy a77313f3-2532-440f-b471-9a15ecfc16e3 after original-media upload 12baab6d-cea0-4e08-a106-c51c5b4a6999. Anonymous index/JS/CSS reachable; JS/CSS SHA256 equal build. Session credential never included in evidence.
- Live Gemini test on D60-0181 returned 7 rows/96.53 seconds and Qwen prompts, but manual comparison with historical timestamps found narration drift (especially final row). This confirms API media ingestion, not reliable automatic timing. UI now calls video results a draft requiring source/time review. No claim of fully validated raw-audio alignment.
- Reworked historical transcript flow into two API stages: Qwen selects existing sentence boundary times, code validates order/coverage/time tolerance and renders those exact sentences; Qwen separately generates visual prompts. No new local transcription. Invalid boundaries trigger at most one corrective API turn, never silent algorithmic resegmentation. Valid aligned narration is retained even if prompt generation is partial; only missing prompts are retried.
- Capital book D60-0547 live verification: 18 rows spanning 265.29 seconds, all 18 prompts filled (last prompt retried separately). MP4 metadata read 265.288005 seconds; first segment plays and pauses at 15.02 seconds. Proof: artifacts/clip-workbench-20261010/connected-capital-storyboard.png. Current source is published 2026-08-30 with historical 60-day record, not falsely relabeled as a new 30-day source.
- MiniMax H3 actual 15-second test submitted once via ToAPIs; task tsk_vid_01M4JWT17WY9N6R3YNDSKPXEAP succeeded. Media initially blocked because allowlist only included files.toapis.com while actual authenticated API returned files.toapis.cn. Added exact verified CN host and lookalike-domain regression test. HEAD returned 200 video/mp4, 2,123,846 bytes. Retry reuses same task, does not generate/charge again.
- Final deployment dfb4a816-f4bc-41e2-bebb-674d1d523908. Anonymous homepage/JS/CSS 200 with final asset hashes matching dist. 97 full-suite tests passed before one additional provider-host regression; that regression suite also passed. Browser connection persists after reload; no user key in logs or source.
- Browser composition initially stalled; retaining a rendered video element and routing muted source audio through a zero-gain node fixed the playback clock. Real browser reported currentTime advancing (6.20s), source duration 15.0833s, 768×1344, readyState 4. Raw model media now has its own player/download even before composition.
- Completed actual end-to-end 15-second run: narration prepared, MiniMax MP4 retrieved, source muted, narration merged, and selected output assembled. Browser shows “完整视频 / 1段已合成 / 计划15秒” with download. Downloaded both artifacts: artifacts/clip-workbench-20261010/15秒带旁白验收.webm (3.5MiB) and 15秒MiniMax原视频.mp4 (2.0MiB). MediaRecorder WebM initially reports non-finite duration in browser metadata; no claim of MP4 export for the composed file.
- Latest deployment 6975098a-b6c7-4f37-bf9f-f60eaf33a941, public JS hash matches final build. Screenshots include connection status and capital-book source player. Not all catalog books have original media; Gemini whole-video temporal alignment remains a reviewed draft, not validated production timing. No extra MiniMax generation was submitted during download/composition retries.
