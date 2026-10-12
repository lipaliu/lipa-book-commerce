// Understanding is restricted to Volcengine first, Alibaba second.
export const ALIBABA_TEXT_MODEL='@cf/qwen/qwen3-30b-a3b-fp8';
export const OMNI_MODELS=['qwen3.8-omni-flash','qwen3.5-omni-plus','qwen3.5-omni-flash','qwen3-omni-flash'];
export function understandingAI(env,fetcher=fetch){
 const volc=!!(env.ARK_API_KEY&&env.ARK_TEXT_MODEL&&/^doubao-/.test(env.ARK_TEXT_MODEL));
 const gateway=!!(!volc&&env.TOAPIS_TEXT_KEY);const model=volc?env.ARK_TEXT_MODEL:gateway?'qwen3.5-plus':ALIBABA_TEXT_MODEL;
 return {model,provider:volc?'volcengine':'alibaba',async run(_model,params){
  if(gateway){const r=await fetcher('https://toapis.cn/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.TOAPIS_TEXT_KEY,'content-type':'application/json'},body:JSON.stringify({...params,model,stream:true,enable_thinking:false}),redirect:'manual',signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('ToAPIs千问接口返回HTTP '+r.status+'；未自动重复调用');return readChatResult(r);}
  if(!volc){if(!env.AI)throw Error('阿里系文字模型未连接');return env.AI.run(ALIBABA_TEXT_MODEL,params);}
  const r=await fetcher('https://ark.cn-beijing.volces.com/api/v3/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.ARK_API_KEY,'content-type':'application/json'},body:JSON.stringify({...params,model,stream:false}),redirect:'manual',signal:AbortSignal.timeout(90000)});
  if(!r.ok)throw Error('火山文字接口返回HTTP '+r.status+'；本次未自动重复付费调用');
  return r.json();
 }};
}
export async function analysisCapabilities(key,fetcher=fetch,allowGemini=false){
 const r=await fetcher('https://toapis.cn/v1/models?type=all',{headers:{Authorization:'Bearer '+key},redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('无法核对ToAPIs模型权限（HTTP '+r.status+'），未发起拆解');
 const data=await r.json();if(!Array.isArray(data.data))throw Error('ToAPIs未返回有效模型目录');
 const ids=data.data.map(x=>x.id);
 const model=OMNI_MODELS.find(x=>ids.includes(x))||(allowGemini&&ids.includes('gemini-2.5-flash-official')?'gemini-2.5-flash-official':null);
 return {textModels:ids.filter(x=>/^qwen|^doubao/.test(x)&&!/image|seedance|seedream/.test(x)),priority:['volcengine','alibaba'],videoModel:model,videoReady:!!model,volcengineListed:ids.filter(x=>/^doubao-seed-(?!ance|ream)/.test(x)),reason:model?(model.startsWith('gemini')?'已获授权测试Gemini原片识别；文案与提示词仍使用阿里':'已在账号目录中找到阿里系音画理解模型；生成权限以实际请求为准'):'当前ToAPIs账号没有已适配的火山或阿里音画理解模型。请让ToAPIs开通Qwen-Omni接口，或接入火山／阿里官方音画理解API。普通千问文字、视觉模型不能替代原声转写；未调用其他厂商。'};
}
export async function readChatResult(response){
 if(!response.headers.get('content-type')?.includes('text/event-stream'))return response.json();
 const text=await response.text();if(text.length>2000000)throw Error('模型输出过长');
 let content='',finished=false;
 for(const line of text.split(/\r?\n/)){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(raw==='[DONE]'){finished=true;continue;}if(!raw)continue;const chunk=JSON.parse(raw);if(chunk.error)throw Error('音画理解接口返回错误');const c=chunk.choices?.[0];content+=c?.delta?.content||'';if(c?.finish_reason==='stop')finished=true;if(c?.finish_reason==='length')throw Error('模型拆解输出被截断，请缩短原片');}
 if(!finished)throw Error('音画理解响应中断，结果未采用');
 return {choices:[{message:{content}}]};
}
