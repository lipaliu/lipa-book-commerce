"""Prepare publicly referenced, already-downloaded videos for in-table comparison."""
import json,pathlib,subprocess,concurrent.futures,math
import imageio_ffmpeg
root=pathlib.Path(__file__).resolve().parents[2]; web=root/'web';dest=web/'client/reference-videos';dest.mkdir(exist_ok=True)
mapping={'D60-0003':'D60-0003','row-b250608ad444a62d6f47e1094364b0b9bf4f0c1e1d3d2766ee8220b66b8e9dc8':'D60-0671'}
manifest_file=web/'server/reference-video-data.mjs'
manifest=json.loads(manifest_file.read_text().removeprefix('export const referenceVideos=').strip().removesuffix(';')) if manifest_file.exists() else {}
jobs=[]
for sid,rid in mapping.items():
 p=root/'.work/asr-batch'/f'{rid}.asr.json'
 if not p.exists():p=root/'.work'/f'{rid}.asr.json'
 d=json.loads(p.read_text());src=pathlib.Path(d['source']);assert src.is_file(),src
 duration=d['audio_seconds'];manifest[sid]={'url':f'/reference-videos/{rid}.mp4','duration':duration,'clips':[]}
 jobs.append((src,0,duration,dest/f'{rid}.mp4'))
 for size in [10,15]:
  for start in range(0,math.ceil(duration),size):
   end=min(start+size,duration);name=f'{rid}-{size}s-{start}.mp4';jobs.append((src,start,end-start,dest/name))
   manifest[sid]['clips'].append({'start':start,'end':end,'url':'/reference-videos/'+name})
def run(j):
 src,start,duration,out=j
 if out.exists():return
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-v','error','-ss',str(start),'-i',str(src),'-t',str(duration),'-map','0:v:0','-map','0:a:0?','-vf','scale=360:-2','-r','25','-c:v','libx264','-preset','veryfast','-crf','28','-pix_fmt','yuv420p','-c:a','aac','-b:a','64k','-movflags','+faststart','-threads','2','-y',str(out)],check=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(run,jobs))
(web/'server/reference-video-data.mjs').write_text('export const referenceVideos='+json.dumps(manifest,separators=(',',':'))+';\n')
print('Prepared',len(jobs),'MP4 files;',sum(p.stat().st_size for p in dest.glob('*.mp4')),'bytes')
