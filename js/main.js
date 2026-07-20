'use strict';
const SK = 'chatstory_v2';
let st = { version:0, convs:[], activeCid:null, settings:{ apiBaseUrl:'', apiKey:'', modelName:'', maxTokens:4096, maxUnlimited:true, temperature:0.7, systemPrompt:'', availModels:[], giteeToken:'', giteeRepo:'', giteeBranch:'main', githubToken:'', githubRepo:'', githubBranch:'main' }, activeProject:null, projects:[], qps:[], theme:'dark' };
let streaming = false;
let attachs = [];
let _debTimer = null, _saveTimer = null;
let _streamAbort = null;

const G = id => document.getElementById(id);
const msgsEl = G('msgs'), convListEl = G('convList'), userInput = G('userInput');
const sendBtn = G('sendBtn'), mdlBadge = G('mdlBadge'), chatTitle = G('chatTitle');

function save() { localStorage.setItem(SK, JSON.stringify(st)); if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function(){
    fetch("/api/data/save", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(st)}).catch(function(e){});
  }, 500);
}
function load(){var saved=localStorage.getItem(SK);if(saved){try{st=JSON.parse(saved)}catch(e){}}normalizeState();fetch('/api/data/load').then(function(r){return r.json()}).then(function(d){if(d.ok&&d.data){var serverData=d.data;if(serverData.version>=(st.version||0)){st=serverData;normalizeState();if(typeof renderAll==='function')renderAll()}else if(st.version>(serverData.version||0)){if(typeof save==='function')save()}}}).catch(function(e){});}
function normalizeState(){st.convs=st.convs||[];st.projects=st.projects||[];st.projects.forEach(function(p){p.conversations=p.conversations||[];p.rvEntries=p.rvEntries||[];p.rvReasons=p.rvReasons||[];p.gvEntries=p.gvEntries||[];p.gvReasons=p.gvReasons||[];p.memories=p.memories||[];p.lorebooks=p.lorebooks||[]});st.settings=st.settings||{};st.version=st.version||0;st.rvEntries=st.rvEntries||[];st.rvReasons=st.rvReasons||[];st.gvEntries=st.gvEntries||[];st.gvReasons=st.gvReasons||[];st.qps=st.qps||[];st.memories=st.memories||[];if(!st.settings.giteeToken)st.settings.giteeToken="b6df2c768b72835f8fad74d052509656";if(!st.settings.giteeRepo)st.settings.giteeRepo="middle000/story_-project";if(!st.settings.giteeBranch)st.settings.giteeBranch="main";}
function applyTheme(){var tb=G('themeBtn');if(st.theme==='dark'){document.body.classList.add('dark');if(tb)tb.textContent='☀️'}else{document.body.classList.remove('dark');if(tb)tb.textContent='🌙'}}
load();applyTheme();renderAll();

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
  if(name==='backup'){};if(name==='projects'){renderProjects();renderProjBody()}
  if(name==='lorebookList') renderLorebookList();
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
  if(name==='lorebookList') renderLorebookList();
  hdr.scrollIntoView({behavior:'smooth'});
}

// ===== CONVERSATIONS =====


// ===== PROJECT MANAGEMENT =====
function showNewProjectModal(){G('newProjModal').classList.remove('hidden');setTimeout(function(){G('newProjName').focus()},100)}
function closeNewProjectModal(){G('newProjModal').classList.add('hidden');G('newProjName').value=''}
function addProject(){
  var n = G('newProjName').value.trim();
  if(!n){ toast('请输入工程名称','error'); return; }
  var proj = { id: Date.now().toString(36), name: n, rvEntries: [], rvReasons: [], gvEntries: [], gvReasons: [], memories: [], lorebooks: [], lorebook: null, conversations: [] };
  st.projects.push(proj);
  st.activeProject = proj.id;
  closeNewProjectModal();
  save(); renderProjects(); renderProjBody();
  renderRVs(); renderGVs(); renderMems(); renderLorebookList();
  toast('已创建工程: '+n, 'success');
}function toggleSubSec(el){
  el.classList.toggle('collapsed');
  var body = el.nextElementSibling;
  if(body) body.classList.toggle('hidden');
}
function renameProject(id,e){
  if(e)e.stopPropagation();
  var p=st.projects.find(function(x){return x.id===id});
  if(!p)return;
  var name=prompt('修改工程名称：',p.name||'');
  if(name===null)return;
  name=name.trim();
  if(!name){toast('工程名称不能为空','error');return}
  p.name=name; save(); renderProjects(); renderProjBody(); toast('工程名称已修改','success');
}
function delProject(id, e){
  e.stopPropagation();
  if(!confirm('删除整个工程?')) return;
  st.projects = st.projects.filter(function(p){ return p.id !== id; });
  if(st.activeProject === id) st.activeProject = st.projects[0] ? st.projects[0].id : null;
  save(); renderProjects(); renderProjBody();
}
function selProject(id){
  st.activeProject = id; save(); renderProjects(); renderProjBody();
  renderRVs(); renderGVs(); renderMems(); renderLorebookList();
}
function toggleProject(id){
  st.expandedProjects = st.expandedProjects || [];
  var idx = st.expandedProjects.indexOf(id);
  if(idx >= 0) st.expandedProjects.splice(idx, 1);
  else st.expandedProjects.push(id);
  st.activeProject = id; save();
  renderProjects();
  renderProjectData(id);
}

