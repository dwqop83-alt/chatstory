
'use strict';
const SK = 'chatstory_v2';
let st = { version:0, convs:[], activeCid:null, settings:{ apiBaseUrl:'', apiKey:'', modelName:'', maxTokens:4096, maxUnlimited:true, temperature:0.7, systemPrompt:'', availModels:[], giteeToken:'', giteeRepo:'', giteeBranch:'main', githubToken:'', githubRepo:'', githubBranch:'main' }, rvEntries:[], rvReasons:[], gvEntries:[], gvReasons:[], qps:[], memories:[], theme:'dark' };
let streaming = false;
let attachs = [];
let _debTimer = null, _saveTimer = null;let _progressTimer=null,_progressStart=0;

const G = id => document.getElementById(id);
const msgsEl = G('msgs'), convListEl = G('convList'), userInput = G('userInput');
const sendBtn = G('sendBtn'), mdlBadge = G('mdlBadge'), chatTitle = G('chatTitle');

function save() { localStorage.setItem(SK, JSON.stringify(st)); }
function load() { try { var r = localStorage.getItem(SK); if(r) st = JSON.parse(r); } catch(e){} st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0; st.rvEntries=st.rvEntries||[]; st.rvReasons=st.rvReasons||[]; st.gvEntries=st.gvEntries||[]; st.gvReasons=st.gvReasons||[]; st.qps=st.qps||[]; st.memories=st.memories||[]; if(!st.settings.giteeToken)st.settings.giteeToken='b6df2c768b72835f8fad74d052509656'; if(!st.settings.giteeRepo)st.settings.giteeRepo='middle000/story_-project'; if(!st.settings.giteeBranch)st.settings.giteeBranch='main'; }

load(); applyTheme(); renderAll();

userInput.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,150)+'px'});

