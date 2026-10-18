/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node.js CommonJS video renderer. */
/* TISA — WEAR YOUR LOYALTY. Deterministic, frame-accurate motion design. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const ROOT = path.resolve(__dirname, '..');
const projectRequire = createRequire(path.resolve(__dirname, '../../../package.json'));
function dep(name) { try { return require(name); } catch { try { return projectRequire(name); } catch { return require('/tmp/tisa-motion-runtime/node_modules/' + name); } } }
const { createCanvas, loadImage, GlobalFonts } = dep('@napi-rs/canvas');
const QRCode = dep('qrcode');
const ffmpeg = dep('ffmpeg-static');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf', 'Display');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'Body');
const W=1080,H=1920,FPS=30,DURATION=30;
const C={black:'#090b0b',white:'#f2f0e9',red:'#f01732',lime:'#c8ff3d',grey:'#a6aaa5'};
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const images={};
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const out=t=>1-Math.pow(1-clamp(t),4);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const back=t=>{t=clamp(t)-1;return 1+2.4*t*t*t+1.4*t*t};
const rad=n=>n*Math.PI/180;
function text(s,x,y,size,color=C.white,opts={}){
  ctx.save();ctx.font=`${size}px ${opts.font||'Display'}`;
  if(opts.width){const m=ctx.measureText(s).width;if(m>opts.width){size*=opts.width/m;ctx.font=`${size}px ${opts.font||'Display'}`}}
  ctx.textAlign=opts.align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.strokeStyle=color;
  ctx.globalAlpha*=opts.alpha??1;ctx.letterSpacing=opts.spacing?`${opts.spacing}px`:'0px';
  if(opts.stroke){ctx.lineWidth=opts.stroke;ctx.strokeText(s,x,y)}else ctx.fillText(s,x,y);ctx.restore();
}
function reveal(s,x,y,size,t,delay=0,color=C.white,width=900){
  const p=out((t-delay)/.62);ctx.save();ctx.beginPath();ctx.rect(x-8,y-size*1.04,width+16,size*1.2);ctx.clip();
  text(s,x,y+(1-p)*size*1.13,size,color,{width,alpha:clamp(p*2)});ctx.restore();
}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function box(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function halo(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.scale(1,1.3);let g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore()}
function jersey(name,x,y,h,rotation=0,sx=1,alpha=1){
  const im=images[name];ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(rad(rotation));ctx.scale(sx,1);
  const w=h*im.width/im.height;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
}
function badge(s,x,y,w,color,ink){box(x,y,w,58,color,29);text(s,x+w/2,y+39,29,ink,{font:'Body',align:'center',width:w-30})}
function pitch(t,ink=C.white){
  ctx.save();ctx.globalAlpha=.065;ctx.strokeStyle=ink;ctx.lineWidth=2;
  ctx.strokeRect(90,190,900,1540);ctx.beginPath();ctx.ellipse(540,960,330,330,0,0,Math.PI*2);ctx.stroke();
  line(90,960,990,960,ink,2);ctx.strokeRect(280,190,520,180);ctx.strokeRect(280,1550,520,180);
  for(let i=0;i<12;i++){const y=((i*184+t*35)%2000)-80;line(60,y,74,y,ink,2);line(1006,y,1020,y,ink,2)}ctx.restore();
}
function hud(t,light=false){
  const ink=light?C.black:C.white;
  ctx.save();ctx.globalAlpha=.9;ctx.drawImage(images.logo,86,35,82,82);text('FOOTBALL CULTURE',990,99,21,ink,{font:'Body',align:'right',spacing:2});
  line(90,132,990,132,ink+'45');text('WEAR YOUR LOYALTY',90,1830,22,ink,{font:'Body',spacing:2});
  text(String(Math.floor(t*30)).padStart(3,'0')+' / 900',990,1830,22,ink,{font:'Body',align:'right'});
  box(90,1850,900,3,ink+'30');box(90,1850,900*clamp(t/30),3,light?C.red:C.lime);ctx.restore();
}
function marquee(s,t,y,size,color){
  ctx.save();ctx.font=`${size}px Display`;const width=ctx.measureText(s).width+90;let x=-(t*160)%width;
  for(let i=-1;i<4;i++)text(s,x+i*width,y,size,color,{stroke:2});ctx.restore();
}
function scene0(u,t){
  const second=u>=1.5,lt=u%1.5;
  box(0,0,W,H,second?C.lime:C.black);pitch(t,second?C.black:C.white);
  const ink=second?C.black:C.white;
  ctx.save();ctx.translate(540,1060);ctx.rotate(rad(-13+u*6));ctx.globalAlpha=.11;
  for(let i=0;i<5;i++)line(-850,-650+i*320,850,-650+i*320,ink,55);ctx.restore();
  text('THIS IS FOR THE FANS.',90,260,30,ink,{font:'Body',spacing:2});
  reveal('YOUR',90,610,370,lt,0,ink);reveal(second?'COLORS.':'TEAM.',90,920,370,lt,.13,ink);
  const names=['arsenal','liverpool','united','city','barcelona','brazil'];
  const index=Math.min(5,Math.floor(u*2));const beat=u*2%1;
  jersey(names[index],540,1355,660*(1+.055*(1-beat)),Math.sin(u*5)*6);
  badge('FOOTBALL. WORN YOUR WAY.',180,1710,720,second?C.black:C.red,C.white);
}
function scene1(u,t){
  box(0,0,W,H,C.white);pitch(t,C.black);
  text('01 / THE FEELING',90,230,25,C.black,{font:'Body',spacing:3});
  reveal('WEAR',90,475,300,u,0,C.black);reveal('YOUR',90,720,300,u,.14,C.black);
  reveal('LOYALTY.',90,945,270,u,.28,C.red);
  halo(560,1290,600,'#f0173230');
  const p=back(u/.9);jersey('arsenal',540+Math.sin(u)*22,1300+160*(1-p),800*(.7+.3*p),-8+8*out(u/1.2));
  text('YOUR TEAM IS PART OF YOU.',90,1750,30,C.black,{font:'Body',spacing:1.5});
}
const premierLineup=[['arsenal','ARSENAL',C.red],['liverpool','LIVERPOOL','#ef3340'],['united','MANCHESTER UNITED',C.red],['city','MANCHESTER CITY','#8bd1ef']];
const lineup=[['argentina','ARGENTINA','#8cd5f5'],['barcelona','BARCELONA',C.red],['brazil','BRAZIL','#ffe000'],['city','MANCHESTER CITY','#8bd1ef'],['madrid','REAL MADRID',C.white],['psg','PARIS',C.red],...premierLineup.slice(0,3)];
function scene2(u,t){
  box(0,0,W,H,C.black);pitch(t);marquee('FIND YOUR COLORS',t,910,330,'#ffffff13');
  reveal('FIND YOUR',90,385,198,u,0);reveal('COLORS.',90,575,225,u,.14,C.lime);
  const q=clamp((u-.5)/.95,0,premierLineup.length-1),nearest=Math.round(q);
  text('PREMIER LEAGUE PICKS',90,685,28,C.white,{font:'Body',spacing:2});
  halo(540,1160,680,premierLineup[nearest][2]+'38');
  const order=premierLineup.map((v,i)=>({v,i,d:i-q})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  for(const {v,d}of order){if(Math.abs(d)>2)continue;const focus=Math.max(0,1-Math.abs(d)*.6);const x=540+d*660;
    jersey(v[0],x,1210+Math.abs(d)*70,670+focus*280,d*9+Math.sin(t*1.4)*2,1,Math.max(.1,1-Math.abs(d)*.4));
  }
  text(premierLineup[nearest][1],540,1720,76,C.white,{align:'center',width:900});
  for(let i=0;i<premierLineup.length;i++)box(540-(premierLineup.length*48-18)/2+i*48,1760,30,5,i===nearest?C.lime:'#ffffff36');
}
function scene3(u,t){
  box(0,0,W,H,C.white);pitch(t,C.black);
  reveal('CLUB OR',90,325,195,u,0,C.black);reveal('COUNTRY.',90,490,195,u,.12,C.red);
  for(let i=0;i<lineup.length;i++){
    const p=back((u-.12-i*.08)/.8),x=210+(i%3)*330,y=740+Math.floor(i/3)*355;
    const im=lineup[i];ctx.save();ctx.globalAlpha=clamp(p);
    ctx.strokeStyle='#1111111b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-20,136,0,Math.PI*2);ctx.stroke();
    jersey(im[0],x,y+90*(1-p)+Math.sin(t*2+i)*8,280*(.8+.2*p),(i%2?-1:1)*lerp(13,2,p));
    text(im[1],x,y+185,25,C.black,{font:'Body',align:'center',width:300});ctx.restore();
  }
}
function scene4(u,t){
  box(0,0,W,H,C.red);pitch(t,C.black);
  marquee('EVERY ANGLE',t*.5,1380,440,'#00000019');
  reveal('EVERY',90,390,265,u);reveal('ANGLE.',90,640,280,u,.15);
  const flip=smooth((u-1.12)/1.15)*Math.PI,front=flip<Math.PI/2;
  const sx=Math.max(.025,Math.abs(Math.cos(flip)));
  const grow=out(u/.8);jersey(front?'barcelona':'barcelona_back',540,1190+(1-grow)*190,1030*(.8+.2*grow),Math.sin(u*1.4)*3,sx);
  const glow=Math.sin(flip);if(glow>.1){for(let i=0;i<6;i++)line(150,800+i*120,930,720+i*120,'#ffffff'+Math.round(glow*24).toString(16).padStart(2,'0'),2)}
  badge('01 / FRONT',130,1720,375,front?C.white:'#0000002b',front?C.black:C.white);
  badge('02 / BACK',575,1720,375,!front?C.white:'#0000002b',!front?C.black:C.white);
}
function scene5(u,t){
  box(0,0,W,H,C.black);pitch(t);
  halo(310,1030,680,'#f0173237');halo(850,1100,600,'#c8ff3d25');
  reveal('HOME.',90,380,250,u,0,C.white);reveal('AWAY.',550,580,220,u,.18,C.lime,440);
  const p=out(u/.9);
  jersey('barcelona',lerp(-400,300,p),1120+Math.sin(u*1.6)*24,890,-13+Math.sin(t)*2);
  jersey('psg_away',lerp(1500,800,p),1180+Math.cos(u*1.6)*25,890,12+Math.cos(t)*2);
  ctx.save();ctx.globalAlpha=out((u-.6)/.6);box(65,1570,950,160,C.lime);text('YOUR WAY.',540,1700,170,C.black,{align:'center',width:870});ctx.restore();
}
function scene6(u,t){
  box(0,0,W,H,C.black);pitch(t);
  const index=Math.min(2,Math.floor(u/(4/3))),lt=u-index*(4/3);
  const steps=[['PICK','YOUR TEAM.','liverpool'],['FIND','YOUR KIT.','psg_away'],['MESSAGE','TISA.','logo']];
  const [a,b,photo]=steps[index];
  text('0'+(index+1),-20,1430,1250,'#f0173228',{stroke:3});
  text('YOUR NEXT KIT, IN THREE MOVES.',90,260,26,C.lime,{font:'Body',spacing:1.5});
  reveal(a,90,620,index===2?210:280,lt,0);reveal(b,90,850,245,lt,.1,C.lime);
  if(photo==='logo'){const p=back(lt/.65);ctx.save();ctx.translate(710,1260+90*(1-p));ctx.rotate(rad(lerp(-15,0,p)));ctx.drawImage(images.logo,-260,-260,520,520);ctx.restore()}
  else jersey(photo,680,1300+80*(1-out(lt/.6)),650,Math.sin(lt)*7);
  for(let i=0;i<3;i++){box(90+i*306,1670,280,6,'#ffffff20');box(90+i*306,1670,280*clamp((u-i*4/3)/(4/3)),6,C.lime)}
  text('YOUR TEAM. YOUR KIT. ONE MESSAGE.',90,1750,28,C.white,{font:'Body',width:900});
}
function scene7(u,t){
  box(0,0,W,H,C.white);pitch(t,C.black);
  reveal('WEAR YOUR',90,410,235,u,0,C.black);reveal('COLORS.',90,665,325,u,.12,C.red);
  const p=out((u-.35)/.7);ctx.save();ctx.globalAlpha=p;
  box(90,780+40*(1-p),900,110,C.black,2);text("LET’S FIND YOUR NEXT KIT.",540,854+40*(1-p),49,C.white,{font:'Body',align:'center',width:840});ctx.restore();
  const q=out((u-.65)/.7);ctx.save();ctx.globalAlpha=q;
  box(90,1020,260,260,'#ffffff',12);ctx.drawImage(images.qr,100,1030,240,240);
  text('SCAN TO CHAT',220,1330,26,C.black,{font:'Body',align:'center'});
  text('MESSAGE TISA',400,1080,78,C.black,{width:590});
  text('WhatsApp / phone',400,1142,28,'#51564f',{font:'Body'});
  text('+971 54 383 1461',400,1212,57,C.black,{font:'Body',width:590});
  text('tisa-iota.vercel.app',400,1280,32,C.black,{font:'Body',width:590});
  text('Facebook / TISA',400,1335,26,'#51564f',{font:'Body'});
  text('SEND YOUR TEAM, KIT & SIZE.',90,1475,31,C.black,{font:'Body',spacing:1.5,width:900});ctx.restore();
  const b=out((u-.9)/.8);ctx.save();ctx.globalAlpha=b;ctx.drawImage(images.logo,420,1535+(1-b)*70,240,240);ctx.restore();
}
const scenes=[scene0,scene1,scene2,scene3,scene4,scene5,scene6,scene7];
const times=[0,3,6,10,14,18,22,26,30];
function frame(t){
  ctx.resetTransform();ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  let index=times.findIndex((start,i)=>t>=start&&t<times[i+1]);if(index<0)index=7;
  const u=t-times[index];scenes[index](u,t);
  if(index!==7)hud(t,[1,3].includes(index)||(index===0&&u>=1.5));
  else {ctx.drawImage(images.logo,90,35,82,82);text('FOOTBALL CULTURE',210,94,24,C.black,{font:'Body',spacing:2});line(90,132,990,132,'#00000035');text('WEAR YOUR LOYALTY',90,1830,22,C.black,{font:'Body',spacing:3})}
  for(const boundary of times.slice(1,-1)){
    const dt=t-boundary;if(dt>=-.16&&dt<.27){const p=clamp((dt+.16)/.43);const x=lerp(-1400,2300,p);
      ctx.fillStyle=boundary%4===2?C.lime:C.red;ctx.beginPath();ctx.moveTo(x-700,-100);ctx.lineTo(x+100,-100);ctx.lineTo(x-450,2020);ctx.lineTo(x-1250,2020);ctx.closePath();ctx.fill();
      ctx.save();ctx.translate(x-700,1100);ctx.rotate(rad(-14));for(let i=0;i<4;i++)ctx.drawImage(images.logo,i*180,-125,140,140);ctx.restore();
    }
  }
}
async function main(){
  for(const name of ['argentina','barcelona','barcelona_back','brazil','city','madrid','psg','psg_away','arsenal','liverpool','united','logo'])images[name]=await loadImage(path.join(ROOT,'assets',name+'.png'));
  images.qr=await loadImage(await QRCode.toBuffer('https://wa.me/971543831461',{margin:2,width:600,errorCorrectionLevel:'M',color:{dark:C.black,light:'#ffffff'}}));
  const stills=[.8,2.2,4.2,8.4,12.5,15.1,16.6,19.6,22.7,24.3,27.5,29.5];
  for(const t of stills){frame(t);fs.writeFileSync(path.join(ROOT,`frame-${t.toFixed(1)}.png`),canvas.toBuffer('image/png'))}
  frame(28.5);fs.writeFileSync(path.join(ROOT,'tisa-cover.png'),canvas.toBuffer('image/png'));
  if(process.argv.includes('--stills')){console.log('Stills rendered');return}
  const output=path.join(ROOT,'TISA-Wear-Your-Loyalty-30s.mp4');
  const args=['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','pipe:0','-i',path.join(ROOT,'original-soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-profile:v','high','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-af','loudnorm=I=-14:TP=-3:LRA=8,alimiter=limit=0.7:attack=5:release=60:level=0:latency=1','-t','30','-movflags','+faststart','-threads','4',output];
  const proc=spawn(ffmpeg,args,{stdio:['pipe','ignore','pipe']});let log='';proc.stderr.on('data',d=>{log+=d;});proc.stdin.on('error',()=>{});
  const finished=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(new Error(log)))});
  const started=Date.now();
  for(let i=0;i<FPS*DURATION;i++){frame(i/FPS);if(!proc.stdin.write(canvas.data()))await once(proc.stdin,'drain');if(i%90===0)console.log(`${i}/${FPS*DURATION} frames · ${Math.round((Date.now()-started)/1000)}s`)}
  proc.stdin.end();await finished;console.log('Rendered '+output);
}
main().catch(e=>{console.error(e);process.exitCode=1});
