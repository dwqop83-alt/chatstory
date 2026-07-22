// ===== REVIEW (低级作家) =====
function normalizeReasons(value){return Array.isArray(value)?value.filter(Boolean):(value?[value]:[])}
function reasonStore(kind){return kind==='good'?st.gvReasons:st.rvReasons}
function selectedReasonValues(kind){var id=kind==='good'?'gvReasonTags':'rvReasonTags';var el=G(id);if(!el)return[];return Array.from(el.querySelectorAll('option:checked')).map(function(x){return x.value})}
function writerReasonValues(){var el=G('writerReasonTags');if(!el)return[];return Array.from(el.querySelectorAll('option:checked')).map(function(x){return x.value})}
function renderReasonTags(kind){
  var id=kind==='good'?'gvReasonTags':'rvReasonTags', list=reasonStore(kind)||[], el=G(id);if(!el)return;
  el.innerHTML=list.map(function(r){return '<option value="'+esc(r)+'">'+esc(r)+'</option>'}).join('')||'<option disabled>暂无标签</option>';
}
function renderRvReasons(){renderReasonTags('review')}
function renderGvReasons(){renderReasonTags('good')}
function onRvReason(){}
function onGvReason(){}
function addReason(kind){
  var id=kind==='good'?'gvNewReason':'rvNewReason', input=G(id), value=input&&input.value.trim();if(!value)return;
  var list=reasonStore(kind);if(!list.includes(value))list.push(value);save();input.value='';kind==='good'?renderGvReasons():renderRvReasons();
  var box=G(kind==='good'?'gvReasonTags':'rvReasonTags');var cb=box&&Array.from(box.querySelectorAll('option')).find(function(x){return x.value===value});if(cb)cb.selected=true;
}
function addRvReason(){addReason('review')}
function addGvReason(){addReason('good')}
function delRvReason(i){var list=reasonStore('review');list.splice(i,1);save();renderRvReasons()}
function delGvReason(i){var list=reasonStore('good');list.splice(i,1);save();renderGvReasons()}
function entryReasons(entry){return normalizeReasons(entry.reason)}
function renderReasonText(entry){return entryReasons(entry).map(esc).join('、')}
function renderCompactEntry(entry,kind){
  return '<div class="writer-record" title="'+esc(entry.text)+'"><span class="writer-record-num">#'+entry.num+'</span><span class="writer-record-text">'+esc(entry.text)+'</span><button class="review-entry-del" onclick="'+(kind==='good'?'delGv':'delRv')+'(\''+entry.id+'\')">✕</button></div>';
}
function renderRVs(){var el=G("rvList");if(!el)return;var list=getRv()||[];el.innerHTML=list.length?[...list].reverse().map(function(e){return renderCompactEntry(e,'review')}).join(''):'<div class="empty-compact">暂无记录</div>'}
function renderGVs(){var el=G("gvList");if(!el)return;var list=getGv()||[];el.innerHTML=list.length?[...list].reverse().map(function(e){return renderCompactEntry(e,'good')}).join(''):'<div class="empty-compact">暂无记录</div>'}
function delRv(id){if(!confirm("删除？"))return;var p=getActiveProject();if(!p)return;var list=p.rvEntries||[];var idx=list.findIndex(function(e){return e.id===id});if(idx>=0)list.splice(idx,1);save();renderProjects();if(st.activeProject)renderProjectData(st.activeProject);updateRvBadge()}
function delGv(id){if(!confirm("删除？"))return;var p=getActiveProject();if(!p)return;var list=p.gvEntries||[];var idx=list.findIndex(function(e){return e.id===id});if(idx>=0)list.splice(idx,1);save();renderProjects();if(st.activeProject)renderProjectData(st.activeProject);updateGvBadge()}
function updateRvBadge(){var b=G("rvBadge");if(!b)return;var n=getRv().length;b.textContent=n;b.style.display=n?"":"none"}
function updateGvBadge(){var b=G("gvBadge");if(!b)return;var n=getGv().length;b.textContent=n;b.style.display=n?"":"none"}
function messageText(message){if(!message)return '';if(Array.isArray(message.content))return message.content.map(function(x){return x.type==='text'?x.text:(x.image_url?'[图片]':'')}).join(' ');return String(message.content||'')}
function getMessageContext(text){
  var conv=typeof getActive==='function'?getActive():null;if(!conv||!conv.msgs)return{before:'',after:''};
  var index=-1;for(var i=0;i<conv.msgs.length;i++){var content=messageText(conv.msgs[i]);if(content===text||content.includes(text)){index=i;break}}
  return{before:index>0?messageText(conv.msgs[index-1]):'',after:index>=0&&index<conv.msgs.length-1?messageText(conv.msgs[index+1]):''};
}
function analysisPrompt(text,reasons,kind,context){
 var positive=kind==='good';var custom=positive?st.settings.goodUserPrompt:st.settings.reviewUserPrompt;
 var def=positive?'请分析这段描写为什么好，结合标签、前文和后文，指出可复用的写作技巧。':'请分析这段描写为什么不好，结合标签、前文和后文，指出具体问题和改进方向。';
 var prompt=(custom||def).replaceAll('{text}',text).replaceAll('{reason}',reasons.join('、')).replaceAll('{reasons}',reasons.join('、')).replaceAll('{before}',context.before||'无').replaceAll('{after}',context.after||'无');return prompt+'\n类型：'+(positive?'高级作家':'低级作家')+'\n标签：'+reasons.join('、')+'\n前文：'+(context.before||'无')+'\n当前描写：'+text+'\n后文：'+(context.after||'无')+'\n请给出具体、可执行的分析。';
}
async function requestWriterAI(text,reasons,kind,context){
 var s=st.settings;if(!s.apiBaseUrl||!s.apiKey)throw new Error('未配置API');
 var prompt=analysisPrompt(text,reasons,kind,context);
 var r=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:kind==='good'?'你是高级写作分析助手':'你是低级写作分析助手'},{role:'user',content:prompt}],max_tokens:500,temperature:0.3})});
 if(!r.ok){var t=await r.text();var msg=t;try{msg=JSON.parse(t).error?.message||t}catch(_){}throw new Error(msg)}var d=await r.json();return d.choices?.[0]?.message?.content?.trim()||'(无结果)';
}
async function submitReview(){return submitWriterEntry('review')}
async function submitGood(){return submitWriterEntry('good')}
async function submitWriterEntry(kind){
 var text=G(kind==='good'?'gvText':'rvText').value.trim();if(!text){toast('请先填写描写','error');return}
 var reasons=selectedReasonValues(kind);if(!reasons.length){toast(kind==='good'?'请选择至少一个标签':'请选择至少一个原因','error');return}
 var btn=G(kind==='good'?'btnGvAdd':'btnRvAdd');if(btn){btn.disabled=true;btn.textContent='⏳ 分析中...'}
 var ai='';try{ai=await requestWriterAI(text,reasons,kind,getMessageContext(text))}catch(e){ai='(失败: '+e.message+')'}
 var list=kind==="good"?getGv():getRv();list.push({id:Date.now().toString(36),num:list.length+1,text:text,reason:reasons,date:new Date().toISOString(),aiAnalysis:ai});
 G(kind==='good'?'gvText':'rvText').value='';save();kind==='good'?renderGVs():renderRVs();kind==='good'?updateGvBadge():updateRvBadge();if(btn){btn.disabled=false;btn.textContent='📌 记录并分析'}toast('已记录并分析','success');
}

