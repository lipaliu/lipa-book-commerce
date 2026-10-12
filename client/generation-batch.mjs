// Preserve completed tasks and stop new submissions on account-level failures.
export async function generateRows(rows,generate,concurrency=2){
 let next=0,blocked=false;const errors=[];
 const worker=async()=>{while(next<rows.length&&!blocked){const index=next++,row=rows[index];try{await generate(row);}catch(e){errors.push({index,error:e});if([401,402,403,429].includes(e.httpStatus))blocked=true;}}};
 await Promise.all(Array.from({length:Math.min(concurrency,rows.length)},worker));
 if(errors.length)throw Error('生成未全部完成；成功片段已保留，未用原片替补。'+(blocked?'已暂停后续提交。':'')+errors.map(x=>' 第'+(x.index+1)+'段：'+x.error.message).join('；'));
}