function getActiveProject(){
  return st.projects.find(function(p){ return p.id === st.activeProject; }) || null;
}
function renderProjects(){
  var el = G('projectList');
  if(!el) return;
  if(!st.projects.length){
    el.innerHTML = '<div style="font-size:11px;color:var(--text-secondary);padding:8px;text-align:center">暂无工程</div>';
    return;
  }
  st.expandedProjects = st.expandedProjects || [];
  var h = '';
  for(var i = 0; i < st.projects.length; i++){
    var p = st.projects[i];
    var active = p.id === st.activeProject;
    var expanded = st.expandedProjects.indexOf(p.id) >= 0;
    var rvCount = (p.rvEntries||[]).length;
    var gvCount = (p.gvEntries||[]).length;
    var memCount = 0;
    for(var j = 0; j < (p.memories||[]).length; j++) memCount += (p.memories[j].items||[]).length;
    var loreCount = (p.lorebooks||[]).length;
    var conversationCount = (p.conversations||[]).length;
    h += '<div class="proj-item'+(active?' active':'')+'">';
    h += '<div class="proj-hdr" onclick="toggleProject(\''+p.id+'\')" style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;transition:background 0.2s">';
    h += '<span class="arr" id="projarr-'+p.id+'">'+(expanded?'▼':'▶')+'</span>';
    h += '<span class="proj-name" style="flex:1">📁 '+esc(p.name)+'</span>';
    h += '<span style="font-size:10px;color:var(--text-secondary);display:flex;gap:4px">';
    if(rvCount) h += '<span title="低级作家">✍️'+rvCount+'</span>';
    if(gvCount) h += '<span title="高级作家">🏆'+gvCount+'</span>';
    if(memCount) h += '<span title="长期记忆">🧠'+memCount+'</span>';
    if(loreCount) h += '<span title="世界观">🌍'+loreCount+'</span>';
    if(conversationCount) h += '<span title="历史对话">💬'+conversationCount+'</span>';
    h += '</span>';
    h += '<button class="btn-sm" onclick="renameProject(\''+p.id+'\',event)" title="修改工程名称" style="padding:2px 6px;font-size:10px;background:transparent;color:var(--text-secondary);border:1px solid var(--border);border-radius:4px;cursor:pointer">✏️</button>';
    h += '<button class="btn-sm" onclick="delProject(\''+p.id+'\',event)" style="padding:2px 6px;font-size:10px;background:transparent;color:#e05555;border:1px solid #e05555;border-radius:4px;cursor:pointer;flex-shrink:0">✕</button>';
    h += '</div>';
    h += '<div class="proj-body" id="projbody-'+p.id+'" style="display:'+(expanded?'block':'none')+'">';
    h += '<div class="side-sec">';
    h += '<div class="side-sec-hdr collapsed" onclick="toggleSubSec(this)"><span>💬 历史对话 <span style="font-size:10px;color:var(--text-secondary)">'+conversationCount+'</span></span><span class="arr">▼</span></div>';
    h += '<div class="side-sec-body hidden"><div class="projectConvList" id="projConv-'+p.id+'"></div></div>';
    h += '</div>';
    h += '<div class="side-sec">';
    h += '<div class="side-sec-hdr collapsed" onclick="toggleSubSec(this)"><span>✍️ 低级作家 <span style="font-size:10px;color:var(--text-secondary)">'+rvCount+'</span></span><span class="arr">▼</span></div>';
    h += '<div class="side-sec-body hidden">';
    h += '<div class="writer-list-head"><button class="btn-sm" onclick="openWriterModal(\'review\')">＋ 新增分析</button></div>';
    h += '<div class="review-list" id="rvList-'+p.id+'"></div>';
    h += '</div></div>';
    h += '<div class="side-sec">';
    h += '<div class="side-sec-hdr collapsed" onclick="toggleSubSec(this)"><span>🏆 高级作家 <span style="font-size:10px;color:var(--text-secondary)">'+gvCount+'</span></span><span class="arr">▼</span></div>';
    h += '<div class="side-sec-body hidden">';
    h += '<div class="writer-list-head"><button class="btn-sm" onclick="openWriterModal(\'good\')">＋ 新增分析</button></div>';
    h += '<div class="good-list" id="gvList-'+p.id+'"></div>';
    h += '</div></div>';
    h += '<div class="side-sec">';
    h += '<div class="side-sec-hdr collapsed" onclick="toggleSubSec(this)"><span>🧠 长期记忆</span><span class="arr">▼</span></div>';
    h += '<div class="side-sec-body hidden">';
    h += '<div class="memList" id="memList-'+p.id+'"></div>';
    h += '<div style="display:flex;flex-direction:column;gap:4px;padding:4px"><input type="text" id="memProjName-'+p.id+'" placeholder="新建记忆项目..."><button class="btn-sm" onclick="addMemProj(\''+p.id+'\')" style="width:100%">＋ 新建项目</button></div>';
    h += '</div></div>';
    h += '<div class="side-sec">';
    h += '<div class="side-sec-hdr collapsed" onclick="toggleSubSec(this)"><span>🌍 世界观数据</span><span class="arr">▼</span></div>';
    h += '<div class="side-sec-body hidden">';
    h += '<div style="display:flex;flex-direction:column;gap:6px;padding:4px">';
    h += '<button class="btn-sm" onclick="compressContext()" style="width:100%;padding:8px;font-size:12px;font-weight:600">🗜️ 压缩上下文</button>';
    h += '<div style="display:flex;gap:4px"><button class="btn-sm" onclick="openPromptEditor()" style="flex:1;padding:6px;font-size:11px">✏️ 编辑Prompt</button><button class="btn-sm" onclick="openLastLorebook()" style="flex:1;padding:6px;font-size:11px">📖 打开提取列表</button></div>';
    h += '</div>';
    h += '<div style="border-top:1px solid var(--border);margin:4px 0"></div>';
    h += '<div class="lorebookList" id="lorebookList-'+p.id+'"><div style="font-size:11px;color:var(--text-secondary);padding:8px;text-align:center">暂无保存的世界观数据</div></div>';
    h += '</div></div>';
    h += '</div>';
    h += '</div>';
  }
  el.innerHTML = h;
  // Render data for each expanded project
  for(var i = 0; i < st.projects.length; i++){
    if(st.expandedProjects && st.expandedProjects.indexOf(st.projects[i].id) >= 0){
      renderProjectData(st.projects[i].id);
    }
  }
}
function renderProjBody(){
  var p = getActiveProject();
  var container = G('projBody');
  if(!container) return;
  if(!p){
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px">📁 请先创建或选择一个工程</div>';
    return;
  }
  // Sub-modules now rendered inline in renderProjects
﻿  renderProjectConversations(); renderRvReasons(); renderRVs(); renderGvReasons(); renderGVs(); renderMems(); renderLorebookList();
}

