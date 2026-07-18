
'use strict';
const SK = 'chatstory_v2';
let st = { version:0, convs:[], activeCid:null, settings:{ apiBaseUrl:'', apiKey:'', modelName:'', maxTokens:4096, maxUnlimited:true, temperature:0.7, systemPrompt:'', availModels:[], giteeToken:'', giteeRepo:'', giteeBranch:'main', githubToken:'', githubRepo:'', githubBranch:'main' }, rvEntries:[], rvReasons:[], gvEntries:[], gvReasons:[], qps:[], memories:[], theme:'dark' };
let streaming = false;
let attachs = [];
let _debTimer = null, _saveTimer = null;

const G = id => document.getElementById(id);
const msgsEl = G('msgs'), convListEl = G('convList'), userInput = G('userInput');
const sendBtn = G('sendBtn'), mdlBadge = G('mdlBadge'), chatTitle = G('chatTitle');

function save() { localStorage.setItem(SK, JSON.stringify(st)); }
function load() { try { var r = localStorage.getItem(SK); if(r) st = JSON.parse(r); } catch(e){} st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0; st.rvEntries=st.rvEntries||[]; st.rvReasons=st.rvReasons||[]; st.gvEntries=st.gvEntries||[]; st.gvReasons=st.gvReasons||[]; st.qps=st.qps||[]; st.memories=st.memories||[]; if(!st.settings.giteeToken)st.settings.giteeToken='b6df2c768b72835f8fad74d052509656'; if(!st.settings.giteeRepo)st.settings.giteeRepo='middle000/story_-project'; if(!st.settings.giteeBranch)st.settings.giteeBranch='main'; }

load(); applyTheme(); renderAll();

userInput.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,150)+'px'});

function toggleTheme(){st.theme=st.theme==='dark'?'light':'dark';applyTheme();save()}
function applyTheme(){if(st.theme==='dark'){document.body.classList.add('dark');G('themeBtn').textContent='☀️'}else{document.body.classList.remove('dark');G('themeBtn').textContent='🌙'}}

function toggleSidebar(){var sb=G('sidebar');var w=window.innerWidth;if(w>768){sb.classList.toggle('collapsed')}else{sb.classList.toggle('open');document.querySelector('.side-backdrop').classList.toggle('show')}}

// ===== SECTIONS =====
function toggleSec(name, el){
  el.classList.toggle('collapsed');
  var body = G('sec'+name.charAt(0).toUpperCase()+name.slice(1));
  if(body) body.classList.toggle('hidden');
  if(name==='prompts') renderQPs();
  if(name==='review'){renderRVs();renderRvReasons()}
  if(name==='good'){renderGVs();renderGvReasons()}
  if(name==='memory') renderMems();
  if(name==='backup'){}
  }

function expandAndJump(name){var sb=G('sidebar');sb.classList.remove('collapsed');jumpTo(name)}
function jumpTo(name){
  var body = G('sec'+name.charAt(0).toUpperCase()+name.slice(1));
  var hdr = body.previousElementSibling;
  body.classList.remove('hidden');
  hdr.classList.remove('collapsed');
  if(name==='review'){renderRVs();renderRvReasons()}
  if(name==='good'){renderGVs();renderGvReasons()}
  if(name==='backup'){}
  hdr.scrollIntoView({behavior:'smooth'});
}

// ===== CONVERSATIONS =====
function newConv(){
  var c = {id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'新对话',msgs:[],createdAt:Date.now()};
  st.convs.unshift(c); st.activeCid=c.id; save(); renderAll(); userInput.focus();
}
function getActive(){return st.convs.find(c=>c.id===st.activeCid)||null}
function delConv(id,e){e.stopPropagation();if(!confirm('删除对话？'))return;st.convs=st.convs.filter(c=>c.id!==id);if(st.activeCid===id)st.activeCid=st.convs[0]?.id||null;save();renderAll()}
function selConv(id){st.activeCid=id;save();renderAll();scrollBottom()}
// ===== Right-click context menu =====
var _memText = '';
document.addEventListener('contextmenu', function(e){
  var sel = window.getSelection().toString().trim();
  if(!sel) return;
  e.preventDefault();
  _memText = sel;
  var menu = G('ctxMenu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('show');
  renderCtxSub();
});
document.addEventListener('click', function(e){
  if(!e.target.closest('.ctx-menu')) G('ctxMenu').classList.remove('show');
});

function renderCtxSub(){
  var sub = G('ctxSub');
  sub.innerHTML = '<div class="ctx-menu-sub-item" onclick="addToMemNew()">＋ 新建项目</div>' +
    st.memories.map(function(p){return '<div class="ctx-menu-sub-item" onclick="addToMem(\''+p.id+'\')">📁 '+esc(p.name)+'</div>'}).join('');
}

function addToMem(pid){
  var p = st.memories.find(function(x){return x.id===pid});
  if(!p||!_memText) return;
  p.items.push({id:Date.now().toString(36),content:_memText,date:new Date().toISOString()});
  save(); toast('已添加到 '+p.name,'success');
  G('ctxMenu').classList.remove('show'); _memText='';
}
function addToMemNew(){
  if(!_memText) return;
  var name = prompt('新建记忆项目名称：');
  if(!name) return;
  var p = {id:Date.now().toString(36),name:name,items:[{id:Date.now().toString(36),content:_memText,date:new Date().toISOString()}]};
  st.memories.push(p); save(); toast('已创建并添加','success');
  G('ctxMenu').classList.remove('show'); _memText='';
}

function saveConvToMem(){
  var c = getActive();
  if(!c||c.msgs.length===0){toast('无对话内容','error');return}
  var text = c.msgs.map(function(m){
    var ct = Array.isArray(m.content) ? m.content.map(function(p){return p.type==='text'?p.text:''}).join(' ') : m.content;
    return '['+(m.role==='user'?'用户':'AI')+']: '+ct;
  }).join('\n\n');
  if(!text.trim()){toast('无内容','error');return}
  _memText = text;
  var menu = G('ctxMenu');
  var btn = document.querySelector('.icn-btn[onclick*="saveConvToMem"]');
  var rect = btn.getBoundingClientRect();
  // Delay to avoid immediate close by document click handler
  setTimeout(function(){
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.classList.add('show');
    renderCtxSub();
  }, 100);
}

function clearConv(){var c=getActive();if(!c||c.msgs.length===0)return;if(!confirm('清空对话？'))return;c.msgs=[];c.title='新对话';save();renderAll()}

// ===== QUICK PROMPTS =====
var qpEditingId=null;
function saveQP(){
  var t=G('qpTitle').value.trim()||'未命名', c=G('qpContent').value.trim();
  if(!c){toast('请输入内容','error');return}
  if(qpEditingId){
    var p=st.qps.find(p=>p.id===qpEditingId); if(p){p.title=t;p.content=c}
    qpEditingId=null; G('qpSaveBtn').textContent='＋ 新建并保存'; G('qpCancelBtn').style.display='none';
  }else{
    st.qps.unshift({id:Date.now().toString(36),title:t,content:c});
  }
  G('qpTitle').value=''; G('qpContent').value=''; save(); renderQPs(); toast('已保存','success');
}
function editQP(id){var p=st.qps.find(p=>p.id===id);if(!p)return;qpEditingId=id;G('qpTitle').value=p.title;G('qpContent').value=p.content;G('qpSaveBtn').textContent='✓ 更新';G('qpCancelBtn').style.display='';G('qpContent').focus()}
function cancelEditQP(){qpEditingId=null;G('qpTitle').value='';G('qpContent').value='';G('qpSaveBtn').textContent='＋ 新建并保存';G('qpCancelBtn').style.display='none'}
function delQP(id){st.qps=st.qps.filter(p=>p.id!==id);save();renderQPs()}
function useQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;userInput.focus();userInput.style.height='auto';userInput.style.height=Math.min(userInput.scrollHeight,150)+'px'}}
function sendQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;sendMsg()}}
function renderQPs(){
  var el=G('qpList');
  if(!st.qps.length){el.innerHTML='<div style="padding:8px;font-size:11px;color:var(--text-secondary);text-align:center">暂无</div>';return}
  el.innerHTML=st.qps.map(p=>'<div class="qp-item" data-qpid="'+p.id+'" title="点击填入"><span class="qp-title">'+esc(p.title)+'</span><span class="qp-acts"><button class="qp-act send" data-send="'+p.id+'" title="粘贴并发送">▶</button><button class="qp-act edit" data-edit="'+p.id+'" title="编辑">✎</button><button class="qp-act del" data-del="'+p.id+'" title="删除">✕</button></span></div>').join('');
  if(!el._b){el._b=true;el.addEventListener('click',function(e){var item=e.target.closest('.qp-item');if(!item)return;var id=item.dataset.qpid;if(e.target.closest('.qp-act.send'))sendQP(id);else if(e.target.closest('.qp-act.edit'))editQP(id);else if(e.target.closest('.qp-act.del'))delQP(id);else useQP(id)})}
}

