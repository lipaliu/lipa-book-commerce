import {sourceFiles} from './source-library-data.mjs';
export async function sourceMediaResponse(req,assets,files=sourceFiles){
 const id=new URL(req.url).pathname.split('/').pop().replace(/\.mp4$/,'');const file=files[id];if(!file)return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405});
 let start=0,end=file.size-1;const range=req.headers.get('Range');
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'content-range':`bytes */${file.size}`}});start=m[1]?Number(m[1]):Math.max(0,file.size-Number(m[2]));end=m[1]?(m[2]?Number(m[2]):end):end;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=file.size||end<start)return new Response(null,{status:416,headers:{'content-range':`bytes */${file.size}`}});end=Math.min(end,file.size-1);}
 const headers={'content-type':file.mime,'content-length':String(end-start+1),'accept-ranges':'bytes','cache-control':'public, max-age=3600'};if(range)headers['content-range']=`bytes ${start}-${end}/${file.size}`;
 const parts=file.parts.filter(p=>p.start<=end&&p.start+p.size>start);let index=0;
 const stream=req.method==='HEAD'?null:new ReadableStream({async pull(controller){if(index>=parts.length){controller.close();return;}const p=parts[index++];try{const res=await assets.fetch(new Request('https://assets.local'+p.url));if(!res.ok)throw Error('Source media part unavailable');const bytes=new Uint8Array(await res.arrayBuffer());if(bytes.length!==p.size)throw Error('Source media part truncated');controller.enqueue(bytes.subarray(Math.max(0,start-p.start),Math.min(bytes.length,end-p.start+1)));}catch(e){controller.error(e);}}});
 return new Response(stream,{status:range?206:200,headers});
}
