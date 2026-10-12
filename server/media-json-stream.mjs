const encoder=new TextEncoder();
const base64=bytes=>btoa(String.fromCharCode(...bytes));
// Transport only: preserve the MP4 bytes; no decoding, sampling or transcription.
export function jsonMediaStream(prefix,body,suffix){
 const reader=body.getReader();
 async function* chunks(){yield encoder.encode(prefix);let carry=new Uint8Array();try{for(;;){const {value,done}=await reader.read();if(done)break;let at=0;if(carry.length){const n=Math.min(3-carry.length,value.length),joined=new Uint8Array(carry.length+n);joined.set(carry);joined.set(value.subarray(0,n),carry.length);at=n;if(joined.length===3){yield encoder.encode(base64(joined));carry=new Uint8Array();}else{carry=joined;continue;}}
 const end=at+Math.floor((value.length-at)/3)*3;while(at<end){const next=Math.min(at+12288,end);yield encoder.encode(base64(value.subarray(at,next)));at=next;}carry=value.slice(at);}
 if(carry.length)yield encoder.encode(base64(carry));yield encoder.encode(suffix);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
 const iterator=chunks();return new ReadableStream({async pull(controller){try{const {value,done}=await iterator.next();done?controller.close():controller.enqueue(value);}catch(e){controller.error(e);}},async cancel(){await iterator.return();}});
}
