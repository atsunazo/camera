import*as C from'./core.js';import assert from'node:assert/strict';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a}≠${b}`);
// ズーム: カーソル下の点が不動 / 上下限 / はみ出し防止
let v={z:1,tx:0,ty:0};const fw=400,fh=300,vw=400,vh=300;
C.zoomAt(v,2,100,80);near((100-v.tx)/v.z,100);near((80-v.ty)/v.z,80);near(v.z,2);
C.zoomAt(v,99,0,0);near(v.z,8);C.zoomAt(v,.01,0,0);near(v.z,1);
v={z:3,tx:50,ty:-9999};C.clampView(v,fw,fh,vw,vh);near(v.tx,0);near(v.ty,vh-fh*3);
v={z:1,tx:77,ty:13};C.clampView(v,200,100,400,300);near(v.tx,100);near(v.ty,100); // 小さい写真は中央
// 90°回転: 4回で元に戻る / 点が回転後画像の内側に残る
let m={x:30,y:70,w:20,h:10},W=200,H=100;const r0={...m};
for(let i=0;i<4;i++){const n=C.rotMask(m,H);assert.ok(n.x>=0&&n.x<=H&&n.y>=0&&n.y<=W);m=n;[W,H]=[H,W]}
assert.deepEqual(m,r0);
const one=C.rotMask(r0,100);assert.deepEqual([one.x,one.y,one.w,one.h],[30,30,10,20]); // (x,y)->(H-y,x)
// NMS・分割・顔→顔隠し・重複
const bs=[{x:10,y:10,w:50,h:50,score:.9},{x:12,y:12,w:48,h:50,score:.7},{x:200,y:10,w:40,h:40,score:.8}];
assert.equal(C.nms(bs).length,2);
const t=C.tilePlan(1000,800,3,.4);assert.equal(t.length,9);near(t[8].x+t[8].w,1000);near(t[8].y+t[8].h,800);
const fm=C.faceToMask({x:100,y:100,w:100,h:100},'fill','😊',10);assert.ok(fm.w>100&&fm.h>100);near(fm.x,150);
assert.equal(C.dupOf([fm],{...fm,x:fm.x+3}),true);assert.equal(C.dupOf([fm],{...fm,x:fm.x+500}),false);
const sm=C.faceToMask({x:0,y:0,w:100,h:120},'stamp','😊',10);assert.equal(sm.w,sm.h);
// 履歴
const h=new C.History('a');h.push('b');h.push('c');assert.equal(h.undo(),'b');assert.equal(h.undo(),'a');assert.equal(h.undo(),null);
assert.equal(h.redo(),'b');h.push('d');assert.equal(h.canRedo,false);assert.equal(h.undo(),'b');
console.log('core tests: all passed');
// ===== 追加テスト =====
// 写真座標 ⇔ 表示座標（ズーム・パン込みで往復一致）
{const v={z:2.5,tx:-120,ty:-40},fs=.4;const p=C.toPhoto(v,fs,300,200),s=C.toScreen(v,fs,p.x,p.y);near(s.x,300);near(s.y,200);
 near(C.toScreen({z:1,tx:0,ty:0},fs,1000,500).x,400)}
// ズーム中心: 中心点の写真座標がズーム前後で不変、上限8/下限1
{const v={z:1,tx:0,ty:0},fs=.5,before=C.toPhoto(v,fs,150,90);C.zoomAt(v,4,150,90);const after=C.toPhoto(v,fs,150,90);near(before.x,after.x);near(before.y,after.y);
 C.zoomAt(v,1000,0,0);near(v.z,8);C.zoomAt(v,0,0,0);near(v.z,1)}
// 保存解像度が変わっても顔隠しの相対位置は一致（render の k=W/baseW）
{const m={x:600,y:300,w:200,h:240},bw=1200;for(const W of[600,1200,2400]){const k=W/bw;near(m.x*k/W,m.x/bw);near(m.w*k/W,m.w/bw)}}
// 写真の連続選択: A(遅い)→B(速い)。Bだけが反映され、後から完了したAは上書きしない
const delay=(ms,v,fail)=>new Promise((r,j)=>setTimeout(()=>fail?j(new Error(v)):r(v),ms));
{const Q=new C.Session(),applied=[],fails=[];
 const dec=f=>delay(f.ms,f.name,f.fail);const ap=r=>applied.push(r),fl=e=>fails.push(e.message);
 const a=C.openLatest(Q,dec,{ms:60,name:'A'},ap,fl),b=C.openLatest(Q,dec,{ms:10,name:'B'},ap,fl);
 assert.equal(Q.loading,true);await Promise.all([a,b]);
 assert.deepEqual(applied,['B']);assert.equal(Q.loading,false);assert.equal(Q.photo,1);assert.deepEqual(fails,[])}
// 古い読み込みの失敗が新しい読み込みや表示を壊さない
{const Q=new C.Session(),applied=[],fails=[];const dec=f=>delay(f.ms,f.name,f.fail);
 const a=C.openLatest(Q,dec,{ms:50,name:'A',fail:1},r=>applied.push(r),e=>fails.push(e.message)),b=C.openLatest(Q,dec,{ms:10,name:'B'},r=>applied.push(r),e=>fails.push(e.message));
 await Promise.all([a,b]);assert.deepEqual(applied,['B']);assert.deepEqual(fails,[])}
// 最新の読み込み失敗: 失敗通知、loading解除、前の写真(photo世代)は維持
{const Q=new C.Session();Q.applyPhoto();const fails=[];await C.openLatest(Q,f=>delay(5,'x',1),{},()=>assert.fail('apply'),e=>fails.push(e.message));
 assert.deepEqual(fails,['x']);assert.equal(Q.loading,false);assert.equal(Q.photo,1)}
// 検出中に写真交換: 古い検出結果は追加されず、新しい写真のbusyを古い処理が解除しない
{const Q=new C.Session();Q.applyPhoto();const added=[];let staleSeen=false;
 const det=C.runJob(Q,'detect',async stale=>{await delay(40);staleSeen=stale();return[{x:1}]},r=>added.push(...r),()=>assert.fail('fail'));
 assert.equal(Q.job,'detect');assert.equal(Q.busy,true);
 await C.openLatest(Q,async()=>'B',{},()=>{},()=>{});            // 写真Bに交換（jobは無効化）
 assert.equal(Q.job,null);
 const det2=C.runJob(Q,'detect',async()=>{await delay(80);return[{x:2}]},r=>added.push(...r),()=>{}); // B用の検出を開始
 await det;                                                      // 古い検出が完了
 assert.equal(staleSeen,true);assert.deepEqual(added,[]);assert.equal(Q.job,'detect'); // Bのjobは解除されない
 await det2;assert.deepEqual(added,[{x:2}]);assert.equal(Q.job,null)}
// busy中の二重実行（連打）は無視 / 失敗後に解除され再試行できる
{const Q=new C.Session();Q.applyPhoto();let n=0,errs=0;const w=async()=>{n++;await delay(20);throw new Error('x')};
 const a=C.runJob(Q,'detect',w,()=>{},()=>errs++),b=C.runJob(Q,'detect',w,()=>{},()=>errs++),c=C.runJob(Q,'save',w,()=>{},()=>errs++);
 assert.equal(await b,false);assert.equal(await c,false);await a;assert.equal(n,1);assert.equal(errs,1);assert.equal(Q.busy,false);
 assert.equal(await C.runJob(Q,'detect',async()=>[], ()=>{}, ()=>{}),true)}
// 読み込み中は編集不可(busy)
{const Q=new C.Session();Q.startLoad();assert.equal(Q.busy,true);assert.equal(await C.runJob(Q,'save',async()=>1,()=>{},()=>{}),false)}
// 検出結果の重複抑制: 同じ顔を2回追加しても増えない
{const ms=[];const f=[{x:100,y:100,w:80,h:90,score:.9}];
 for(let i=0;i<3;i++)for(const m of f.map(b=>C.faceToMask(b,'fill','😊',10)))if(!C.dupOf(ms,m))ms.push(m);assert.equal(ms.length,1)}
console.log('extended tests: all passed');
