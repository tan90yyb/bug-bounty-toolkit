'use strict';
const $ = id => document.getElementById(id);
const labels = {goal:'目标',asset:'资产',business:'业务',lead:'线索',evidence:'证据',finding:'漏洞',candidate:'候选线索',validating:'验证中',confirmed:'已确认',refuted:'已证伪',deferred:'待续测',loaded:'已加载',running:'执行中',completed:'已完成',blocked:'受阻',failed:'失败',queued:'排队中',in_progress:'研究中',unknown:'未知'};
const colors = {goal:'#677488',asset:'#3f7fbc',business:'#8b71c4',lead:'#dc9250',evidence:'#429481',finding:'#d36267'};
const order = ['goal','asset','business','lead','evidence','finding'];
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pill = status => '<span class="pill '+(Object.hasOwn(labels,status)?status:'')+'">'+esc(labels[status]||status||'未知')+'</span>';
const field = (name,value) => value===undefined||value===null||value===''?'':'<span class="detail-label">'+esc(name)+'</span><div class="detail-value">'+esc(Array.isArray(value)?value.join('\n'):value)+'</div>';
const date = value => {const d=new Date(value);return isNaN(d)?'时间未记录':d.toLocaleString('zh-CN',{hour12:false});};
const duration = value => value===undefined?'耗时未记录':Number(value)<60?value+' 秒':(Number(value)/60).toFixed(1)+' 分钟';
let state=null,selectedNode='',selectedFinding='',zoom=1,eventLimit=60,page='graph',lastPayload='',fetching=false,previousAssets='';
function selectPage(value) {
 page=value;
 for(const button of document.querySelectorAll('.tab')){
  const active=button.dataset.page===value;
  button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  const section=$('page-'+button.dataset.page);section.hidden=!active;section.classList.toggle('active',active);
 }
 if(state)renderPage();
}
function renderAll(){
 $('project-title').textContent=state.meta.title||'研究工作台';
 $('project-description').textContent=state.meta.target?state.meta.target+' · 资产、研究路径与执行进展':'资产、研究路径与执行进展';
 $('demo-banner').hidden=!state.meta.demo;
 $('metric-assets').textContent=state.nodes.filter(n=>n.kind==='asset').length;
 $('metric-leads').textContent=state.nodes.filter(n=>n.kind==='lead').length+state.findings.filter(f=>['candidate','validating'].includes(f.status)).length;
 $('metric-confirmed').textContent=state.findings.filter(f=>f.status==='confirmed').length;
 $('metric-deferred').textContent=state.findings.filter(f=>f.status==='deferred').length;
 $('metric-running').textContent=state.skills.filter(s=>s.status==='running').length;
 $('finding-count').textContent=state.findings.length;
 $('updated').textContent=state.meta.updatedAt?'记录更新 '+date(state.meta.updatedAt):'尚无记录';
 const warnings=state.warnings||[];
 $('warning').hidden=!warnings.length;$('warning').textContent=warnings.join('\n');
 const assets=state.nodes.filter(n=>n.kind==='asset'),key=JSON.stringify(assets.map(n=>[n.id,n.title]));
 if(key!==previousAssets){
  const selected=$('asset-filter').value;
  $('asset-filter').innerHTML='<option value="">全部资产</option>'+assets.map(n=>'<option value="'+esc(n.id)+'">'+esc(n.title)+'</option>').join('');
  if(assets.some(n=>n.id===selected))$('asset-filter').value=selected;
  previousAssets=key;
 }
 renderPage();
}
function renderPage(){if(page==='graph')renderGraph();else if(page==='findings')renderFindings();else renderTrace();}
function graphNodes(){
 const selected=$('asset-filter').value,search=$('graph-search').value.trim().toLowerCase();
 let nodes=state.nodes;
 if(selected){
  const keep=new Set([selected]);let changed=true;
  while(changed){changed=false;for(const e of state.edges)if(keep.has(e.from)&&!keep.has(e.to)){keep.add(e.to);changed=true;}}
  for(const n of nodes)if(n.assetId===selected)keep.add(n.id);
  const ancestors=new Set(keep);changed=true;
  while(changed){changed=false;for(const e of state.edges)if(ancestors.has(e.to)&&!ancestors.has(e.from)){ancestors.add(e.from);changed=true;}}
  nodes=nodes.filter(n=>ancestors.has(n.id));
 }
 if(search){
  const matches=new Set(nodes.filter(n=>(n.title+' '+(n.detail||'')+' '+n.id).toLowerCase().includes(search)).map(n=>n.id));
  const keep=new Set(matches);
  for(const e of state.edges){if(matches.has(e.from))keep.add(e.to);if(matches.has(e.to))keep.add(e.from);}
  nodes=nodes.filter(n=>keep.has(n.id));
 }
 return nodes;
}
function svg(tag,attrs,text){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [k,v]of Object.entries(attrs||{}))node.setAttribute(k,String(v));
 if(text!==undefined)node.textContent=text;return node;
}
let graphSize={width:1380,height:440};
function setZoom(){const g=$('graph');g.setAttribute('width',graphSize.width*zoom);g.setAttribute('height',graphSize.height*zoom);$('zoom-label').textContent=Math.round(zoom*100)+'%';}
function renderGraph(){
 const graph=$('graph'),viewport=$('graph-viewport'),oldScroll={x:viewport.scrollLeft,y:viewport.scrollTop};
 graph.replaceChildren();const nodes=graphNodes(),ids=new Set(nodes.map(n=>n.id)),edges=state.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
 $('graph-empty').hidden=nodes.length>0;graph.hidden=!nodes.length;
 $('graph-summary').textContent=nodes.length+' 个节点 · '+edges.length+' 条关系';
 if(!nodes.length){$('node-detail').innerHTML='<p class="eyebrow">节点详情</p><h3>暂无匹配节点</h3><p class="muted">清除筛选，或先记录一个目标及其资产。</p>';return;}
 const columns=order.map(kind=>nodes.filter(n=>n.kind===kind));
 graphSize={width:1380,height:Math.max(440,Math.max(...columns.map(a=>a.length))*116+90)};
 graph.setAttribute('viewBox','0 0 '+graphSize.width+' '+graphSize.height);setZoom();
 const defs=svg('defs'),marker=svg('marker',{id:'arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
 marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#b3bfcd'}));defs.append(marker);graph.append(defs);
 const positions=new Map();
 columns.forEach((list,col)=>{
  const x=30+col*222;
  if(list.length)graph.append(svg('text',{x:x+4,y:29,class:'column-title'},labels[order[col]]+' / '+String(list.length).padStart(2,'0')));
  list.forEach((n,row)=>positions.set(n.id,{x,y:58+row*116}));
 });
 for(const e of edges){
  const a=positions.get(e.from),b=positions.get(e.to),sx=a.x+184,sy=a.y+33,tx=b.x,ty=b.y+33;
  const distance=Math.max(35,Math.abs(tx-sx)*.5),d='M '+sx+' '+sy+' C '+(sx+distance)+' '+sy+', '+(tx-distance)+' '+ty+', '+tx+' '+ty;
  graph.append(svg('path',{d,fill:'none',stroke:'#c6d0dc','stroke-width':1.2,'marker-end':'url(#arrow)'}));
  graph.append(svg('text',{x:(sx+tx)/2,y:(sy+ty)/2-7,'text-anchor':'middle',class:'edge-label'},e.label));
 }
 for(const n of nodes){
  const p=positions.get(n.id),group=svg('g',{transform:'translate('+p.x+','+p.y+')',class:'graph-node'+(n.id===selectedNode?' selected':''),role:'button',tabindex:0,'aria-label':labels[n.kind]+'：'+n.title});
  group.append(svg('title',{},n.title),svg('rect',{width:184,height:69,rx:7}),svg('circle',{cx:14,cy:20,r:3,fill:colors[n.kind]}));
  const title=Array.from(n.title);group.append(svg('text',{x:24,y:24,class:'node-title'},title.slice(0,21).join('')+(title.length>21?'…':'')));
  group.append(svg('text',{x:14,y:49,class:'node-sub'},(n.tier?n.tier+' · ':'')+(labels[n.status]||n.status||labels[n.kind])));
  const pick=()=>{selectedNode=n.id;renderGraph();nodeDetail(n);};
  group.addEventListener('click',pick);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick();}});
  graph.append(group);
 }
 viewport.scrollLeft=oldScroll.x;viewport.scrollTop=oldScroll.y;
 const selected=nodes.find(n=>n.id===selectedNode);if(selected)nodeDetail(selected);
 else $('node-detail').innerHTML='<p class="eyebrow">节点详情</p><h3>选择一条研究路径</h3><p class="muted">点击图中的节点，查看状态、证据和下一步。</p>';
}
function nodeDetail(n){
 const linked=state.edges.filter(e=>e.from===n.id||e.to===n.id);
 $('node-detail').innerHTML='<p class="eyebrow">'+esc(labels[n.kind])+' / 节点详情</p><h3>'+esc(n.title)+'</h3>'+pill(n.status)+'<p class="id">'+esc(n.id)+'</p>'+field('已观察 / 说明',n.detail)+field('业务类型',n.businessType)+field('价值分类',n.tier)+field('范围依据',n.scope)+field('证据位置',n.evidencePaths)+field('下一步',n.nextPlan)+field('关联路径',linked.map(e=>{const other=state.nodes.find(x=>x.id===(e.from===n.id?e.to:e.from));return e.label+' → '+(other?.title||'');}))+field('最后更新',n.updatedAt?date(n.updatedAt):'');
 const f=state.findings.find(f=>f.id===n.id);
 if(f){const button=document.createElement('button');button.className='button';button.classList.add('detail-action');button.textContent='查看漏洞与八问 →';button.onclick=()=>{selectedFinding=f.id;selectPage('findings');};$('node-detail').append(button);}
}
const passed = f => Array.from({length:8},(_,i)=>f.questions?.['Q'+(i+1)]).filter(q=>q?.answer==='yes').length;
function renderFindings(){
 const status=$('finding-status').value,query=$('finding-search').value.trim().toLowerCase();
 const list=state.findings.filter(f=>(!status||f.status===status)&&JSON.stringify(f).toLowerCase().includes(query));
 $('finding-list').innerHTML=list.length?list.map(f=>{
  const asset=state.nodes.find(n=>n.id===f.assetId);
  return '<button class="finding-card'+(selectedFinding===f.id?' selected':'')+'" data-finding="'+esc(f.id)+'"><div class="finding-card-top"><span class="finding-id">'+esc(f.id)+'</span>'+pill(f.status)+'</div><h3>'+esc(f.title)+'</h3><p>'+esc(asset?.title||f.origin||'资产未关联')+'</p><div class="finding-card-bottom"><span>'+esc(f.tier||'价值待分类')+' · '+esc(f.severity||'等级待定')+'</span><span>八问 '+passed(f)+' / 8</span></div></button>';
 }).join(''):'<div class="empty"><strong>暂无匹配线索</strong><p>记录候选与验证结果后，可在这里查看。</p></div>';
 for(const b of $('finding-list').querySelectorAll('button'))b.onclick=()=>{selectedFinding=b.dataset.finding;renderFindings();};
 const selected=list.find(f=>f.id===selectedFinding);
 if(selected)findingDetail(selected);else $('finding-detail').innerHTML='<p class="eyebrow">漏洞详情</p><h3>选择一个候选或结果</h3><p class="muted">八问的答案、证据位置和下一步会在这里显示。</p>';
 const deferred=state.findings.filter(f=>f.status==='deferred');
 $('deferred-count').textContent=deferred.length+' 项';
 $('deferred-table').innerHTML=deferred.length?deferred.map(f=>'<tr><td>'+esc(f.id)+'<small>'+esc(f.title)+'</small></td><td>'+esc(f.likelihood||'未知')+'<small>'+esc(f.likelihoodReason||'依据未记录')+'</small></td><td>'+esc(f.elapsedMinutes??'未记录')+' / '+esc(f.estimatedMinutes??'待评估')+' 分钟</td><td>'+esc(f.pauseReason||'未记录')+'</td><td>'+esc(f.nextPlan||f.remainingChecks||'待安排')+'<small>用户决定：'+esc(({pending:'待决定',continue:'继续',decline:'不继续'})[f.userDecision]||f.userDecision||'待决定')+'</small></td></tr>').join(''):'<tr><td colspan="5">因时间未完成的候选：0</td></tr>';
}
function findingDetail(f){
 const count=passed(f),qs=state.questions.map((question,i)=>{
  const key='Q'+(i+1),q=f.questions?.[key]||{},answer=['yes','no'].includes(q.answer)?q.answer:'pending';
  return '<li><div class="gate-row"><span class="gate-number">'+key+'</span><span>'+esc(question)+'</span><span class="gate-answer '+answer+'">'+({yes:'是',no:'否',pending:'待补证'})[answer]+'</span></div><div class="gate-evidence">'+esc(q.reason||'尚未记录判断理由')+(q.evidence?'\n证据：'+esc(q.evidence):'')+'</div></li>';
 }).join('');
 $('finding-detail').innerHTML='<p class="eyebrow">'+esc(f.id)+' / 漏洞详情</p><h3>'+esc(f.title)+'</h3>'+pill(f.status)+field('已观察事实',f.observedFacts)+field('业务影响 / 待验证边界',f.impact)+field('存在可能性与依据',[f.likelihood,f.likelihoodReason].filter(Boolean))+field('证据位置',f.evidencePaths)+field('剩余步骤',f.remainingChecks)+field('下一步',f.nextPlan)+field('暂停原因',f.pauseReason)+'<div class="gate-summary">八问已记录通过 '+count+' / 8'+(count<8?' · 当前保留为研究线索':' · 以实际证据和记录状态为准')+'</div><ol class="gate-list">'+qs+'</ol>';
}
function renderTrace(){
 const status=$('skill-status').value,query=$('trace-search').value.trim().toLowerCase();
 const skills=state.skills.filter(s=>(!status||s.status===status)&&JSON.stringify(s).toLowerCase().includes(query));
 $('skill-list').innerHTML=skills.length?skills.map(s=>{
  const asset=state.nodes.find(n=>n.id===s.assetId);
  return '<article class="skill-card"><div class="skill-top"><h3>'+esc(s.skill)+'</h3>'+pill(s.status)+'</div><p>'+esc(s.summary||s.reason||'说明未记录')+'</p><div class="skill-meta"><span>'+esc(asset?.title||'项目范围')+'</span><span>'+esc(duration(s.elapsedSeconds))+'</span></div></article>';
 }).join(''):'<div class="empty"><strong>尚无技能执行记录</strong><p>记录明确的加载与执行状态后，技能卡片会出现在这里。</p></div>';
 const events=state.timeline.filter(e=>JSON.stringify(e).toLowerCase().includes(query)&&(!status||e.type==='skill.event'&&e.data.status===status)).slice().reverse();
 $('event-count').textContent=events.length+' 条记录';
 $('timeline').innerHTML=events.slice(0,eventLimit).map(e=>{
  const d=e.data,name=e.type==='skill.event'?d.skill:e.type==='edge.upsert'?'关联路径':d.title||d.action||({'run.meta':'项目设置','finding.upsert':'漏洞记录','node.upsert':'节点记录',progress:'进度记录'})[e.type]||e.type;
  const result=(d.summary||d.brief_result||d.label||d.detail||d.reason||'')+(d.timestampSource==='import'?' · 原始时间未记录；此处显示导入时间':'');
  return '<article class="timeline-event"><time>'+esc(date(e.timestamp))+'</time><div><p>'+esc(name)+' '+(d.status?pill(d.status):'')+'</p><small>'+esc(result)+'</small>'+(d.next_plan?'<small>下一步：'+esc(d.next_plan)+'</small>':'')+'</div></article>';
 }).join('')||'<div class="empty"><p>重要操作写入记录后，时间线会持续更新。</p></div>';
 $('more-events').hidden=events.length<=eventLimit;
}
async function refresh(){
 if(fetching)return;fetching=true;
 try{
  const response=await fetch('/api/state',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.text(),parsed=JSON.parse(payload);
  if(parsed.error)throw Error(parsed.error);
  $('connection').textContent='记录已连接';$('connection').classList.remove('error');
  if(payload!==lastPayload){state=parsed;lastPayload=payload;renderAll();}else{$('warning').hidden=!state.warnings.length;$('warning').textContent=state.warnings.join('\n');}
 }catch(e){
  $('connection').textContent='连接中断';$('connection').classList.add('error');
  $('warning').hidden=false;$('warning').textContent='无法读取最新记录：'+e.message+'。页面保留上一次成功读取的内容，请检查本地服务。';
 }finally{fetching=false;}
}
for(const b of document.querySelectorAll('.tab')) {
 b.onclick=()=>selectPage(b.dataset.page);
 b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const pages=['graph','findings','trace'],i=pages.indexOf(page),next=pages[(i+(e.key==='ArrowRight'?1:2))%3];selectPage(next);$('tab-'+next).focus();}};
}
$('refresh').onclick=refresh;
for(const id of ['asset-filter','graph-search'])$(id).addEventListener(id.includes('search')?'input':'change',()=>state&&renderGraph());
for(const id of ['finding-status','finding-search'])$(id).addEventListener(id.includes('search')?'input':'change',()=>state&&renderFindings());
for(const id of ['skill-status','trace-search'])$(id).addEventListener(id.includes('search')?'input':'change',()=>state&&renderTrace());
$('zoom-in').onclick=()=>{zoom=Math.min(2,zoom+.1);setZoom();};$('zoom-out').onclick=()=>{zoom=Math.max(.3,zoom-.1);setZoom();};
$('zoom-fit').onclick=()=>{zoom=Math.min(1,$('graph-viewport').clientWidth/graphSize.width);setZoom();$('graph-viewport').scrollTo(0,0);};
$('more-events').onclick=()=>{eventLimit+=60;renderTrace();};
let drag=null;
$('graph-viewport').addEventListener('pointerdown',e=>{if(e.target.closest('.graph-node'))return;drag={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('dragging');});
$('graph-viewport').addEventListener('pointermove',e=>{if(drag){e.currentTarget.scrollLeft=drag.left+drag.x-e.clientX;e.currentTarget.scrollTop=drag.top+drag.y-e.clientY;}});
for(const event of ['pointerup','pointercancel'])$('graph-viewport').addEventListener(event,e=>{drag=null;e.currentTarget.classList.remove('dragging');});
refresh();setInterval(refresh,3000);
