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
    var ctrl=new AbortController();var to=setTimeout(function(){ctrl.abort()},300000);
    var r=await fetch('/api/github/push',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:msg,token:s.githubToken,repo:s.githubRepo,branch:s.githubBranch||'main'}),
      signal:ctrl.signal
    });
    clearTimeout(to);
    var d=await r.json();
    var elapsed=((Date.now()-t0)/1000).toFixed(1);
    
    if(d.ok){
      st.version=(st.version||0)+1; save(); var ve=G('appVersion');if(ve)ve.textContent='v'+st.version;
      updateProgress(100,'✅ 已发布 v'+st.version+' · '+d.pushed+' 文件 · '+elapsed+'s');
      await new Promise(function(r){setTimeout(r,1500)});
      hideProgress(1500);
      toast('✅ 已发布 v'+st.version+' ('+elapsed+'s)','success');
    }else{
      var detail=d.results?d.results.filter(function(x){return x.status==='error'}).map(function(x){return x.file}).join(', '):'';
      updateProgress(100,'❌ 失败: '+d.failed+'/'+(d.pushed+d.failed)+' 文件出错');
      document.getElementById('pubFill').style.background='#e05555';
      await new Promise(function(r){setTimeout(r,2500)});
      hideProgress(1500);
      toast('❌ 发布失败: '+detail,'error');
    }
  }catch(e){
    updateProgress(100,'❌ 网络错误: '+e.message);
    document.getElementById('pubFill').style.background='#e05555';
    await new Promise(function(r){setTimeout(r,2500)});
    hideProgress(1500);
    toast('❌ '+e.message,'error');
  }
}
