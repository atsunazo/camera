// 純粋関数のみ（DOM非依存）。tests.mjs で検証。
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const fitScale=(W,H,vw,vh)=>Math.min(vw/W,vh/H);
// 表示用ビュー: 写真レイヤーだけに適用する {z,tx,ty}。z=1 が「画面に合わせる」
export function clampView(v,fw,fh,vw,vh){const sw=fw*v.z,sh=fh*v.z;
 v.tx=sw<=vw?(vw-sw)/2:clamp(v.tx,vw-sw,0);v.ty=sh<=vh?(vh-sh)/2:clamp(v.ty,vh-sh,0);return v}
export function zoomAt(v,nz,mx,my,lo=1,hi=8){const z=clamp(nz,lo,hi),k=z/v.z;v.tx=mx-(mx-v.tx)*k;v.ty=my-(my-v.ty)*k;v.z=z;return v}
export function iou(a,b){const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 if(w<=0||h<=0)return{iou:0,min:0};const i=w*h;return{iou:i/(a.w*a.h+b.w*b.h-i),min:i/Math.min(a.w*a.h,b.w*b.h)}}
export function nms(bs,th=.35){const k=[];for(const b of[...bs].sort((p,q)=>q.score-p.score)){
 if(!k.some(q=>{const o=iou(q,b);return o.iou>th||o.min>.6}))k.push(b)}return k}
// 小さい顔を拾うための分割領域（n×n、各タイルは全体のfrac倍）
export function tilePlan(W,H,n,frac){const tw=W*frac,th=H*frac,r=[];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)r.push({x:n>1?(W-tw)*i/(n-1):0,y:n>1?(H-th)*j/(n-1):0,w:tw,h:th});return r}
// 検出枠 → 顔隠し。枠ぴったりではなく周囲（髪・あご・耳）まで余白を取る
export function faceToMask(b,kind,e,n){const x=b.x+b.w/2,y=b.y+b.h/2-b.h*.04;let w=b.w*1.6,h=b.h*1.75;
 if(kind==='stamp')w=h=Math.max(w,h)*.95;return{kind,e,n,x,y,w,h,auto:1}}
export const dupOf=(ms,m)=>ms.some(q=>Math.hypot(q.x-m.x,q.y-m.y)<Math.min(q.w,q.h,m.w,m.h)*.4);
// 90°時計回り。h0=回転前の高さ
export const rotMask=(m,h0)=>({...m,x:h0-m.y,y:m.x,w:m.h,h:m.w});
export class History{constructor(s){this.a=[s];this.i=0}
 push(s){if(s===this.a[this.i])return;this.a=this.a.slice(0,this.i+1);this.a.push(s);if(this.a.length>60)this.a.shift();this.i=this.a.length-1}
 undo(){return this.i>0?this.a[--this.i]:null}redo(){return this.i<this.a.length-1?this.a[++this.i]:null}
 get canUndo(){return this.i>0}get canRedo(){return this.i<this.a.length-1}}
// 写真座標 ⇔ 表示領域座標（x,y は表示領域(#vp)左上基準のpx、fs=写真1pxあたりのfit時CSS px）
export const toPhoto=(v,fs,x,y)=>({x:(x-v.tx)/v.z/fs,y:(y-v.ty)/v.z/fs});
export const toScreen=(v,fs,x,y)=>({x:x*fs*v.z+v.tx,y:y*fs*v.z+v.ty});
// 写真・非同期ジョブの世代管理。古い非同期結果が新しい状態を上書き/解除しないための中核
export class Session{
 constructor(){this.photo=0;this.load=0;this.loading=false;this.job=null;this.jt=0}
 get busy(){return this.loading||!!this.job}
 startLoad(){this.loading=true;return++this.load}          // 選択した瞬間に発行
 loadOk(t){return t===this.load}                           // 最後に選んだものだけ有効
 applyPhoto(){this.photo++;this.loading=false;this.job=null;this.jt++} // 古い検出/保存を無効化
 failLoad(){this.loading=false}
 startJob(kind){this.job=kind;return{p:this.photo,j:++this.jt}}
 stale(k){return k.p!==this.photo}
 endJob(k){if(k.j===this.jt)this.job=null}                 // 古いジョブはbusyを解除しない
}
export async function openLatest(Q,decode,f,apply,fail){const t=Q.startLoad();
 try{const r=await decode(f);if(!Q.loadOk(t))return false;Q.applyPhoto();apply(r);return true}
 catch(e){if(!Q.loadOk(t))return false;Q.failLoad();fail(e);return false}}
export async function runJob(Q,kind,work,apply,fail){if(Q.busy)return false;const k=Q.startJob(kind);
 try{const r=await work(()=>Q.stale(k));if(r!==null&&!Q.stale(k))await apply(r)}
 catch(e){if(!Q.stale(k))fail(e)}finally{Q.endJob(k)}return true}