function renderProjectData(pid){
  if(!pid && st.activeProject) pid = st.activeProject;
  if(!pid) return;
  var p = st.projects.find(function(x){return x.id===pid});
  if(!p) return;
  var convEl = G("projConv-"+pid);
  if(convEl){
    var list = p.conversations||[];
    if(!list.length) convEl.innerHTML="<div style=\"padding:8px;text-align:center;font-size:11px;color:var(--text-secondary)\">\u6682\u65e0\u4fdd\u5b58\u7684\u5bf9\u8bdd</div>";
    else convEl.innerHTML=list.map(function(c,i){return "<div style=\"display:flex;align-items:center;gap:5px;padding:6px 4px;border-bottom:1px solid var(--border)\"><button class=\"btn-sm\" onclick=\"openProjectConversation(\'"+pid+"\',"+i+")\" style=\"flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">\u{1f4ac} "+esc(c.title||"\u672a\u547d\u540d\u5bf9\u8bdd")+"</button><button class=\"btn-sm\" onclick=\"removeProjectConversation(\'"+pid+"\',"+i+",event)\" style=\"padding:3px 6px;color:#e05555;background:transparent\">\u2715</button></div>"}).join("");
  }
  var rvEl = G("rvList-"+pid);
  if(rvEl){
    var rvList = p.rvEntries||[];
    rvEl.innerHTML=rvList.length?rvList.map(function(e){return "<div class=\"writer-record\" title=\""+esc(e.text)+"\"><span class=\"writer-record-num\">#"+e.num+"</span><span class=\"writer-record-text\">"+esc(e.text)+"</span><button class=\"review-entry-del\" onclick=\"delRv(\'"+e.id+"\')\">\u2715</button></div>"}).join(""):"<div class=\"empty-compact\">\u6682\u65e0\u8bb0\u5f55</div>";
  }
  var gvEl = G("gvList-"+pid);
  if(gvEl){
    var gvList = p.gvEntries||[];
    gvEl.innerHTML=gvList.length?gvList.map(function(e){return "<div class=\"writer-record\" title=\""+esc(e.text)+"\"><span class=\"writer-record-num\">#"+e.num+"</span><span class=\"writer-record-text\">"+esc(e.text)+"</span><button class=\"review-entry-del\" onclick=\"delGv(\'"+e.id+"\')\">\u2715</button></div>"}).join(""):"<div class=\"empty-compact\">\u6682\u65e0\u8bb0\u5f55</div>";
  }
  var memEl = G("memList-"+pid);
  if(memEl){
    var memProjects = p.memories||[];
    if(!memProjects.length) memEl.innerHTML="<div style=\"padding:16px;text-align:center;font-size:12px;color:var(--text-secondary)\">\u6682\u65e0</div>";
    else memEl.innerHTML=memProjects.map(function(memProj){var items=memProj.items||[], mpid=esc(memProj.id);return "<div class=\"mem-proj\"><div class=\"mem-proj-hdr\" id=\"memhdr-"+pid+"-"+mpid+"\" onclick=\"toggleMemProj(\'"+pid+"\',\'"+mpid+"\')\"><span>\u{1f4c1} "+esc(memProj.name||"\u672a\u547d\u540d\u8bb0\u5fc6")+" ("+items.length+")</span><span style=\"display:flex;align-items:center;gap:6px\"><span class=\"arr\">\u25bc</span><button style=\"background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px\" onclick=\"event.stopPropagation();delMemProj(\'"+pid+"\',\'"+mpid+"\')\">\u2715</button></span></div><div class=\"mem-proj-body\" id=\"membody-"+pid+"-"+mpid+"\">"+(items.length?items.map(function(item){var iid=esc(item.id);return "<div class=\"mem-item\"><span class=\"mem-item-txt\">"+esc(item.content||"")+"</span><button class=\"mem-item-del\" onclick=\"delMemItem(\'"+pid+"\',\'"+mpid+"\',\'"+iid+"\')\">\u2715</button></div>"}).join(""):"<div style=\"padding:8px;font-size:11px;color:var(--text-secondary)\">\u6682\u65e0\u8bb0\u5fc6</div>")+"<div class=\"mem-add-row\"><input type=\"text\" id=\"meminput-"+pid+"-"+mpid+"\" placeholder=\"\u6dfb\u52a0\u8bb0\u5fc6...\" onkeydown=\"if(event.key==='Enter')addMemItem(\'"+pid+"\',\'"+mpid+"\')\"><button class=\"btn-sm\" onclick=\"addMemItem(\'"+pid+"\',\'"+mpid+"\')\" style=\"padding:5px 10px;font-size:11px\">+</button></div></div></div>"}).join("");
  }
  var lbEl = G("lorebookList-"+pid);
  if(lbEl){
    var lbs = p.lorebooks||[];
    if(!lbs.length) lbEl.innerHTML="<div style=\"font-size:11px;color:var(--text-secondary);padding:8px;text-align:center\">\u6682\u65e0\u4fdd\u5b58\u7684\u4e16\u754c\u89c2\u6570\u636e</div>";
    else{var html2="";for(var k=0;k<lbs.length;k++){var lb=lbs[k];var c=lb.data.characters.length,s=lb.data.settings.length,p2=lb.data.plotPoints.length,w=lb.data.worldRules.length;var total=c+s+p2+w;var dt=new Date(lb.timestamp);var ds=dt.getMonth()+1+"/"+dt.getDate()+" "+dt.getHours()+":"+String(dt.getMinutes()).padStart(2,"0");html2+="<div class=\"lorebook-item\" style=\"padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center\" onclick=\"openLorebook(\'"+lb.id+"\')\"><div><div style=\"font-size:12px;font-weight:600\">"+esc(lb.name)+"</div><div style=\"font-size:10px;color:var(--text-secondary);margin-top:2px\">"+ds+" · \u{1f464}"+c+" \u{1f4cd}"+s+" \u{1f4cc}"+p2+" \u{1f30d}"+w+" ("+total+"\u5361\u7247)</div></div><button class=\"btn-sm\" onclick=\"event.stopPropagation();delLorebook(\'"+lb.id+"\')\" style=\"padding:2px 6px;font-size:10px;background:transparent;color:#e05555;border:1px solid #e05555;border-radius:4px;cursor:pointer\">\u2715</button></div>";}lbEl.innerHTML=html2;}
  }
}