// ===== REVIEW (低级作家) =====
function renderRvReasons(){G('rvReason').innerHTML='<option value="">-- 选择原因 --</option>'+st.rvReasons.map(r=>'<option>'+esc(r)+'</option>').join('')}
function onRvReason(){}
function addRvReason(){var v=G('rvNewReason').value.trim();if(!v)return;if(!st.rvReasons.includes(v))st.rvReasons.push(v);save();renderRvReasons();G('rvReason').value=v;G('rvNewReason').value=''}function delRvReason(i){st.rvReasons.splice(i,1);save();renderRvReasons();toast('???','success')}function delGvReason(i){st.gvReasons.splice(i,1);save();renderGvReasons();toast('???','success')}
function renderRVs(){
  var el=G('rvList');
  if(!st.rvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无记录</div>';return}
  el.innerHTML=[...st.rvEntries].reverse().map(e=>'<div class="review-entry"><button class="review-entry-del" onclick="delRv(\''+e.id+'\')">✕</button><span class="review-entry-num">#'+e.num+'</span> <span class="review-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="review-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="review-entry-reason"><strong>原因：</strong>'+esc(e.reason)+'</div><div class="review-entry-ai"><strong>🤖 AI分析：</strong> <span class="rv-actions"><button class="rv-act" onclick="redoRvAI(\''+e.id+'\')" title="重新分析">🔄</button><button class="rv-act" onclick="editRvAI(\''+e.id+'\')" title="编辑">✏️</button></span><br><span id="rvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}
function delRv(id){if(!confirm('删除？'))return;st.rvEntries=st.rvEntries.filter(e=>e.id!==id);st.rvEntries.forEach((e,i)=>e.num=i+1);save();renderRVs();updateRvBadge()}
function updateRvBadge(){var n=st.rvEntries.length;var b=G('rvBadge');b.textContent=n;b.style.display=n>0?'':'none'}
async function submitReview(){
  var text=G('rvText').value.trim(); if(!text){toast('请填内容','error');return}
  var reason=G('rvReason').value||G('rvNewReason').value.trim();
  if(!reason){toast('请填原因','error');return}
  if(reason&&!st.rvReasons.includes(reason)){st.rvReasons.push(reason)}
  var btn=G('btnRvAdd'); btn.disabled=true; btn.textContent='⏳ 分析中...';
  var ai='';
  try{ai=await callAI(text,reason)}catch(e){ai='(失败: '+e.message+')'}
  st.rvEntries.push({id:Date.now().toString(36),num:st.rvEntries.length+1,text,reason,date:new Date().toISOString(),aiAnalysis:ai});
  G('rvText').value=''; G('rvReason').value=''; save(); renderRVs(); updateRvBadge(); renderRvReasons(); renderRvReasons();
  btn.disabled=false; btn.textContent='📌 记录并分析'; toast('已记录','success');
}
async function callAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('未配置API');
  var def='标记内容："""{text}"""\n问题：{reason}\n总结一条负向规则（不应做的事），只输出规则';
  var up=(s.reviewUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'你是审核助手'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(无结果)';
}
function editReviewPrompt(){
  var def='标记内容："""{text}"""\n问题：{reason}\n总结一条负向规则（不应做的事），只输出规则';
  var current=st.settings.reviewUserPrompt||def;
  var v=prompt('编辑低级作家分析 Prompt（{text}和{reason}会被替换）:',current);
  if(v===null)return;
  if(!v.trim()||v===def){st.settings.reviewUserPrompt=''}else{st.settings.reviewUserPrompt=v}
  save(); toast('Prompt已更新','success');
}
function editGoodPrompt(){
  var def='优秀描写："""{text}"""\n标签：{reason}\n总结一条正向规则（应该效仿的技巧），只输出规则';
  var current=st.settings.goodUserPrompt||def;
  var v=prompt('编辑高级作家分析 Prompt（{text}和{reason}会被替换）:',current);
  if(v===null)return;
  if(!v.trim()||v===def){st.settings.goodUserPrompt=''}else{st.settings.goodUserPrompt=v}
  save(); toast('Prompt已更新','success');
}
async function redoRvAI(id){
  var e=st.rvEntries.find(function(x){return x.id===id}); if(!e)return;
  var el=document.getElementById('rvai-'+id); if(!el)return;
  el.textContent='⏳ 重新分析中...';
  try{var ai=await callAI(e.text,e.reason); e.aiAnalysis=ai; save(); el.textContent=ai; toast('已重新分析','success')}
  catch(err){el.textContent=e.aiAnalysis; toast('分析失败','error')}
}
function editRvAI(id){
  var e=st.rvEntries.find(function(x){return x.id===id}); if(!e)return;
  var v=prompt('编辑AI分析结果:',e.aiAnalysis); if(v===null)return;
  e.aiAnalysis=v; save();
  var el=document.getElementById('rvai-'+id); if(el) el.textContent=v;
  toast('已更新','success');
}
async function redoGvAI(id){
  var e=st.gvEntries.find(function(x){return x.id===id}); if(!e)return;
  var el=document.getElementById('gvai-'+id); if(!el)return;
  el.textContent='⏳ 重新分析中...';
  try{var ai=await callGoodAI(e.text,e.reason); e.aiAnalysis=ai; save(); el.textContent=ai; toast('已重新分析','success')}
  catch(err){el.textContent=e.aiAnalysis; toast('分析失败','error')}
}
function editGvAI(id){
  var e=st.gvEntries.find(function(x){return x.id===id}); if(!e)return;
  var v=prompt('编辑AI分析结果:',e.aiAnalysis); if(v===null)return;
  e.aiAnalysis=v; save();
  var el=document.getElementById('gvai-'+id); if(el) el.textContent=v;
  toast('已更新','success');
}
function genNegPrompt(){
  if(!st.rvEntries.length){toast('无记录','error');return}
  var seen=new Set(), rules=[];
  for(var e of st.rvEntries){if(e.aiAnalysis&&!e.aiAnalysis.startsWith('(失败')){if(!seen.has(e.aiAnalysis)){seen.add(e.aiAnalysis);rules.push(e.aiAnalysis)}}}
  var p='# 负向提示词\n基于'+st.rvEntries.length+'条记录\n\n应避免：\n\n'+rules.map(r=>'- '+r).join('\n')+'\n\n## 摘要\n'+st.rvEntries.map(e=>'- #'+e.num+' ['+e.reason+'] '+e.text.slice(0,60).replace(/\n/g,' ')).join('\n');
  G('negPromptText').textContent=p; G('negModal').classList.add('show');
}
function copyNeg(){navigator.clipboard.writeText(G('negPromptText').textContent).then(()=>toast('已复制','success'))}

// ===== GOOD (高级作家) =====
function renderGvReasons(){G('gvReason').innerHTML='<option value="">-- 选择标签 --</option>'+st.gvReasons.map(r=>'<option>'+esc(r)+'</option>').join('')}
function onGvReason(){}
function addGvReason(){var v=G('gvNewReason').value.trim();if(!v)return;if(!st.gvReasons.includes(v))st.gvReasons.push(v);save();renderGvReasons();G('gvReason').value=v;G('gvNewReason').value=''}
function renderGVs(){
  var el=G('gvList');
  if(!st.gvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无记录</div>';return}
  el.innerHTML=[...st.gvEntries].reverse().map(e=>'<div class="good-entry"><button class="good-entry-del" onclick="delGv(\''+e.id+'\')">✕</button><span class="good-entry-num">#'+e.num+'</span> <span class="good-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="good-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="good-entry-reason"><strong>标签：</strong>'+esc(e.reason)+'</div><div class="good-entry-ai"><strong>🤖 AI分析：</strong> <span class="rv-actions"><button class="rv-act" onclick="redoGvAI(\''+e.id+'\')" title="重新分析">🔄</button><button class="rv-act" onclick="editGvAI(\''+e.id+'\')" title="编辑">✏️</button></span><br><span id="gvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}
function delGv(id){if(!confirm('删除？'))return;st.gvEntries=st.gvEntries.filter(e=>e.id!==id);st.gvEntries.forEach((e,i)=>e.num=i+1);save();renderGVs();updateGvBadge()}
function updateGvBadge(){var n=st.gvEntries.length;var b=G('gvBadge');b.textContent=n;b.style.display=n>0?'':'none'}
async function submitGood(){
  var text=G('gvText').value.trim(); if(!text){toast('请填内容','error');return}
  var reason=G('gvReason').value||G('gvNewReason').value.trim();
  if(!reason){toast('请填标签','error');return}
  if(reason&&!st.gvReasons.includes(reason)){st.gvReasons.push(reason)}
  var btn=G('btnGvAdd'); btn.disabled=true; btn.textContent='⏳ 分析中...';
  var ai='';
  try{ai=await callGoodAI(text,reason)}catch(e){ai='(失败: '+e.message+')'}
  st.gvEntries.push({id:Date.now().toString(36),num:st.gvEntries.length+1,text,reason,date:new Date().toISOString(),aiAnalysis:ai});
  G('gvText').value=''; G('gvReason').value=''; save(); renderGVs(); updateGvBadge(); renderGvReasons(); renderGvReasons();
  btn.disabled=false; btn.textContent='📌 记录并分析'; toast('已记录','success');
}
async function callGoodAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('未配置API');
  var def='优秀描写："""{text}"""\n标签：{reason}\n总结一条正向规则（应该效仿的技巧），只输出规则';
  var up=(s.goodUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'你是写作点评助手'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(无结果)';
}
function genPosPrompt(){
  if(!st.gvEntries.length){toast('无记录','error');return}
  var seen=new Set(), rules=[];
  for(var e of st.gvEntries){if(e.aiAnalysis&&!e.aiAnalysis.startsWith('(失败')){if(!seen.has(e.aiAnalysis)){seen.add(e.aiAnalysis);rules.push(e.aiAnalysis)}}}
  var p='# 正向提示词\n基于'+st.gvEntries.length+'条记录\n\n应效仿：\n\n'+rules.map(r=>'- '+r).join('\n')+'\n\n## 摘要\n'+st.gvEntries.map(e=>'- #'+e.num+' ['+e.reason+'] '+e.text.slice(0,60).replace(/\n/g,' ')).join('\n');
  G('posPromptText').textContent=p; G('posModal').classList.add('show');
}
function copyPos(){navigator.clipboard.writeText(G('posPromptText').textContent).then(()=>toast('已复制','success'))}
function flagToGood(){
  if(!_memText) return;
  G('gvText').value = _memText;
  jumpTo('good');
}
// ===== LONG-TERM MEMORY =====
function addMemProj(){
  var n=G('memProjName').value.trim(); if(!n){toast('请输入名称','error');return}
  st.memories.push({id:Date.now().toString(36),name:n,items:[]}); G('memProjName').value=''; save(); renderMems(); toast('已创建','success');
}
function delMemProj(id){if(!confirm('删除项目及所有记忆？'))return;st.memories=st.memories.filter(p=>p.id!==id);save();renderMems()}
function toggleMemProj(id){G('membody-'+id).classList.toggle('open');G('memhdr-'+id).classList.toggle('collapsed')}
function addMemItem(pid){var inp=G('meminput-'+pid);var c=inp.value.trim();if(!c)return;var p=st.memories.find(p=>p.id===pid);if(!p)return;p.items.push({id:Date.now().toString(36),content:c,date:new Date().toISOString()});inp.value='';save();renderMems();G('membody-'+pid).classList.add('open');G('memhdr-'+pid).classList.remove('collapsed')}
function delMemItem(pid,iid){var p=st.memories.find(p=>p.id===pid);if(!p)return;p.items=p.items.filter(i=>i.id!==iid);save();renderMems();G('membody-'+pid).classList.add('open')}
function renderMems(){
  var el=G('memList');
  if(!st.memories.length){el.innerHTML='<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无</div>';return}
  el.innerHTML=st.memories.map(p=>'<div class="mem-proj"><div class="mem-proj-hdr" id="memhdr-'+p.id+'" onclick="toggleMemProj(\''+p.id+'\')"><span>📁 '+esc(p.name)+' ('+p.items.length+')</span><span style="display:flex;align-items:center;gap:6px"><span class="arr">▼</span><button style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px" onclick="event.stopPropagation();delMemProj(\''+p.id+'\')">✕</button></span></div><div class="mem-proj-body" id="membody-'+p.id+'">'+(p.items.length?p.items.map(i=>'<div class="mem-item"><span class="mem-item-txt">'+esc(i.content)+'</span><button class="mem-item-del" onclick="delMemItem(\''+p.id+'\',\''+i.id+'\')">✕</button></div>').join(''):'<div style="padding:8px;font-size:11px;color:var(--text-secondary)">暂无记忆</div>')+'<div class="mem-add-row"><input type="text" id="meminput-'+p.id+'" placeholder="添加记忆..." onkeydown="if(event.key===\'Enter\')addMemItem(\''+p.id+'\')"><button class="btn-sm" onclick="addMemItem(\''+p.id+'\')" style="padding:5px 10px;font-size:11px">+</button></div></div></div>').join('');
}

// ===== MODEL DROPDOWN =====
function toggleMdlDrop(e){e.stopPropagation();G('mdlDrop').classList.toggle('show')}
function selChatModel(m){st.settings.modelName=m;save();renderAll();G('mdlDrop').classList.remove('show')}
function renderMdlDrop(){
  var d=G('mdlDrop'), ms=st.settings.availModels||[], cur=st.settings.modelName;
  if(!ms.length){d.innerHTML='<div class="mdl-drop-item" style="color:var(--text-secondary)">无模型 - 在设置中获取</div>';return}
  d.innerHTML=ms.map(m=>'<div class="mdl-drop-item'+(m===cur?' active':'')+'" onclick="selChatModel(\''+m.replace(/'/g,"\\'")+'\')">'+m+'</div>').join('');
}
document.addEventListener('click',function(e){var d=G('mdlDrop'),w=document.querySelector('.mdl-badge-wrap');if(d&&w&&!w.contains(e.target))d.classList.remove('show')});

// ===== FLAG & ATTACH =====
function onAttach(e){
  var files=Array.from(e.target.files);
  for(var f of files){
    var isImg=f.type.startsWith('image/'), rdr=new FileReader();
    rdr.onload=function(ev){var re=ev.target.result;attachs.push({name:f.name,type:f.type,data:isImg?re.split(',')[1]:re,isImg,preview:isImg?re:null,mime:f.type||(isImg?'image/png':'text/plain')});renderAttachs()};
    if(isImg)rdr.readAsDataURL(f);else rdr.readAsText(f);
  }
  e.target.value='';
}
function rmAttach(i){attachs.splice(i,1);renderAttachs()}
function renderAttachs(){
  var pv=G('attachPreview');
  if(!attachs.length){pv.style.display='none';pv.innerHTML='';return}
  pv.style.display='flex';pv.innerHTML=attachs.map((a,i)=>'<div class="attach-item'+(a.isImg?'':' file')+'">'+(a.isImg?'<img src="data:'+a.mime+';base64,'+a.data+'">':'<span>'+a.name.slice(0,16)+'</span>')+'<button class="attach-remove" onclick="rmAttach('+i+')">✕</button></div>').join('');
}
function msgToMem(e,i){
  e.stopPropagation();
  var c = getActive(); if(!c) return;
  var m = c.msgs[i]; if(!m) return;
  var ct = Array.isArray(m.content) ? m.content.map(function(p){return p.type==='text'?p.text:''}).join(' ') : m.content;
  _memText = ct;
  var menu = G('ctxMenu');
  var btn = e.target;
  var rect = btn.getBoundingClientRect();
  setTimeout(function(){
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.classList.add('show');
    renderCtxSub();
  }, 100);
}

function flagToReview(){
  if(!_memText) return;
  G('rvText').value = _memText;
  jumpTo('review');
}
function flagMsg(e,i){e.stopPropagation();var c=getActive();if(!c)return;var m=c.msgs[i];if(!m||m.role!=='assistant')return;G('rvText').value=m.content;jumpTo('review')}


// ===== PUBLISH (GitHub API) =====
async function publishApp(){
  var s=st.settings;
  if(!s.githubToken||!s.githubRepo){toast('请先配置 GitHub Token 和仓库','error');return}
  var msg=prompt('发布说明:','发布更新 '+new Date().toLocaleString('zh-CN'));
  if(msg===null)return;
  
  showProgress('🚀 正在发布到云端...');
  
  try{
    updateProgress(15,'📦 准备文件...');
    await new Promise(function(r){setTimeout(r,400)});
    updateProgress(40,'📤 上传文件中...');
    
    var t0=Date.now();
    var r=await fetch('/api/github/push',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:msg,token:s.githubToken,repo:s.githubRepo,branch:s.githubBranch||'main'})
    });
    var d=await r.json();
    var elapsed=((Date.now()-t0)/1000).toFixed(1);
    
    if(d.ok){
      st.version=(st.version||0)+1; save(); updateVersion();
      update(100,'✅ 已发布 v'+st.version+' · '+d.pushed+' 文件 · '+elapsed+'s');
      await new Promise(function(r){setTimeout(r,1500)});
      hideProgress(1500);
      toast('✅ 已发布 v'+st.version+' ('+elapsed+'s)','success');
    }else{
      var detail=d.results?d.results.filter(function(x){return x.status==='error'}).map(function(x){return x.file}).join(', '):'';
      update(100,'❌ 失败: '+d.failed+'/'+(d.pushed+d.failed)+' 文件出错');
      document.getElementById('pubFill').style.background='#e05555';
      await new Promise(function(r){setTimeout(r,2500)});
      hideProgress(1500);
      toast('❌ 发布失败: '+detail,'error');
    }
  }catch(e){
    update(100,'❌ 网络错误: '+e.message);
    document.getElementById('pubFill').style.background='#e05555';
    await new Promise(function(r){setTimeout(r,2500)});
    hideProgress(1500);
    toast('❌ '+e.message,'error');
  }
}
// ===== GITEE SYNC =====
async function syncPull(){if(!confirm('工程下载：从 Gitee 拉取最新代码？')) return;
  try{
    var r=await fetch('/api/git/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:st.settings.giteeToken,repo:st.settings.giteeRepo,branch:st.settings.giteeBranch})});
    var d=await r.json();
    if(d.pull&&d.pull.ok){toast('工程下载成功','success');setTimeout(function(){location.reload()},500)}
    else toast('下载失败: '+(d.pull?d.pull.error:d.error),'error');
  }catch(e){toast('下载失败: '+e.message,'error')}
}
async function syncPush(){
  var msg=prompt('提交说明:','Sync from ChatStory');
  if(msg===null)return;
  var tok=st.settings.giteeToken;
  var rep=st.settings.giteeRepo;
  var br=st.settings.giteeBranch;
  console.log('Token:',tok?'***'+tok.slice(-4):'EMPTY','Repo:',rep,'Branch:',br);
  try{
    var r=await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,token:tok,repo:rep,branch:br})});
    var txt=await r.text();
    console.log('Raw response:',txt);
    var d=JSON.parse(txt);
    if(d.push&&d.push.ok) toast('工程上传成功','success');
    else if(d.commit&&d.commit.output&&d.commit.output.includes('nothing to commit')) toast('没有变更','success');
    else toast('上传失败 push='+d.push.ok+' commit='+d.commit.ok,'error');
  }catch(e){toast('上传失败: '+e.message,'error')}
}
async function syncDataUpload(){
  if(!confirm('应用上传：将当前所有数据（对话、记忆、设置等）上传到 Gitee？')) return;
  try{
    var r=await fetch('/api/data/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:st,version:1,date:new Date().toISOString()})});
    var d=await r.json();
    if(d.saved) toast('应用数据已保存','success');
    else toast('保存失败','error');
  }catch(e){toast('上传失败: '+e.message,'error')}
}
async function syncDataDownload(){
  if(!confirm('应用下载：从 Gitee 恢复数据？这将覆盖当前数据！')) return;
  try{
    var r=await fetch('/api/data/download');
    var d=await r.json();
    if(d.error){toast(d.error,'error');return}
    if(d.data&&d.data.convs){
      st=d.data;
      save(); renderAll();
      toast('应用数据已恢复','success');
    }else{toast('无可用数据','error')}
  }catch(e){toast('下载失败: '+e.message,'error')}
}

// ===== CLOUD BACKUP =====
var _backupConvIds = [];
function showBackupConvModal(){
  if(!st.convs||!st.convs.length){doCloudExport();return}
  var html='<div class="backup-conv-select-all"><input type="checkbox" onchange="toggleAllBackupConvs(this)"> 全选 / 取消全选</div>';
  for(var i=0;i<st.convs.length;i++){
    var cn=st.convs[i]; var title=cn.msgs&&cn.msgs[0]?cn.msgs[0].content.slice(0,40):'空对话';
    html+='<label class="backup-conv-item"><input type="checkbox" value="'+cn.id+'"> '+esc(title)+' ('+(cn.msgs?cn.msgs.length:0)+'条)</label>';
  }
  G('backupConvList').innerHTML=html;
  G('backupConvModal').classList.add('show');
}
function toggleAllBackupConvs(cb){
  var boxes=G('backupConvList').querySelectorAll('input[type=checkbox]');
  for(var i=0;i<boxes.length;i++) boxes[i].checked=cb.checked;
}
function closeBackupConvModal(){G('backupConvModal').classList.remove('show')}

function showProgress(title){
  var el=G('pubProgress');
  if(!el){
    el=document.createElement('div');el.id='pubProgress';el.className='pub-progress';el.style.minWidth='500px';el.style.maxWidth='650px';
    el.innerHTML='<div style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px">'+
      '<button class="pub-tab" data-pubtab="progress" onclick="switchPubTab(\x27progress\x27)" style="padding:5px 12px;font-size:12px">📊 进度</button>'+
      '<button class="pub-tab" data-pubtab="raw" onclick="switchPubTab(\x27raw\x27)" style="padding:5px 12px;font-size:12px">📄 原始数据</button>'+
      '</div>'+
      '<div id="pubProgressView">'+
        '<div class="pub-progress-text" id="pubTitle"></div>'+
        '<div class="pub-progress-bar"><div class="pub-progress-fill" id="pubFill"></div></div>'+
        '<div class="pub-progress-step" id="pubStep"></div>'+
        '<div id="pubDetail" class="pub-detail"></div>'+
        '<button id="pubCancelBtn" onclick="cancelProgress()" style="margin-top:12px;padding:6px 20px;background:#555;color:#ccc;border:none;border-radius:6px;cursor:pointer;font-size:12px">✕ 取消</button>'+
      '</div>'+
      '<div id="pubRawView" style="display:none">'+
        '<div style="display:flex;gap:4px;margin-bottom:8px">'+
          '<button class="pub-raw-sub" onclick="switchPubRawSub(\x27prompt\x27)" style="padding:4px 10px;font-size:11px">📤 Prompt</button>'+
          '<button class="pub-raw-sub" onclick="switchPubRawSub(\x27response\x27)" style="padding:4px 10px;font-size:11px">📥 响应</button>'+
          '<button class="pub-raw-sub" onclick="switchPubRawSub(\x27parsed\x27)" style="padding:4px 10px;font-size:11px">📋 解析JSON</button>'+
        '</div>'+
        '<pre id="pubRawContent" style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:350px;overflow:auto;text-align:left;margin:0"></pre>'+
      '</div>';
    document.body.appendChild(el);
  }
  G('pubTitle').textContent=title;
  G('pubFill').style.width='0%';
  G('pubFill').style.background='linear-gradient(90deg,#4f6ef7,#a855f7)';
  G('pubStep').textContent='';
  var cb=G('pubCancelBtn');if(cb)cb.style.display='';var pd=G('pubDetail');if(pd){pd.style.display='';pd.innerHTML=''}
  _pubTab='progress';switchPubTab('progress');
  el.style.display='';
}
function updateProgress(pct,step){
  var f=G('pubFill');if(f)f.style.width=pct+'%';
  var s=G('pubStep');if(s)s.textContent=step;
}
function hideProgress(delay){
  setTimeout(function(){var el=G('pubProgress');if(el)el.style.display='none'},delay||1500);
}

async function doCloudExport(){
  var boxes=G('backupConvList').querySelectorAll('input[type=checkbox]:checked');
  _backupConvIds=[];
  for(var i=0;i<boxes.length;i++) _backupConvIds.push(boxes[i].value);
  closeBackupConvModal();
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('请先配置 Gitee Token 和仓库','error');return}
  var sts=G('backupStatus');
  showProgress('☁️ 正在备份至云端...');
  updateProgress(10,'⏳ 准备数据...');
  var data={
    version:2,
    exportedAt:new Date().toISOString(),
    quickPrompts:st.qps,
    reviewEntries:st.rvEntries,
    reviewReasons:st.rvReasons,
    goodEntries:st.gvEntries,
    goodReasons:st.gvReasons,
    memories:st.memories,
    conversations:_backupConvIds.map(function(id){return st.convs.find(function(x){return x.id===id})}).filter(Boolean)
  };
  try{
    updateProgress(30,'⏳ 上传数据...');
    _abortController=new AbortController();
    var toId=setTimeout(function(){_abortController.abort()},30000);
    var r=await fetch('/api/data/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:_abortController.signal});
    clearTimeout(toId);
    var result=await r.json();
    if(result.error)throw new Error(result.error);
    updateProgress(70,'⏳ 推送到 Gitee...');
    await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',message:'Backup: '+new Date().toLocaleString('zh-CN'),token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    updateProgress(100,'✅ 备份完成！'+data.conversations.length+'个对话');
    var url='https://gitee.com/'+s.giteeRepo+'/blob/'+(s.giteeBranch||'main')+'/app-data.json';
    setTimeout(function(){alert('✅ 备份成功！\n\n文件地址：\n'+url)},800);
    sts.textContent='✅ 已备份 ('+data.conversations.length+'对话) '+new Date().toLocaleString('zh-CN');
    toast('✅ 已备份至云端','success');
  }catch(e){
    updateProgress(100,'❌ 失败: '+e.message);
    G('pubFill').style.background='#e05555';
    sts.textContent='❌ 失败: '+e.message;
    _abortController=null;
    toast('备份失败','error');
  }
  _abortController=null;
  hideProgress(2000);
}

var _abortController=null;
function cancelProgress(){
  if(_abortController){_abortController.abort();_abortController=null;}
  var el=G('pubProgress');if(el)el.style.display='none';
  toast('已取消','info');
}

async function cloudImport(){
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('请先配置 Gitee Token 和仓库','error');return}
  var sts=G('backupStatus');
  showProgress('☁️ 正在从云端恢复...');
  updateProgress(15,'⏳ 拉取数据...');
  try{
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},30000);
    await fetch('/api/git/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    clearTimeout(timeoutId);
    updateProgress(40,'⏳ 下载数据...');
    var r=await fetch('/api/data/download',{signal:_abortController.signal});
    var data=await r.json();
    if(data.error)throw new Error(data.error);
    if(!data.version){
      updateProgress(100,'❌ 云端暂无备份数据');
      sts.textContent='❌ 云端暂无备份数据';
      hideProgress(2000);
      return;
    }
    updateProgress(60,'⏳ 合并数据...');
    var merged=0;
    if(data.quickPrompts){for(var q of data.quickPrompts){if(!st.qps.find(function(x){return x.content===q.content})){st.qps.push(q);merged++}}}
    if(data.reviewReasons){for(var rr of data.reviewReasons){if(!st.rvReasons.includes(rr)){st.rvReasons.push(rr);merged++}}}
    if(data.reviewEntries){for(var rv of data.reviewEntries){if(!st.rvEntries.find(function(x){return x.text===rv.text})){st.rvEntries.push(rv);merged++}}}
    if(data.goodReasons){for(var gr of data.goodReasons){if(!st.gvReasons.includes(gr)){st.gvReasons.push(gr);merged++}}}
    if(data.goodEntries){for(var g of data.goodEntries){if(!st.gvEntries.find(function(x){return x.text===g.text})){st.gvEntries.push(g);merged++}}}
    if(data.memories){for(var mp of data.memories){var ex=st.memories.find(function(x){return x.name===mp.name});if(ex){for(var mi of mp.items){if(!ex.items.find(function(x){return x.content===mi.content})){ex.items.push(mi);merged++}}}else{st.memories.push(mp);merged++}}}
    var convRestored=0;
    if(data.conversations&&Array.isArray(data.conversations)){
      for(var cv of data.conversations){
        if(!st.convs.find(function(x){return x.id===cv.id})){st.convs.push(cv);convRestored++}
      }
    }
    save();
    var msg='✅ 已恢复 '+merged+'条';
    if(convRestored>0)msg+=' + '+convRestored+'个对话';
    updateProgress(100,msg);
    sts.textContent=msg;
    toast(msg,'success');
    renderQPs();renderRVs();updateRvBadge();renderRvReasons();
    renderGVs();updateGvBadge();renderGvReasons();renderMems();renderSidebar();
  }catch(e){
    updateProgress(100,'❌ 失败: '+e.message);
    G('pubFill').style.background='#e05555';
    sts.textContent='❌ 失败: '+e.message;
    toast('恢复失败','error');
  }
  _abortController=null;
  hideProgress(2000);
}

// ===== BACKUP (信息备份) =====
function exportData(){
  var data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    quickPrompts: st.qps,
    reviewEntries: st.rvEntries,
    reviewReasons: st.rvReasons,
    goodEntries: st.gvEntries,
    goodReasons: st.gvReasons,
    memories: st.memories,
    conversations: st.convs
  };
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'chatstory-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出','success');
}
function importData(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      var data = JSON.parse(ev.target.result);
      if(!data.version){toast('无效的备份文件','error');return}
      var merged = 0;
      // Merge quick prompts (deduplicate by content)
      if(data.quickPrompts && Array.isArray(data.quickPrompts)){
        for(var q of data.quickPrompts){
          if(!st.qps.find(function(x){return x.content===q.content})){
            st.qps.push(q); merged++;
          }
        }
      }
      // Merge review entries
      if(data.reviewEntries && Array.isArray(data.reviewEntries)){
        for(var r of data.reviewEntries){
          if(!st.rvEntries.find(function(x){return x.text===r.text})){
            st.rvEntries.push(r); merged++;
          }
        }
        st.rvEntries.forEach(function(e,i){e.num=i+1});
      }
      // Merge review reasons
      if(data.reviewReasons && Array.isArray(data.reviewReasons)){
        for(var rr of data.reviewReasons){
          if(!st.rvReasons.includes(rr)){st.rvReasons.push(rr); merged++}
        }
      }
      // Merge good entries
      if(data.goodEntries && Array.isArray(data.goodEntries)){
        for(var g of data.goodEntries){
          if(!st.gvEntries.find(function(x){return x.text===g.text})){
            st.gvEntries.push(g); merged++;
          }
        }
        st.gvEntries.forEach(function(e,i){e.num=i+1});
      }
      // Merge good reasons
      if(data.goodReasons && Array.isArray(data.goodReasons)){
        for(var gr of data.goodReasons){
          if(!st.gvReasons.includes(gr)){st.gvReasons.push(gr); merged++}
        }
      }
      // Merge memories
      if(data.memories && Array.isArray(data.memories)){
        for(var mem of data.memories){
          var existing = st.memories.find(function(x){return x.name===mem.name});
          if(existing){
            for(var item of mem.items){
              if(!existing.items.find(function(x){return x.content===item.content})){
                existing.items.push(item); merged++;
              }
            }
          }else{
            st.memories.push(mem); merged++;
          }
        }
      }
      save(); renderAll();
      if(st.memories.length) renderMems();
      if(st.rvEntries.length) renderRVs();
      toast('导入完成，合并 '+merged+' 条','success');
    }catch(err){toast('解析失败: '+err.message,'error')}
  };
  reader.readAsText(file);
  e.target.value = '';
}
// ===== TOAST =====
function toast(msg,type){var t=document.createElement('div');t.className='toast '+type;t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(function(){t.remove()},300)},2000)}

