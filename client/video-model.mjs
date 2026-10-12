import {visualFidelity} from '../shared/adaptation-policy.mjs';
import {SEEDANCE_DEFAULTS,MINIMAX_DEFAULTS,TOAPIS_DEFAULTS} from '../shared/video-defaults.mjs';
// Optional encrypted HttpOnly session; the plaintext key is never stored in drafts or localStorage.
let connection=null;
export async function restoreVideoConnection(){if(connection)return;try{const r=await fetch('/api/model-session');if(r.ok){const x=await r.json();if(x.connection)connection=x.connection;}}catch{}}
export const videoModelConnection=()=>connection?{provider:connection.provider,model:connection.model,resolution:connection.resolution,remembered:!!connection.remembered}:null;
export async function videoModelCall(action,body={},binary=false,config=connection){
 if(!config)throw Error('请先连接视频模型');
 let res;try{res=await fetch('/api/clip-model/'+action,{method:'POST',headers:{'Content-Type':'application/json',...(config.key?{'X-Video-Api-Key':config.key}:{})},body:JSON.stringify({...body,provider:config.provider,model:config.model,resolution:config.resolution})});}catch{throw Error('网络暂时中断，任务已保留；恢复后点击继续，不会重复提交同一请求');}
 if(!res.ok){const data=await res.json().catch(()=>({}));throw Error(data.error||'模型请求暂时失败，请稍后继续');}
 return binary?res.blob():res.json();
}
export function openVideoConnection(onChange){
 document.querySelector('#video-connection-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='video-connection-dialog';dialog.className='video-connection-dialog';
 dialog.innerHTML=`<form method="dialog"><h2>连接视频模型</h2><p>连接后，选中段落可以直接生成动态视频，再自动拼成整条。</p><label>模型平台<select name="provider"><option value="toapis" selected>ToAPIs / MiniMax H3</option><option value="minimax">MiniMax / 海螺</option><option value="seedance">火山方舟 / Seedance</option></select></label><label data-toapis>视频模型<input value="MiniMax-H3" readonly><small>768p · 竖屏9:16 · 接口地址 https://toapis.cn</small></label><label data-mini hidden>视频模型<select name="miniModel"><option value="MiniMax-H3" selected>MiniMax H3</option><option value="MiniMax-H3-Max">MiniMax H3 Max</option></select><small>默认 MiniMax-H3 · 768P · 竖屏9:16</small></label><label data-seed hidden>已开通的模型ID<input name="seedModel" value="${SEEDANCE_DEFAULTS.model}" placeholder="doubao-seedance-… 或 ep-…" autocomplete="off"><small>默认 Seedance 2.0 · 480p · 竖屏9:16</small></label><label>API Key<input name="apiKey" type="password" autocomplete="off" spellcheck="false" placeholder="粘贴所选平台的API Key" required></label><label><input type="checkbox" name="remember"> 在此浏览器保持连接30天</label><p class="video-key-note">密钥经本站后端发送给你选择的平台（ToAPIs或模型官方），勾选保持连接后，密钥加密保存在仅本站后端可读取的Cookie中，刷新无需重新输入；断开连接即可清除。不勾选则仅本页临时使用。连接验证不生成视频；点击生成将使用你的模型账号额度。</p><p><a data-provider-doc target="_blank" rel="noopener" href="https://platform.minimax.io/docs/api-reference/video-generation-v2-create">查看平台API说明 ↗</a></p><p role="status" data-connect-status></p><div class="video-connect-actions"><button type="button" class="btn" data-close>取消</button><button type="button" class="btn" data-disconnect>断开当前连接</button><button type="submit" class="btn primary">验证并连接</button></div></form>`;
 const form=dialog.querySelector('form'),provider=form.elements.provider,status=dialog.querySelector('[data-connect-status]');
 const update=()=>{const seed=provider.value==='seedance';const gateway=provider.value==='toapis';dialog.querySelector('[data-toapis]').hidden=!gateway;dialog.querySelector('[data-mini]').hidden=seed||gateway;dialog.querySelector('[data-seed]').hidden=!seed;dialog.querySelector('[data-provider-doc]').href=gateway?'https://docs.toapis.com/docs/cn/api-reference/videos/minimax-h3/generation':seed?'https://docs.volcengine.com/docs/ark/video-generation-tutorial?lang=zh':'https://platform.minimax.io/docs/api-reference/video-generation-v2-create';};
 if(connection){provider.value=connection.provider;if(connection.provider==='seedance')form.elements.seedModel.value=connection.model;else if(connection.provider==='minimax')form.elements.miniModel.value=connection.model;}update();provider.onchange=update;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-disconnect]').onclick=async()=>{await fetch('/api/model-session',{method:'DELETE'});connection=null;dialog.close();onChange();};
 dialog.addEventListener('close',()=>{form.elements.apiKey.value='';dialog.remove();},{once:true});
 form.onsubmit=async e=>{e.preventDefault();const config={provider:provider.value,model:provider.value==='toapis'?TOAPIS_DEFAULTS.model:provider.value==='seedance'?form.elements.seedModel.value.trim():form.elements.miniModel.value,resolution:provider.value==='toapis'?TOAPIS_DEFAULTS.resolution:provider.value==='seedance'?SEEDANCE_DEFAULTS.resolution:MINIMAX_DEFAULTS.resolution,key:form.elements.apiKey.value.trim()};const submit=form.querySelector('[type=submit]');submit.disabled=true;status.textContent='正在验证API身份，不提交生成任务…';try{const result=await videoModelCall('connect',{remember:form.elements.remember.checked},false,config);if(!dialog.isConnected)return;connection=result.remembered?{provider:config.provider,model:config.model,resolution:config.resolution,remembered:true}:config;dialog.close();onChange();}catch(err){status.textContent=err.message;}finally{submit.disabled=false;}};
 document.body.append(dialog);dialog.showModal();form.elements.apiKey.focus();
}
export function videoPrompt(row,format,mode='follow'){
 const text=(row.visual||'').trim();if(!text)throw Error('请先补齐画面提示词，可点击“重试未完成提示词”');
 if(row.kind==='real_product')throw Error('真实书页和实书段请沿用原片，或改为情境画面后生成');
 return `制作竖屏9:16动态短视频。表现形式：${format||'情境画面'}。原画面描述（作为基准）：${row.originalVisual||'未提供，当前方案尚未核对原画面'}。\n${visualFidelity(mode)}\n本次画面提示词：${text}\n旁白含义供画面参考：${row.vo||'无旁白'}\n动作自然，镜头节奏贴近原片，原片固定机位就保持固定，不主动增加运镜。不要生成字幕、文字叠层或对白，旁白将在后期单独配制。不要伪造书籍内页、封面文字、购买数据。`;
}
export function videoTaskFingerprint(row,prompt,connection){return JSON.stringify({prompt,seconds:row.seconds,provider:connection.provider,model:connection.model,resolution:connection.resolution});}