function addMemProj(pid){
  var input=G('memProjName-'+pid), name=input&&input.value.trim();
  if(!name){toast('请输入名称','error');return}
  var p=st.projects.find(function(x){return x.id===pid});
  if(!p){toast('工程不存在','error');return}
  p.memories=p.memories||[];
  p.memories.push({id:Date.now().toString(36),name:name,items:[]});
  input.value=''; save(); renderProjects(); renderProjectData(pid); toast('已创建','success');
}
function delMemProj(pid, mpid){
  if(!confirm('删除项目及所有记忆？'))return;
  var p=st.projects.find(function(x){return x.id===pid});
  if(!p)return;
  p.memories=(p.memories||[]).filter(function(project){return project.id!==mpid});
  save(); renderProjects(); renderProjectData(pid);
}
function toggleMemProj(pid, mpid){
  var body=G('membody-'+pid+'-'+mpid), header=G('memhdr-'+pid+'-'+mpid);
  if(body)body.classList.toggle('open');
  if(header)header.classList.toggle('collapsed');
}
function addMemItem(pid, mpid){
  var input=G('meminput-'+pid+'-'+mpid), content=input&&input.value.trim();
  if(!content)return;
  var p=st.projects.find(function(x){return x.id===pid});
  if(!p)return;
  var project=(p.memories||[]).find(function(item){return item.id===mpid});
  if(!project)return;
  project.items=project.items||[];
  project.items.push({id:Date.now().toString(36),content:content,date:new Date().toISOString()});
  input.value=''; save(); renderProjects(); renderProjectData(pid);
  var body=G('membody-'+pid+'-'+mpid), header=G('memhdr-'+pid+'-'+mpid);
  if(body)body.classList.add('open');
  if(header)header.classList.remove('collapsed');
}
function delMemItem(pid,mpid,iid){
  var p=st.projects.find(function(x){return x.id===pid});
  if(!p)return;
  var project=(p.memories||[]).find(function(item){return item.id===mpid});
  if(!project)return;
  project.items=(project.items||[]).filter(function(item){return item.id!==iid});
  save(); renderProjects(); renderProjectData(pid);
  var body=G('membody-'+pid+'-'+mpid);
  if(body)body.classList.add('open');
}
function renderMems(){
  var el=G('memList');
  if(!el)return;
  var projects=getMem()||[];
  if(!projects.length){
    el.innerHTML='<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无</div>';
    return;
  }
  el.innerHTML=projects.map(function(project){
    var items=project.items||[], pid=esc(project.id);
    return '<div class="mem-proj">'+
      '<div class="mem-proj-hdr" id="memhdr-'+pid+'" onclick="toggleMemProj(\''+pid+'\')">'+
        '<span>📁 '+esc(project.name||'未命名记忆')+' ('+items.length+')</span>'+ 
        '<span style="display:flex;align-items:center;gap:6px"><span class="arr">▼</span><button style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px" onclick="event.stopPropagation();delMemProj(\''+pid+'\')">✕</button></span>'+ 
      '</div>'+ 
      '<div class="mem-proj-body" id="membody-'+pid+'">'+ 
        (items.length?items.map(function(item){var iid=esc(item.id);return '<div class="mem-item"><span class="mem-item-txt">'+esc(item.content||'')+'</span><button class="mem-item-del" onclick="delMemItem(\''+pid+'\',\''+iid+'\')">✕</button></div>'}).join(''):'<div style="padding:8px;font-size:11px;color:var(--text-secondary)">暂无记忆</div>')+ 
        '<div class="mem-add-row"><input type="text" id="meminput-'+pid+'" placeholder="添加记忆..." onkeydown="if(event.key===\'Enter\')addMemItem(\''+pid+'\')"><button class="btn-sm" onclick="addMemItem(\''+pid+'\')" style="padding:5px 10px;font-size:11px">+</button></div>'+ 
      '</div>'+ 
    '</div>';
  }).join('');
}

