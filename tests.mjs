import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./face-hide.html',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const names=['bounds','zoom','img'];
const source=names.map(name=>script.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n');
const build=new Function('photo','vp','V','view',`const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));${source};return {bounds,zoom,img};`);
let checks=0;
for(let i=1;i<=100;i++){
 const photo={width:1200+i,height:800+i},vp={clientWidth:400,clientHeight:600},V={z:1,x:31,y:62,f:.25};
 const a=build(photo,vp,V,()=>{}),anchor={x:120,y:180},before=a.img(anchor);
 a.zoom(2.5,anchor.x,anchor.y);const after=a.img(anchor);
 assert.ok(Math.abs(before.x-after.x)<1e-8);assert.ok(Math.abs(before.y-after.y)<1e-8);checks+=2;
 a.zoom(100);assert.equal(V.z,8);a.zoom(.01);assert.equal(V.z,1);checks+=2;
 V.x=1e6;V.y=-1e6;a.bounds();
 const sw=photo.width*V.f,sh=photo.height*V.f;
 assert.equal(V.x,(vp.clientWidth-sw)/2);assert.equal(V.y,(vp.clientHeight-sh)/2);checks+=2;
}
const V={z:4,x:10000,y:-10000,f:1},a=build({width:1000,height:800},{clientWidth:400,clientHeight:600},V,()=>{});a.bounds();assert.equal(V.x,0);assert.equal(V.y,600-3200);checks+=2;
assert.match(html,/\[hidden\]\s*\{display:none!important\}/);checks++;
assert.match(script,/JSON.stringify\(\{turn,masks\}\)/);checks++;
console.log(JSON.stringify({checks,passed:true,scope:'Coordinate functions, zoom bounds, pan bounds, hidden rule, rotation history structure. Not browser integration tests.'},null,2));
