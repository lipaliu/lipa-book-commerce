# 图书带货工作台 · Lipa

正式网站：https://lipa-book-commerce.lipaliu514.workers.dev/#quick

## 当前流程（2026-10-12）

选择库内已有原片的对标，或上传下载好的视频，点击一次即可自动读取原声与画面、按15秒准备口播及提示词、生成新画面、配回原声并拼接下载。96.53秒分成7段：6×15秒＋6.53秒。口播与提示词始终展开，可直接编辑提示词。

- 生成视频：ToAPIs / MiniMax-H3，保留完成片段和任务ID，重试仅处理失败段。
- 原片音画识别：已授权的Gemini；文字理解与提示词优先火山配置，其次阿里Qwen。
- 原片的声音保留，成片画面仅使用新生成片段，不以原片补齐失败段。
- 免费本地浏览器音频封装与视频拼接；不会把本地处理冒充模型理解。
- 账号连接可按用户选择加密保存30天HttpOnly Cookie；凭据不写入源码。
- 生成前检查ToAPIs额度；403显示服务商原因，账号类错误暂停后续提交。
- 完整工作台仍在 `/#studio`，包含选品、购买画像、对标、图书全文/扫描件与分镜操作。

## 本地开发

需要Node.js 22或更新版本、npm及curl（媒体恢复使用系统网络代理配置）。

```sh
npm ci
npm test
npm run media:restore -- --dry-run
npm run media:restore
npm run build
npx wrangler d1 execute lipa-book-commerce-db --local --file schema.sql
npm run dev
```

媒体约4GB，恢复命令从现有正式站点下载并校验SHA-256；未恢复媒体不能完整部署原片功能。媒体仍在本机与Cloudflare，Git只保存恢复清单。抽帧参考图在仓库内。仅恢复一个文件可使用 `npm run media:restore -- --only client/reference-videos/D60-0671-15s-0.mp4`。

数据库结构在 `schema.sql`；生产D1数据独立保存，不通过Git迁移。新建数据库需通过应用导入已有采集资料；`scripts/prepare_seed.py`依赖项目所有者本机Obsidian资料目录，不是任意电脑都能运行的安装步骤。

## 部署

已有部署使用 `wrangler.jsonc` 中的Worker及D1绑定。先核对目标账号，再运行 `npm run deploy`。在其他账号部署时，创建自己的D1并修改配置；不要清空现有生产库。

模型会话加密需要Cloudflare secret `MODEL_SESSION_SECRET`（代码也兼容 `SESSION_SECRET`）；API Key在网页模型连接入口填写。可选服务端模型配置详见 `server/understanding.mjs`、`server/providers.mjs`。不要把 `.dev.vars`、凭据、Cookie或API Key提交到Git。

```sh
npx wrangler secret put MODEL_SESSION_SECRET
npm run deploy
```

网站是共享入口；已取消网站访问密码，修改请求校验同源。私人生成任务按模型账号隔离。GitHub私有仓库不改变现有网站访问范围。

## 已验证与边界

- 132项自动测试通过，覆盖模型调用、任务去重、部分失败恢复、原声保留和不混入原片画面等。
- 真实15秒原片已从上传一路生成、拼接、播放并下载；历史96.5秒完整生成验收单独归档在本机。
- 2026-10-12当前账号余额返回0，后续生成需用户自行补充额度；代码同步不等于所有任务已完成。
- 上传原片识别当前15MB以内、0.5秒至10分钟。任意抖音分享链接自动下载尚未接通。
- 浏览器导出WebM，生成及合成需保持页面打开；浏览器草稿不跨设备同步。
- 灰豚定时采集依赖本机登录会话；最新30天范围、更新时间与采集覆盖范围以站内实际记录为准。排除教辅与非图书服务，标题不能当正文。
- 原始视频、运行截图、研究归档、账户记录不进入此源码仓库；源码不包含生产D1备份。

早期版本说明保留在 [docs/HISTORY.md](docs/HISTORY.md)，其中「尚未接入」只代表对应历史日期。
