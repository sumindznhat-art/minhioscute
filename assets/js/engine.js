const TEEngine=(()=>{
const grp=s=>{if(!s.length)return[];const o=[];let d=s[0],c=1;for(let i=1;i<s.length;i++){if(s[i]===d)c++;else{o.push({k:d,n:c});d=s[i];c=1;}}o.push({k:d,n:c});return o;};
class Yq{
constructor(){this.ch=[];this.td=[];this.xx=[];this.max=500;this.ng={1:6,2:8,3:10,4:14,5:18,6:22};}
dice(it){const m=[['dice1','dice2','dice3'],['xucxac1','xucxac2','xucxac3'],['d1','d2','d3'],['x1','x2','x3']];
for(const[a,b,c]of m){if(it[a]!=null&&it[b]!=null&&it[c]!=null){const ar=[+it[a],+it[b],+it[c]];if(ar.every(n=>n>=1&&n<=6))return ar;}}
for(const f of['dice','dices','xucxac']){if(Array.isArray(it[f])&&it[f].length>=3){const ar=it[f].slice(0,3).map(Number);if(ar.every(n=>n>=1&&n<=6))return ar;}}return null;}
nap(items){this.ch=[];this.td=[];this.xx=[];
for(const it of items){const r=it.resultTruyenThong||it.result||it.ketQua;if(r!=='TAI'&&r!=='XIU')continue;
this.ch.push(r);const d=this.dice(it);this.xx.push(d);this.td.push(d?d[0]+d[1]+d[2]:null);}
if(this.ch.length>this.max){const c=-this.max;this.ch=this.ch.slice(c);this.td=this.td.slice(c);this.xx=this.xx.slice(c);}}
ngM(k){return this.ng[k]||22;}
fg(fp,hc=null){const c=this.ch,k=fp.length;if(!k)return{t:0,x:0,s:0,v:[]};
const tot=fp.reduce((a,b)=>a+b,0);let t=0,x=0;const v=[];
for(let st=0;st<c.length-tot;st++){let p=st,ok=true,ht=null,hc2=null;
for(const dd of fp){if(p+dd>c.length){ok=false;break;}const seg=c.slice(p,p+dd);if(new Set(seg).size!==1){ok=false;break;}
const h=seg[0];if(ht!==null&&h===ht){ok=false;break;}ht=h;hc2=h;p+=dd;}
if(!ok)continue;if(hc!==null&&hc2!==hc)continue;if(st>0&&c[st-1]===c[st])continue;if(p>=c.length)continue;
if(c[p]==='TAI')t++;else x++;v.push(p);}
return{t,x,s:t+x,v};}
pattern(){const g=this.ch.slice(-24);if(g.length<3)return null;const nh=grp(g);if(!nh.length)return null;
const h=nh[nh.length-1].k,dn=nh[nh.length-1].n;const kM=Math.min(6,nh.length);
for(let k=kM;k>=1;k--){const fp=nh.slice(-k).map(n=>n.n);const{s}=this.fg(fp,h);if(s>=this.ngM(k))return{fp,h,k};}
return{fp:[dn],h,k:1};}
hist(p){if(!p)return{t:null,x:null,s:0,v:[]};const{t,x,s,v}=this.fg(p.fp,p.h);if(s<this.ngM(p.fp.length))return{t:null,x:null,s,v};return{t:t/s*100,x:x/s*100,s,v};}
fBet(){const c=this.ch;if(c.length<2)return 0;let b=1;for(let i=c.length-1;i>0;i--){if(c[i]===c[i-1])b++;else break;}return b;}
fAlt(){const c=this.ch;if(c.length<6)return null;let d=0;for(let i=c.length-1;i>c.length-6&&i>0;i--){if(c[i]!==c[i-1])d++;else break;}if(d>=4)return{d,g:c[c.length-1]==='TAI'?'XIU':'TAI'};return null;}
fVol(){const c=this.ch;if(c.length<15)return null;const g=c.slice(-25);let d=0;for(let i=1;i<g.length;i++)if(g[i]!==g[i-1])d++;const r=d/(g.length-1);return{r,cao:r>.65,thap:r<.35};}
fM1(){const c=this.ch;if(c.length<20)return null;let tt=0,tx=0,xt=0,xx=0;const w=c.slice(-80);
for(let i=1;i<w.length;i++){const p=w[i-1],n=w[i];if(p==='TAI'&&n==='TAI')tt++;else if(p==='TAI'&&n==='XIU')tx++;else if(p==='XIU'&&n==='TAI')xt++;else xx++;}
const last=c[c.length-1];const pt=last==='TAI'?(tt+1)/(tt+tx+2):(xt+1)/(xt+xx+2);return{pt,px:1-pt,last};}
fMom(){const c=this.ch;if(c.length<15)return null;let t=0,x=0;const g=c.slice(-15);
for(let i=0;i<g.length;i++){const w=Math.exp(-(g.length-1-i)/5);if(g[i]==='TAI')t+=w;else x+=w;}
return{h:t>x?'TAI':'XIU',m:Math.abs(t-x)/(t+x)};}
fKNN(){const c=this.ch,W=5;if(c.length<W+10)return null;const cur=c.slice(-W);const res=[];
for(let i=0;i<c.length-W;i++){let k=0;for(let j=0;j<W;j++)if(c[i+j]===cur[j])k++;if(k>=W-1&&i+W<c.length)res.push({d:k,k:c[i+W]});}
if(res.length<3)return null;res.sort((a,b)=>b.d-a.d);const top=res.slice(0,10);let t=0,x=0;for(const r of top)if(r.k==='TAI')t++;else x++;return{t,x,s:top.length,r:t/top.length*100};}
scan(){const p=this.pattern();const h=this.hist(p);let rt=h.t;
if(rt===null&&this.ch.length>=5)rt=this.ch.filter(x=>x==='TAI').length/this.ch.length*100;
if(rt===null)return{gy:null,rt:50,rx:50,tin:{},n:0};
const tin={fBet:this.fBet(),fAlt:this.fAlt(),fVol:this.fVol(),fM1:this.fM1(),fMom:this.fMom(),fKNN:this.fKNN()};
return{gy:rt>=50?'TAI':'XIU',rt,rx:100-rt,n:h.s||this.ch.length,tin};}
}
function predict(eng){const qs=eng.scan();if(!qs.gy)return{g:null,conf:0};
let d=Math.min(1,Math.abs(qs.rt-50)/35);
if(qs.tin.fBet>=3)d=Math.max(d,.6+qs.tin.fBet*.03);
if(qs.tin.fAlt&&qs.tin.fAlt.d>=4)d=Math.max(d,.65);
if(qs.tin.fVol&&qs.tin.fVol.cao)d=Math.max(d,.6);
if(qs.tin.fMom&&qs.tin.fMom.m>.4)d=Math.max(d,.55+qs.tin.fMom.m*.3);
if(qs.tin.fM1){const p=qs.gy==='TAI'?qs.tin.fM1.pt:qs.tin.fM1.px;d=Math.max(d,p);}
if(qs.tin.fKNN){const p=qs.gy==='TAI'?qs.tin.fKNN.r:100-qs.tin.fKNN.r;d=Math.max(d,p/100);}
return{g:qs.gy,conf:Math.min(95,Math.round(d*100)),rt:qs.rt,rx:qs.rx};}
return{Yq,predict};})();
window.TEEngine=TEEngine;