var _writerModalKind='review';
function writerKindLabel(kind){return kind==='good'?'🏆 高级作家':'✍️ 低级作家'}
function writerEntries(kind,projectId){var project=projectId?st.projects.find(function(p){return p.id===projectId}):getActiveProject();return project?(kind==='good'?(project.gvEntries||[]):(project.rvEntries||[])):[]}
function writerReasons(kind){return kind==='good'?st.gvReasons:st.rvReasons}
function writerNextNumber(kind,projectId){var list=writerEntries(kind,projectId), max=0;list.forEach(function(e){max=Math.max(max,Number(e.num)||0)});return max+1}
function populateWriterProjects(selectedId){
  var el=G('writerProjectChoice');if(!el)return;
  el.innerHTML=(st.projects||[]).map(function(p){return '<option value="'+esc(p.id)+'">📁 '+esc(p.name)+'</option>'}).join('');
  if(selectedId)el.value=selectedId;else if(st.activeProject)el.value=st.activeProject;
}
function syncWriterReasonsToProject(){
  var projectId=G('writerProjectChoice')&&G('writerProjectChoice').value;
  var project=st.projects.find(function(p){return p.id===projectId});
  if(!project)return;
  var list=_writerModalKind==='good'?(project.gvReasons||[]):(project.rvReasons||[]);
  var current=writerReasonValues();
  G('writerReasonTags').innerHTML=list.map(function(r){return '<option value="'+esc(r)+'" '+(current.includes(r)?'selected':'')+'>'+esc(r)+'</option>'}).join('')||'<option disabled>暂无标签</option>';
}
function populateWriterReasons(selected){
  var el=G('writerReasonTags');if(!el)return;var values=selected||[];
  var projectId=G('writerProjectChoice')&&G('writerProjectChoice').value;var project=projectId&&st.projects.find(function(p){return p.id===projectId});var list=project?(_writerModalKind==='good'?(project.gvReasons||[]):(project.rvReasons||[])):(writerReasons(_writerModalKind)||[]);el.innerHTML=list.map(function(r){return '<option value="'+esc(r)+'" '+(values.includes(r)?'selected':'')+'>'+esc(r)+'</option>'}).join('')||'<option disabled>暂无标签</option>';
}
function addWriterReason(){
  var input=G('writerNewReason'), value=input&&input.value.trim();if(!value)return;
  var projectId=G('writerProjectChoice').value,project=st.projects.find(function(p){return p.id===projectId}),list=project?(_writerModalKind==='good'?(project.gvReasons=project.gvReasons||[],project.gvReasons):(project.rvReasons=project.rvReasons||[],project.rvReasons)):writerReasons(_writerModalKind);
  if(!list.includes(value))list.push(value);save();if(input)input.value='';
  var selected=writerReasonValues();if(!selected.includes(value))selected.push(value);populateWriterReasons(selected);
}
function openWriterModal(kind,text,projectId,entry){
  if(!st.projects.length){toast('请先创建书籍工程','error');return}
  _writerModalKind=kind==='good'?'good':'review';
  G('writerModalTitle').textContent=writerKindLabel(_writerModalKind)+' · 分析并保存';
  populateWriterProjects(projectId||(entry&&entry.projectId));
  populateWriterReasons(entry?entry.reason:[]);syncWriterReasonsToProject();
  var current=text||(entry&&entry.text)||'';
  var context=getMessageContext(current);
  G('writerText').value=current;G('writerBefore').value=(entry&&entry.before)||context.before||'';G('writerAfter').value=(entry&&entry.after)||context.after||'';G('writerAnalysis').value=(entry&&entry.aiAnalysis)||'';
  G('writerSaveBtn').textContent=entry?'💾 保存修改':'📌 记录并分析';
  G('writerPromptBtn').textContent=_writerModalKind==='good'?'✨ 正Prompt':'🧪 负Prompt';
  G('writerProjectChoice').onchange=syncWriterReasonsToProject;
  G('writerModal').classList.remove('hidden');
}
function closeWriterModal(){var el=G('writerModal');if(el)el.classList.add('hidden')}
function writerPromptAction(){_writerModalKind==='good'?genPosPrompt():genNegPrompt()}
async function saveWriterAnalysis(){
  var kind=_writerModalKind,text=G('writerText').value.trim(),reasons=writerReasonValues(),projectId=G('writerProjectChoice').value;
  if(!text){toast('请填写当前描写','error');return}
  if(!reasons.length){toast('请选择至少一个标签','error');return}
  var btn=G('writerSaveBtn');if(btn){btn.disabled=true;btn.textContent='⏳ 分析中...'}
  var context={before:G('writerBefore').value.trim(),after:G('writerAfter').value.trim()},ai='';
  try{ai=await requestWriterAI(text,reasons,kind,context)}catch(e){ai='(失败: '+e.message+')'}
  var list=writerEntries(kind,projectId), entry={id:Date.now().toString(36),num:writerNextNumber(kind,projectId),text:text,reason:reasons,date:new Date().toISOString(),aiAnalysis:ai,before:context.before,after:context.after,projectId:projectId};
  var project=st.projects.find(function(p){return p.id===projectId});
  if(!project){toast('书籍工程不存在','error');if(btn){btn.disabled=false;btn.textContent='📌 记录并分析'};return}
  st.activeProject=projectId;
  if(kind==='good')project.gvEntries=project.gvEntries||[],project.gvEntries.push(entry);else project.rvEntries=project.rvEntries||[],project.rvEntries.push(entry);
  save();closeWriterModal();renderProjects();renderProjBody();renderRVs();renderGVs();updateRvBadge();updateGvBadge();
  if(btn){btn.disabled=false;btn.textContent='📌 记录并分析'}toast('已分析并保存为 #'+entry.num,'success');
}