// ===== Token estimation =====
var MODEL_CTX={'gpt-4o':128000,'gpt-4o-mini':128000,'gpt-4-turbo':128000,'gpt-4':8192,'gpt-3.5-turbo':16385,'o4-mini':200000,'o3-mini':200000,'o1':200000,'o1-mini':128000,'deepseek-chat':1000000,'deepseek-reasoner':1000000,'deepseek-v3':1000000,'claude-3-5-sonnet-20241022':200000,'claude-3-opus-20240229':200000,'claude-3-haiku-20240307':200000,'moonshot-v1-8k':8192,'moonshot-v1-32k':32768,'moonshot-v1-128k':128000,'glm-4-plus':128000,'glm-4':128000,'qwen-plus':131072,'qwen-max':32768,'qwen-turbo':131072,'gemini-2.0-flash':1048576,'gemini-1.5-pro':2097152,'gemini-1.5-flash':1048576,'mistral-large-latest':128000,'mistral-small-latest':32768,'llama3.2':128000,'llama3.1':128000,'llama3':8192};
function estTokens(text){if(!text)return 0;var en=0;for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);if((c>=32&&c<=126)||c===10||c===13)en++}var other=text.length-en;return Math.ceil(en/4+other/1.8)}
function getModelCtx(modelName){var n=(modelName||"").trim().toLowerCase();if(MODEL_CTX[n])return MODEL_CTX[n];if(n.indexOf("deepseek")>=0)return 1000000;if(n.indexOf("gpt-4")>=0||n.indexOf("o4")>=0||n.indexOf("o3")>=0||n.indexOf("o1")>=0)return 128000;if(n.indexOf("claude")>=0)return 200000;if(n.indexOf("gemini")>=0)return 1048576;return st.settings.maxUnlimited?131072:st.settings.maxTokens*2}
function calcTokens(conv){if(!conv||!conv.msgs.length)return{used:0,ctx:getModelCtx(st.settings.modelName),left:getModelCtx(st.settings.modelName)};var total=0;if(st.settings.systemPrompt)total+=estTokens(st.settings.systemPrompt);for(var p=0;p<st.memories.length;p++){for(var j=0;j<st.memories[p].items.length;j++)total+=estTokens('['+st.memories[p].name+'] '+st.memories[p].items[j].content)}for(var k=0;k<conv.msgs.length;k++){var m=conv.msgs[k];if(Array.isArray(m.content)){for(var l=0;l<m.content.length;l++){if(m.content[l].type==='text')total+=estTokens(m.content[l].text)}}else{total+=estTokens(m.content)}}var ctx=getModelCtx(st.settings.modelName);return{used:total,ctx:ctx,left:Math.max(0,ctx-total-1024)}}
function renderTokenInfo(){var conv=getActive();var info=calcTokens(conv);var pct=info.ctx>0?Math.min(100,Math.round(info.used/info.ctx*100)):0;var cls=pct>80?'high':pct>50?'mid':'low';var usedK=info.used>1000?(info.used/1000).toFixed(1)+'K':info.used;var ctxK=(info.ctx/1000).toFixed(0)+'K';var leftK=info.left>1000?(info.left/1000).toFixed(0)+'K':info.left;G('tokenInfo').innerHTML=usedK+'/'+ctxK+' <span style="font-size:10px">剩余'+leftK+'</span><span class="bar-bg"><span class="bar-fill '+cls+'" style="width:'+pct+'%"></span></span>'}

