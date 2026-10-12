// Source ranges stay tied to the reference; editing output seconds cannot move them.
export function resolveReferenceClip(row,reference,uploadedUrl){
 if(row.start==null||!Number.isFinite(row.end)||row.end<=row.start)return null;
 const clip=!uploadedUrl&&reference?.clips?.find(c=>Math.abs(c.start-row.start)<.01&&Math.abs(c.end-row.end)<.05);
 if(clip)return {url:clip.url,start:0,end:row.end-row.start,duration:row.end-row.start,isFile:true};
 const url=uploadedUrl||reference?.url;
 return url?{url,start:row.start,end:row.end,duration:row.end-row.start,isFile:false}:null;
}
