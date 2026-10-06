import {toBase64,fromBase64,voiceMime} from './free-media.mjs';
export async function storeGenerated(db,id,metadata,bytes){
 const statements=[],chunkSize=300000;let pieces=0;
 for(let offset=0;offset<bytes.length;offset+=chunkSize){statements.push(db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind(`generated-piece:${id}:${pieces++}`,toBase64(bytes.slice(offset,offset+chunkSize))));}
 statements.push(db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').bind('generated:'+id,JSON.stringify({...metadata,size:bytes.length,pieces})));
 await db.batch(statements);
}
export async function serveGenerated(db,id){
 const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind('generated:'+id).first();if(!row)return new Response('生成素材不存在',{status:404});
 const meta=JSON.parse(row.value);let bytes;
 if(meta.base64)bytes=fromBase64(meta.base64);
 else{bytes=new Uint8Array(meta.size);let offset=0;const rows=await db.batch(Array.from({length:meta.pieces},(_,i)=>db.prepare('SELECT value FROM settings WHERE key=?').bind(`generated-piece:${id}:${i}`)));for(const r of rows){if(!r.results?.[0]?.value)return new Response('素材文件不完整',{status:503});const part=fromBase64(r.results[0].value);bytes.set(part,offset);offset+=part.length;}if(offset!==meta.size)return new Response('素材文件不完整',{status:503});}
 const mime=meta.kind==='voice'?voiceMime(bytes):meta.mime;
 return new Response(bytes,{headers:{'content-type':mime,'content-length':String(bytes.length),'cache-control':'public,max-age=31536000,immutable'}});
}
