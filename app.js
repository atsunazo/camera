import*as C from'./core.js';import*as D from'./detector.js';
const $=s=>document.querySelector(s),vp=$('#vp'),layer=$('#layer'),cv=$('#cv'),fr=$('#frame');
const EM=['😊','🥰','😎','🐱','🐶','🐰','🌸','⭐','💖','🎀'],FONT='"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif',MAXW=3000;
const S={o:null,rot:0,masks:[],sel:-1,kind:'fill',emoji:'😊',n:10,pid:0,busy:0,failed:0,hist:null,cache:null},V={z:1,tx:0,ty:0,fs:0};
const say=(t,e)=>{const m=$('#msg');m.textContent=t||'';m.dataset.e=e?1:''};
const snap=()=>JSON.stringify({rot:S.rot,masks:S.masks}),dims=()=>{const b=base();return[b.width,b.height]};
const vpr=()=>vp.getBoundingClientRect();
// ---- 写真（回転済み）: 全ての座標は「回転後の作業画像 px」。表示・保存で共通
function base(){if(S.cache&&S.cache.r===S.rot)return S.cache.c;const o=S.o,r=S.rot,c=document.createElement('canvas');
 c.width=r%2?o.height:o.width;c.height=r%2?o.width:o.height;const x=c.getContext('2d');
 if(r===1)x.transform(0,1,-1,0,o.height,0);if(r===2)x.transform(-1,0,0,-1,o.width,o.height);if(r===3)x.transform(0,-1,1,0,0,o.width);
 x.drawImage(o,0,0);S.cache={r,c};return c}