function toggleTheme(){st.theme=st.theme==='dark'?'light':'dark';applyTheme();save()}
function applyTheme(){if(st.theme==='dark'){document.body.classList.add('dark');G('themeBtn').textContent='鈽€锔?}else{document.body.classList.remove('dark');G('themeBtn').textContent='馃寵'}}

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
  var c = {id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'鏂板璇?,msgs:[],createdAt:Date.now()};
  st.convs.unshift(c); st.activeCid=c.id; save(); renderAll(); userInput.focus();
}
function getActive(){return st.convs.find(c=>c.id===st.activeCid)||null}
function delConv(id,e){e.stopPropagation();if(!confirm('鍒犻櫎瀵硅瘽锛?))return;st.convs=st.convs.filter(c=>c.id!==id);if(st.activeCid===id)st.activeCid=st.convs[0]?.id||null;save();renderAll()}
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
  sub.innerHTML = '<div class="ctx-menu-sub-item" onclick="addToMemNew()">锛?鏂板缓椤圭洰</div>' +
    st.memories.map(function(p){return '<div class="ctx-menu-sub-item" onclick="addToMem(\''+p.id+'\')">馃搧 '+esc(p.name)+'</div>'}).join('');
}

function addToMem(pid){
  var p = st.memories.find(function(x){return x.id===pid});
  if(!p||!_memText) return;
  p.items.push({id:Date.now().toString(36),content:_memText,date:new Date().toISOString()});
  save(); toast('宸叉坊鍔犲埌 '+p.name,'success');
  G('ctxMenu').classList.remove('show'); _memText='';
}
function addToMemNew(){
  if(!_memText) return;
  var name = prompt('鏂板缓璁板繂椤圭洰鍚嶇О锛?);
  if(!name) return;
  var p = {id:Date.now().toString(36),name:name,items:[{id:Date.now().toString(36),content:_memText,date:new Date().toISOString()}]};
  st.memories.push(p); save(); toast('宸插垱寤哄苟娣诲姞','success');
  G('ctxMenu').classList.remove('show'); _memText='';
}

function saveConvToMem(){
  var c = getActive();
  if(!c||c.msgs.length===0){toast('鏃犲璇濆唴瀹?,'error');return}
  var text = c.msgs.map(function(m){
    var ct = Array.isArray(m.content) ? m.content.map(function(p){return p.type==='text'?p.text:''}).join(' ') : m.content;
    return '['+(m.role==='user'?'鐢ㄦ埛':'AI')+']: '+ct;
  }).join('\n\n');
  if(!text.trim()){toast('鏃犲唴瀹?,'error');return}
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

function clearConv(){var c=getActive();if(!c||c.msgs.length===0)return;if(!confirm('娓呯┖瀵硅瘽锛?))return;c.msgs=[];c.title='鏂板璇?;save();renderAll()}

// ===== QUICK PROMPTS =====
var qpEditingId=null;
function saveQP(){
  var t=G('qpTitle').value.trim()||'鏈懡鍚?, c=G('qpContent').value.trim();
  if(!c){toast('璇疯緭鍏ュ唴瀹?,'error');return}
  if(qpEditingId){
    var p=st.qps.find(p=>p.id===qpEditingId); if(p){p.title=t;p.content=c}
    qpEditingId=null; G('qpSaveBtn').textContent='锛?鏂板缓骞朵繚瀛?; G('qpCancelBtn').style.display='none';
  }else{
    st.qps.unshift({id:Date.now().toString(36),title:t,content:c});
  }
  G('qpTitle').value=''; G('qpContent').value=''; save(); renderQPs(); toast('宸蹭繚瀛?,'success');
}
function editQP(id){var p=st.qps.find(p=>p.id===id);if(!p)return;qpEditingId=id;G('qpTitle').value=p.title;G('qpContent').value=p.content;G('qpSaveBtn').textContent='鉁?鏇存柊';G('qpCancelBtn').style.display='';G('qpContent').focus()}
function cancelEditQP(){qpEditingId=null;G('qpTitle').value='';G('qpContent').value='';G('qpSaveBtn').textContent='锛?鏂板缓骞朵繚瀛?;G('qpCancelBtn').style.display='none'}
function delQP(id){st.qps=st.qps.filter(p=>p.id!==id);save();renderQPs()}
function useQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;userInput.focus();userInput.style.height='auto';userInput.style.height=Math.min(userInput.scrollHeight,150)+'px'}}
function sendQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;sendMsg()}}
function renderQPs(){
  var el=G('qpList');
  if(!st.qps.length){el.innerHTML='<div style="padding:8px;font-size:11px;color:var(--text-secondary);text-align:center">鏆傛棤</div>';return}
  el.innerHTML=st.qps.map(p=>'<div class="qp-item" data-qpid="'+p.id+'" title="鐐瑰嚮濉叆"><span class="qp-title">'+esc(p.title)+'</span><span class="qp-acts"><button class="qp-act send" data-send="'+p.id+'" title="绮樿创骞跺彂閫?>鈻?/button><button class="qp-act edit" data-edit="'+p.id+'" title="缂栬緫">鉁?/button><button class="qp-act del" data-del="'+p.id+'" title="鍒犻櫎">鉁?/button></span></div>').join('');
  if(!el._b){el._b=true;el.addEventListener('click',function(e){var item=e.target.closest('.qp-item');if(!item)return;var id=item.dataset.qpid;if(e.target.closest('.qp-act.send'))sendQP(id);else if(e.target.closest('.qp-act.edit'))editQP(id);else if(e.target.closest('.qp-act.del'))delQP(id);else useQP(id)})}
}

// ===== REVIEW (浣庣骇浣滃) =====
function renderRvReasons(){G('rvReason').innerHTML='<option value="">-- 閫夋嫨鍘熷洜 --</option>'+st.rvReasons.map(r=>'<option>'+esc(r)+'</option>').join('')}
function onRvReason(){}
function addRvReason(){var v=G('rvNewReason').value.trim();if(!v)return;if(!st.rvReasons.includes(v))st.rvReasons.push(v);save();renderRvReasons();G('rvReason').value=v;G('rvNewReason').value=''}function delRvReason(i){st.rvReasons.splice(i,1);save();renderRvReasons();toast('???','success')}function delGvReason(i){st.gvReasons.splice(i,1);save();renderGvReasons();toast('???','success')}
function renderRVs(){
  var el=G('rvList');
  if(!st.rvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">鏆傛棤璁板綍</div>';return}
  el.innerHTML=[...st.rvEntries].reverse().map(e=>'<div class="review-entry"><button class="review-entry-del" onclick="delRv(\''+e.id+'\')">鉁?/button><span class="review-entry-num">#'+e.num+'</span> <span class="review-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="review-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="review-entry-reason"><strong>鍘熷洜锛?/strong>'+esc(e.reason)+'</div><div class="review-entry-ai"><strong>馃 AI鍒嗘瀽锛?/strong> <span class="rv-actions"><button class="rv-act" onclick="redoRvAI(\''+e.id+'\')" title="閲嶆柊鍒嗘瀽">馃攧</button><button class="rv-act" onclick="editRvAI(\''+e.id+'\')" title="缂栬緫">鉁忥笍</button></span><br><span id="rvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}
function delRv(id){if(!confirm('鍒犻櫎锛?))return;st.rvEntries=st.rvEntries.filter(e=>e.id!==id);st.rvEntries.forEach((e,i)=>e.num=i+1);save();renderRVs();updateRvBadge()}
function updateRvBadge(){var n=st.rvEntries.length;var b=G('rvBadge');b.textContent=n;b.style.display=n>0?'':'none'}
async function submitReview(){
  var text=G('rvText').value.trim(); if(!text){toast('璇峰～鍐呭','error');return}
  var reason=G('rvReason').value||G('rvNewReason').value.trim();
  if(!reason){toast('璇峰～鍘熷洜','error');return}
  if(reason&&!st.rvReasons.includes(reason)){st.rvReasons.push(reason)}
  var btn=G('btnRvAdd'); btn.disabled=true; btn.textContent='鈴?鍒嗘瀽涓?..';
  var ai='';
  try{ai=await callAI(text,reason)}catch(e){ai='(澶辫触: '+e.message+')'}
  st.rvEntries.push({id:Date.now().toString(36),num:st.rvEntries.length+1,text,reason,date:new Date().toISOString(),aiAnalysis:ai});
  G('rvText').value=''; G('rvReason').value=''; save(); renderRVs(); updateRvBadge(); renderRvReasons(); renderRvReasons();
  btn.disabled=false; btn.textContent='馃搶 璁板綍骞跺垎鏋?; toast('宸茶褰?,'success');
}
async function callAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('鏈厤缃瓵PI');
  var def='鏍囪鍐呭锛?""{text}"""\n闂锛歿reason}\n鎬荤粨涓€鏉¤礋鍚戣鍒欙紙涓嶅簲鍋氱殑浜嬶級锛屽彧杈撳嚭瑙勫垯';
  var up=(s.reviewUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'浣犳槸瀹℃牳鍔╂墜'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(鏃犵粨鏋?';
}
function editReviewPrompt(){
  var def='鏍囪鍐呭锛?""{text}"""\n闂锛歿reason}\n鎬荤粨涓€鏉¤礋鍚戣鍒欙紙涓嶅簲鍋氱殑浜嬶級锛屽彧杈撳嚭瑙勫垯';
  var current=st.settings.reviewUserPrompt||def;
  var v=prompt('缂栬緫浣庣骇浣滃鍒嗘瀽 Prompt锛坽text}鍜寋reason}浼氳鏇挎崲锛?',current);
  if(v===null)return;
  if(!v.trim()||v===def){st.settings.reviewUserPrompt=''}else{st.settings.reviewUserPrompt=v}
  save(); toast('Prompt宸叉洿鏂?,'success');
}
function editGoodPrompt(){
  var def='浼樼鎻忓啓锛?""{text}"""\n鏍囩锛歿reason}\n鎬荤粨涓€鏉℃鍚戣鍒欙紙搴旇鏁堜豢鐨勬妧宸э級锛屽彧杈撳嚭瑙勫垯';
  var current=st.settings.goodUserPrompt||def;
  var v=prompt('缂栬緫楂樼骇浣滃鍒嗘瀽 Prompt锛坽text}鍜寋reason}浼氳鏇挎崲锛?',current);
  if(v===null)return;
  if(!v.trim()||v===def){st.settings.goodUserPrompt=''}else{st.settings.goodUserPrompt=v}
  save(); toast('Prompt宸叉洿鏂?,'success');
}
async function redoRvAI(id){
  var e=st.rvEntries.find(function(x){return x.id===id}); if(!e)return;
  var el=document.getElementById('rvai-'+id); if(!el)return;
  el.textContent='鈴?閲嶆柊鍒嗘瀽涓?..';
  try{var ai=await callAI(e.text,e.reason); e.aiAnalysis=ai; save(); el.textContent=ai; toast('宸查噸鏂板垎鏋?,'success')}
  catch(err){el.textContent=e.aiAnalysis; toast('鍒嗘瀽澶辫触','error')}
}
function editRvAI(id){
  var e=st.rvEntries.find(function(x){return x.id===id}); if(!e)return;
  var v=prompt('缂栬緫AI鍒嗘瀽缁撴灉:',e.aiAnalysis); if(v===null)return;
  e.aiAnalysis=v; save();
  var el=document.getElementById('rvai-'+id); if(el) el.textContent=v;
  toast('宸叉洿鏂?,'success');
}
async function redoGvAI(id){
  var e=st.gvEntries.find(function(x){return x.id===id}); if(!e)return;
  var el=document.getElementById('gvai-'+id); if(!el)return;
  el.textContent='鈴?閲嶆柊鍒嗘瀽涓?..';
  try{var ai=await callGoodAI(e.text,e.reason); e.aiAnalysis=ai; save(); el.textContent=ai; toast('宸查噸鏂板垎鏋?,'success')}
  catch(err){el.textContent=e.aiAnalysis; toast('鍒嗘瀽澶辫触','error')}
}
function editGvAI(id){
  var e=st.gvEntries.find(function(x){return x.id===id}); if(!e)return;
  var v=prompt('缂栬緫AI鍒嗘瀽缁撴灉:',e.aiAnalysis); if(v===null)return;
  e.aiAnalysis=v; save();
  var el=document.getElementById('gvai-'+id); if(el) el.textContent=v;
  toast('宸叉洿鏂?,'success');
}
function genNegPrompt(){
  if(!st.rvEntries.length){toast('鏃犺褰?,'error');return}
  var seen=new Set(), rules=[];
  for(var e of st.rvEntries){if(e.aiAnalysis&&!e.aiAnalysis.startsWith('(澶辫触')){if(!seen.has(e.aiAnalysis)){seen.add(e.aiAnalysis);rules.push(e.aiAnalysis)}}}
  var p='# 璐熷悜鎻愮ず璇峔n鍩轰簬'+st.rvEntries.length+'鏉¤褰昞n\n搴旈伩鍏嶏細\n\n'+rules.map(r=>'- '+r).join('\n')+'\n\n## 鎽樿\n'+st.rvEntries.map(e=>'- #'+e.num+' ['+e.reason+'] '+e.text.slice(0,60).replace(/\n/g,' ')).join('\n');
  G('negPromptText').textContent=p; G('negModal').classList.add('show');
}
function copyNeg(){navigator.clipboard.writeText(G('negPromptText').textContent).then(()=>toast('宸插鍒?,'success'))}

// ===== GOOD (楂樼骇浣滃) =====
function renderGvReasons(){G('gvReason').innerHTML='<option value="">-- 閫夋嫨鏍囩 --</option>'+st.gvReasons.map(r=>'<option>'+esc(r)+'</option>').join('')}
function onGvReason(){}
function addGvReason(){var v=G('gvNewReason').value.trim();if(!v)return;if(!st.gvReasons.includes(v))st.gvReasons.push(v);save();renderGvReasons();G('gvReason').value=v;G('gvNewReason').value=''}
function renderGVs(){
  var el=G('gvList');
  if(!st.gvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">鏆傛棤璁板綍</div>';return}
  el.innerHTML=[...st.gvEntries].reverse().map(e=>'<div class="good-entry"><button class="good-entry-del" onclick="delGv(\''+e.id+'\')">鉁?/button><span class="good-entry-num">#'+e.num+'</span> <span class="good-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="good-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="good-entry-reason"><strong>鏍囩锛?/strong>'+esc(e.reason)+'</div><div class="good-entry-ai"><strong>馃 AI鍒嗘瀽锛?/strong> <span class="rv-actions"><button class="rv-act" onclick="redoGvAI(\''+e.id+'\')" title="閲嶆柊鍒嗘瀽">馃攧</button><button class="rv-act" onclick="editGvAI(\''+e.id+'\')" title="缂栬緫">鉁忥笍</button></span><br><span id="gvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}
function delGv(id){if(!confirm('鍒犻櫎锛?))return;st.gvEntries=st.gvEntries.filter(e=>e.id!==id);st.gvEntries.forEach((e,i)=>e.num=i+1);save();renderGVs();updateGvBadge()}
function updateGvBadge(){var n=st.gvEntries.length;var b=G('gvBadge');b.textContent=n;b.style.display=n>0?'':'none'}
async function submitGood(){
  var text=G('gvText').value.trim(); if(!text){toast('璇峰～鍐呭','error');return}
  var reason=G('gvReason').value||G('gvNewReason').value.trim();
  if(!reason){toast('璇峰～鏍囩','error');return}
  if(reason&&!st.gvReasons.includes(reason)){st.gvReasons.push(reason)}
  var btn=G('btnGvAdd'); btn.disabled=true; btn.textContent='鈴?鍒嗘瀽涓?..';
  var ai='';
  try{ai=await callGoodAI(text,reason)}catch(e){ai='(澶辫触: '+e.message+')'}
  st.gvEntries.push({id:Date.now().toString(36),num:st.gvEntries.length+1,text,reason,date:new Date().toISOString(),aiAnalysis:ai});
  G('gvText').value=''; G('gvReason').value=''; save(); renderGVs(); updateGvBadge(); renderGvReasons(); renderGvReasons();
  btn.disabled=false; btn.textContent='馃搶 璁板綍骞跺垎鏋?; toast('宸茶褰?,'success');
}
async function callGoodAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('鏈厤缃瓵PI');
  var def='浼樼鎻忓啓锛?""{text}"""\n鏍囩锛歿reason}\n鎬荤粨涓€鏉℃鍚戣鍒欙紙搴旇鏁堜豢鐨勬妧宸э級锛屽彧杈撳嚭瑙勫垯';
  var up=(s.goodUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'浣犳槸鍐欎綔鐐硅瘎鍔╂墜'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(鏃犵粨鏋?';
}
function genPosPrompt(){
  if(!st.gvEntries.length){toast('鏃犺褰?,'error');return}
  var seen=new Set(), rules=[];
  for(var e of st.gvEntries){if(e.aiAnalysis&&!e.aiAnalysis.startsWith('(澶辫触')){if(!seen.has(e.aiAnalysis)){seen.add(e.aiAnalysis);rules.push(e.aiAnalysis)}}}
  var p='# 姝ｅ悜鎻愮ず璇峔n鍩轰簬'+st.gvEntries.length+'鏉¤褰昞n\n搴旀晥浠匡細\n\n'+rules.map(r=>'- '+r).join('\n')+'\n\n## 鎽樿\n'+st.gvEntries.map(e=>'- #'+e.num+' ['+e.reason+'] '+e.text.slice(0,60).replace(/\n/g,' ')).join('\n');
  G('posPromptText').textContent=p; G('posModal').classList.add('show');
}
function copyPos(){navigator.clipboard.writeText(G('posPromptText').textContent).then(()=>toast('宸插鍒?,'success'))}
function flagToGood(){
  if(!_memText) return;
  G('gvText').value = _memText;
  jumpTo('good');
}
// ===== LONG-TERM MEMORY =====
function addMemProj(){
  var n=G('memProjName').value.trim(); if(!n){toast('璇疯緭鍏ュ悕绉?,'error');return}
  st.memories.push({id:Date.now().toString(36),name:n,items:[]}); G('memProjName').value=''; save(); renderMems(); toast('宸插垱寤?,'success');
}
function delMemProj(id){if(!confirm('鍒犻櫎椤圭洰鍙婃墍鏈夎蹇嗭紵'))return;st.memories=st.memories.filter(p=>p.id!==id);save();renderMems()}
function toggleMemProj(id){G('membody-'+id).classList.toggle('open');G('memhdr-'+id).classList.toggle('collapsed')}
function addMemItem(pid){var inp=G('meminput-'+pid);var c=inp.value.trim();if(!c)return;var p=st.memories.find(p=>p.id===pid);if(!p)return;p.items.push({id:Date.now().toString(36),content:c,date:new Date().toISOString()});inp.value='';save();renderMems();G('membody-'+pid).classList.add('open');G('memhdr-'+pid).classList.remove('collapsed')}
function delMemItem(pid,iid){var p=st.memories.find(p=>p.id===pid);if(!p)return;p.items=p.items.filter(i=>i.id!==iid);save();renderMems();G('membody-'+pid).classList.add('open')}
function renderMems(){
  var el=G('memList');
  if(!st.memories.length){el.innerHTML='<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-secondary)">鏆傛棤</div>';return}
  el.innerHTML=st.memories.map(p=>'<div class="mem-proj"><div class="mem-proj-hdr" id="memhdr-'+p.id+'" onclick="toggleMemProj(\''+p.id+'\')"><span>馃搧 '+esc(p.name)+' ('+p.items.length+')</span><span style="display:flex;align-items:center;gap:6px"><span class="arr">鈻?/span><button style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px" onclick="event.stopPropagation();delMemProj(\''+p.id+'\')">鉁?/button></span></div><div class="mem-proj-body" id="membody-'+p.id+'">'+(p.items.length?p.items.map(i=>'<div class="mem-item"><span class="mem-item-txt">'+esc(i.content)+'</span><button class="mem-item-del" onclick="delMemItem(\''+p.id+'\',\''+i.id+'\')">鉁?/button></div>').join(''):'<div style="padding:8px;font-size:11px;color:var(--text-secondary)">鏆傛棤璁板繂</div>')+'<div class="mem-add-row"><input type="text" id="meminput-'+p.id+'" placeholder="娣诲姞璁板繂..." onkeydown="if(event.key===\'Enter\')addMemItem(\''+p.id+'\')"><button class="btn-sm" onclick="addMemItem(\''+p.id+'\')" style="padding:5px 10px;font-size:11px">+</button></div></div></div>').join('');
}

// ===== MODEL DROPDOWN =====
function toggleMdlDrop(e){e.stopPropagation();G('mdlDrop').classList.toggle('show')}
function selChatModel(m){st.settings.modelName=m;save();renderAll();G('mdlDrop').classList.remove('show')}
function renderMdlDrop(){
  var d=G('mdlDrop'), ms=st.settings.availModels||[], cur=st.settings.modelName;
  if(!ms.length){d.innerHTML='<div class="mdl-drop-item" style="color:var(--text-secondary)">鏃犳ā鍨?- 鍦ㄨ缃腑鑾峰彇</div>';return}
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
  pv.style.display='flex';pv.innerHTML=attachs.map((a,i)=>'<div class="attach-item'+(a.isImg?'':' file')+'">'+(a.isImg?'<img src="data:'+a.mime+';base64,'+a.data+'">':'<span>'+a.name.slice(0,16)+'</span>')+'<button class="attach-remove" onclick="rmAttach('+i+')">鉁?/button></div>').join('');
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
  if(!s.githubToken||!s.githubRepo){toast('璇峰厛閰嶇疆 GitHub Token 鍜屼粨搴?,'error');return}
  var msg=prompt('鍙戝竷璇存槑:','鍙戝竷鏇存柊 '+new Date().toLocaleString('zh-CN'));
  if(msg===null)return;
  
  showProgress('馃殌 姝ｅ湪鍙戝竷鍒颁簯绔?..');
  
  try{
    updateProgress(15,'馃摝 鍑嗗鏂囦欢...');
    await new Promise(function(r){setTimeout(r,400)});
    updateProgress(40,'馃摛 涓婁紶鏂囦欢涓?..');
    
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
      update(100,'鉁?宸插彂甯?v'+st.version+' 路 '+d.pushed+' 鏂囦欢 路 '+elapsed+'s');
      await new Promise(function(r){setTimeout(r,1500)});
      hideProgress(1500);
      toast('鉁?宸插彂甯?v'+st.version+' ('+elapsed+'s)','success');
    }else{
      var detail=d.results?d.results.filter(function(x){return x.status==='error'}).map(function(x){return x.file}).join(', '):'';
      update(100,'鉂?澶辫触: '+d.failed+'/'+(d.pushed+d.failed)+' 鏂囦欢鍑洪敊');
      document.getElementById('pubFill').style.background='#e05555';
      await new Promise(function(r){setTimeout(r,2500)});
      hideProgress(1500);
      toast('鉂?鍙戝竷澶辫触: '+detail,'error');
    }
  }catch(e){
    update(100,'鉂?缃戠粶閿欒: '+e.message);
    document.getElementById('pubFill').style.background='#e05555';
    await new Promise(function(r){setTimeout(r,2500)});
    hideProgress(1500);
    toast('鉂?'+e.message,'error');
  }
}
// ===== GITEE SYNC =====
async function syncPull(){if(!confirm('宸ョ▼涓嬭浇锛氫粠 Gitee 鎷夊彇鏈€鏂颁唬鐮侊紵')) return;
  try{
    var r=await fetch('/api/git/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:st.settings.giteeToken,repo:st.settings.giteeRepo,branch:st.settings.giteeBranch})});
    var d=await r.json();
    if(d.pull&&d.pull.ok){toast('宸ョ▼涓嬭浇鎴愬姛','success');setTimeout(function(){location.reload()},500)}
    else toast('涓嬭浇澶辫触: '+(d.pull?d.pull.error:d.error),'error');
  }catch(e){toast('涓嬭浇澶辫触: '+e.message,'error')}
}
async function syncPush(){
  var msg=prompt('鎻愪氦璇存槑:','Sync from ChatStory');
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
    if(d.push&&d.push.ok) toast('宸ョ▼涓婁紶鎴愬姛','success');
    else if(d.commit&&d.commit.output&&d.commit.output.includes('nothing to commit')) toast('娌℃湁鍙樻洿','success');
    else toast('涓婁紶澶辫触 push='+d.push.ok+' commit='+d.commit.ok,'error');
  }catch(e){toast('涓婁紶澶辫触: '+e.message,'error')}
}
async function syncDataUpload(){
  if(!confirm('搴旂敤涓婁紶锛氬皢褰撳墠鎵€鏈夋暟鎹紙瀵硅瘽銆佽蹇嗐€佽缃瓑锛変笂浼犲埌 Gitee锛?)) return;
  try{
    var r=await fetch('/api/data/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:st,version:1,date:new Date().toISOString()})});
    var d=await r.json();
    if(d.saved) toast('搴旂敤鏁版嵁宸蹭繚瀛?,'success');
    else toast('淇濆瓨澶辫触','error');
  }catch(e){toast('涓婁紶澶辫触: '+e.message,'error')}
}
async function syncDataDownload(){
  if(!confirm('搴旂敤涓嬭浇锛氫粠 Gitee 鎭㈠鏁版嵁锛熻繖灏嗚鐩栧綋鍓嶆暟鎹紒')) return;
  try{
    var r=await fetch('/api/data/download');
    var d=await r.json();
    if(d.error){toast(d.error,'error');return}
    if(d.data&&d.data.convs){
      st=d.data;
      save(); renderAll();
      toast('搴旂敤鏁版嵁宸叉仮澶?,'success');
    }else{toast('鏃犲彲鐢ㄦ暟鎹?,'error')}
  }catch(e){toast('涓嬭浇澶辫触: '+e.message,'error')}
}

// ===== CLOUD BACKUP =====
var _backupConvIds = [];
function showBackupConvModal(){
  if(!st.convs||!st.convs.length){doCloudExport();return}
  var html='<div class="backup-conv-select-all"><input type="checkbox" onchange="toggleAllBackupConvs(this)"> 鍏ㄩ€?/ 鍙栨秷鍏ㄩ€?/div>';
  for(var i=0;i<st.convs.length;i++){
    var cn=st.convs[i]; var title=cn.msgs&&cn.msgs[0]?cn.msgs[0].content.slice(0,40):'绌哄璇?;
    html+='<label class="backup-conv-item"><input type="checkbox" value="'+cn.id+'"> '+esc(title)+' ('+(cn.msgs?cn.msgs.length:0)+'鏉?</label>';
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
    el=document.createElement('div');el.id='pubProgress';el.className='pub-progress';
    el.innerHTML='<div class="pub-progress-text" id="pubTitle"></div><div class="pub-tabs" style="display:flex;gap:2px;margin:8px 0 4px"><button class="pub-tab active" data-pubtab="progress" onclick="switchPubTab(\'progress\')" style="flex:1;padding:4px 8px;border:none;background:var(--hover);color:var(--text);cursor:pointer;font-size:11px;border-radius:6px 6px 0 0">馃搳 杩涘害</button><button class="pub-tab" data-pubtab="raw" onclick="switchPubTab(\'raw\')" style="flex:1;padding:4px 8px;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px 6px 0 0">馃搫 鍘熷鏁版嵁</button></div><div id="pubProgressView"><div class="pub-progress-bar"><div class="pub-progress-fill" id="pubFill"></div></div><div class="pub-progress-step" id="pubStep"></div><div class="pub-progress-time" id="pubElapsed" style="font-size:10px;color:var(--text-secondary);margin-top:2px"></div><div class="pub-progress-detail" id="pubDetail" style="display:none;max-height:160px;overflow-y:auto;text-align:left;font-size:10px;color:var(--text-secondary);background:var(--hover);border-radius:8px;padding:8px 12px;margin-top:8px;font-family:monospace;line-height:1.5"></div></div><div id="pubRawView" style="display:none"><div style="display:flex;gap:2px;margin-bottom:6px"><button class="pub-raw-sub active" onclick="switchPubRawSub(\'prompt\')" style="flex:1;padding:3px 6px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:10px;border-radius:4px">馃摛 Prompt</button><button class="pub-raw-sub" onclick="switchPubRawSub(\'response\')" style="flex:1;padding:3px 6px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:10px;border-radius:4px">馃摜 鍝嶅簲</button><button class="pub-raw-sub" onclick="switchPubRawSub(\'parsed\')" style="flex:1;padding:3px 6px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:10px;border-radius:4px">馃搳 瑙ｆ瀽</button></div><pre id="pubRawContent" style="max-height:200px;overflow-y:auto;background:var(--hover);border-radius:8px;padding:10px;font-family:Consolas,monospace;font-size:10px;white-space:pre-wrap;word-break:break-all;line-height:1.4;color:var(--text);margin:0"></pre></div><button id="pubCancelBtn" onclick="cancelProgress()" style="margin-top:12px;padding:6px 20px;background:#555;color:#ccc;border:none;border-radius:6px;cursor:pointer;font-size:12px">鉁?鍙栨秷</button>';_pubTab='progress';_pubRawSub='prompt';switchPubTab('progress');_rawPrompt='';_rawResponse='';_rawParsed=null;;_progressStart=Date.now();if(_progressTimer)clearInterval(_progressTimer);_progressTimer=setInterval(function(){var e=G('pubElapsed');if(e){var s=Math.floor((Date.now()-_progressStart)/1000);e.textContent='鈴?'+s+'s'}},1000);
}
function updateProgress(pct,step){
  var f=G('pubFill');if(f)f.style.width=pct+'%';
  var s=G('pubStep');if(s)s.textContent=step;
}
function hideProgress(delay){if(_progressTimer){clearInterval(_progressTimer);_progressTimer=null}
  setTimeout(function(){var el=G('pubProgress');if(el)el.style.display='none'},delay||1500);
}

var _pubTab="progress";var _pubRawSub="prompt";var _rawPrompt="";var _rawResponse="";var _rawParsed=null;
function switchPubTab(t){_pubTab=t;var tabs=G("pubProgress").querySelectorAll(".pub-tab");for(var i=0;i<tabs.length;i++){var tb=tabs[i];var active=tb.dataset.pubtab===t;tb.classList.toggle("active",active);tb.style.background=active?"var(--hover)":"transparent";tb.style.color=active?"var(--text)":"var(--text-secondary)"};G("pubProgressView").style.display=t==="progress"?"":"none";G("pubRawView").style.display=t==="raw"?"":"none";if(t==="raw")renderPubRaw()}
function switchPubRawSub(s){_pubRawSub=s;var btns=G("pubRawView").querySelectorAll(".pub-raw-sub");for(var i=0;i<btns.length;i++){var b=btns[i];var isActive=(s==="prompt"&&b.textContent.includes("Prompt"))||(s==="response"&&b.textContent.includes("鍝嶅簲"))||(s==="parsed"&&b.textContent.includes("瑙ｆ瀽"));b.style.background=isActive?"var(--accent)":"var(--hover)";b.style.color=isActive?"#fff":"var(--text-secondary)"};renderPubRaw()}
function renderPubRaw(){var el=G("pubRawContent");if(!el)return;if(_pubRawSub==="prompt")el.textContent=_rawPrompt||"(绛夊緟Prompt鏋勫缓...)";else if(_pubRawSub==="response")el.textContent=_rawResponse||"(绛夊緟妯″瀷鍝嶅簲...)";else if(_pubRawSub==="parsed")el.textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):"(绛夊緟瑙ｆ瀽瀹屾垚...)"}
function updateRawPrompt(){if(G("pubRawContent")&&_pubRawSub==="prompt")G("pubRawContent").textContent=_rawPrompt||""}
function updateRawResponse(){if(G("pubRawContent")&&_pubRawSub==="response")G("pubRawContent").textContent=_rawResponse||""}
function updateRawParsed(){if(G("pubRawContent")&&_pubRawSub==="parsed")G("pubRawContent").textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):""}

async function doCloudExport(){
  var boxes=G('backupConvList').querySelectorAll('input[type=checkbox]:checked');
  _backupConvIds=[];
  for(var i=0;i<boxes.length;i++) _backupConvIds.push(boxes[i].value);
  closeBackupConvModal();
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('璇峰厛閰嶇疆 Gitee Token 鍜屼粨搴?,'error');return}
  var sts=G('backupStatus');
  showProgress('鈽侊笍 姝ｅ湪澶囦唤鑷充簯绔?..');
  updateProgress(10,'鈴?鍑嗗鏁版嵁...');
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
    updateProgress(30,'鈴?涓婁紶鏁版嵁...');
    _abortController=new AbortController();
    var toId=setTimeout(function(){_abortController.abort()},30000);
    var r=await fetch('/api/data/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:_abortController.signal});
    clearTimeout(toId);
    var result=await r.json();
    if(result.error)throw new Error(result.error);
    updateProgress(70,'鈴?鎺ㄩ€佸埌 Gitee...');
    await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',message:'Backup: '+new Date().toLocaleString('zh-CN'),token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    updateProgress(100,'鉁?澶囦唤瀹屾垚锛?+data.conversations.length+'涓璇?);
    var url='https://gitee.com/'+s.giteeRepo+'/blob/'+(s.giteeBranch||'main')+'/app-data.json';
    setTimeout(function(){alert('鉁?澶囦唤鎴愬姛锛乗n\n鏂囦欢鍦板潃锛歕n'+url)},800);
    sts.textContent='鉁?宸插浠?('+data.conversations.length+'瀵硅瘽) '+new Date().toLocaleString('zh-CN');
    toast('鉁?宸插浠借嚦浜戠','success');
  }catch(e){
    updateProgress(100,'鉂?澶辫触: '+e.message);
    G('pubFill').style.background='#e05555';
    sts.textContent='鉂?澶辫触: '+e.message;
    _abortController=null;
    toast('澶囦唤澶辫触','error');
  }
  _abortController=null;
  hideProgress(2000);
}

var _abortController=null;
function cancelProgress(){
  if(_abortController){_abortController.abort();_abortController=null;}
  var el=G('pubProgress');if(el)el.style.display='none';
  toast('宸插彇娑?,'info');
}

async function cloudImport(){
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('璇峰厛閰嶇疆 Gitee Token 鍜屼粨搴?,'error');return}
  var sts=G('backupStatus');
  showProgress('鈽侊笍 姝ｅ湪浠庝簯绔仮澶?..');
  updateProgress(15,'鈴?鎷夊彇鏁版嵁...');
  try{
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},30000);
    await fetch('/api/git/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    clearTimeout(timeoutId);
    updateProgress(40,'鈴?涓嬭浇鏁版嵁...');
    var r=await fetch('/api/data/download',{signal:_abortController.signal});
    var data=await r.json();
    if(data.error)throw new Error(data.error);
    if(!data.version){
      updateProgress(100,'鉂?浜戠鏆傛棤澶囦唤鏁版嵁');
      sts.textContent='鉂?浜戠鏆傛棤澶囦唤鏁版嵁';
      hideProgress(2000);
      return;
    }
    updateProgress(60,'鈴?鍚堝苟鏁版嵁...');
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
    var msg='鉁?宸叉仮澶?'+merged+'鏉?;
    if(convRestored>0)msg+=' + '+convRestored+'涓璇?;
    updateProgress(100,msg);
    sts.textContent=msg;
    toast(msg,'success');
    renderQPs();renderRVs();updateRvBadge();renderRvReasons();
    renderGVs();updateGvBadge();renderGvReasons();renderMems();renderSidebar();
  }catch(e){
    updateProgress(100,'鉂?澶辫触: '+e.message);
    G('pubFill').style.background='#e05555';
    sts.textContent='鉂?澶辫触: '+e.message;
    toast('鎭㈠澶辫触','error');
  }
  _abortController=null;
  hideProgress(2000);
}

// ===== BACKUP (淇℃伅澶囦唤) =====
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
  toast('宸插鍑?,'success');
}
function importData(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      var data = JSON.parse(ev.target.result);
      if(!data.version){toast('鏃犳晥鐨勫浠芥枃浠?,'error');return}
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
      toast('瀵煎叆瀹屾垚锛屽悎骞?'+merged+' 鏉?,'success');
    }catch(err){toast('瑙ｆ瀽澶辫触: '+err.message,'error')}
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
function renderTokenInfo(){var conv=getActive();var info=calcTokens(conv);var pct=info.ctx>0?Math.min(100,Math.round(info.used/info.ctx*100)):0;var cls=pct>80?'high':pct>50?'mid':'low';var usedK=info.used>1000?(info.used/1000).toFixed(1)+'K':info.used;var ctxK=(info.ctx/1000).toFixed(0)+'K';var leftK=info.left>1000?(info.left/1000).toFixed(0)+'K':info.left;G('tokenInfo').innerHTML=usedK+'/'+ctxK+' <span style="font-size:10px">鍓╀綑'+leftK+'</span><span class="bar-bg"><span class="bar-fill '+cls+'" style="width:'+pct+'%"></span></span>'}

// ===== RENDER =====
function renderAll(){renderSidebar();renderChat();renderHeader();renderMdlDrop();updateRvBadge();updateGvBadge();try{renderTokenInfo()}catch(e){}}
function renderSidebar(){convListEl.innerHTML=st.convs.map(c=>'<div class="conv-item'+(c.id===st.activeCid?' active':'')+'" onclick="selConv(\''+c.id+'\')"><span class="conv-title">'+esc(c.title)+'</span><button class="conv-del" onclick="delConv(\''+c.id+'\',event)">鉁?/button></div>').join('')}
function renderHeader(){mdlBadge.textContent=(st.settings.modelName||'鏈厤缃?)+' 鈻?;var c=getActive();chatTitle.textContent=c?c.title:'鏂板璇?}
function renderChat(){
  var c=getActive();
  if(!c||c.msgs.length===0){msgsEl.innerHTML='<div class="empty-chat"><div class="logo">馃挰</div><h2>ChatStory</h2><p>灞曞紑宸︿晶璁剧疆閰嶇疆API</p></div>';return}
  msgsEl.innerHTML=c.msgs.map(function(m,i){
    var hasVers=m.versions&&m.versions.length>1;
    var verHtml=hasVers?'<div class="ver-switch"><button onclick="prevVer('+i+')" '+(m.vIdx===0?'disabled':'')+'>鈼€</button><span>#'+(m.vIdx+1)+'/'+m.versions.length+'</span><button onclick="nextVer('+i+')" '+(m.vIdx>=m.versions.length-1?'disabled':'')+'>鈻?/button></div>':'';
    var actions='<div class="msg-actions">'+
      (m.role==='user'?'<button class="msg-act redo" onclick="redoMsg(event,'+i+')" title="閲嶆柊鍥炵瓟">馃攧</button>':'<button class="msg-act redo" onclick="redoMsg(event,'+i+')" title="閲嶆柊鍥炵瓟">馃攧</button>')+
      '<button class="msg-act edit" onclick="editMsg(event,'+i+')" title="缂栬緫">鉁忥笍</button>'+
      '<button class="msg-act copy" onclick="copyMsg(event,'+i+')" title="澶嶅埗">馃搵</button>'+
      '</div>';
    return'<div class="msg-row '+m.role+'"><div><div class="msg-bubble"><button class="msg-del-btn" onclick="delMsg(event,'+i+')">鉁?/button><button class="msg-mem-btn" onclick="msgToMem(event,'+i+')" title="娣诲姞鑷抽暱鏈熻蹇?>馃</button>'+(m.role==='user'?renderUser(m):renderMD(m.content))+'</div>'+(m.error?'<div class="msg-error">鈿狅笍 '+esc(m.error)+'</div>':'')+verHtml+actions+'</div></div>'
  }).join('');
  msgsEl.querySelectorAll('pre').forEach(function(pre){if(pre.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.textContent='澶嶅埗';b.onclick=function(){navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent).then(function(){b.textContent='宸插鍒?';setTimeout(function(){b.textContent='澶嶅埗'},1500)})};pre.style.position='relative';pre.appendChild(b)});
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
    if(!prev||prev.role!=='user'){toast('鏃犳硶鎵惧埌瀵瑰簲闂','error');return}
    m.versions.push({content:'',ts:Date.now()});
    m.vIdx=m.versions.length-1;
    m.content='';
    save();renderAll();scrollBottom();
    try{regenerateResponse(i)}catch(e){toast('閲嶆柊鍥炵瓟澶辫触: '+e.message,'error')}
  }
}
async function regenerateResponse(ai){
  var c=getActive();if(!c)return;
  var s=st.settings;
  var apiMsgs=[];
  var sys=s.systemPrompt||'';
  var memLines=[];
  for(var p of st.memories){for(var j of p.items)memLines.push('['+p.name+'] '+j.content)}
  if(memLines.length)sys=(sys?sys+'\n\n':'')+'# 闀挎湡璁板繂\n'+memLines.map(function(m){return'- '+m}).join('\n');
  if(sys)apiMsgs.push({role:'system',content:sys});
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
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(鏃犲搷搴?'}
  finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}
}
function editMsg(e,i){
  e.stopPropagation();
  var c=getActive();if(!c)return;
  var m=c.msgs[i];if(!m)return;
  var text=Array.isArray(m.content)?m.content.map(function(p){return p.type==='text'?p.text:''}).join(' '):m.content;
  var newText=prompt('缂栬緫娑堟伅锛?,text);
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
  navigator.clipboard.writeText(text).then(function(){toast('宸插鍒?,'success')});
}

function renderUser(m){if(Array.isArray(m.content)){var h='';for(var p of m.content){if(p.type==='text')h+=esc(p.text);else if(p.type==='image_url')h+='<br><img src="'+p.image_url.url+'" style="max-width:200px;max-height:200px;border-radius:6px;margin-top:4px">'}return h.replace(/\n/g,'<br>')}return esc(m.content)}
function renderMD(t){if(!t)return'';try{return marked.parse(t)}catch(e){return esc(t)}}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML.replace(/\n/g,'<br>')}

marked.setOptions({breaks:true,gfm:true});

// ===== MESSAGE ACTIONS =====
function delMsg(e,i){e.stopPropagation();var c=getActive();if(!c)return;c.msgs.splice(i,1);if(!c.msgs.length)c.title='鏂板璇?;save();renderAll();scrollBottom()}

// ===== SEND =====
function onInputKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}

async function sendMsg(){
  if(streaming)return;
  var content=userInput.value.trim(); if(!content)return;
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast('璇峰厛閰嶇疆API','error');return}

  var c=getActive(); if(!c){newConv();c=getActive()}
  if(!c.msgs.length)c.title=content.slice(0,30)+(content.length>30?'...':'');

  // Build user msg
  if(attachs.length){
    var parts=[{type:'text',text:content}];
    for(var a of attachs){if(a.isImg)parts.push({type:'image_url',image_url:{url:'data:'+a.mime+';base64,'+a.data}});else parts.push({type:'text',text:'\n[闄勪欢: '+a.name+']\n'+a.data})}
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
  if(memLines.length)sys=(sys?sys+'\n\n':'')+'# 闀挎湡璁板繂\n'+memLines.map(m=>'- '+m).join('\n');
  if(sys)apiMsgs.push({role:'system',content:sys});
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
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(鏃犲搷搴?'}
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
  if(!last.querySelector('.msg-del-btn')){var db=document.createElement('button');db.className='msg-del-btn';db.textContent='鉁?;db.title='鍒犻櫎';db.onclick=function(e){delMsg(e,idx)};last.appendChild(db)}
  if(!last.querySelector('.msg-mem-btn')){var mb=document.createElement('button');mb.className='msg-mem-btn';mb.textContent='馃';mb.title='娣诲姞鑷抽暱鏈熻蹇?;mb.onclick=function(e){msgToMem(e,idx)};last.appendChild(mb)}
  last.querySelectorAll('pre').forEach(function(pre){if(pre.querySelector('.copy-btn'))return;var b=document.createElement('button');b.className='copy-btn';b.textContent='澶嶅埗';b.onclick=function(){navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent).then(function(){b.textContent='宸插鍒?';setTimeout(function(){b.textContent='澶嶅埗'},1500)})};pre.style.position='relative';pre.appendChild(b)});
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
  save(); closeSettings(); renderAll(); toast('宸蹭繚瀛?,'success');
}
async function fetchModalModels(){
  var sv=G('modalProvider').value, url=(sv==='__custom__'?G('modalCustomUrl').value:sv).replace(/\/+$/,'');
  var key=G('modalApiKey').value.trim();
  if(!url){toast('璇烽€夋彁渚涘晢','error');return} if(!key){toast('璇峰～Key','error');return}
  try{
    var r=await fetch(url+'/models',{headers:{'Authorization':'Bearer '+key}});
    if(!r.ok)throw new Error((await r.json()).error?.message||'fail');
    var d=await r.json(), models=(d.data||[]).map(function(x){return x.id}).sort();
    if(!models.length){toast('鏃犳ā鍨?,'error');return}
    G('modalModelList').innerHTML=models.map(function(x){return '<option value="'+x+'">'}).join('');
    st.settings.availModels=models; save(); renderMdlDrop(); toast(models.length+' 涓ā鍨?,'success');
  }catch(e){toast('澶辫触: '+e.message,'error')}
}
G('settingsModal').addEventListener('click',function(e){if(e.target===this)closeSettings()});

G('negModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});G('posModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){G('negModal').classList.remove('show');G('posModal').classList.remove('show');}if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();newConv()}});



var _rawTab="prompt";var _loreTab="characters";var _loreData=null;var _loreStats=null;

function closeCompress(){var m=G("compressModal");if(m)m.style.display="none";var cb=G("compressBtn");if(cb)cb.disabled=false}
function esc(s){if(!s)return"";var d=document.createElement("div");d.textContent=s;return d.innerHTML}

var keyMap={name:"瑙掕壊鍚?,alias:"鍒О",calledBy:"鍏朵粬绉板懠",role:"瑙掕壊瀹氫綅",gender:"鎬у埆",age:"骞撮緞",appearance:"澶栬矊",sexualFeatures:"鎬у櫒瀹樼壒寰?,fetish:"鎬х櫀",personality:"鎬ф牸",background:"鑳屾櫙",relationships:"鍏崇郴",sexPositions:"鍋氱埍濮垮娍",arc:"蹇冪悊杞彉",notes:"澶囨敞",event:"浜嬩欢",chapter:"绔犺妭",type:"绫诲瀷",status:"鐘舵€?,significance:"閲嶈鎬?,relatedChars:"鐩稿叧瑙掕壊",psychologicalChange:"蹇冪悊杞彉",description:"鎻忚堪",atmosphere:"姘涘洿",era:"鏃朵唬",rule:"瑙勫垯",category:"绫诲埆",scope:"鑼冨洿",details:"璇︽儏"};

function renderLoreTab(){var el=G("loreTabContent");if(!el)return;var tab=_loreTab||"characters";var data=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};var items,html="";if(tab==="characters"){items=data.characters||[];if(!items.length){el.innerHTML="<div style=\"color:var(--text-secondary);padding:20px;text-align:center\">鏆傛棤瑙掕壊鏁版嵁</div>";return}html="<div style=\"display:flex;flex-direction:column;gap:10px\">";for(var i=0;i<items.length;i++){var c=items[i];html+="<div style=\"background:var(--hover);border-radius:8px;padding:12px\">";html+="<div style=\"font-weight:700;font-size:14px;margin-bottom:6px\">馃懁 "+esc(c.name||"鏈煡")+(c.alias?" <span style=\"color:var(--text-secondary);font-size:11px\">("+esc(c.alias)+")</span>":"")+"</div>";var fields=["role","gender","age","appearance","sexualFeatures","fetish","personality","background","relationships","calledBy","sexPositions","arc","notes"];for(var fi=0;fi<fields.length;fi++){var f=fields[fi];var v=c[f];if(v&&v.trim())html+="<div style=\"font-size:11px;margin:3px 0\"><span style=\"color:var(--text-secondary);font-weight:600\">"+(keyMap[f]||f)+"锛?/span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="settings"){items=data.settings||[];if(!items.length){el.innerHTML="<div style=\"color:var(--text-secondary);padding:20px;text-align:center\">鏆傛棤鍦烘櫙鏁版嵁</div>";return}html="<div style=\"display:flex;flex-direction:column;gap:10px\">";for(var i=0;i<items.length;i++){var s=items[i];html+="<div style=\"background:var(--hover);border-radius:8px;padding:12px\">";html+="<div style=\"font-weight:700;font-size:14px;margin-bottom:6px\">馃搷 "+esc(s.name||"鏈煡")+(s.type?" <span style=\"color:var(--text-secondary);font-size:11px\">["+esc(s.type)+"]</span>":"")+"</div>";var sfields=["description","atmosphere","era","significance","notes"];for(var fi=0;fi<sfields.length;fi++){var f=sfields[fi];var v=s[f];if(v&&v.trim())html+="<div style=\"font-size:11px;margin:3px 0\"><span style=\"color:var(--text-secondary);font-weight:600\">"+(keyMap[f]||f)+"锛?/span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="plots"){items=data.plotPoints||[];if(!items.length){el.innerHTML="<div style=\"color:var(--text-secondary);padding:20px;text-align:center\">鏆傛棤鎯呰妭鏁版嵁</div>";return}html="<div style=\"display:flex;flex-direction:column;gap:10px\">";for(var i=0;i<items.length;i++){var p=items[i];html+="<div style=\"background:var(--hover);border-radius:8px;padding:12px\">";html+="<div style=\"font-weight:700;font-size:14px;margin-bottom:6px\">馃搶 "+esc(p.event||"鏈煡浜嬩欢")+(p.chapter?" <span style=\"color:var(--text-secondary);font-size:11px\">["+esc(p.chapter)+"]</span>":"")+"</div>";var pfields=["type","status","significance","relatedChars","psychologicalChange","notes"];for(var fi=0;fi<pfields.length;fi++){var f=pfields[fi];var v=p[f];if(v&&v.trim())html+="<div style=\"font-size:11px;margin:3px 0\"><span style=\"color:var(--text-secondary);font-weight:600\">"+(keyMap[f]||f)+"锛?/span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}else if(tab==="world"){items=data.worldRules||[];if(!items.length){el.innerHTML="<div style=\"color:var(--text-secondary);padding:20px;text-align:center\">鏆傛棤涓栫晫瑙傛暟鎹?/div>";return}html="<div style=\"display:flex;flex-direction:column;gap:10px\">";for(var i=0;i<items.length;i++){var w=items[i];html+="<div style=\"background:var(--hover);border-radius:8px;padding:12px\">";html+="<div style=\"font-weight:700;font-size:14px;margin-bottom:6px\">馃實 "+esc(w.rule||"鏈煡瑙勫垯")+(w.category?" <span style=\"color:var(--text-secondary);font-size:11px\">["+esc(w.category)+"]</span>":"")+"</div>";var wfields=["scope","details","notes"];for(var fi=0;fi<wfields.length;fi++){var f=wfields[fi];var v=w[f];if(v&&v.trim())html+="<div style=\"font-size:11px;margin:3px 0\"><span style=\"color:var(--text-secondary);font-weight:600\">"+(keyMap[f]||f)+"锛?/span>"+esc(v)+"</div>"}html+="</div>"}html+="</div>"}el.innerHTML=html}

function switchLoreTab(tab){_loreTab=tab;var m=G("compressModal");if(!m)return;var btns=m.querySelectorAll(".lore-tab");for(var i=0;i<btns.length;i++){var b=btns[i];var active=b.dataset.loretab===tab;b.style.background=active?"var(--accent)":"var(--hover)";b.style.color=active?"#fff":"var(--text-secondary)"}renderLoreTab()}

function renderLoreModal(lore,stats){if(!lore)lore=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};if(!stats)stats=_loreStats||{};var modal=G("compressModal");if(!modal){var d=document.createElement("div");d.id="compressModal";d.className="modal-overlay";d.style.cssText="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1100;align-items:center;justify-content:center";d.addEventListener("click",function(e){if(e.target===this)closeCompress()});d.innerHTML="<div class=\"modal\" style=\"max-width:800px;width:95vw;max-height:90vh;overflow-y:auto;background:var(--sidebar-bg);border-radius:12px;padding:20px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:14px\"><div style=\"font-size:17px;font-weight:700\">馃摉 涓栫晫瑙?Lorebook 路 鎻愬彇缁撴灉</div><div style=\"display:flex;gap:6px\"><button class=\"btn-sm\" onclick=\"openRawModal()\" style=\"padding:5px 10px;font-size:11px;background:var(--hover);color:var(--text);border:none;border-radius:6px;cursor:pointer\">馃搫 鍘熷鏁版嵁</button><button class=\"btn-sm\" onclick=\"saveLorebook()\" style=\"padding:5px 10px;font-size:11px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer\">馃捑 淇濆瓨</button><button class=\"btn-sm\" onclick=\"useCompressed()\" style=\"padding:5px 10px;font-size:11px;background:#10a37f;color:#fff;border:none;border-radius:6px;cursor:pointer\">鉁嶏笍 缁啓</button><button class=\"btn-sm\" onclick=\"closeCompress()\" style=\"padding:5px 10px;font-size:11px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer\">鉁?鍏抽棴</button></div></div><div style=\"font-size:11px;color:var(--text-secondary);margin-bottom:10px\">鍗＄墖: "+stats.totalCards+" 路 鍘熷: "+(stats.origChars||0).toLocaleString()+"瀛?路 鑰楁椂: "+(stats.elapsed||0)+"s</div><div style=\"display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px\"><button class=\"lore-tab active\" data-loretab=\"characters\" onclick=\"switchLoreTab('characters')\" style=\"flex:1;padding:6px 8px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:11px;border-radius:6px\">馃懁 瑙掕壊 <span id=\"loreCount_c\">("+(lore.characters||[]).length+")</span></button><button class=\"lore-tab\" data-loretab=\"settings\" onclick=\"switchLoreTab('settings')\" style=\"flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px\">馃搷 鍦烘櫙 <span id=\"loreCount_s\">("+(lore.settings||[]).length+")</span></button><button class=\"lore-tab\" data-loretab=\"plots\" onclick=\"switchLoreTab('plots')\" style=\"flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px\">馃搶 鎯呰妭 <span id=\"loreCount_p\">("+(lore.plotPoints||[]).length+")</span></button><button class=\"lore-tab\" data-loretab=\"world\" onclick=\"switchLoreTab('world')\" style=\"flex:1;padding:6px 8px;border:none;background:var(--hover);color:var(--text-secondary);cursor:pointer;font-size:11px;border-radius:6px\">馃實 涓栫晫瑙?<span id=\"loreCount_w\">("+(lore.worldRules||[]).length+")</span></button></div><div id=\"loreTabContent\" style=\"max-height:50vh;overflow-y:auto;font-size:12px;line-height:1.6\"></div></div>";document.body.appendChild(d);_loreTab="characters";renderLoreTab()}else{modal.style.display="flex";G("loreCount_c").textContent="("+(lore.characters||[]).length+")";G("loreCount_s").textContent="("+(lore.settings||[]).length+")";G("loreCount_p").textContent="("+(lore.plotPoints||[]).length+")";G("loreCount_w").textContent="("+(lore.worldRules||[]).length+")";_loreTab="characters";switchLoreTab("characters")}}

function saveLorebook(){if(!_loreData){toast("鏃犳暟鎹彲淇濆瓨","error");return}st.lorebook=_loreData;save();toast("鉁?涓栫晫瑙傚凡淇濆瓨","success")}

function useCompressed(){var ctx=buildContinuationContext();userInput.value=ctx;userInput.style.height="auto";userInput.style.height=Math.min(userInput.scrollHeight,250)+"px";closeCompress();userInput.focus();toast("缁啓涓婁笅鏂囧凡鍔犺浇鍒板彂閫佹锛屽彲缂栬緫鍚庡彂閫?,"success")}

function openRawModal(){var m=G("rawModal");if(!m)return;m.style.display="flex";_rawTab="prompt";switchRawTab("prompt")}
function closeRawModal(){var m=G("rawModal");if(m)m.style.display="none"}

function switchRawTab(tab){_rawTab=tab;var m=G("rawModal");if(!m)return;var btns=m.querySelectorAll("[data-rawtab]");for(var i=0;i<btns.length;i++){var b=btns[i];var active=b.dataset.rawtab===tab;b.style.background=active?"var(--accent)":"var(--hover)";b.style.color=active?"#fff":"var(--text-secondary)"}var el=G("rawContent");if(!el)return;if(tab==="prompt")el.textContent=_rawPrompt||"(绛夊緟Prompt鏋勫缓...)";else if(tab==="response")el.textContent=_rawResponse||"(绛夊緟妯″瀷鍝嶅簲...)";else if(tab==="parsed")el.textContent=_rawParsed?JSON.stringify(_rawParsed,null,2):"(绛夊緟瑙ｆ瀽瀹屾垚...)"}

function copyRawData(){var el=G("rawContent");if(!el)return;var text=el.textContent||"";if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){toast("宸插鍒?,"success")}).catch(function(){toast("澶嶅埗澶辫触","error")})}else{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);toast("宸插鍒?,"success")}}

// Init badges
updateRvBadge();