var _projectSaveConversationId=null;
function cloneConversationForProject(conv){
  return JSON.parse(JSON.stringify({
    id: conv.id,
    sourceConversationId: conv.id,
    title: conv.title || '未命名对话',
    msgs: conv.msgs || [],
    createdAt: conv.createdAt || Date.now(),
    copiedAt: Date.now()
  }));
}
function saveConversationById(id,e){
  if(e)e.stopPropagation();
  _projectSaveConversationId=id;
  var conv=st.convs.find(function(x){return x.id===id});
  if(!conv){toast('找不到这条对话','error');return}
  if(!st.projects.length){toast('请先创建书籍工程','error');return}
  var list=G('projectConvModalList');
  list.innerHTML=st.projects.map(function(p){
    var checked=(p.conversations||[]).some(function(x){return x.sourceConversationId===conv.id || x.id===conv.id});
    return '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer"><input type="checkbox" value="'+esc(p.id)+'" '+(checked?'checked':'')+'><span>📁 '+esc(p.name)+'</span><span style="margin-left:auto;font-size:11px;color:var(--text-secondary)">'+(p.conversations||[]).length+' 个对话</span></label>';
  }).join('');
  G('projectConvModal').classList.remove('hidden');
}
function saveActiveConversationToProject(){
  _projectSaveConversationId=getActive()&&getActive().id;
  var conv=getActive();
  if(!conv){toast('当前没有可保存的对话','error');return}
  if(!st.projects.length){toast('请先创建书籍工程','error');return}
  var list=G('projectConvModalList');
  if(!list)return;
  list.innerHTML=st.projects.map(function(p){
    var checked=(p.conversations||[]).some(function(c){return c.sourceConversationId===conv.id || c.id===conv.id});
    return '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer"><input type="checkbox" value="'+esc(p.id)+'" '+(checked?'checked':'')+'><span>📁 '+esc(p.name)+'</span><span style="margin-left:auto;font-size:11px;color:var(--text-secondary)">'+(p.conversations||[]).length+' 个对话</span></label>';
  }).join('');
  G('projectConvModal').classList.remove('hidden');
}
function closeProjectConvModal(){_projectSaveConversationId=null;G('projectConvModal').classList.add('hidden')}
function confirmSaveConversationToProjects(){
  var conv=st.convs.find(function(x){return x.id===_projectSaveConversationId})||getActive();
  if(!conv)return;
  var checks=G('projectConvModalList').querySelectorAll('input[type=checkbox]');
  var saved=0;
  checks.forEach(function(input){
    var p=st.projects.find(function(x){return x.id===input.value});
    if(!p)return;
    p.conversations=p.conversations||[];
    var index=p.conversations.findIndex(function(c){return c.sourceConversationId===conv.id || c.id===conv.id});
    if(input.checked){
      if(index<0){p.conversations.push(cloneConversationForProject(conv));saved++;}
      else{p.conversations[index]=cloneConversationForProject(conv);}
    }else if(index>=0){p.conversations.splice(index,1);}
  });
  save(); closeProjectConvModal(); renderProjects(); renderProjBody();
  toast(saved?'已保存到 '+saved+' 个书籍工程':'书籍工程已更新','success');
}
function renderProjectConversations(){
  var el=G('projectConvList');
  var p=getActiveProject();
  if(!el||!p)return;
  var list=p.conversations||[];
  if(!list.length){el.innerHTML='<div style="padding:8px;text-align:center;font-size:11px;color:var(--text-secondary)">暂无保存的对话</div>';return;}
  el.innerHTML=list.map(function(c,i){
    return '<div style="display:flex;align-items:center;gap:5px;padding:6px 4px;border-bottom:1px solid var(--border)"><button class="btn-sm" onclick="openProjectConversation(\''+p.id+'\','+i+')" style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">💬 '+esc(c.title||'未命名对话')+'</button><button class="btn-sm" onclick="removeProjectConversation(\''+p.id+'\','+i+',event)" style="padding:3px 6px;color:#e05555;background:transparent">✕</button></div>';
  }).join('');
}
function openProjectConversation(projectId,index){
  var p=st.projects.find(function(x){return x.id===projectId});
  var source=p&&p.conversations&&p.conversations[index];
  if(!source)return;
  var copy=JSON.parse(JSON.stringify(source));
  copy.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  copy.sourceProjectId=projectId;
  copy.sourceConversationId=source.sourceConversationId||source.id;
  copy.title=(source.title||'未命名对话')+'（工程副本）';
  st.convs.unshift(copy); st.activeCid=copy.id; save(); renderAll(); scrollBottom();
  toast('已加载工程对话副本','success');
}
function removeProjectConversation(projectId,index,e){
  if(e)e.stopPropagation();
  var p=st.projects.find(function(x){return x.id===projectId});
  if(!p||!p.conversations)return;
  p.conversations.splice(index,1); save(); renderProjects(); renderProjBody();
}

var _projectContextAction=null;
function openProjectContextAction(action){
  if(!_memText){toast('请先选中文本','error');return}
  if(!st.projects.length){toast('请先创建书籍工程','error');return}
  if(action==='review'||action==='good'){
    G('ctxMenu').classList.remove('show');
    openWriterModal(action,_memText,st.activeProject);
    return;
  }
  _projectContextAction=action;
  var title={review:'🏴 标记到低级作家',good:'🏆 标记到高级作家',memory:'🧠 添加至长期记忆'}[action]||'选择书籍工程';
  G('projectContextTitle').textContent=title;
  G('projectContextHint').textContent=action==='memory'?'选择一个书籍工程，将选中文本写入其长期记忆。':'选择一个书籍工程，将选中文本写入其对应属性。';
  G('projectContextList').innerHTML=st.projects.map(function(p){return '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);cursor:pointer"><input type="radio" name="projectContextChoice" value="'+esc(p.id)+'" '+(p.id===st.activeProject?'checked':'')+'><span>📁 '+esc(p.name)+'</span></label>';}).join('');
  G('projectContextModal').classList.remove('hidden');
}
function closeProjectContextModal(){_projectContextAction=null;G('projectContextModal').classList.add('hidden')}
function confirmProjectContextAction(){
  var selected=G('projectContextList').querySelector('input[name="projectContextChoice"]:checked');
  var p=selected&&st.projects.find(function(x){return x.id===selected.value});
  if(!p){toast('请选择书籍工程','error');return}
  var text=_memText;
  if(!text){closeProjectContextModal();return}
  var action=_projectContextAction;
  st.activeProject=p.id;save();closeProjectContextModal();G('ctxMenu').classList.remove('show');
  renderProjects();renderProjBody();
  setTimeout(function(){
    if(action==='review'||action==='good'){
      openWriterModal(action,text,p.id);
    }else if(action==='memory'){
      p.memories=p.memories||[];var memory=p.memories[0];
      if(!memory){memory={id:Date.now().toString(36),name:'右键收藏',items:[]};p.memories.push(memory)}
      memory.items=memory.items||[];memory.items.push({id:Date.now().toString(36),content:text,date:new Date().toISOString()});
      save();renderProjBody();toast('已添加到工程「'+p.name+'」的长期记忆','success');
    }
    _projectContextAction=null;
    if(action==='memory')_memText='';
  },0);
}