// ===== RENDER =====
function renderAll(){renderSidebar();renderChat();renderHeader();renderMdlDrop();updateRvBadge();updateGvBadge();try{renderTokenInfo()}catch(e){}}
function renderSidebar(){convListEl.innerHTML=st.convs.map(c=>'<div class="conv-item'+(c.id===st.activeCid?' active':'')+'" onclick="selConv(\''+c.id+'\')"><span class="conv-title">'+esc(c.title)+'</span><button class="conv-del" onclick="delConv(\''+c.id+'\',event)">✕</button></div>').join('')}
function renderHeader(){mdlBadge.textContent=(st.settings.modelName||'未配置')+' ▾';var c=getActive();chatTitle.textContent=c?c.title:'新对话'}
function renderChat(){
  var c=getActive();
  if(!c||c.msgs.length===0){msgsEl.innerHTML='<div class="empty-chat"><div class="logo">💬</div><h2>ChatStory</h2><p>展开左侧设置配置API</p></div>';return}
  msgsEl.innerHTML=c.msgs.map(function(m,i){
    var hasVers=m.versions&&m.versions.length>1;
    var verHtml=hasVers?'<div class="ver-switch"><button onclick="prevVer('+i+')" '+(m.vIdx===0?'disabled':'')+'>◀</button><span>#'+(m.vIdx+1)+'/'+m.versions.length+'</span><button onclick="nextVer('+i+')" '+(m.vIdx>=m.versions.length-1?'disabled':'')+'>▶</button></div>':'';
    var actions='<div class="msg-actions">'+
      (m.role==='user'?'<button class="msg-act redo" onclick="redoMsg(event,'+i+')" title="重新回答">🔄</button>':'<button class="msg-act redo" onclick="redoMsg(event,'+i+')" title="重新回答">🔄</button>')+
      '<button class="msg-act edit" onclick="editMsg(event,'+i+')" title="编辑">✏️</button>'+
      '<button class="msg-act copy" onclick="copyMsg(event,'+i+')" title="复制">📋</button>'+
      '</div>';
    return'<div class="msg-row '+m.role+'"><div><div class="msg-bubble"><button class="msg-del-btn" onclick="delMsg(event,'+i+')">✕</button><button class="msg-mem-btn" onclick="msgToMem(event,'+i+')" title="添加至长期记忆">🧠</button>'+(m.role==='user'?renderUser(m):renderMD(m.content))+'</div>'+(m.error?'<div class="msg-error">⚠️ '+esc(m.error)+'</div>':'')+verHtml+actions+'</div></div>'
  }).join('');
  msgsEl.querySelectorAll('pre').forEach(function(pre){if(pre.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.textContent='复制';b.onclick=function(){navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent).then(function(){b.textContent='已复制!';setTimeout(function(){b.textContent='复制'},1500)})};pre.style.position='relative';pre.appendChild(b)});
  msgsEl.querySelectorAll('pre code').forEach(function(b){hljs.highlightElement(b)});
  scrollBottom();
}
function scrollBottom(){setTimeout(function(){msgsEl.scrollTop=msgsEl.scrollHeight},50)}

