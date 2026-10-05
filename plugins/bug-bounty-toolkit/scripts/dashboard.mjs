#!/usr/bin/env node
// Records and local presentation only. Does not scan or contact targets.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/dashboard');
const kinds = ['goal','asset','business','lead','evidence','finding'];
const findingStates = ['candidate','validating','confirmed','refuted','deferred'];
const skillStates = ['loaded','running','completed','blocked','failed','deferred'];
export const questions = [
'资产、方法和验证操作是否在已确认的授权范围内？',
'是否有完整、可重复的 PoC？',
'危害解释是否由已观察证据支撑，关键环节均已核实？',
'所声称的影响是否已经证明？',
'是否证明了安全边界被突破的结果？',
'开发者能否理解危害和复现步骤？',
'是否能用具体业务场景说明影响对象和影响方式？',
'当前证据是否符合目标项目的有效漏洞与拟报等级标准？'];
const hash = value => createHash('sha256').update(value).digest('hex');
const idFor = (prefix,value) => prefix+'-'+hash(value).slice(0,16);
function required(value,field,max=16000) {
 if(typeof value!=='string'||!value.trim()||value.length>max) throw Error('Invalid '+field);
}
function blank() {
 return {version:1,meta:{title:'Bug Bounty Toolkit',demo:false},nodes:[],edges:[],findings:[],skills:[],timeline:[],warnings:[],questions};
}
function upsert(list,item) {
 const index=list.findIndex(x=>x.id===item.id);
 if(index<0)list.push(item);else list[index]={...list[index],...item};
}
function apply(state,event) {
 const d=event.data;
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Event data must be an object');
 if(event.type==='run.meta') {
  if(d.title!==undefined)required(d.title,'title',300);
  if(state.meta.demo&&d.demo===false)throw Error('Demo records cannot be relabeled as real');
  if(!state.meta.demo&&d.demo===true&&state.timeline.length)throw Error('Real records cannot be relabeled as demo');
  state.meta={...state.meta,...d};
 } else if(event.type==='node.upsert') {
  required(d.id,'id',200);required(d.title,'title',500);
  if(!kinds.includes(d.kind))throw Error('Invalid node kind');
  const old=state.nodes.find(x=>x.id===d.id);
  if(old&&old.kind!==d.kind)throw Error('Existing node kind cannot change');
  upsert(state.nodes,{...d,updatedAt:event.timestamp});
 } else if(event.type==='edge.upsert') {
  required(d.id,'id',200);required(d.label,'label',200);
  if(!state.nodes.some(n=>n.id===d.from)||!state.nodes.some(n=>n.id===d.to))throw Error('Edge endpoint does not exist');
  upsert(state.edges,d);
 } else if(event.type==='finding.upsert') {
  required(d.id,'id',200);
  const value={...(state.findings.find(x=>x.id===d.id)||{}),...d,updatedAt:event.timestamp};
  required(value.title,'title',500);
  if(!findingStates.includes(value.status))throw Error('Invalid finding status');
  if(value.assetId&&!state.nodes.some(n=>n.id===value.assetId&&n.kind==='asset'))throw Error('Finding asset does not exist');
  if(value.status==='confirmed')for(let i=1;i<=8;i++) {
   const q=value.questions?.['Q'+i];
   if(!q||q.answer!=='yes'||!q.reason?.trim()||!q.evidence?.trim())throw Error('Confirmed finding requires Q'+i+' with reason and evidence');
  }
  if(state.nodes.some(n=>n.id===d.id&&n.kind!=='finding'))throw Error('Finding id collides with a node');
  upsert(state.findings,value);
  upsert(state.nodes,{id:value.id,kind:'finding',title:value.title,status:value.status,assetId:value.assetId,detail:value.impact||value.observedFacts||'',updatedAt:event.timestamp});
 } else if(event.type==='skill.event') {
  required(d.id,'skill run id',200);required(d.skill,'skill',200);
  if(!skillStates.includes(d.status))throw Error('Invalid skill status');
  if(d.elapsedSeconds!==undefined&&(!Number.isFinite(d.elapsedSeconds)||d.elapsedSeconds<0))throw Error('Invalid elapsedSeconds');
  const old=state.skills.find(x=>x.id===d.id);
  if(old&&old.skill!==d.skill)throw Error('Skill run name cannot change');
  upsert(state.skills,{...d,updatedAt:event.timestamp});
 } else if(event.type!=='progress')throw Error('Unknown event type: '+event.type);
 state.timeline.push(event);state.meta.updatedAt=event.timestamp;
}
export function createStore(directory) {
 const dir=path.resolve(directory),log=path.join(dir,'dashboard-events.jsonl');
 async function read() {
  const state=blank();let raw;
  try{raw=await fs.readFile(log,'utf8');}catch(e){if(e.code==='ENOENT')return state;throw e;}
  const ids=new Set();
  for(const [index,line]of raw.split('\n').entries()) {
   if(!line.trim())continue;
   try {
    const event=JSON.parse(line);
    if(ids.has(event.eventId))continue;
    if(!event.eventId||!Number.isFinite(Date.parse(event.timestamp)))throw Error('Invalid event metadata');
    apply(state,event);ids.add(event.eventId);
   } catch(e){state.warnings.push('记录第 '+(index+1)+' 行无法重放：'+e.message);}
  }
  return state;
 }
 async function append(input) {
  await fs.mkdir(dir,{recursive:true});
  const lock=path.join(dir,'.dashboard-write.lock');let acquired=false;
  for(let i=0;i<100;i++){
   try{await fs.mkdir(lock);acquired=true;break;}
   catch(e){if(e.code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,50));}
  }
  if(!acquired)throw Error('Record writer busy. Check no writer is running before removing .dashboard-write.lock.');
  try {
   const state=await read();
   if(state.warnings.length)throw Error('Repair record log before appending: '+state.warnings.join('; '));
   const existing=new Set(state.timeline.map(x=>x.eventId)),batch=[];
   for(const item of Array.isArray(input)?input:[input]){
    const event={...item,eventId:item.eventId||randomUUID(),timestamp:item.timestamp||new Date().toISOString()};
    required(event.eventId,'eventId',300);
    if(!Number.isFinite(Date.parse(event.timestamp)))throw Error('Invalid timestamp');
    if(existing.has(event.eventId))continue;
    apply(state,event);existing.add(event.eventId);batch.push(event);
   }
   if(batch.length){
    const handle=await fs.open(log,'a');
    try{await handle.writeFile(batch.map(x=>JSON.stringify(x)).join('\n')+'\n');await handle.sync();}
    finally{await handle.close();}
   }
   return {appended:batch.length,nodes:state.nodes.length,findings:state.findings.length,skills:state.skills.length};
  }finally{await fs.rmdir(lock);}
 }
 return {dir,log,read,append};
}
export function parseCsv(raw) {
 const records=[];let row=[],cell='',quoted=false;raw=raw.replace(/^\uFEFF/,'');
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&raw[i+1]==='\n')i++;
   row.push(cell);if(row.some(x=>x!==''))records.push(row);row=[];cell='';
  }else cell+=c;
 }
 if(quoted)throw Error('Unclosed CSV quote');
 if(cell||row.length){row.push(cell);records.push(row);}
 const fields=records.shift()||[];
 return records.map(values=>Object.fromEntries(fields.map((f,i)=>[f.trim(),values[i]||''])));
}
async function maybe(p){try{return await fs.readFile(p,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function ingest(store) {
 const events=[],warnings=[],state=await store.read(),nodes=new Map(state.nodes.map(n=>[n.id,n]));
 const goalId='goal-main';
 if(!nodes.has(goalId))events.push({type:'node.upsert',data:{id:goalId,kind:'goal',title:state.meta.title,status:'in_progress'},eventId:'import-goal-main'});
 function asset(origin,fields={}){
  const key=origin.trim();if(!key)return null;
  const id=[...nodes.values()].find(n=>n.kind==='asset'&&n.title===key)?.id||idFor('asset',key); const {updatedAt,...known}=nodes.get(id)||{}; const value={...known,id,kind:'asset',title:key,...fields};
  nodes.set(id,value);
  events.push({type:'node.upsert',data:value,eventId:'import-asset-'+hash(JSON.stringify(value))});
  events.push({type:'edge.upsert',data:{id:'scope-'+id,from:goalId,to:id,label:'发现 / 纳入队列'},eventId:'import-edge-'+id});
  return id;
 }
 for(const filename of ['asset-inventory.csv','site-queue.csv']){
  const raw=await maybe(path.join(store.dir,filename));if(raw===null)continue;
  for(const r of parseCsv(raw)){
   const origin=r.origin||r.url||r.domain||r.hostname||r.host||r['站点'];
   if(!origin){warnings.push(filename+'：跳过缺少 origin/url/domain/host 的行');continue;}
   asset(origin,{status:r.status||'unknown',businessType:r.business_type||r.businessType||'',tier:r.tier||r.value_tier||'',detail:r.reason||r.notes||'',nextPlan:r.next_action||r.next_plan||'',source:filename,scope:r.scope_status||r.ownership_status||'待核对'});
  }
 }
 const deferred=await maybe(path.join(store.dir,'time-deferred-findings.csv'));
 if(deferred!==null)for(const r of parseCsv(deferred)){
  if(!r.finding_id&&!r.lead_id){warnings.push('待续测表：跳过没有编号的行');continue;}
  const id=r.finding_id||r.lead_id,previous=state.findings.find(f=>f.id===id);
  const assetId=r.origin?asset(r.origin):previous?.assetId;
  const status=r.status==='refuted'?'refuted':['confirmed','refuted'].includes(previous?.status)?previous.status:r.status==='resumed'?'validating':r.status==='resolved'?(previous?.status||'candidate'):'deferred';
  const {updatedAt,...knownFinding}=previous||{}; const data={...knownFinding,id,title:r.suspected_class||previous?.title||id,status,assetId,origin:r.origin,endpoint:r.endpoint,impact:r.potential_impact,observedFacts:r.observed_facts,evidencePaths:r.evidence_paths,likelihood:r.existence_likelihood,likelihoodReason:r.likelihood_reason,missingQuestions:r.missing_questions,remainingChecks:r.remaining_checks,elapsedMinutes:r.elapsed_work_minutes,pauseReason:r.pause_reason,nextPlan:r.next_action,estimatedMinutes:r.estimated_remaining_minutes,userDecision:r.user_decision||'pending',source:'time-deferred-findings.csv'};
  events.push({type:'finding.upsert',data,eventId:'import-deferred-'+hash(JSON.stringify(data))});
  if(assetId)events.push({type:'edge.upsert',data:{id:'finding-'+id,from:assetId,to:id,label:'待续测线索'},eventId:'import-finding-edge-'+hash(assetId+id)});
 }
 const progress=await maybe(path.join(store.dir,'progress.jsonl'));
 if(progress!==null)for(const [index,line]of progress.split('\n').entries()){
  if(!line.trim())continue;
  try{
   const p=JSON.parse(line);
   const item={eventId:'import-progress-'+hash(line),type:'progress',timestamp:p.timestamp||new Date().toISOString(),data:{...p,source:'progress.jsonl',sourceLine:index+1,timestampSource:p.timestamp?'original':'import'}};
   if(p.skill&&skillStates.includes(p.skill_status)){
    item.type='skill.event';item.data={...item.data,id:p.skill_run_id||'import-'+p.skill+'-'+(index+1),skill:p.skill,status:p.skill_status};
   }
   events.push(item);
  }catch(e){warnings.push('progress.jsonl 第 '+(index+1)+' 行：'+e.message);}
 }
 return {...await store.append(events),warnings};
}
export async function startServer(store,{port=0}={}){
 const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host?.split(':')[0];
  if(!['127.0.0.1','localhost'].includes(host)){res.writeHead(403);res.end('Local host only');return;}
  if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});res.end('Read-only dashboard');return;}
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'"};
  try{
   const route=new URL(req.url,'http://localhost').pathname;
   if(route==='/api/state'||route==='/api/export'){
    if(route==='/api/export')headers['Content-Disposition']='attachment; filename="toolkit-dashboard.json"';
    res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(await store.read()));
   }else if(files[route]){
    const [file,type]=files[route];res.writeHead(200,{...headers,'Content-Type':type});res.end(await fs.readFile(path.join(assets,file)));
   }else{res.writeHead(404,headers);res.end('Not found');}
  }catch(e){res.writeHead(500,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return {server,url:'http://127.0.0.1:'+server.address().port};
}
export async function createDemo(store){
 if((await store.read()).timeline.length)throw Error('Demo requires an empty directory');
 const ev=(type,data)=>({type,data});
 const events=[
 ev('run.meta',{title:'演示 · 业务边界探索',target:'demo.example',demo:true}),
 ev('node.upsert',{id:'goal-main',kind:'goal',title:'演示项目',detail:'全部为虚构数据，仅用于界面验收',status:'in_progress'}),
 ev('node.upsert',{id:'asset-demo',kind:'asset',title:'portal.demo.example',status:'in_progress',businessType:'查询 / 报表',tier:'Tier 1',scope:'演示范围'}),
 ev('node.upsert',{id:'asset-pay',kind:'asset',title:'pay.demo.example',status:'deferred',businessType:'支付 / 订单',tier:'Tier 0',scope:'演示范围'}),
 ev('node.upsert',{id:'biz-demo',kind:'business',title:'演示：报表导出',assetId:'asset-demo',detail:'业务功能与角色关系',status:'completed'}),
 ev('node.upsert',{id:'lead-demo',kind:'lead',title:'演示：对象归属检查',assetId:'asset-demo',detail:'比较演示角色 A 与 B 的资源边界',nextPlan:'补齐负面对照',status:'validating'}),
 ev('node.upsert',{id:'evidence-demo',kind:'evidence',title:'演示：请求与基线',assetId:'asset-demo',detail:'占位证据；未请求真实网站',status:'completed'}),
 ev('finding.upsert',{id:'DEMO-001',title:'演示候选：报表对象归属异常',status:'validating',assetId:'asset-demo',tier:'Tier 1',severity:'待定',likelihood:'中',likelihoodReason:'虚构异常示例，影响尚未验证',observedFacts:'演示记录，不能用于正式报告',impact:'待验证：其他角色的报表是否可访问',nextPlan:'补充负面对照与业务影响',questions:{Q1:{answer:'yes',reason:'演示环境',evidence:'虚构范围说明'},Q2:{answer:'pending',reason:'未有真实 PoC',evidence:''}}}),
 ev('finding.upsert',{id:'DEMO-002',title:'演示待续测：订单状态校验',status:'deferred',assetId:'asset-pay',tier:'Tier 0',likelihood:'未知',likelihoodReason:'仅有业务流程线索',pauseReason:'演示：时间预算不足',elapsedMinutes:32,estimatedMinutes:20,remainingChecks:'验证状态转换和角色关系',nextPlan:'由用户选择是否继续',userDecision:'pending'}),
 ev('skill.event',{id:'run-recon',skill:'web2-recon',status:'loaded',summary:'演示：已读取信息收集技能'}),
 ev('skill.event',{id:'run-recon',skill:'web2-recon',status:'completed',summary:'演示：整理资产清单',elapsedSeconds:125,assetId:'asset-demo'}),
 ev('skill.event',{id:'run-hunt',skill:'hunt-dispatch',status:'completed',summary:'演示：按业务分配研究方向',elapsedSeconds:40}),
 ev('skill.event',{id:'run-idor',skill:'hunt-idor',status:'running',summary:'演示：调查对象归属',assetId:'asset-demo'}),
 ev('skill.event',{id:'run-logic',skill:'hunt-business-logic',status:'deferred',summary:'演示：等待续测决定',reason:'时间不足',assetId:'asset-pay',elapsedSeconds:1920}),
 ev('skill.event',{id:'run-triage',skill:'triage-validation',status:'loaded',summary:'演示：仅加载，尚未开始验证'})
 ];
 for(const [from,to,label]of [['goal-main','asset-demo','范围'],['goal-main','asset-pay','范围'],['asset-demo','biz-demo','包含业务'],['biz-demo','lead-demo','研究方向'],['lead-demo','evidence-demo','产生证据'],['evidence-demo','DEMO-001','支持候选'],['asset-pay','DEMO-002','待续测']])events.push(ev('edge.upsert',{id:from+'-'+to,from,to,label}));
 return store.append(events);
}
export async function main(args){
 const [command,...rest]=args,options={};
 for(let i=0;i<rest.length;i+=2){
  if(!rest[i].startsWith('--')||rest[i+1]===undefined)throw Error('Options require --key value');
  options[rest[i].slice(2)]=rest[i+1];
 }
 if(!options.dir)throw Error('Usage: node dashboard.mjs init|append|ingest|serve|export|demo --dir RECON_DIR [--file events.json] [--port 8765] [--title title]');
 const store=createStore(options.dir);
 if(command==='init')return store.append({type:'run.meta',data:{title:options.title||path.basename(store.dir),target:options.target||'',demo:false}});
 if(command==='append'){if(!options.file)throw Error('--file is required');return store.append(JSON.parse(await fs.readFile(options.file,'utf8')));}
 if(command==='ingest')return ingest(store);
 if(command==='demo')return createDemo(store);
 if(command==='export'){if(!options.file)throw Error('--file is required');await fs.writeFile(options.file,JSON.stringify(await store.read(),null,2));return {file:options.file};}
 if(command==='serve'){
  const port=Number(options.port||8765);
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port');
  const result=await startServer(store,{port});console.log(JSON.stringify({url:result.url,records:store.log,mode:'local-read-only'}));return {running:true};
 }
 throw Error('Unknown command');
}
if(typeof process!=='undefined'&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main(process.argv.slice(2)).then(r=>{if(!r?.running)console.log(JSON.stringify(r));}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