// ===== LEGACY BRIDGE: redirect st.rvEntries etc to active project =====
function getRv(){ var p = getActiveProject(); return p ? p.rvEntries : []; }
function setRv(v){ var p = getActiveProject(); if(p) p.rvEntries = v; }
function getRvR(){ var p = getActiveProject(); return p ? p.rvReasons : []; }
function setRvR(v){ var p = getActiveProject(); if(p) p.rvReasons = v; }
function getGv(){ var p = getActiveProject(); return p ? p.gvEntries : []; }
function setGv(v){ var p = getActiveProject(); if(p) p.gvEntries = v; }
function getGvR(){ var p = getActiveProject(); return p ? p.gvReasons : []; }
function setGvR(v){ var p = getActiveProject(); if(p) p.gvReasons = v; }
function getMem(){ var p = getActiveProject(); return p ? p.memories : []; }
function setMem(v){ var p = getActiveProject(); if(p) p.memories = v; }
function getLBs(){ var p = getActiveProject(); return p ? p.lorebooks : []; }
function setLBs(v){ var p = getActiveProject(); if(p) p.lorebooks = v; }
function getLB(){ var p = getActiveProject(); return p ? p.lorebook : null; }
function setLB(v){ var p = getActiveProject(); if(p) p.lorebook = v; }