// ===== Version management =====
function prevVer(i){
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m||m.vIdx<=0)return;
  m.vIdx--;m.content=m.versions[m.vIdx].content;
  save();renderAll();scrollBottom();
}
function nextVer(i){
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m||m.vIdx>=m.versions.length-1)return;
  m.vIdx++;m.content=m.versions[m.vIdx].content;
  save();renderAll();scrollBottom();
}
function redoMsg(e,i){
  e.stopPropagation();
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m)return;
  if(m.role==='user'){
    // Re-send this user message
    userInput.value = Array.isArray(m.content) ? m.content.map(function(p){return p.type==='text'?p.text:''}).join(' ') : m.content;
    sendMsg();
  } else {
    // Re-generate response
    var prev=c.msgs[i-1];
    if(!prev||prev.role!=='user'){toast('无法找到对应问题','error');return}
    m.versions.push({content:'',ts:Date.now()});
    m.vIdx=m.versions.length-1;
    m.content='';
    save();renderAll();scrollBottom();
    try{regenerateResponse(i)}catch(e){toast('重新回答失败: '+e.message,'error')}
  }
}
async function regenerateResponse(ai){
  var c=getActive();if(!c)return;
  var s=st.settings;
  var apiMsgs=[];
  var sys=s.systemPrompt||'';
  var memLines=[];
  for(var p of st.memories){for(var j of p.items)memLines.push('['+p.name+'] '+j.content)}
  if(memLines.length)sys=(sys?sys+'\n\n':'')+'# 长期记忆\n'+memLines.map(function(m){return'- '+m}).join('\n');
  var loreCtx='';if(st.lorebook&&(st.lorebook.characters||[]).length+(st.lorebook.settings||[]).length+(st.lorebook.plotPoints||[]).length+(st.lorebook.worldRules||[]).length>0){loreCtx='\n\n# 小说世界观设定\n'+buildLoreContext(st.lorebook,true)}if(loreCtx)sys=sys+loreCtx;if(sys)apiMsgs.push({role:'system',content:sys});
  for(var k=0;k<=ai;k++){var m=c.msgs[k];if(k===ai)continue;apiMsgs.push({role:m.role,content:Array.isArray(m.content)?m.content.map(function(p){return p.type==='text'?p.text:''}).join(' '):m.content})}
  streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;
  try{
    var body={model:s.modelName,messages:apiMsgs,temperature:s.temperature,stream:true};
    if(!s.maxUnlimited)body.max_tokens=s.maxTokens;
    var resp=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(body)});
    if(!resp.ok){var t=await resp.text(),me=t;try{me=JSON.parse(t).error?.message||t}catch(_){}throw new Error('HTTP '+resp.status+': '+me)}
    var reader=resp.body.getReader(),decoder=new TextDecoder(),buf='';
    while(true){var rv=await reader.read();if(rv.done)break;buf+=decoder.decode(rv.value,{stream:true});var lines=buf.split('\n');buf=lines.pop()||'';for(var ln of lines){ln=ln.trim();if(!ln||!ln.startsWith('data: '))continue;var d=ln.slice(6);if(d==='[DONE]')continue;try{var delta=JSON.parse(d).choices?.[0]?.delta?.content;if(delta){c.msgs[ai].content+=delta;c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;debUpdate(c.msgs[ai].content)}}catch(_){}}}
    if(_debTimer){clearTimeout(_debTimer);_debTimer=null}
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null}
    c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;
    save();updLastBubble(c.msgs[ai].content);
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(无响应)'}
  finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}
}
function editMsg(e,i){
  e.stopPropagation();
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m)return;
  var text=Array.isArray(m.content)?m.content.map(function(p){return p.type==='text'?p.text:''}).join(' '):m.content;
  var newText=prompt('编辑消息：',text);
  if(newText===null||newText===text)return;
  m.versions.push({content:newText,ts:Date.now()});
  m.vIdx=m.versions.length-1;
  m.content=newText;
  if(m.role==='assistant'){m.versions[m.vIdx].content=newText}
  save();renderAll();scrollBottom();
}
function copyMsg(e,i){
  e.stopPropagation();
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m)return;
  var text=Array.isArray(m.content)?m.content.map(function(p){return p.type==='text'?p.text:''}).join(' '):m.content;
  navigator.clipboard.writeText(text).then(function(){toast('已复制','success')});
}

function renderUser(m){if(Array.isArray(m.content)){var h='';for(var p of m.content){if(p.type==='text')h+=esc(p.text);else if(p.type==='image_url')h+='<br><img src="'+p.image_url.url+'" style="max-width:200px;max-height:200px;border-radius:6px;margin-top:4px">'}return h.replace(/\n/g,'<br>')}return esc(m.content)}
function renderMD(t){if(!t)return'';try{return marked.parse(t)}catch(e){return esc(t)}}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML.replace(/\n/g,'<br>')}

marked.setOptions({breaks:true,gfm:true});

// ===== MESSAGE ACTIONS =====
function delMsg(e,i){e.stopPropagation();var c=getActive();if(!c)return;c.msgs.splice(i,1);if(!c.msgs.length)c.title='新对话';save();renderAll();scrollBottom()}

// ===== SEND =====
function onInputKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}

async function sendMsg(){
  if(streaming)return;
  var content=userInput.value.trim(); if(!content)return;
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast('请先配置API','error');return}

  var c=getActive(); if(!c){newConv();c=getActive()}
  if(!c.msgs.length)c.title=content.slice(0,30)+(content.length>30?'...':'');

  // Build user msg
  if(attachs.length){
    var parts=[{type:'text',text:content}];
    for(var a of attachs){if(a.isImg)parts.push({type:'image_url',image_url:{url:'data:'+a.mime+';base64,'+a.data}});else parts.push({type:'text',text:'\n[附件: '+a.name+']\n'+a.data})}
    c.msgs.push({role:'user',content:parts,versions:[{content:parts,ts:Date.now()}],vIdx:0});
  }else{c.msgs.push({role:'user',content:content,versions:[{content:content,ts:Date.now()}],vIdx:0})}
  attachs=[]; renderAttachs();
  userInput.value=''; userInput.style.height='auto'; save(); renderAll(); scrollBottom();

  c.msgs.push({role:'assistant',content:'',versions:[{content:'',ts:Date.now()}],vIdx:0}); var ai=c.msgs.length-1; save(); renderAll();

  // Build API messages with memories
  var apiMsgs=[];
  var sys=s.systemPrompt||'';
  var memLines=[];
  for(var p of st.memories){for(var i of p.items)memLines.push('['+p.name+'] '+i.content)}
  if(memLines.length)sys=(sys?sys+'\n\n':'')+'# 长期记忆\n'+memLines.map(m=>'- '+m).join('\n');
  var loreCtx='';if(st.lorebook&&(st.lorebook.characters||[]).length+(st.lorebook.settings||[]).length+(st.lorebook.plotPoints||[]).length+(st.lorebook.worldRules||[]).length>0){loreCtx='\n\n# 小说世界观设定\n'+buildLoreContext(st.lorebook,true)}if(loreCtx)sys=sys+loreCtx;if(sys)apiMsgs.push({role:'system',content:sys});
  for(var m of c.msgs.slice(0,-1))apiMsgs.push({role:m.role,content:m.content});

  streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;
  try{
    var body={model:s.modelName,messages:apiMsgs,temperature:s.temperature,stream:true};
    if(!s.maxUnlimited)body.max_tokens=s.maxTokens;
    var resp=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(body)});
    if(!resp.ok){var t=await resp.text(),m=t;try{m=JSON.parse(t).error?.message||t}catch(_){}throw new Error('HTTP '+resp.status+': '+m)}
    var reader=resp.body.getReader(),decoder=new TextDecoder(),buf='';
    while(true){var rv=await reader.read();if(rv.done)break;buf+=decoder.decode(rv.value,{stream:true});var lines=buf.split('\n');buf=lines.pop()||'';for(var ln of lines){ln=ln.trim();if(!ln||!ln.startsWith('data: '))continue;var d=ln.slice(6);if(d==='[DONE]')continue;try{var delta=JSON.parse(d).choices?.[0]?.delta?.content;if(delta){c.msgs[ai].content+=delta;c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;debUpdate(c.msgs[ai].content)}}catch(_){}}}
    if(_debTimer){clearTimeout(_debTimer);_debTimer=null}
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null}
    c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;save();updLastBubble(c.msgs[ai].content);
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(无响应)'}
  finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}
}

function debUpdate(content){
  if(_debTimer)clearTimeout(_debTimer);
  _debTimer=setTimeout(function(){updLastBubble(content)},50);
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(function(){save()},800);
}

function updLastBubble(content){
  var bubbles=msgsEl.querySelectorAll('.msg-row.assistant .msg-bubble');
  var last=bubbles[bubbles.length-1]; if(!last)return;
  last.innerHTML=renderMD(content);
  var c=getActive(); if(!c)return;
  var idx=c.msgs.length-1;
  if(!last.querySelector('.msg-del-btn')){var db=document.createElement('button');db.className='msg-del-btn';db.textContent='✕';db.title='删除';db.onclick=function(e){delMsg(e,idx)};last.appendChild(db)}
  if(!last.querySelector('.msg-mem-btn')){var mb=document.createElement('button');mb.className='msg-mem-btn';mb.textContent='🧠';mb.title='添加至长期记忆';mb.onclick=function(e){msgToMem(e,idx)};last.appendChild(mb)}
  last.querySelectorAll('pre').forEach(function(pre){if(pre.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.textContent='复制';b.onclick=function(){navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent).then(function(){b.textContent='已复制!';setTimeout(function(){b.textContent='复制'},1500)})};pre.style.position='relative';pre.appendChild(b)});
  last.querySelectorAll('pre code').forEach(function(b){hljs.highlightElement(b)});
  scrollBottom();
}

