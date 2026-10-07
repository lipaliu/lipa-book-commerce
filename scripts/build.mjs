import {build} from 'esbuild';
import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['client/app.mjs'],bundle:true,outfile:'dist/app.js',format:'esm',target:['es2022'],minify:true});
for(const f of ['index.html','style.css']) await copyFile('client/'+f,'dist/'+f);
await cp('client/reference-frames','dist/reference-frames',{recursive:true});
console.log('Built book commerce workbench');