async function redoRvAI(id){var e=getRv().find(function(x){return x.id===id});if(!e)return;var el=document.getElementById("rvai-"+id);if(el)el.textContent="⏳";try{e.aiAnalysis=await requestWriterAI(e.text,entryReasons(e),"review",getMessageContext(e.text));save();if(el)el.textContent=e.aiAnalysis}catch(err){if(el)el.textContent="(失败: "+err.message+")"}}
function editRvAI(id){var e=getRv().find(function(x){return x.id===id});if(!e)return;var v=prompt("编辑AI分析：",e.aiAnalysis||"");if(v!==null){e.aiAnalysis=v;save();renderRVs()}}
async function redoGvAI(id){var e=getGv().find(function(x){return x.id===id});if(!e)return;var el=document.getElementById("gvai-"+id);if(el)el.textContent="⏳";try{e.aiAnalysis=await requestWriterAI(e.text,entryReasons(e),"good",getMessageContext(e.text));save();if(el)el.textContent=e.aiAnalysis}catch(err){if(el)el.textContent="(失败: "+err.message+")"}}
function editGvAI(id){var e=getGv().find(function(x){return x.id===id});if(!e)return;var v=prompt("编辑AI分析：",e.aiAnalysis||"");if(v!==null){e.aiAnalysis=v;save();renderGVs()}}