// ===== MODAL =====
// ===== SETTINGS MODAL =====
function openSettings(){
  var s=st.settings;
  var sel=G('modalProvider'), cust=G('modalCustomUrl'), m=false;
  for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===s.apiBaseUrl){sel.value=s.apiBaseUrl;m=true;break}}
  if(!m&&s.apiBaseUrl){sel.value='__custom__';cust.value=s.apiBaseUrl;cust.style.display=''}
  else{sel.value=s.apiBaseUrl||'';cust.style.display='none'}
  G('modalApiKey').value=s.apiKey||'';
  G('modalModel').value=s.modelName||'';
  G('modalMaxTokens').value=s.maxTokens||4096;
  var ul=s.maxUnlimited!==false;
  G('modalUnlimited').checked=ul;
  G('modalMaxTokens').disabled=ul;
  G('modalTemp').value=s.temperature??0.7;
  G('modalSysPrompt').value=s.systemPrompt||'';
  G('modalGiteeToken').value=s.giteeToken||'';
  G('modalGiteeRepo').value=s.giteeRepo||'';
  G('modalGiteeBranch').value=s.giteeBranch||'main';
  G('modalGithubToken').value=s.githubToken||'';
  G('modalGithubRepo').value=s.githubRepo||'';
  G('modalGithubBranch').value=s.githubBranch||'main';
  G('settingsModal').classList.add('show');
}
function closeSettings(){G('settingsModal').classList.remove('show')}
function onModalProv(){
  var sel=G('modalProvider'); G('modalCustomUrl').style.display=sel.value==='__custom__'?'':'none';
  var map={'https://api.openai.com/v1':'gpt-4o','https://api.deepseek.com/v1':'deepseek-chat','https://api.moonshot.cn/v1':'moonshot-v1-8k','http://localhost:11434/v1':'llama3.2','https://openrouter.ai/api/v1':'openai/gpt-4o','https://api.anthropic.com/v1':'claude-3-5-sonnet-20241022','https://api.zhipuai.cn/v1':'glm-4-plus','https://dashscope.aliyuncs.com/compatible-mode/v1':'qwen-plus','https://api.siliconflow.cn/v1':'Qwen/Qwen2.5-7B-Instruct','https://api.together.xyz/v1':'meta-llama/Llama-3.3-70B-Instruct-Turbo','https://api.groq.com/openai/v1':'llama-3.3-70b-versatile','https://generativelanguage.googleapis.com/v1beta/openai':'gemini-2.0-flash','https://api.mistral.ai/v1':'mistral-large-latest'};
  var m=map[sel.value]; if(m&&!G('modalModel').value.trim()) G('modalModel').value=m;
}
function fillPreset(url,model){var s=G('modalProvider');for(var i=0;i<s.options.length;i++){if(s.options[i].value===url){s.value=url;onModalProv();G('modalModel').value=model;return}}s.value='__custom__';onModalProv();G('modalCustomUrl').value=url;G('modalModel').value=model}
function saveModalSettings(){
  var sv=G('modalProvider').value;
  st.settings.apiBaseUrl=sv==='__custom__'?G('modalCustomUrl').value.trim():sv;
  st.settings.apiKey=G('modalApiKey').value.trim();
  st.settings.modelName=G('modalModel').value.trim();
  st.settings.maxUnlimited=G('modalUnlimited').checked;
  st.settings.maxTokens=st.settings.maxUnlimited?4096:(parseInt(G('modalMaxTokens').value)||4096);
  st.settings.temperature=parseFloat(G('modalTemp').value)??0.7;
  st.settings.systemPrompt=G('modalSysPrompt').value.trim();
  st.settings.giteeToken=G('modalGiteeToken').value.trim();
  st.settings.giteeRepo=G('modalGiteeRepo').value.trim();
  st.settings.giteeBranch=G('modalGiteeBranch').value.trim()||'main';
  st.settings.githubToken=G('modalGithubToken').value.trim();
  st.settings.githubRepo=G('modalGithubRepo').value.trim();
  st.settings.githubBranch=G('modalGithubBranch').value.trim()||'main';
  save(); closeSettings(); renderAll(); toast('已保存','success');
}
async function fetchModalModels(){
  var sv=G('modalProvider').value, url=(sv==='__custom__'?G('modalCustomUrl').value:sv).replace(/\/+$/,'');
  var key=G('modalApiKey').value.trim();
  if(!url){toast('请选提供商','error');return} if(!key){toast('请填Key','error');return}
  try{
    var r=await fetch(url+'/models',{headers:{'Authorization':'Bearer '+key}});
    if(!r.ok)throw new Error((await r.json()).error?.message||'fail');
    var d=await r.json(), models=(d.data||[]).map(function(x){return x.id}).sort();
    if(!models.length){toast('无模型','error');return}
    G('modalModelList').innerHTML=models.map(function(x){return '<option value="'+x+'">'}).join('');
    st.settings.availModels=models; save(); renderMdlDrop(); toast(models.length+' 个模型','success');
  }catch(e){toast('失败: '+e.message,'error')}
}
document.addEventListener('DOMContentLoaded',function(){G('settingsModal').addEventListener('click',function(e){if(e.target===this)closeSettings()})});

document.addEventListener('DOMContentLoaded',function(){G('negModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});G('posModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')})});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){G('negModal').classList.remove('show');G('posModal').classList.remove('show');}if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();newConv()}});

// Init badges
updateRvBadge();

// ===== LOREBOOK EXTRACTION =====
var _loreData=null,_loreStats=null,_loreTab="characters",_rawTab="prompt";
var _pubTab="progress",_pubRawSub="prompt",_rawPrompt="",_rawResponse="",_rawParsed=null;
var _progressTimer=null,_progressStart=0;
function switchPubTab(t){_pubTab=t;var tabs=G("pubProgress").querySelectorAll(".pub-tab");for(var i=0;i<tabs.length;i++){var tb=tabs[i];var active=tb.dataset.pubtab===t;tb.style.background=active?"var(--hover)":"transparent";tb.style.color=active?"var(--text)":"var(--text-secondary)"}G("pubProgressView").style.display=t==="progress"?"":"none";G("pubRawView").style.display=t==="raw"?"":"none";if(t==="raw")renderPubRaw()}
function switchPubRawSub(s){_pubRawSub=s;var btns=G("pubRawView").querySelectorAll(".pub-raw-sub");for(var i=0;i<btns.length;i++){var b=btns[i];var isActive=(s==="prompt"&&b.textContent.indexOf("Prompt")>=0)||(s==="response"&&b.textContent.indexOf("响应")>=0)||(s==="parsed"&&b.textContent.indexOf("解析")>=0);b.style.background=isActive?"var(--accent)":"var(--hover)";b.style.color=isActive?"#fff":"var(--text-secondary)"}renderPubRaw()}
function renderPubRaw(){var el=G("pubRawContent");if(!el)return;if(_pubRawSub==="prompt")el.textContent=_rawPrompt||"(等待Prompt构建...)";else if(_pubRawSub==="response")el.textContent=_rawResponse||"(等待模型响应...)";else if(_pubRawSub==="parsed")el.textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):"(等待解析完成...)"}
function updateRawPrompt(){if(G("pubRawContent")&&_pubRawSub==="prompt")G("pubRawContent").textContent=_rawPrompt||""}
function updateRawResponse(){if(G("pubRawContent")&&_pubRawSub==="response")G("pubRawContent").textContent=_rawResponse||""}
function updateRawParsed(){if(G("pubRawContent")&&_pubRawSub==="parsed")G("pubRawContent").textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):""}

async function compressContext(){
  try{
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast("请先配置API","error");return}
  var conv=getActive();if(!conv||!conv.msgs.length){toast("当前对话为空","error");return}
  var compressBtn=G("compressBtn");if(compressBtn)compressBtn.disabled=true;
  showProgress("🗜️ Lorebook 世界观提取中...");
  updateProgress(2,"📊 扫描对话结构...");
  var pairs=[];
  for(var i=0;i<conv.msgs.length;i++){
    var m=conv.msgs[i];var content=typeof m.content==="string"?m.content:(Array.isArray(m.content)?m.content.map(function(p){return p.type==="text"?p.text:""}).join(" "):JSON.stringify(m.content));
    if(!content||!content.trim()||m.error)continue;
    if(m.role==="user"){var next=conv.msgs[i+1];var ai="";if(next&&next.role==="assistant"&&!next.error){ai=typeof next.content==="string"?next.content:(Array.isArray(next.content)?next.content.map(function(p){return p.type==="text"?p.text:""}).join(" "):JSON.stringify(next.content));i++}pairs.push({user:content,assistant:ai})}
  }
  if(!pairs.length){toast("无可压缩内容","error");if(compressBtn)compressBtn.disabled=false;return}
  var totalPairs=pairs.length;var origChars=0;for(var pi=0;pi<pairs.length;pi++)origChars+=pairs[pi].user.length+(pairs[pi].assistant?pairs[pi].assistant.length:0);
  var dl=G("pubDetail");if(dl){dl.innerHTML=""}
  function addLog(txt){var d=G("pubDetail");if(d){d.style.display="";d.innerHTML+=txt+"<br>";d.scrollTop=d.scrollHeight}}
  addLog("📊 共"+totalPairs+"段 · "+(origChars>1000?(origChars/1000).toFixed(1)+"K":origChars)+"字符");updateProgress(5,"📊 "+totalPairs+"段 · "+(origChars>1000?(origChars/1000).toFixed(1)+"K":origChars)+"字符");
  var lore={characters:[],settings:[],plotPoints:[],worldRules:[]};_loreData=lore;_rawPrompt="";_rawResponse="";_progressStart=Date.now();_progressTimer=setInterval(function(){var e=Math.floor((Date.now()-_progressStart)/1000);var s=G("pubStep");if(s&&s.textContent)s.textContent=s.textContent.replace(/\s*\d+s$/,"")+" "+e+"s"},1000);
  for(var pi=0;pi<pairs.length;pi++){
    var pair=pairs[pi];var pairNum=pi+1;var pctBase=5+Math.floor(85*pi/totalPairs);var pctNext=5+Math.floor(85*(pi+1)/totalPairs);
    updateProgress(pctBase,"📤 发送第"+pairNum+"/"+totalPairs+"段...");addLog("📤 第"+pairNum+"/"+totalPairs+"段 · 用户"+pair.user.length+"字"+(pair.assistant?", AI"+pair.assistant.length+"字":""));
    _rawPrompt="第"+pairNum+"/"+totalPairs+"段\n用户: "+pair.user+(pair.assistant?"\nAI: "+pair.assistant:"");updateRawPrompt();
    var knownCtx="";if(lore.characters.length>0){knownCtx="\n## 已建立的角色（需补充完善）\n";for(var kc=0;kc<lore.characters.length;kc++){var kch=lore.characters[kc];knownCtx+="- "+kch.name+(kch.alias?"（曾用称呼："+kch.alias+"）":"")+"\n"}}
    var chunkPrompt="你是一个小说世界观提取助手。从以下对话片段中提取所有世界观信息。\n\n要求：\n1. 尽可能全面、细致地提取，包括外貌细节、性格特点、人物关系、背景设定等\n2. 即使是前面已出现过的角色，每次提到新的特征、关系、背景都要提取出来\n3. 注意同一角色的不同称呼（本名、昵称、亲属称谓等），识别为同一人\n4. 描述要具体，不要用空泛的概括\n"+knownCtx+"\n严格输出JSON（不要markdown代码块）：\n{\n  \"characters\":[{\"name\":\"角色名\",\"alias\":\"别名/称号（多个称呼用逗号分隔）\",\"calledBy\":\"其他角色对该角色的称呼\",\"role\":\"主角/配角/反派/龙套\",\"gender\":\"性别\",\"age\":\"年龄\",\"appearance\":\"外貌（五官、发型、配饰、身材等）\",\"sexualFeatures\":\"性器官特征\",\"fetish\":\"性癖\",\"personality\":\"性格\",\"background\":\"背景故事\",\"relationships\":\"与其他角色关系\",\"sexPositions\":\"出现过的做爱姿势及次数\",\"arc\":\"角色心理转变\",\"notes\":\"补充\"}],\n  \"settings\":[{\"name\":\"场景/地点名\",\"type\":\"城市/建筑/自然/室内\",\"era\":\"时代背景\",\"description\":\"详细描述（环境、陈设、氛围细节）\",\"atmosphere\":\"氛围/基调\",\"significance\":\"叙事作用\",\"notes\":\"补充\"}],\n  \"plotPoints\":[{\"event\":\"事件描述\",\"chapter\":\"章节\",\"type\":\"主线/支线/情感/冲突\",\"status\":\"进行中/已解决\",\"significance\":\"对故事的重要性\",\"relatedChars\":\"涉及角色\",\"psychologicalChange\":\"角色心理转变\",\"notes\":\"补充\"}],\n  \"worldRules\":[{\"rule\":\"世界观规则\",\"category\":\"魔法/科技/社会/文化/政治\",\"scope\":\"适用范围\",\"details\":\"详细说明\",\"notes\":\"补充\"}]\n}\n\n对话片段：\n用户: "+pair.user+(pair.assistant?"\nAI: "+pair.assistant:"");
    _rawPrompt="第"+pairNum+"/"+totalPairs+"段 完整Prompt:\n"+chunkPrompt;updateRawPrompt();
    var bodyObj={model:s.modelName,messages:[{role:"system",content:"你是一个专业的小说世界观提取助手。请仔细阅读以下对话片段，从中提取所有世界观相关信息。要求全面、细致、不遗漏。"},{role:"user",content:chunkPrompt}],max_tokens:s.maxUnlimited?16384:(s.maxTokens||4096),temperature:0.3};
    _abortController=new AbortController();var reqStart=Date.now();var TIMEOUT_MS=600000;
    try{
      updateProgress(pctBase+Math.floor((pctNext-pctBase)/4),"⏳ 等待AI响应...");addLog("📡 发送请求 ("+JSON.stringify(bodyObj).length+"字节)...");
      var resp=await Promise.race([fetch(s.apiBaseUrl.replace(/\/+$/,"")+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.apiKey},body:JSON.stringify(bodyObj),signal:_abortController.signal}),new Promise(function(_,reject){setTimeout(function(){_abortController.abort();reject(new Error("请求超时(600s)"))},TIMEOUT_MS)})]);
      _abortController=null;var reqTime=Date.now()-reqStart;addLog("📡 HTTP "+resp.status+" ("+(reqTime/1000).toFixed(1)+"s)");
      if(!resp.ok){var errText=await resp.text();addLog("⚠️ API错误: "+errText.substring(0,200));throw new Error("API "+resp.status)}
      var data=await resp.json();var raw=data.choices&&data.choices[0]?data.choices[0].message.content:"";_rawResponse=raw;updateRawResponse();addLog("📥 接收: "+(raw?raw.length:0)+"字符");
      updateProgress(pctBase+Math.floor((pctNext-pctBase)/2),"🔍 解析JSON...");addLog("🔍 解析中...");
      var chunk=null;try{var jsonStr=raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();if(jsonStr.indexOf("{")>=0){jsonStr=jsonStr.substring(jsonStr.indexOf("{"));if(jsonStr.lastIndexOf("}")>=0)jsonStr=jsonStr.substring(0,jsonStr.lastIndexOf("}")+1)}chunk=JSON.parse(jsonStr)}catch(je){addLog("⚠️ JSON解析失败: "+je.message);chunk={characters:[],settings:[],plotPoints:[],worldRules:[]}}
      mergeLore(lore,chunk);addLog("✅ 提取: 👤"+(chunk.characters||[]).length+" 📍"+(chunk.settings||[]).length+" 📌"+(chunk.plotPoints||[]).length+" 🌍"+(chunk.worldRules||[]).length);
      _loreData=lore;_rawParsed=lore;updateRawParsed();updateLoreCards();
      updateProgress(pctNext,"✅ 第"+pairNum+"/"+totalPairs+"段完成");
    }catch(e){_abortController=null;addLog("❌ 第"+pairNum+"段失败: "+e.message);updateProgress(pctNext,"❌ 第"+pairNum+"段失败")}
  }
  var cC=lore.characters.length,cS=lore.settings.length,cP=lore.plotPoints.length,cR=lore.worldRules.length;var totalCards=cC+cS+cP+cR;
  if(_progressTimer){clearInterval(_progressTimer);_progressTimer=null}if(totalCards===0)throw new Error("未提取到任何内容");
  var statsStr="原文 "+origChars.toLocaleString()+" 字 →";if(cC)statsStr+="👤"+cC+" ";if(cS)statsStr+="📍"+cS+" ";if(cP)statsStr+="📌"+cP+" ";if(cR)statsStr+="🌍"+cR+" ";
  var statsObj={totalCards:totalCards,origChars:origChars,elapsed:Math.floor((Date.now()-_progressStart)/1000),str:statsStr};
  addLog("✅ 完成! 共"+totalCards+" 张卡片");updateProgress(100,"✅ "+statsStr.trim());
  _loreData=lore;_loreStats=statsObj;_rawParsed=lore;
  var pp=G("pubProgress");if(pp)pp.style.display="none";renderLoreModal(lore,statsObj);
  toast("✅ 提取 "+totalCards+" 张世界观卡片","success");
  }catch(e){var cb=G("compressBtn");if(cb)cb.disabled=false;var pp2=G("pubProgress");if(pp2)pp2.style.display="none";toast("❌ 提取失败: "+e.message,"error")}
}

