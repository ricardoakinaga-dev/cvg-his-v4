import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.cwd(), app=join(root,'apps/spa');
const require=createRequire(join(app,'package.json'));
const {createServer}=await import(pathToFileURL(require.resolve('vite')));
const vue=require('@vitejs/plugin-vue').default;
const {chromium}=createRequire(join(root,'package.json'))('@playwright/test');
const files=['packages/design-system/src/vue/DsButton.vue','packages/design-system/src/tokens/variables.css','apps/spa/src/styles/main.css'];
const pin=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(join(root,p))).digest('hex')]));
const before=pin();
mkdirSync(join(root,'docs/frontend/implementation/evidence'),{recursive:true});
const out=mkdtempSync(join(root,'docs/frontend/implementation/evidence/button-material-'));
const html=`<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><script type="module">
import {createApp, ref, h} from 'vue';
import DsButton from '/@fs/${join(root,files[0])}';
import '/@fs/${join(root,files[1])}';
import '/@fs/${join(root,files[2])}';
createApp({setup(){const loading=ref(false),count=ref(0),pendingLabel=ref('Carregando');return ()=>h('main',{style:'padding:24px;max-width:900px'},[
h('h1','Controles — CVG Pulse'),h('p','Prova isolada do componente real. Sem operação de negócio.'),
h('div',{style:'display:flex;gap:16px;flex-wrap:wrap;margin:24px 0'},[
h(DsButton,{id:'save',loading:loading.value,onClick:()=>{count.value++;loading.value=true}},{default:()=>loading.value?'Processando solicitação extensa':'Salvar'}),
...['secondary','ghost','danger','success'].map((variant,i)=>h(DsButton,{variant},{default:()=>['Cancelar','Ver detalhes','Excluir','Confirmado'][i]})),
h(DsButton,{disabled:true},{default:()=> 'Indisponível'}),h(DsButton,{id:'initial',loading:true},{default:()=>pendingLabel.value}),h('button',{id:'change-label',onClick:()=>pendingLabel.value='Processando uma solicitação muito extensa'},'Mudar texto pendente'),h('div',{id:'full-container',style:'width:100%'},[h(DsButton,{id:'full',fullWidth:true,loading:true},{default:()=> 'Salvar tudo'})])]),
h('button',{id:'finish',onClick:()=>loading.value=false},'Concluir simulação'),h('output',{id:'count'},String(count.value))]);}}).mount('#app');
</script></body></html>`;
const server=await createServer({root:app,configFile:false,optimizeDeps:{entries:[],include:['vue']},plugins:[vue(),{name:'matrix',configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/__button-matrix')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml(req.url,html));});}}],resolve:{dedupe:['vue','vue-router']},server:{host:'127.0.0.1',port:0,fs:{allow:[root]}}});
let browser;
const rows=[], errors=[];
try {
 await server.listen(); const url=`http://127.0.0.1:${server.httpServer.address().port}/__button-matrix`;
 browser=await chromium.launch({headless:true});
 for(const width of [390,1440])for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:theme});
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#save').waitFor();
  await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
  const initialPending=await page.locator('#initial').boundingBox();
  await page.locator('#change-label').click();assert.ok(Math.abs(initialPending.width-(await page.locator('#initial').boundingBox()).width)<1);
  const fullBefore=await page.locator('#full').boundingBox();
  await page.locator('#full-container').evaluate(e=>e.style.width='60%');
  const fullAfter=await page.locator('#full').boundingBox();assert.ok(fullAfter.width<fullBefore.width);assert.ok(Math.abs(fullAfter.width-(await page.locator('#full-container').boundingBox()).width)<1);
  const button=page.locator('#save'), initial=await button.boundingBox();
  assert.equal(await page.getByRole('button',{name:'Salvar',exact:true}).count(),1);
  await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await button.evaluate(e=>e.matches(':focus-visible')),true);
  await button.click();await page.waitForFunction(()=>document.querySelector('#save').getAttribute('aria-busy')==='true');
  const loading=await button.boundingBox();assert.ok(Math.abs(initial.width-loading.width)<1,`width changed ${initial.width} to ${loading.width}`);
  assert.equal(await page.getByRole('button',{name:'Processando solicitação extensa',exact:true}).count(),1);
  await button.evaluate(e=>{e.click();e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});
  assert.equal(await button.isDisabled(),true);assert.equal(await page.locator('#count').textContent(),'1');
  await page.locator('#finish').click();await button.focus();assert.equal(await button.evaluate(e=>e===document.activeElement),true);const restored=await button.boundingBox();assert.ok(Math.abs(initial.width-restored.width)<1);
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await button.evaluate(e=>getComputedStyle(e).transitionDuration);assert.ok(reduced.split(',').every(value=>parseFloat(value)<=0.00001));
  const spinner=await page.locator('.ds-btn__spinner').first().evaluate(e=>getComputedStyle(e).animationName);assert.equal(spinner,'none');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  await page.screenshot({path:join(out,`${width}-${theme}.png`),fullPage:true});
  rows.push({width,theme,initial:initial.width,loading:loading.width,restored:restored.width,initialPending:initialPending.width,fullBefore:fullBefore.width,fullAfter:fullAfter.width,reduced,spinner,overflow});await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(pin(),before);
 writeFileSync(join(out,'report.json'),JSON.stringify({scope:'isolated real DsButton; synthetic operation; Chromium only; not full FEA-010 acceptance',before,after:pin(),rows,errors},null,2));console.log(out);
}finally{await browser?.close();await server.close();}
