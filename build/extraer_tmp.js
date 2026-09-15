const fs=require('fs'), path=require('path');
const { chromium } = require(path.join(__dirname,'node_modules','playwright-core'));
const S = require('./sim/sim_srv.js');
const pad=n=>String(n).padStart(2,'0'), HOY=new Date();
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
S.SIM.fecha=iso(HOY); S.SIM.hora='11:00:00';
const c=S.DB.CAMAS_ESTADO.find(x=>x.ID_CAMA==='1');
Object.assign(c,{OCUPADA:true,STATUS_CAMA:'Ocupada',PATIENT_ID:'p1',COD_PACIENTE:'C1',
 NOMBRE:'Rosa Elena Contreras Pino',EDAD:74,SEXO:'F',DIAGNOSTICO:'Neumonía grave adquirida en la comunidad',
 VIA_AEREA:'TOT',SOPORTE:'VM',MODO:'ACVC',TALLA_CM:158,FECHA_INGRESO:iso(new Date(HOY-8*864e5)),
 FECHA_INICIO_SOPORTE:iso(new Date(HOY-8*864e5)),FECHA_INICIO_VA:iso(new Date(HOY-8*864e5)),FIRMA_KINE:'DMV'});
const compilado=path.join(__dirname,'_x.html');
fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname,'..','v2','index.html'),'utf8').replace(/<\?=[\s\S]*?\?>/g,''));
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const p=await b.newPage({viewport:{width:1400,height:950}});
 await p.exposeFunction('__gasApi',(a,d,t)=>{let r;try{r=S.api(a,d,t)}catch(e){r={ok:false,error:e.message}}return JSON.stringify(r);});
 await p.addInitScript(()=>{window.google={script:{run:{withSuccessHandler(o){return{withFailureHandler(f){return{
  async api(a,d,t){const r=JSON.parse(await window.__gasApi(a,d||{},t||null)); if(r.ok)o(r);else f(r.error);}};}};}}}};});
 await p.goto('file://'+compilado); await p.waitForTimeout(1300);
 const out = await p.evaluate(()=>{
  const g=document.getElementById('bedGrid');
  const ocupada=[...g.children].find(n=>n.textContent.includes('Rosa Elena'));
  const vacia=[...g.children].find(n=>n.textContent.includes('Disponible'));
  const tokens={}; const cs=getComputedStyle(document.documentElement);
  ['--card','--border','--primary','--muted','--bg','--pdark','--danger','--ok','--text'].forEach(k=>{tokens[k]=cs.getPropertyValue(k).trim();});
  return { ocupada: ocupada?ocupada.outerHTML:'', vacia: vacia?vacia.outerHTML:'', tokens,
           bodyBg: getComputedStyle(document.body).backgroundColor,
           fuente: getComputedStyle(document.body).fontFamily };
 });
 fs.writeFileSync(path.join(__dirname,'_tarjetas.json'), JSON.stringify(out,null,1));
 await b.close(); fs.unlinkSync(compilado);
 console.log('tokens:', JSON.stringify(out.tokens));
 console.log('fuente:', out.fuente, '| fondo:', out.bodyBg);
 console.log('ocupada:', out.ocupada.length, 'chars · vacía:', out.vacia.length);
})();