// 描画先の大きさ(sc倍)だけを基準にする。編集表示も保存も同じ関数（選択枠は描かない）
function render(t,sc){const b=base();t.width=Math.round(b.width*sc);t.height=Math.round(b.height*sc);const x=t.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(b,0,0,t.width,t.height);
 if(!S.masks.length)return;const sn=document.createElement('canvas');sn.width=t.width;sn.height=t.height;sn.getContext('2d').drawImage(t,0,0);
 for(const m of S.masks){const cx=m.x*sc,cy=m.y*sc,w=m.w*sc,h=m.h*sc;x.save();
  if(m.kind==='stamp'){const s=Math.max(w,h);x.font=`${s}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(m.e,cx,cy+s*.08)}
  else{x.beginPath();x.ellipse(cx,cy,w/2,h/2,0,0,7);
   if(m.kind==='fill'){x.fillStyle='#17171c';x.fill()}
   else{x.clip();const x0=Math.max(0,cx-w/2),y0=Math.max(0,cy-h/2),x1=Math.min(t.width,cx+w/2),y1=Math.min(t.height,cy+h/2);
    if(x1>x0&&y1>y0){const cell=Math.max(2,Math.min(w,h)/m.n),tw=Math.max(1,Math.ceil((x1-x0)/cell)),th=Math.max(1,Math.ceil((y1-y0)/cell)),tc=document.createElement('canvas');tc.width=tw;tc.height=th;
     tc.getContext('2d').drawImage(sn,x0,y0,x1-x0,y1-y0,0,0,tw,th);x.imageSmoothingEnabled=false;x.drawImage(tc,0,0,tw,th,x0,y0,x1-x0,y1-y0)}}}
  x.restore()}}
const draw=()=>{const[W,H]=dims();render(cv,Math.min(1,2000/Math.max(W,H)));frame()};
// ---- 表示ビュー: #layer(写真+顔隠し枠)のtransformだけを変える。ヘッダー/ボタンは不変
function layout(){const[W,H]=dims(),r=vpr(),fs=C.fitScale(W,H,r.width,r.height),k=V.fs?fs/V.fs:1;V.tx*=k;V.ty*=k;V.fs=fs;
 layer.style.width=W*fs+'px';layer.style.height=H*fs+'px';view()}
function view(){const[W,H]=dims(),r=vpr();C.clampView(V,W*V.fs,H*V.fs,r.width,r.height);
 layer.style.transform=`translate(${V.tx}px,${V.ty}px) scale(${V.z})`;layer.style.setProperty('--iz',1/V.z);frame()}
function frame(){const m=S.masks[S.sel];fr.hidden=!m;if(!m)return;const f=V.fs;
 Object.assign(fr.style,{left:(m.x-m.w/2)*f+'px',top:(m.y-m.h/2)*f+'px',width:m.w*f+'px',height:m.h*f+'px'})}
const wp=(cx,cy)=>{const r=vpr();return{x:(cx-r.left-V.tx)/V.z/V.fs,y:(cy-r.top-V.ty)/V.z/V.fs}};
function hit(p){const pad=10/(V.z*V.fs);for(let i=S.masks.length-1;i>=0;i--){const m=S.masks[i];
 if(m.kind==='stamp'?Math.abs(p.x-m.x)<=m.w/2+pad&&Math.abs(p.y-m.y)<=m.h/2+pad:((p.x-m.x)/(m.w/2+pad))**2+((p.y-m.y)/(m.h/2+pad))**2<=1)return i}return -1}
// ---- 履歴
const commit=()=>{S.hist.push(snap());ui()};
function restore(s){const o=JSON.parse(s),rc=o.rot!==S.rot;S.rot=o.rot;S.masks=o.masks;S.sel=-1;if(rc){V.z=1;V.tx=V.ty=0;V.fs=0;layout()}draw();ui()}
// ---- ジェスチャ（#vp内に限定）: 通常=写真のパン/ピンチズーム。選択中の枠本体=移動、ハンドル=サイズ
const P=new Map();let g=null;
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)||1;
function startPan(p){g={t:'pan',x:p.x,y:p.y,tx:V.tx,ty:V.ty,moved:0}}
vp.onpointerdown=e=>{if(!S.o||S.busy)return;vp.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(P.size===2){if(g&&g.ch)commit();const[a,b]=[...P.values()];g={t:'pinch',d:d2(a,b),z:V.z,tx:V.tx,ty:V.ty,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};return}
 if(P.size>2)return;const m=S.masks[S.sel],p=wp(e.clientX,e.clientY);
 if(m&&e.target.closest('#handle'))g={t:'resize',ch:0};
 else if(m&&e.target.closest('#frame'))g={t:'drag',dx:m.x-p.x,dy:m.y-p.y,ch:0};
 else startPan({x:e.clientX,y:e.clientY})};
vp.onpointermove=e=>{if(!P.has(e.pointerId)||!g)return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});const m=S.masks[S.sel];
 if(g.t==='pinch'){const[a,b]=[...P.values()],r=vpr(),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,z=C.clamp(g.z*d2(a,b)/g.d,1,8),k=z/g.z,ox=g.mx-r.left,oy=g.my-r.top;
  V.z=z;V.tx=(mx-r.left)-(ox-g.tx)*k;V.ty=(my-r.top)-(oy-g.ty)*k;view()}
 else if(g.t==='pan'){const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>6)g.moved=1;V.tx=g.tx+dx;V.ty=g.ty+dy;view()}
 else if(g.t==='drag'&&m){const p=wp(e.clientX,e.clientY),[W,H]=dims();m.x=C.clamp(p.x+g.dx,0,W);m.y=C.clamp(p.y+g.dy,0,H);g.ch=1;draw()}
 else if(g.t==='resize'&&m){const p=wp(e.clientX,e.clientY),w=Math.max(16,2*(p.x-m.x)),h=Math.max(16,2*(p.y-m.y));
  if(m.kind==='stamp')m.w=m.h=Math.max(w,h);else{m.w=w;m.h=h}g.ch=1;draw();ui(1)}};
function end(e){if(!P.has(e.pointerId))return;P.delete(e.pointerId);const old=g;
 if(P.size===0){g=null;if(old&&old.t==='pan'&&!old.moved&&e.type==='pointerup'){const i=hit(wp(e.clientX,e.clientY));S.sel=i;frame();ui()}
  else if(old&&old.ch)commit()}
 else if(P.size===1)startPan([...P.values()][0])}   // ピンチ後は残った指でパン継続（ジャンプ防止）
vp.onpointerup=vp.onpointercancel=vp.onlostpointercapture=end;
const reset=()=>{P.clear();g=null};
addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
for(const t of['gesturestart','gesturechange'])vp.addEventListener(t,e=>e.preventDefault());
vp.addEventListener('wheel',e=>{if(!S.o)return;e.preventDefault();const r=vpr();C.zoomAt(V,V.z*Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);view()},{passive:false});
const zoomBy=f=>{const r=vpr();C.zoomAt(V,V.z*f,r.width/2,r.height/2);view()};
$('#zin').onclick=()=>zoomBy(1.4);$('#zout').onclick=()=>zoomBy(1/1.4);$('#fit').onclick=()=>{V.z=1;V.tx=V.ty=0;view()};
$('#rot').onclick=()=>{if(S.busy)return;const H=dims()[1];S.masks=S.masks.map(m=>C.rotMask(m,H));S.rot=(S.rot+1)%4;S.sel=-1;V.z=1;V.tx=V.ty=0;V.fs=0;layout();draw();commit()};
new ResizeObserver(()=>{if(S.o)layout()}).observe(vp);
// ---- 顔隠し操作
const cur=()=>S.masks[S.sel],kindNow=()=>(cur()||S).kind;
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,m=cur();S.kind=k;
 if(m){m.kind=k;m.e=m.e||S.emoji;m.n=m.n||S.n;if(k==='stamp')m.w=m.h=Math.max(m.w,m.h);draw();commit()}else ui()});
$('#emojis').innerHTML=EM.map(e=>`<button class="em" data-e="${e}">${e}</button>`).join('');
$('#emojis').onclick=e=>{const b=e.target.closest('[data-e]');if(!b)return;S.emoji=b.dataset.e;const m=cur();if(m&&m.kind==='stamp'){m.e=S.emoji;draw();commit()}};
$('#cs').oninput=e=>{const n=34-e.target.value,m=cur();S.n=n;if(m&&m.kind==='mosaic'){m.n=n;draw()}};
$('#cs').onchange=()=>{if(cur())commit()};
$('#size').oninput=e=>{const m=cur();if(!m)return;const t=e.target.value/100*dims()[0],k=t/Math.max(m.w,m.h);m.w*=k;m.h*=k;draw()};
$('#size').onchange=()=>commit();
$('#del').onclick=()=>{if(S.sel<0)return;S.masks.splice(S.sel,1);S.sel=-1;draw();commit()};
$('#add').onclick=()=>{if(!S.o||S.busy)return;const r=vpr(),p=wp(r.left+r.width/2,r.top+r.height/2),s=.22*r.width/(V.z*V.fs),[W,H]=dims();
 S.masks.push({kind:S.kind,e:S.emoji,n:S.n,x:C.clamp(p.x,0,W),y:C.clamp(p.y,0,H),w:s,h:S.kind==='stamp'?s:s*1.2});S.sel=S.masks.length-1;draw();commit();say('顔隠しを追加しました。ドラッグで移動、丸いハンドルで大きさを変えられます')};
const undo=f=>{const s=S.hist[f]();if(s)restore(s)};$('#undo').onclick=()=>undo('undo');$('#redo').onclick=()=>undo('redo');
// ---- 自動顔検出（端末内）
$('#auto').onclick=async()=>{if(!S.o||S.busy)return;const pid=S.pid;S.busy=1;S.failed=0;ui();
 try{say('顔検出の準備中…');await D.load(say);if(pid!==S.pid)return;say('顔を検出しています…');
  const bs=await D.detectAll(base(),{stale:()=>pid!==S.pid,progress:(i,n)=>say(`顔を検出しています…（${i}/${n}）`)});
  if(bs===null||pid!==S.pid)return;
  if(!bs.length)return say('顔が見つかりませんでした。手動で追加できます（「＋ 顔隠しを追加」）');
  const ms=bs.map(b=>C.faceToMask(b,S.kind,S.emoji,S.n)).filter(m=>!C.dupOf(S.masks,m));
  if(!ms.length)return say('新しく見つかった顔はありません（検出済みの顔は追加済みです）');
  S.masks.push(...ms);S.sel=-1;draw();commit();say(`${ms.length}件の顔を隠しました（${D.engineName()}）。保存前に、隠したい顔がすべて隠れているか確認してください。`)}
 catch(e){if(pid!==S.pid)return;S.failed=1;console.error(e);say(D.ready()?'顔検出に失敗しました。もう一度試すか、手動で追加してください。':'顔検出モデルを取得できませんでした。通信状況を確認して「もう一度試す」を押してください。手動で追加もできます。',1)}
 finally{if(pid===S.pid){S.busy=0;ui()}}};
// ---- 写真の読み込み
for(const id of['pick','pick2'])$('#'+id).onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 try{const im=await new Promise((ok,ng)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);ng(new Error('decode'))};i.src=u}),
  k=Math.min(1,MAXW/Math.max(im.naturalWidth,im.naturalHeight)),o=document.createElement('canvas');
  o.width=Math.round(im.naturalWidth*k);o.height=Math.round(im.naturalHeight*k);o.getContext('2d').drawImage(im,0,0,o.width,o.height);
  S.pid++;S.busy=0;S.failed=0;S.o=o;S.cache=null;S.rot=0;S.masks=[];S.sel=-1;S.hist=new C.History(snap());reset();V.z=1;V.tx=V.ty=0;V.fs=0;
  vp.classList.remove('off');layout();draw();ui();say('「✨ 顔を自動で隠す」を押してください')}
 catch(err){say('写真を読み込めませんでした（HEICなど非対応の形式の可能性があります）。別の写真を選んでください。',1)}};
// ---- 保存: 作業解像度(長辺最大3000px)のまま描画し、JPEG品質0.92。選択枠は含めない
let url=null;const freeUrl=()=>{if(url){URL.revokeObjectURL(url);url=null}};
$('#save').onclick=()=>{if(!S.o||S.busy)return;const o=document.createElement('canvas');render(o,1);
 o.toBlob(async b=>{o.width=o.height=1;if(!b)return say('画像を作成できませんでした。もう一度試してください',1);
  const f=new File([b],'kao-camera.jpg',{type:'image/jpeg'});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e.name==='AbortError')return}
  freeUrl();url=URL.createObjectURL(b);$('#mimg').src=url;$('#dl').href=url;$('#modal').style.display='flex'},'image/jpeg',.92)};
$('#mclose').onclick=()=>{$('#modal').style.display='none';$('#mimg').removeAttribute('src');freeUrl()};
// ---- UI状態
function ui(light){const has=!!S.o,b=S.busy,m=cur(),k=kindNow();
 $('#start').hidden=has;
 for(const id of['auto','add','save','rot','zin','zout','fit'])$('#'+id).disabled=!has||!!b;
 $('#undo').disabled=!has||!!b||!S.hist.canUndo;$('#redo').disabled=!has||!!b||!S.hist.canRedo;$('#pick2').disabled=false;
 $('#auto').textContent=b?'処理中…':S.failed?'もう一度試す':'✨ 顔を自動で隠す';
 $('#klabel').textContent=m?'隠し方（選択中の顔隠しを変更）':'隠し方（これから作る顔隠し）';
 document.querySelectorAll('[data-k]').forEach(x=>x.classList.toggle('on',x.dataset.k===k));
 $('#emojis').hidden=k!=='stamp';$('#coarse').hidden=k!=='mosaic';$('#selbar').hidden=!m;
 $('#cs').value=34-(m&&m.kind==='mosaic'?m.n:S.n);if(m&&!light)$('#size').value=Math.round(Math.max(m.w,m.h)/dims()[0]*100)}
ui();
