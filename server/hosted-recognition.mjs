import {ADAPTATION_POLICY_VERSION} from '../shared/adaptation-policy.mjs';
import {sourceFiles} from './source-library-data.mjs';
import {sourceMediaResponse} from './source-library.mjs';
import {referenceVideos} from './reference-video-data.mjs';
import {evaluateScope} from './domain.mjs';
import {analysisCapabilities} from './understanding.mjs';
import {GEMINI_RECOGNITION_MODEL,recognitionPayload,parseRecognition,generateRecognitionPrompts} from './gemini-recognition.mjs';
import {jsonMediaStream} from './media-json-stream.mjs';
export async function hostedRecognitionRoute(req,env,fetcher=fetch){
 const key=req.headers.get('X-Video-Api-Key');if(!key||key.length<12||key.length>4096||/\s/.test(key))throw Error('请先连接ToAPIs账号');const input=await req.json(),id=String(input.sampleId||''),seconds=Number(input.seconds||15);if(input.provider!=='toapis'||![10,15].includes(seconds))throw Error('请选择ToAPIs和10秒或15秒分段');
 const sample=await env.DB.prepare('SELECT product,category FROM samples WHERE id=?').bind(id).first();if(!sample||!evaluateScope(sample.product,sample.category).allowed)throw Error('请选择非教辅图书');
 const reference=referenceVideos[id],sourceId=reference?.sourceId||id,file=sourceFiles[sourceId];if(!file||!reference?.duration)throw Error('这条原片尚未准备好自动识别');if(file.size>74990000)throw Error('原片超出当前75MB直传范围，可先使用已保存转写生成分段');
 const cacheKey=`source-recognition:v1:${id}:${seconds}:${file.size}`;const cached=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(cacheKey).first();if(cached){const value=JSON.parse(cached.value);if(value.rows){if(value.analysis?.promptPolicy!==ADAPTATION_POLICY_VERSION||value.rows.some(r=>!r.visual?.trim())){value.rows.forEach(r=>r.visual='');value.warning='';await generateRecognitionPrompts(value,key,env,fetcher);await env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(value),cacheKey).run();}return Response.json({...value,cached:true});}if(Date.now()-value.started<600000)throw Error('原片识别正在处理中，请稍后重试；不会重复提交');await env.DB.prepare('DELETE FROM settings WHERE key=?').bind(cacheKey).run();}
 const capability=await analysisCapabilities(key,fetcher,true);if(capability.videoModel!==GEMINI_RECOGNITION_MODEL)throw Error('此入口用于已授权的Gemini原片识别测试；账号中未找到对应模型');
 const claim=await env.DB.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(cacheKey,JSON.stringify({started:Date.now()})).run();if(!claim.meta.changes)throw Error('这条原片已在处理中');
 try{const payload=recognitionPayload('__RAW_MEDIA__',file.mime,seconds,reference.duration),[prefix,suffix]=JSON.stringify(payload).split('__RAW_MEDIA__');const media=await sourceMediaResponse(new Request('https://source.local/api/source-media/'+sourceId+'.mp4'),env.ASSETS);if(!media.ok)throw Error('原视频暂时无法读取');const response=await fetcher('https://toapis.cn/v1beta/models/'+GEMINI_RECOGNITION_MODEL+':generateContent',{method:'POST',headers:{Authorization:'Bearer '+key,'content-type':'application/json'},body:jsonMediaStream(prefix,media.body,suffix),redirect:'manual',signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('ToAPIs原片识别返回HTTP '+response.status+'，未产生分镜');const result=parseRecognition(await response.json(),seconds,reference.duration);try{await generateRecognitionPrompts(result,key,env,fetcher);}catch(e){result.warning='原片已识别，提示词待重试：'+e.message;}
 await env.DB.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(result),cacheKey).run();return Response.json(result);
 }catch(e){await env.DB.prepare('DELETE FROM settings WHERE key=?').bind(cacheKey).run();throw e;}
}