// Install getters/setters on st
if(Object.defineProperty){
  Object.defineProperty(st, 'rvEntries', { get: getRv, set: setRv, enumerable: true, configurable: true });
  Object.defineProperty(st, 'rvReasons', { get: getRvR, set: setRvR, enumerable: true, configurable: true });
  Object.defineProperty(st, 'gvEntries', { get: getGv, set: setGv, enumerable: true, configurable: true });
  Object.defineProperty(st, 'gvReasons', { get: getGvR, set: setGvR, enumerable: true, configurable: true });
  Object.defineProperty(st, 'memories', { get: getMem, set: setMem, enumerable: true, configurable: true });
  Object.defineProperty(st, 'lorebooks', { get: getLBs, set: setLBs, enumerable: true, configurable: true });
  Object.defineProperty(st, 'lorebook', { get: getLB, set: setLB, enumerable: true, configurable: true });
}
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
  sub.innerHTML = '<div class="ctx-menu-sub-item" onclick="openProjectContextAction(\'memory\')">📁 选择书籍工程...</div>';
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
function delQP(id,e){if(e)e.stopPropagation();st.qps=st.qps.filter(p=>p.id!==id);save();renderQPs();toast('快捷提示词已删除','success')}
function useQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;userInput.focus();userInput.style.height='auto';userInput.style.height=Math.min(userInput.scrollHeight,150)+'px'}}
function sendQP(id){var p=st.qps.find(p=>p.id===id);if(p){userInput.value=p.content;sendMsg()}}
function renderQPs(){
  var el=G('qpList');
  if(!st.qps.length){el.innerHTML='<div style="padding:8px;font-size:11px;color:var(--text-secondary);text-align:center">暂无</div>';return}
  el.innerHTML=st.qps.map(p=>'<div class="qp-item" data-qpid="'+p.id+'" title="点击填入"><span class="qp-title">'+esc(p.title)+'</span><span class="qp-acts"><button class="qp-act send" data-send="'+p.id+'" title="粘贴并发送">▶</button><button class="qp-act edit" data-edit="'+p.id+'" title="编辑">✎</button><button class="qp-act del" data-del="'+p.id+'" title="删除">✕</button></span></div>').join('');
  if(!el._b){el._b=true;el.addEventListener('click',function(e){var item=e.target.closest('.qp-item');if(!item)return;var id=item.dataset.qpid;if(e.target.closest('.qp-act.send'))sendQP(id);else if(e.target.closest('.qp-act.edit'))editQP(id);else if(e.target.closest('.qp-act.del'))delQP(id,e);else useQP(id)})}
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
async function syncDataUpload(){if(!confirm("上传数据库到 Gitee？"))return;try{var r=await fetch("/api/sync/upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:st.settings.giteeToken,repo:st.settings.giteeRepo,branch:st.settings.giteeBranch})});var d=await r.json();if(d.ok)toast(d.message||"上传成功","success");else toast(d.error||"上传失败","error")}catch(e){toast("上传失败: "+e.message,"error")}}
async function syncDataDownload(){if(!confirm("从 Gitee 恢复数据库？这将覆盖当前所有数据！"))return;try{var r=await fetch("/api/sync/download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:st.settings.giteeToken,repo:st.settings.giteeRepo,branch:st.settings.giteeBranch})});var d=await r.json();if(d.ok){toast(d.message||"恢复成功","success");setTimeout(function(){location.reload()},1000)}else toast(d.error||"恢复失败","error")}catch(e){toast("下载失败: "+e.message,"error")}}

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
  G('backupConvModal').classList.remove('hidden');
}
function toggleAllBackupConvs(cb){
  var boxes=G('backupConvList').querySelectorAll('input[type=checkbox]');
  for(var i=0;i<boxes.length;i++) boxes[i].checked=cb.checked;
}
function closeBackupConvModal(){G('backupConvModal').classList.add('hidden')}

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
  var convList=G('backupConvList');
  var boxes=convList?convList.querySelectorAll('input[type=checkbox]:checked'):[];
  _backupConvIds=[];
  for(var i=0;i<boxes.length;i++) _backupConvIds.push(boxes[i].value);
  closeBackupConvModal();
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('请先配置 Gitee Token 和仓库','error');return}
  showProgress('正在备份至云端...');
  updateProgress(10,'准备数据...');
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
    updateProgress(30,'上传数据...');
    _abortController=new AbortController();
    var toId=setTimeout(function(){_abortController.abort()},30000);
    var r=await fetch('/api/data/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:_abortController.signal});
    clearTimeout(toId);
    var result=await r.json();
    if(result.error)throw new Error(result.error);
    updateProgress(70,'推送到 Gitee...');
    await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',message:'Backup: '+new Date().toLocaleString('zh-CN'),token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    updateProgress(100,'备份完成');
    var url='https://gitee.com/'+s.giteeRepo+'/blob/'+(s.giteeBranch||'main')+'/app-data.json';
    toast('备份成功','success');
    setTimeout(function(){alert('备份成功!\n\n文件: '+url)},800)
  }catch(e){
    updateProgress(100,'失败: '+e.message);
    var pf=G('pubFill'); if(pf)pf.style.background='#e05555';
    toast('备份失败: '+e.message,'error')
  }
  _abortController=null;
  hideProgress(3000);
}

var _abortController=null;function cancelProgress(){
  if(_abortController){_abortController.abort();_abortController=null;}
  var el=G('pubProgress');if(el)el.style.display='none';
  toast('已取消','info');
}

async function cloudImport(){
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('请先配置 Gitee Token 和仓库','error');return}
  showProgress('正在从云端恢复...');
  updateProgress(15,'拉取数据...');
  try{
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},30000);
    await fetch('/api/git/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:s.giteeBranch||'main',token:s.giteeToken,repo:s.giteeRepo}),signal:_abortController.signal});
    clearTimeout(timeoutId);
    updateProgress(40,'下载数据...');
    var r=await fetch('/api/data/download',{signal:_abortController.signal});
    var data=await r.json();
    if(data.error)throw new Error(data.error);
    if(!data.version){
      updateProgress(100,'云端暂无备份数据');
      toast('云端暂无备份数据','error');
      hideProgress(2500);
      return;
    }
    updateProgress(60,'合并数据...');
    var merged=0;
    if(data.quickPrompts){for(var i=0;i<data.quickPrompts.length;i++){var q=data.quickPrompts[i];if(!st.qps.find(function(x){return x.content===q.content})){st.qps.push(q);merged++}}}
    if(data.reviewReasons){for(var i=0;i<data.reviewReasons.length;i++){var rr=data.reviewReasons[i];if(!st.rvReasons.includes(rr)){st.rvReasons.push(rr);merged++}}}
    if(data.reviewEntries){for(var i=0;i<data.reviewEntries.length;i++){var rv=data.reviewEntries[i];if(!st.rvEntries.find(function(x){return x.text===rv.text})){st.rvEntries.push(rv);merged++}}}
    if(data.goodReasons){for(var i=0;i<data.goodReasons.length;i++){var gr=data.goodReasons[i];if(!st.gvReasons.includes(gr)){st.gvReasons.push(gr);merged++}}}
    if(data.goodEntries){for(var i=0;i<data.goodEntries.length;i++){var g=data.goodEntries[i];if(!st.gvEntries.find(function(x){return x.text===g.text})){st.gvEntries.push(g);merged++}}}
    if(data.memories){for(var i=0;i<data.memories.length;i++){var mp=data.memories[i];var ex=st.memories.find(function(x){return x.name===mp.name});if(ex){for(var j=0;j<(mp.items||[]).length;j++){var mi=mp.items[j];if(!ex.items.find(function(x){return x.content===mi.content})){ex.items.push(mi);merged++}}}else{st.memories.push(mp);merged++}}}
    var convRestored=0;
    if(data.conversations&&Array.isArray(data.conversations)){
      for(var i=0;i<data.conversations.length;i++){
        var cv=data.conversations[i];
        if(!st.convs.find(function(x){return x.id===cv.id})){st.convs.push(cv);convRestored++}
      }
    }
    save();
    var msg='已恢复 '+merged+'条';
    if(convRestored>0)msg+=' + '+convRestored+'个对话';
    updateProgress(100,msg);
    toast(msg,'success');
    renderQPs(); renderRVs(); renderRvReasons();
    renderGVs(); renderGvReasons(); renderMems(); renderSidebar();
    if(typeof updateRvBadge==='function')updateRvBadge();
    if(typeof updateGvBadge==='function')updateGvBadge()
  }catch(e){
    updateProgress(100,'失败: '+e.message);
    var pf=G('pubFill'); if(pf)pf.style.background='#e05555';
    toast('恢复失败: '+e.message,'error')
  }
  _abortController=null;
  hideProgress(3000);
}// ===== BACKUP (信息备份) =====
function exportData(){
  var data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    quickPrompts: st.qps,
    projects: st.projects,
    conversations: st.convs
  };  var json = JSON.stringify(data, null, 2);
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
function renderAll(){renderSidebar();renderChat();renderHeader();if(typeof renderMdlDrop==='function')renderMdlDrop();if(typeof updateRvBadge==='function')updateRvBadge();if(typeof updateGvBadge==='function')updateGvBadge();try{renderTokenInfo()}catch(e){}}
function renderSidebar(){convListEl.innerHTML=st.convs.map(c=>'<div class="conv-item'+(c.id===st.activeCid?' active':'')+'" onclick="selConv(\''+c.id+'\')"><span class="conv-title">'+esc(c.title)+'</span><button class="conv-save" title="保存对话到书籍工程" onclick="saveConversationById(\''+c.id+'\',event)">📚</button><button class="conv-del" onclick="delConv(\''+c.id+'\',event)">✕</button></div>').join('')}
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
  if(sys)apiMsgs.push({role:'system',content:sys});
  for(var k=0;k<=ai;k++){var m=c.msgs[k];if(k===ai)continue;apiMsgs.push({role:m.role,content:Array.isArray(m.content)?m.content.map(function(p){return p.type==='text'?p.text:''}).join(' '):m.content})}
  streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;
  _streamAbort=new AbortController();
  sendBtn.querySelector('.btn-text').textContent='停止';
  sendBtn.onclick=stopStream;
  try{
    var body={model:s.modelName,messages:apiMsgs,temperature:s.temperature,stream:true};
    if(!s.maxUnlimited)body.max_tokens=s.maxTokens;
    var resp=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(body),signal:_streamAbort.signal});
    if(!resp.ok){var t=await resp.text(),me=t;try{me=JSON.parse(t).error?.message||t}catch(_){}throw new Error('HTTP '+resp.status+': '+me)}
    var reader=resp.body.getReader(),decoder=new TextDecoder(),buf='';
    while(true){var rv=await reader.read();if(rv.done)break;buf+=decoder.decode(rv.value,{stream:true});var lines=buf.split('\n');buf=lines.pop()||'';for(var ln of lines){ln=ln.trim();if(!ln||!ln.startsWith('data: '))continue;var d=ln.slice(6);if(d==='[DONE]')continue;try{var delta=JSON.parse(d).choices?.[0]?.delta?.content;if(delta){c.msgs[ai].content+=delta;c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;debUpdate(c.msgs[ai].content)}}catch(_){}}}
    if(_debTimer){clearTimeout(_debTimer);_debTimer=null}
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null}
    c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;
    save();updLastBubble(c.msgs[ai].content);
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(无响应)'}
  finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='发送';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}
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

