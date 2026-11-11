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
