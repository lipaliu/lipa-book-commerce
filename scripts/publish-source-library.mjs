// Package original bytes for hosting; no decoding, transcription, or shot inference.
import fs from 'node:fs/promises';import path from 'node:path';
import {referenceVideos} from '../server/reference-video-data.mjs';
import {timedReferences} from '../server/timed-reference-data.mjs';
const boot=JSON.parse(await fs.readFile('/tmp/book-bootstrap-current.json','utf8'));
const queue=JSON.parse(await fs.readFile('../.work/downie-queue.json','utf8'));
const byVideo=new Map(queue.map(r=>[r.video_id,r['记录编号']]));
const dest='client/source-bytes';await fs.mkdir(dest,{recursive:true});
const files={},refs={...referenceVideos},report=[];const partSize=20*1024*1024;
for(const product of boot.products)for(const sample of product.samples){
 const rid=byVideo.get(sample.videoId)||sample.id;if(!/^D60-\d+$/.test(rid))continue;
 const source=path.resolve('../.work/downie-media',rid+'.mp4');let stat;try{stat=await fs.stat(source);}catch{continue;}
 let duration=timedReferences[sample.id]?.duration||timedReferences[rid]?.duration;
 if(!duration){try{duration=JSON.parse(await fs.readFile('../.work/asr-batch/'+rid+'.asr.json','utf8')).audio_seconds;}catch{continue;}}
 if(!files[rid]){
  const handle=await fs.open(source);const parts=[];
  try{for(let offset=0,index=0;offset<stat.size;offset+=partSize,index++){
   const length=Math.min(partSize,stat.size-offset),name=rid+'-'+index+'.bin',out=path.join(dest,name);let exists=false;try{exists=(await fs.stat(out)).size===length;}catch{}
   if(!exists){const bytes=Buffer.alloc(length);const read=await handle.read(bytes,0,length,offset);if(read.bytesRead!==length)throw Error('Incomplete source '+rid);await fs.writeFile(out,bytes);}
   parts.push({url:'/source-bytes/'+name,start:offset,size:length});
  }}finally{await handle.close();}
  files[rid]={size:stat.size,mime:'video/mp4',parts};
 }
 refs[sample.id]=refs[sample.id]||{url:'/api/source-media/'+rid+'.mp4',duration,videoId:sample.videoId,sourceId:rid,clips:[]};
 report.push({sampleId:sample.id,sourceId:rid,product:product.product,hasTranscript:!!(timedReferences[sample.id]||timedReferences[rid])});
}
await fs.writeFile('server/source-library-data.mjs','export const sourceFiles='+JSON.stringify(files)+';\n');
await fs.writeFile('server/reference-video-data.mjs','export const referenceVideos='+JSON.stringify(refs)+';\n');
await fs.mkdir('artifacts/source-library',{recursive:true});await fs.writeFile('artifacts/source-library/coverage.json',JSON.stringify({createdAt:new Date().toISOString(),report},null,2));
console.log(JSON.stringify({references:report.length,books:new Set(report.map(x=>x.product)).size,files:Object.keys(files).length,GB:Object.values(files).reduce((n,f)=>n+f.size,0)/1e9}));
