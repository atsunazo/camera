// 顔検出（端末内）。MediaPipe Tasks Vision 0.10.14 + BlazeFace short-range (float16/1)。
// まず ./vendor（自前配置）を試し、無ければ jsDelivr / Google Storage から取得（初回のみ通信）。
// どちらも失敗し、ブラウザ標準 FaceDetector があればそれを補助経路に使う。
import{tilePlan,nms}from'./core.js';
const VER='0.10.14',CDN=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const SRC=[{b:'./vendor',f:'vision_bundle.js',m:'./vendor/blaze_face_short_range.tflite'},
 {b:CDN,f:'vision_bundle.mjs',m:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'}];
let pro=null,eng=null;
export const engineName=()=>eng&&eng.name;
export const ready=()=>!!eng;
export function load(status){if(pro)return pro;
 pro=(async()=>{let err;
  for(const s of SRC){try{status&&status(s.b==='./vendor'?'顔検出の準備中…':'顔検出の準備中…（初回はモデル取得に通信します。写真は送信されません）');
   const m=await import(`${s.b}/${s.f}`),fs=await m.FilesetResolver.forVisionTasks(`${s.b}/wasm`),
    d=await m.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:s.m,delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:.5,minSuppressionThreshold:.3});
   return eng={name:'MediaPipe BlazeFace',run:c=>d.detect(c).detections.map(q=>({x:q.boundingBox.originX,y:q.boundingBox.originY,w:q.boundingBox.width,h:q.boundingBox.height,score:q.categories[0].score}))}}
  catch(e){err=e}}
  if('FaceDetector'in window){try{const nd=new window.FaceDetector({fastMode:false,maxDetectedFaces:30});
   return eng={name:'ブラウザ標準FaceDetector',native:1,run:async c=>(await nd.detect(c)).map(f=>({x:f.boundingBox.x,y:f.boundingBox.y,w:f.boundingBox.width,h:f.boundingBox.height,score:1}))}}catch(e){err=e}}
  throw err||new Error('load failed')})().catch(e=>{pro=null;throw e});
 return pro}
const tick=()=>new Promise(r=>setTimeout(r,0));
// 全体 + 2×2 + 3×3 の分割で小さい顔も探す。stale() が真なら破棄(null)
export async function detectAll(cv,{stale=()=>false,progress}={}){
 const W=cv.width,H=cv.height,passes=[{r:{x:0,y:0,w:W,h:H},t:.5}];
 if(!eng.native&&Math.max(W,H)>=900){tilePlan(W,H,2,.6).forEach(r=>passes.push({r,t:.6}));tilePlan(W,H,3,.4).forEach(r=>passes.push({r,t:.65}))}
 const out=[];let i=0;
 for(const p of passes){if(stale())return null;progress&&progress(++i,passes.length);await tick();
  const tc=document.createElement('canvas');tc.width=Math.round(p.r.w);tc.height=Math.round(p.r.h);
  tc.getContext('2d').drawImage(cv,p.r.x,p.r.y,p.r.w,p.r.h,0,0,tc.width,tc.height);
  for(const b of await eng.run(tc))if(b.score>=p.t)out.push({x:b.x+p.r.x,y:b.y+p.r.y,w:b.w,h:b.h,score:b.score})}
 return stale()?null:nms(out)}