function genNegPrompt(){
  var entries=getRv();if(!entries.length){toast("无记录","error");return}
  var rules=entries.filter(function(e){return e.aiAnalysis&&!e.aiAnalysis.startsWith("(失败")}).map(function(e){return "- "+e.aiAnalysis}).join("\n");
  var p="# 负向提示词\\n基于"+entries.length+"条记录\\n\\n应避免：\\n\\n"+rules+"\\n\\n## 摘要\\n"+entries.map(function(e){return "- #"+e.num+" ["+renderReasonText(e)+"] "+e.text.slice(0,60).replace(/\\n/g," ")}).join("\\n");
  G("negPromptText").textContent=p;G("negModal").classList.add("show");
}
function copyNeg(){navigator.clipboard.writeText(G('negPromptText').textContent).then(function(){toast('已复制','success')})}
function flagToGood(){openProjectContextAction('good')}

function genPosPrompt(){
  var entries=getGv();if(!entries.length){toast("无记录","error");return}
  var rules=entries.filter(function(e){return e.aiAnalysis&&!e.aiAnalysis.startsWith("(失败")}).map(function(e){return "- "+e.aiAnalysis}).join("\\n");
  var p="# 正向提示词\\n基于"+entries.length+"条记录\\n\\n应效仿：\\n\\n"+rules+"\\n\\n## 摘要\\n"+entries.map(function(e){return "- #"+e.num+" ["+renderReasonText(e)+"] "+e.text.slice(0,60).replace(/\\n/g," ")}).join("\\n");
  G("posPromptText").textContent=p;G("posModal").classList.add("show");
}
function copyPos(){navigator.clipboard.writeText(G('posPromptText').textContent).then(function(){toast('已复制','success')})}

