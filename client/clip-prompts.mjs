// Automatic entry fills empty prompts once; explicit retry never overwrites edits.
export async function fillPromptRows(rows,generate,{automatic=false,persist=async()=>{},progress=()=>{},isCurrent=()=>true}={}){
 const pending=rows.filter(r=>r.included&&r.outputMode!=='original'&&r.kind!=='real_product'&&!String(r.visual||'').trim()&&(!automatic||!r.promptAttempted));
 const errors=[];
 for(const [i,r] of pending.entries()){
  if(!isCurrent())break;
  r.promptAttempted=true;await persist();
  progress(i+1,pending.length);
  try{
   const text=String(await generate(r)||'').trim();
   if(!text)throw Error('模型没有返回提示词');
   if(!String(r.visual||'').trim()){r.visual=text;delete r.promptError;}
  }catch(e){r.promptError=e.message;errors.push('第'+(rows.indexOf(r)+1)+'段：'+e.message);}
  await persist();
 }
 return errors;
}
