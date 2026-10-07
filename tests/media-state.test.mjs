import test from 'node:test';import assert from 'node:assert/strict';
import {missingShotMedia} from '../client/media-state.mjs';
import {productionHtml} from '../client/production-ui.mjs';
import {buildProduction} from '../server/production.mjs';
const pack=buildProduction({id:'qa',script:'先看一个问题。\n\n再看选择标准。'},{id:'D60-0003',product:'中国神仙',category:'科普'},{template:'reading',task:'查看图鉴'},{scriptLocked:false,shots:[{id:'shot-1',kind:'comic_scene'},{id:'shot-2',kind:'generated_scene'}]});
test('unlocked scene shots can generate real images; no SVG sketch is displayed as a scene image',()=>{
 const html=productionHtml({pack,tab:'shots',providers:[],modelTasks:[]});
 assert.doesNotMatch(html.split('</table>')[0],/构图草图|分镜示意|data:image\/svg/);
 assert.match(html,/data-scene-image="shot-1" >生成这张图片/);
 assert.match(html,/等待AI生成画面/);
 assert.equal(missingShotMedia(pack).length,2);
});
test('missing scene assets block composition; only matching current video or actual images count',()=>{
 const p={...pack,planHash:'current',generated:[{kind:'image',shotId:'shot-1',url:'/image'}]};
 assert.equal(missingShotMedia(p,[{shotId:'shot-2',sourceHash:'old',status:'succeeded',outputUrl:'/old'}]).length,1);
 assert.equal(missingShotMedia(p,[{shotId:'shot-2',sourceHash:'current',status:'succeeded',outputUrl:'/new'}]).length,0);
 const html=productionHtml({pack:p,tab:'preview',providers:[],modelTasks:[]});
 assert.match(html,/data-action="render-vo-preview" disabled/);
});
