export async function referenceVideoResponse(req,assets){
 const range=req.headers.get('Range');if(!range)return assets.fetch(req);
 const clean=new Request(req);clean.headers.delete('Range');const res=await assets.fetch(clean);
 if(res.status!==200||!res.headers.get('content-type')?.includes('video/'))return res;
 const bytes=new Uint8Array(await res.arrayBuffer()),match=/^bytes=(\d*)-(\d*)$/.exec(range),h=new Headers(res.headers);h.set('accept-ranges','bytes');
 let start,end;if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,bytes.length-Number(match[2]));end=match[1]?(match[2]?Number(match[2]):bytes.length-1):bytes.length-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=bytes.length||end<start){h.set('content-range',`bytes */${bytes.length}`);h.delete('content-length');return new Response(null,{status:416,headers:h});}
 end=Math.min(end,bytes.length-1);h.set('content-range',`bytes ${start}-${end}/${bytes.length}`);h.set('content-length',String(end-start+1));return new Response(bytes.slice(start,end+1),{status:206,headers:h});
}