function mergeLore(lore,chunk){if(!chunk||!chunk.characters)return;var cArr=chunk.characters||[],sArr=chunk.settings||[],pArr=chunk.plotPoints||[],wArr=chunk.worldRules||[];for(var i=0;i<cArr.length;i++){var nc=cArr[i];if(!nc.name)continue;var found=null;for(var j=0;j<lore.characters.length;j++){var ec=lore.characters[j];if(ec.name===nc.name||(nc.alias&&nc.alias.indexOf(ec.name)>=0)||(ec.alias&&ec.alias.indexOf(nc.name)>=0)){found=ec;break}}if(found){for(var k in nc){if(k!=="name"&&nc[k]&&(!found[k]||found[k]===nc[k]||nc[k].length>found[k].length))found[k]=nc[k]}if(nc.name!==found.name&&found.alias&&found.alias.indexOf(nc.name)<0)found.alias+=","+nc.name}else{lore.characters.push(nc)}}for(var i=0;i<sArr.length;i++){var ns=sArr[i];if(!ns.name)continue;var found=null;for(var j=0;j<lore.settings.length;j++){if(lore.settings[j].name===ns.name){found=j;break}}if(found!==null){for(var k in ns){if(k!=="name"&&ns[k]&&(!lore.settings[found][k]||ns[k].length>lore.settings[found][k].length))lore.settings[found][k]=ns[k]}}else{lore.settings.push(ns)}}for(var i=0;i<pArr.length;i++){var np=pArr[i];if(!np.event)continue;var found=null;for(var j=0;j<lore.plotPoints.length;j++){if(lore.plotPoints[j].event===np.event){found=j;break}}if(found!==null){for(var k in np){if(k!=="event"&&np[k]&&(!lore.plotPoints[found][k]||np[k].length>lore.plotPoints[found][k].length))lore.plotPoints[found][k]=np[k]}}else{lore.plotPoints.push(np)}}for(var i=0;i<wArr.length;i++){var nw=wArr[i];if(!nw.rule)continue;var found=null;for(var j=0;j<lore.worldRules.length;j++){if(lore.worldRules[j].rule===nw.rule){found=j;break}}if(found!==null){for(var k in nw){if(k!=="rule"&&nw[k]&&(!lore.worldRules[found][k]||nw[k].length>lore.worldRules[found][k].length))lore.worldRules[found][k]=nw[k]}}else{lore.worldRules.push(nw)}}}
function updateLoreCards(){var modal=G("compressModal");if(modal&&modal.style.display==="flex"){G("loreCount_c").textContent="("+((_loreData.characters||[]).length)+")";G("loreCount_s").textContent="("+((_loreData.settings||[]).length)+")";G("loreCount_p").textContent="("+((_loreData.plotPoints||[]).length)+")";G("loreCount_w").textContent="("+((_loreData.worldRules||[]).length)+")";renderLoreTab()}}
var keyMap={name:"角色名",alias:"别称",calledBy:"其他称呼",role:"角色定位",gender:"性别",age:"年龄",appearance:"外貌",sexualFeatures:"性器官特征",fetish:"性癖",personality:"性格",background:"背景",relationships:"关系",sexPositions:"做爱姿势",arc:"心理转变",notes:"备注",event:"事件",chapter:"章节",type:"类型",status:"状态",significance:"重要性",relatedChars:"相关角色",psychologicalChange:"心理转变",description:"描述",atmosphere:"氛围",era:"时代",rule:"规则",category:"类别",scope:"范围",details:"详情"};
function buildLoreContext(lore,detail){lore=lore||st.lorebook||_loreData||{};var parts=[];if(lore.characters&&lore.characters.length){parts.push(detail?"## 角色详情":"## 角色");for(var i=0;i<lore.characters.length;i++){var c3=lore.characters[i];if(detail){var lines=[];lines.push("- **"+c3.name+"**"+(c3.alias?"（"+c3.alias+"）":"")+(c3.role?" · "+c3.role:"")+(c3.gender?" · "+c3.gender:"")+(c3.age?" · "+c3.age+"岁":""));if(c3.appearance)lines.push("  外貌："+c3.appearance);if(c3.personality)lines.push("  性格："+c3.personality);if(c3.background)lines.push("  背景："+c3.background);if(c3.relationships)lines.push("  关系："+c3.relationships);if(c3.calledBy)lines.push("  称呼："+c3.calledBy);if(c3.fetish)lines.push("  性癖："+c3.fetish);if(c3.sexualFeatures)lines.push("  性特征："+c3.sexualFeatures);if(c3.sexPositions)lines.push("  性姿势："+c3.sexPositions);if(c3.arc)lines.push("  心理转变："+c3.arc);if(c3.notes)lines.push("  备注："+c3.notes);parts.push(lines.join("\n"));}else{parts.push("- "+c3.name+(c3.role?" ("+c3.role+")":"")+(c3.personality?": "+c3.personality:""))}}}if(lore.settings&&lore.settings.length){parts.push(detail?"## 场景详情":"## 场景");for(var i=0;i<lore.settings.length;i++){var s2=lore.settings[i];if(detail)parts.push("- **"+s2.name+"**"+(s2.type?" ["+s2.type+"]":"")+(s2.era?" · "+s2.era:"")+"\n  "+(s2.description||"")+(s2.atmosphere?" · 氛围："+s2.atmosphere:"")+(s2.significance?" · 作用："+s2.significance:""));else parts.push("- "+s2.name+(s2.type?" ["+s2.type+"]":"")+(s2.description?": "+s2.description.substring(0,80):""))}}if(lore.plotPoints&&lore.plotPoints.length){parts.push(detail?"## 情节节点":"## 情节节点");for(var i=0;i<lore.plotPoints.length;i++){var p2=lore.plotPoints[i];if(detail)parts.push("- **"+p2.event+"**"+(p2.chapter?" ["+p2.chapter+"]":"")+(p2.type?" · "+p2.type:"")+(p2.status?" · "+p2.status:"")+"\n  重要性："+(p2.significance||"")+(p2.relatedChars?"\n  角色："+p2.relatedChars:"")+(p2.psychologicalChange?"\n  心理转变："+p2.psychologicalChange:""));else parts.push("- "+p2.event+(p2.status?" ["+p2.status+"]":""))}}if(lore.worldRules&&lore.worldRules.length){parts.push(detail?"## 世界观规则":"## 世界观规则");for(var i=0;i<lore.worldRules.length;i++){var w=lore.worldRules[i];if(detail)parts.push("- **"+w.rule+"**"+(w.category?" ["+w.category+"]":"")+(w.scope?" · 范围："+w.scope:"")+"\n  "+(w.details||""));else parts.push("- "+w.rule+(w.category?" ["+w.category+"]":"")+(w.details?": "+w.details.substring(0,60):""))}}return parts.join("\n\n");}
function buildContinuationContext(){var parts=["# 续写上下文\n请严格基于以下设定续写，保持人物性格、情节、文风一致。\n"];var lore=st.lorebook||_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};var hasLore=lore.characters.length+lore.settings.length+lore.plotPoints.length+lore.worldRules.length>0;if(hasLore)parts.push("---\n## 📖 小说世界观\n"+buildLoreContext(lore,true));if(st.gvEntries&&st.gvEntries.length){var gv=["---\n## ✅ 优秀描写参考（文风、用词习惯）"];var n=0;for(var i=0;i<st.gvEntries.length;i++){var e=st.gvEntries[i];if(e.aiAnalysis&&e.aiAnalysis.trim()&&e.aiAnalysis.indexOf("(失败")<0){gv.push("- "+e.aiAnalysis);n++;if(n>=10)break}}if(n>0)parts.push(gv.join("\n"));}if(st.rvEntries&&st.rvEntries.length){var rv=["---\n## ⚠️ 应避免的写法"];var n=0;for(var i=0;i<st.rvEntries.length;i++){var e=st.rvEntries[i];if(e.aiAnalysis&&e.aiAnalysis.trim()&&e.aiAnalysis.indexOf("(失败")<0){rv.push("- "+e.aiAnalysis);n++;if(n>=10)break}}if(n>0)parts.push(rv.join("\n"));}parts.push("---\n## 🎯 续写要求\n1. 严格遵循以上角色设定、情节走向和世界观规则\n2. 模仿参考的优秀描写风格和用词习惯\n3. 避免负向规则中列出的写法\n4. 自然衔接前文内容，保持叙述连贯\n5. 角色对话和内心活动要符合其性格设定");return parts.join("\n\n");}
function useContinuationContext(){var ctx=buildContinuationContext();userInput.value=ctx;userInput.style.height="auto";userInput.style.height=Math.min(userInput.scrollHeight,250)+"px";userInput.focus();toast("续写上下文已加载到发送框，可编辑后发送","success")}
function closeCompress(){var m=G("compressModal");if(m)m.style.display="none";var cb=G("compressBtn");if(cb)cb.disabled=false}
function renderLoreTab(){var el=G("loreTabContent");if(!el)return;var tab=_loreTab||"characters";var data=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};var items,html="";if(tab==="characters"){items=data.characters||[];if(!items.length){el.innerHTML='<div style="color:var(--text-secondary);padding:20px;text-align:center">暂无角色数据</div>';return}html='<div style="display:flex;flex-direction:column;gap:10px">';for(var i=0;i<items.length;i++){var c=items[i];html+='<div style="background:var(--hover);border-radius:8px;padding:12px">';html+='<div style="font-weight:700;font-size:14px;margin-bottom:6px">👤 '+esc(c.name||"未知")+(c.alias?' <span style="color:var(--text-secondary);font-size:11px">('+esc(c.alias)+")</span>":"")+"</div>";var fields=["role","gender","age","appearance","sexualFeatures","fetish","personality","background","relationships","calledBy","sexPositions","arc","notes"];for(var fi=0;fi<fields.length;fi++){var f=fields[fi];var v=c[f];if(v&&v.trim())html+='<div style="font-size:11px;margin:3px 0"><span style="color:var(--text-secondary);font-weight:600">'+(keyMap[f]||f)+"：</span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="settings"){items=data.settings||[];if(!items.length){el.innerHTML='<div style="color:var(--text-secondary);padding:20px;text-align:center">暂无场景数据</div>';return}html='<div style="display:flex;flex-direction:column;gap:10px">';for(var i=0;i<items.length;i++){var s=items[i];html+='<div style="background:var(--hover);border-radius:8px;padding:12px">';html+='<div style="font-weight:700;font-size:14px;margin-bottom:6px">📍 '+esc(s.name||"未知")+(s.type?' <span style="color:var(--text-secondary);font-size:11px">['+esc(s.type)+"]</span>":"")+"</div>";var sfields=["description","atmosphere","era","significance","notes"];for(var fi=0;fi<sfields.length;fi++){var f=sfields[fi];var v=s[f];if(v&&v.trim())html+='<div style="font-size:11px;margin:3px 0"><span style="color:var(--text-secondary);font-weight:600">'+(keyMap[f]||f)+"：</span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="plots"){items=data.plotPoints||[];if(!items.length){el.innerHTML='<div style="color:var(--text-secondary);padding:20px;text-align:center">暂无情节数据</div>';return}html='<div style="display:flex;flex-direction:column;gap:10px">';for(var i=0;i<items.length;i++){var p=items[i];html+='<div style="background:var(--hover);border-radius:8px;padding:12px">';html+='<div style="font-weight:700;font-size:14px;margin-bottom:6px">📌 '+esc(p.event||"未知事件")+(p.chapter?' <span style="color:var(--text-secondary);font-size:11px">['+esc(p.chapter)+"]</span>":"")+"</div>";var pfields=["type","status","significance","relatedChars","psychologicalChange","notes"];for(var fi=0;fi<pfields.length;fi++){var f=pfields[fi];var v=p[f];if(v&&v.trim())html+='<div style="font-size:11px;margin:3px 0"><span style="color:var(--text-secondary);font-weight:600">'+(keyMap[f]||f)+"：</span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="world"){items=data.worldRules||[];if(!items.length){el.innerHTML='<div style="color:var(--text-secondary);padding:20px;text-align:center">暂无世界观数据</div>';return}html='<div style="display:flex;flex-direction:column;gap:10px">';for(var i=0;i<items.length;i++){var w=items[i];html+='<div style="background:var(--hover);border-radius:8px;padding:12px">';html+='<div style="font-weight:700;font-size:14px;margin-bottom:6px">🌍 '+esc(w.rule||"未知规则")+(w.category?' <span style="color:var(--text-secondary);font-size:11px">['+esc(w.category)+"]</span>":"")+"</div>";var wfields=["scope","details","notes"];for(var fi=0;fi<wfields.length;fi++){var f=wfields[fi];var v=w[f];if(v&&v.trim())html+='<div style="font-size:11px;margin:3px 0"><span style="color:var(--text-secondary);font-weight:600">'+(keyMap[f]||f)+"：</span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}el.innerHTML=html}
function switchLoreTab(tab){_loreTab=tab;var m=G("compressModal");if(!m)return;var btns=m.querySelectorAll(".lore-tab");for(var i=0;i<btns.length;i++){var b=btns[i];var active=b.dataset.loretab===tab;b.style.background=active?"var(--accent)":"var(--hover)";b.style.color=active?"#fff":"var(--text-secondary)"}renderLoreTab()}
function renderLoreModal(lore,stats){if(!lore)lore=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};if(!stats)stats=_loreStats||{};var modal=G("compressModal");if(!modal){var d=document.createElement("div");d.id="compressModal";d.className="modal-overlay";d.innerHTML='<div class="modal" style="max-width:720px;max-height:85vh;overflow-y:auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:17px;font-weight:700">📖 世界观 Lorebook · 提取结果</div><div style="display:flex;gap:6px"><button class="btn-sm" onclick="openRawModal()" style="padding:5px 10px;font-size:11px;background:var(--hover);color:var(--text);border:none;border-radius:6px;cursor:pointer">📄 原始数据</button><button class="btn-sm" onclick="saveLorebook()" style="padding:5px 10px;font-size:11px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer">💾 保存</button><button class="btn-sm" onclick="useCompressed()" style="padding:5px 10px;font-size:11px;background:#10a37f;color:#fff;border:none;border-radius:6px;cursor:pointer">✍️ 续写</button><button class="btn-sm" onclick="closeCompress()" style="padding:5px 10px;font-size:11px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer">✕ 关闭</button></div></div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">卡片: '+stats.totalCards+' · 原始: '+(stats.origChars||0).toLocaleString()+'字 · 耗时: '+(stats.elapsed||0)+'s</div><div style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px"><button class="lore-tab active" data-loretab="characters" onclick="switchLoreTab(\x27characters\x27)" style="flex:1;padding:6px 8px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:11px;border-radius:6px">👤 角色 <span id="loreCount_c">('+(lore.characters||[]).length+')</span></button><button class="lore-tab" data-loretab="settings" onclick="switchLoreTab(\x27settings\x27)" style="flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px">📍 场景 <span id="loreCount_s">('+(lore.settings||[]).length+')</span></button><button class="lore-tab" data-loretab="plots" onclick="switchLoreTab(\x27plots\x27)" style="flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px">📌 情节 <span id="loreCount_p">('+(lore.plotPoints||[]).length+')</span></button><button class="lore-tab" data-loretab="world" onclick="switchLoreTab(\x27world\x27)" style="flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px">🌍 世界观 <span id="loreCount_w">('+(lore.worldRules||[]).length+')</span></button></div><div id="loreTabContent" style="max-height:50vh;overflow-y:auto;font-size:12px;line-height:1.6"></div></div>';document.body.appendChild(d);d.style.display="flex";_loreTab="characters";renderLoreTab();}else{modal.style.display="flex";G("loreCount_c").textContent="("+(lore.characters||[]).length+")";G("loreCount_s").textContent="("+(lore.settings||[]).length+")";G("loreCount_p").textContent="("+(lore.plotPoints||[]).length+")";G("loreCount_w").textContent="("+(lore.worldRules||[]).length+")";_loreTab="characters";switchLoreTab("characters");}}
function saveLorebook(){if(!_loreData){toast("无数据可保存","error");return}st.lorebook=_loreData;save();toast("✅ 世界观已保存","success")}
function useCompressed(){var ctx=buildContinuationContext();userInput.value=ctx;userInput.style.height="auto";userInput.style.height=Math.min(userInput.scrollHeight,250)+"px";closeCompress();userInput.focus();toast("续写上下文已加载到发送框，可编辑后发送","success")}
function openRawModal(){var cm=G("compressModal");if(cm)cm.style.display="none";var m=G("rawModal");if(!m)return;m.style.display="flex";_rawTab="prompt";switchRawTab("prompt")}
function closeRawModal(){var m=G("rawModal");if(m)m.style.display="none";var cm=G("compressModal");if(cm)cm.style.display="flex"}
function switchRawTab(tab){_rawTab=tab;var m=G("rawModal");if(!m)return;var btns=m.querySelectorAll("[data-rawtab]");for(var i=0;i<btns.length;i++){var b=btns[i];var active=b.dataset.rawtab===tab;b.style.background=active?"var(--accent)":"var(--hover)";b.style.color=active?"#fff":"var(--text-secondary)"}var el=G("rawContent");if(!el)return;if(tab==="prompt")el.textContent=_rawPrompt||"(等待Prompt构建...)";else if(tab==="response")el.textContent=_rawResponse||"(等待模型响应...)";else if(tab==="parsed")el.textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):"(等待解析完成...)"}
function copyRawData(){var el=G("rawContent");if(!el)return;var text=el.textContent||"";if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){toast("已复制","success")}).catch(function(){toast("复制失败","error")})}else{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast("已复制","success")}}
