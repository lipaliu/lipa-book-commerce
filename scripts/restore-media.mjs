// Restore deployed media, verifying every file before placing it in the build input.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';const exec=promisify(execFile);
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createReadStream} from 'node:fs';
const manifest=JSON.parse(await fs.readFile('media-manifest.json','utf8'));
const args=process.argv.slice(2),only=args.indexOf('--only');
const files=only<0?manifest.files:manifest.files.filter(f=>f.path===args[only+1]);
if(!files.length)throw Error('No matching media file');
console.log(`${files.length} media files, ${(files.reduce((n,f)=>n+f.size,0)/1024**3).toFixed(2)} GiB`);
if(args.includes('--dry-run'))process.exit(0);
async function valid(file){try{if((await fs.stat(file.path)).size!==file.size)return false;const hash=createHash('sha256');for await(const chunk of createReadStream(file.path))hash.update(chunk);return hash.digest('hex')===file.sha256;}catch{return false;}}
for(const [i,file] of files.entries()){
 if(!/^client\/(?:source-bytes|reference-videos)\/[\w.-]+$/.test(file.path))throw Error('Invalid media path');
 if(await valid(file))continue;
 const url=new URL('/'+file.path.slice(7),manifest.baseUrl);
 await fs.mkdir(path.dirname(file.path),{recursive:true});
 await exec('curl',['--fail','--location','--silent','--show-error','--retry','2','--max-time','120','--output',file.path+'.partial',url.href]);
 const bytes=await fs.readFile(file.path+'.partial');if(bytes.length!==file.size||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error(`Media verification failed: ${file.path}`);
 await fs.rename(file.path+'.partial',file.path);console.log(`${i+1}/${files.length} ${file.path}`);
}
console.log('Media verified.');
