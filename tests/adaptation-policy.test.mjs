import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestEdit} from '../server/ai-editor.mjs';
import {generateRecognitionPrompts} from '../server/gemini-recognition.mjs';
import {videoPrompt} from '../client/video-model.mjs';
const row={vo:'为什么饭局中途要去厕所？',originalText:'为什么饭局中途要去厕所？',originalVisual:'戴眼镜的男子穿黑色T恤，明亮书架前固定机位口播。',visual:'昏暗悬疑书房，镜头快速推进。',seconds:15,kind:'generated_scene'};
test('editing receives original visual baseline and small-change constraints, narration is not reduced to a summary',async()=>{
 const requests=[];const ai={run:async(_,p)=>{requests.push(p);return {response:'微调建议'};}};
 await suggestEdit(ai,{field:'visual',...row,currentText:row.visual,narration:row.vo});
 assert.match(requests[0].messages[1].content,/明亮书架/);assert.doesNotMatch(requests[0].messages[1].content,/昏暗悬疑书房/);assert.match(requests[0].messages[0].content,/原画面描述优先/);
 await suggestEdit(ai,{field:'vo',...row,currentText:'读懂古人的故事'});
 assert.match(requests[1].messages[0].content,/保留开头钩子/);assert.doesNotMatch(requests[1].messages[1].content,/约\d+个汉字/);
});
test('video request includes source baseline and explicit remix preserves content order',()=>{
 const follow=videoPrompt(row,'情境画面');assert.ok(follow.includes(row.originalVisual));assert.match(follow,/明亮场景不能擅自变昏暗/);
 const remix=videoPrompt(row,'漫画故事','remix');assert.match(remix,/只允许按所选形式改变渲染方式/);assert.match(remix,/不另起故事/);
});
test('prompt model can mark actual book displays for original footage while preserving narration',async()=>{
 const result={rows:[{...row}],analysis:{}};
 await generateRecognitionPrompts(result,'test-only',{},async(url,opt)=>{const input=JSON.parse(opt.body);assert.match(input.messages[0].content,/保留展示书的内容与顺序/);return Response.json({choices:[{message:{content:JSON.stringify({prompts:[{index:0,prompt:'沿用真实原片翻页画面，保留展示顺序。',requiresOriginal:true}]})}}]});});
 assert.equal(result.rows[0].kind,'real_product');assert.equal(result.rows[0].vo,row.vo);assert.equal(result.analysis.promptPolicy,'close-reference-v1');
});