function stopStream(){
  if(_streamAbort){_streamAbort.abort();_streamAbort=null;}
  streaming=false;
  sendBtn.classList.remove('loading');
  sendBtn.disabled=false;
  sendBtn.querySelector('.btn-text').textContent='发送';
  sendBtn.onclick=sendMsg;
  userInput.focus();
  save();
  renderAll();
  scrollBottom();
}

function stopStream(){
  if(_streamAbort){_streamAbort.abort();_streamAbort=null;}
  streaming=false;
  sendBtn.classList.remove('loading');
  sendBtn.disabled=false;
  sendBtn.querySelector('.btn-text').textContent='发送';
  sendBtn.onclick=sendMsg;
  userInput.focus();
  save();
  renderAll();
  scrollBottom();
}

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

  var apiMsgs=[];
  var sys=s.systemPrompt||'';
  if(sys)apiMsgs.push({role:'system',content:sys});
  for(var m of c.msgs.slice(0,-1))apiMsgs.push({role:m.role,content:m.content});

  streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;
  _streamAbort=new AbortController();
  sendBtn.querySelector('.btn-text').textContent='停止';
  sendBtn.onclick=stopStream;
  try{
    var body={model:s.modelName,messages:apiMsgs,temperature:s.temperature,stream:true};
    if(!s.maxUnlimited)body.max_tokens=s.maxTokens;
    var resp=await fetch(s.apiBaseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify(body),signal:_streamAbort.signal});
    if(!resp.ok){var t=await resp.text(),m=t;try{m=JSON.parse(t).error?.message||t}catch(_){}throw new Error('HTTP '+resp.status+': '+m)}
    var reader=resp.body.getReader(),decoder=new TextDecoder(),buf='';
    while(true){var rv=await reader.read();if(rv.done)break;buf+=decoder.decode(rv.value,{stream:true});var lines=buf.split('\n');buf=lines.pop()||'';for(var ln of lines){ln=ln.trim();if(!ln||!ln.startsWith('data: '))continue;var d=ln.slice(6);if(d==='[DONE]')continue;try{var delta=JSON.parse(d).choices?.[0]?.delta?.content;if(delta){c.msgs[ai].content+=delta;c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;debUpdate(c.msgs[ai].content)}}catch(_){}}}
    if(_debTimer){clearTimeout(_debTimer);_debTimer=null}
    if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null}
    c.msgs[ai].versions[c.msgs[ai].vIdx].content=c.msgs[ai].content;save();updLastBubble(c.msgs[ai].content);
  }catch(e){c.msgs[ai].error=e.message;if(!c.msgs[ai].content)c.msgs[ai].content='(无响应)'}
  finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='发送';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}
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
  G('settingsModal').classList.remove('hidden');
}
function closeSettings(){G('settingsModal').classList.add('hidden')}
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
  var sv=G('modalProvider').value;
  var url=(sv==='__custom__'?G('modalCustomUrl').value:sv).replace(/\/+$/,'');
  var key=G('modalApiKey').value.trim();
  if(!url){toast('请选提供商','error');return}
  if(!key){toast('请填Key','error');return}
  try{
    var models=[];
    try{
      var r=await fetch(url+'/models',{headers:{'Authorization':'Bearer '+key}});
      var text=await r.text();
      var d;
      try{d=JSON.parse(text)}catch(e){throw new Error('Bad JSON')}
      if(r.ok){
        if(d.data)models=d.data.map(function(x){return x.id}).filter(Boolean);
        else if(d.models)models=d.models.map(function(x){return x.id||x.name}).filter(Boolean);
        else if(Array.isArray(d))models=d.map(function(x){return typeof x==='string'?x:x.id||x.name}).filter(Boolean)
      }
    }catch(e){console.log('API models failed:',e.message)}
    if(!models.length){
      var presets={};
      presets['https://api.deepseek.com/v1']=['deepseek-v4-flash','deepseek-v4-pro','deepseek-chat','deepseek-reasoner'];
      presets['https://api.openai.com/v1']=['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'];
      presets['https://api.moonshot.cn/v1']=['moonshot-v1-8k','moonshot-v1-32k','moonshot-v1-128k'];
      models=presets[url]||['deepseek-chat','deepseek-v4-flash','deepseek-v4-pro'];
      toast('内置模型 ('+models.length+')','success')
    }else{
      toast(models.length+' 个模型','success')
    }
    var dl=G('modalModelList');
    if(dl)dl.innerHTML=models.map(function(x){return '<option value="'+x+'">'}).join('');
    st.settings.availModels=models;save();
    if(typeof renderMdlDrop==='function')renderMdlDrop()
  }catch(e){toast('获取失败: '+e.message,'error')}
}document.addEventListener('DOMContentLoaded',function(){G('settingsModal').addEventListener('click',function(e){if(e.target===this)closeSettings()})});

document.addEventListener('DOMContentLoaded',function(){G('negModal').addEventListener('click',function(e){if(e.target===this)this.classList.add('hidden')});G('posModal').addEventListener('click',function(e){if(e.target===this)this.classList.add('hidden')})});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){G('negModal').classList.add('hidden');G('posModal').classList.add('hidden');}if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();newConv()}});

// Init badges
if(typeof updateRvBadge==='function'){try{updateRvBadge()}catch(e){}}