// ===== MODEL DROPDOWN =====
function toggleMdlDrop(e){e.stopPropagation();G('mdlDrop').classList.toggle('show')}
function selChatModel(m){st.settings.modelName=m;save();renderAll();G('mdlDrop').classList.remove('show')}
function renderMdlDrop(){
  var d=G('mdlDrop'), ms=st.settings.availModels||[], cur=st.settings.modelName;
  if(!d) return;
  if(!ms.length){d.innerHTML='<div class="mdl-drop-item" style="color:var(--text-secondary)">无模型 - 在设置中获取</div>';return}
  d.innerHTML=ms.map(m=>'<div class="mdl-drop-item'+(m===cur?' active':'')+'" onclick="selChatModel(\''+m.replace(/'/g,"\\'" )+'\')">'+m+'</div>').join('');
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
  if(!ct||!ct.trim()){toast("消息内容为空","error");return}
  if(!st.projects||!st.projects.length){toast("请先创建书籍工程","error");return}
  _memText = ct;
  var modal = document.getElementById("memProjectModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "memProjectModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.onclick = function(ev){if(ev.target===modal)modal.style.display="none"};
    modal.innerHTML = "<div class=\"modal\" style=\"max-width:420px\"><div style=\"font-size:16px;font-weight:700;margin-bottom:12px\">\uD83E\uDDE0 添加至长期记忆</div>" +
      "<div style=\"margin-bottom:10px\"><label style=\"font-size:12px;font-weight:600;display:block;margin-bottom:4px\">记忆名称</label>" +
      "<input type=\"text\" id=\"memProjectNameInput\" placeholder=\"输入记忆名称...\" style=\"width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px;background:var(--input-bg);color:var(--text);outline:none;box-sizing:border-box\"></div>" +
      "<div style=\"margin-bottom:10px\"><label style=\"font-size:12px;font-weight:600;display:block;margin-bottom:4px\">选择书籍工程（可多选）</label>" +
      "<div id=\"memProjectCheckList\" style=\"max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;padding:4px\"></div></div>" +
      "<div style=\"display:flex;gap:8px;justify-content:flex-end\">" +
      "<button class=\"btn-sm\" onclick=\"document.getElementById('memProjectModal').style.display='none'\" style=\"background:var(--hover);color:var(--text)\">取消</button>" +
      "<button class=\"btn-sm\" onclick=\"confirmMemProjectSave()\">保存</button></div></div>";
    document.body.appendChild(modal);
  }
  var list = document.getElementById("memProjectCheckList");
  list.innerHTML = st.projects.map(function(p){
    return "<label style=\"display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px\">" +
      "<input type=\"checkbox\" value=\""+esc(p.id)+"\" "+(p.id===st.activeProject?"checked":"")+" style=\"accent-color:var(--accent)\">" +
      "\uD83D\uDCC1 "+esc(p.name)+"</label>";
  }).join("");
  document.getElementById("memProjectNameInput").value = "";
  modal.style.display = "flex";
}

function confirmMemProjectSave(){
  var name = document.getElementById("memProjectNameInput").value.trim();
  if(!name){toast("请输入记忆名称","error");return}
  var checkboxes = document.querySelectorAll("#memProjectCheckList input[type=checkbox]:checked");
  if(!checkboxes.length){toast("请至少选择一个书籍工程","error");return}
  var count = 0;
  for(var ci=0;ci<checkboxes.length;ci++){
    var pid = checkboxes[ci].value;
    var p = st.projects.find(function(x){return x.id===pid});
    if(!p) continue;
    p.memories = p.memories || [];
    var memProj = {id:Date.now().toString(36),name:name,items:[{id:Date.now().toString(36),content:_memText,date:new Date().toISOString()}]};
    p.memories.push(memProj);
    count++;
  }
  save();
  document.getElementById("memProjectModal").style.display = "none";
  renderProjects();
  if(st.activeProject) renderProjectData(st.activeProject);
  renderProjBody();
  _memText = "";
  toast("已添加到 "+count+" 个工程的长期记忆","success");
}

function flagToReview(){
  openProjectContextAction('review');
}
function flagMsg(e,i){e.stopPropagation();var c=getActive();if(!c)return;var m=c.msgs[i];if(!m||m.role!=='assistant')return;_memText=messageText(m);openProjectContextAction('review')}


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