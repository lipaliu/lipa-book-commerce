export function missingShotMedia(pack,modelTasks=[]){
 return pack.shots.filter(shot=>{
  if(shot.kind==='graphic')return !pack.cards.some(card=>card.id===shot.imageId);
  if(pack.generated?.some(media=>media.kind==='image'&&media.shotId===shot.id))return false;
  return !modelTasks.some(task=>task.shotId===shot.id&&task.sourceHash===pack.planHash&&task.status==='succeeded'&&task.outputUrl);
 });
}
