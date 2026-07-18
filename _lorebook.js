const fs = require("fs");
let c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");
let patches = 0;

// ============================================================
// PATCH 1: Rewrite compressContext to Lorebook extraction
// ============================================================
const oldCC = `async function compressContext(){
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast('请先配置API','error');return}
  var c=getActive(); if(!c||!c.msgs.length){toast('当前对话为空','error');return}
  
  // Build conversation text
  var convText='';
  for(var i=0;i<c.msgs.length;i++){
    var m=c.msgs[i];
    var roleLabel=m.role==='user'?'用户':'助手';
    var content=typeof m.content==='string'?m.content:JSON.stringify(m.content);
    if(m.error){convText+=roleLabel+': [错误] '+m.error+'\\n';continue}
    if(!content||!content.trim())continue;
    convText+=roleLabel+': '+content+'\\n\\n';
  }
  
  if(!convText.trim()){toast('无可压缩内容','error');return}
  
  var compressBtn=G('compressBtn');
  compressBtn.disabled=true;
  showProgress('🗜️ 正在压缩上下文...');
  updateProgress(10,'📊 分析对话...');
  await new Promise(function(r){setTimeout(r,300)});
  
  var origChars=convText.length;
  updateProgress(25,'📤 发送至 '+s.modelName+'...');
  
  try{
    var compressPrompt='你是一个上下文压缩助手。请将以下对话压缩为一份简洁但信息密集的摘要。保留所有关键信息：决策、代码模式、事实数据、用户偏好、待办事项、重要结论。压缩后的摘要应足以让模型在无原始对话的情况下继续提供高质量回复。\\n\\n--- 原始对话 ---\\n'+convText+'\\n--- 结束 ---\\n\\n请输出压缩后的上下文摘要：';
    
    var apiMsgs=[{role:'user',content:compressPrompt}];
    var body=JSON.stringify({model:s.modelName,messages:apiMsgs,temperature:0.3,stream:false,max_tokens:4096});
    
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},120000);
    
    updateProgress(50,'⏳ 等待模型响应...');
    var resp=await fetch(s.apiBaseUrl.replace(/\\/+$/,'')+'/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},
      body:body,
      signal:_abortController.signal
    });
    clearTimeout(timeoutId);
    _abortController=null;
    
    updateProgress(75,'📥 接收结果...');
    if(!resp.ok){var t=await resp.text(),m=t;try{m=JSON.parse(t).error?.message||t}catch(_){}throw new Error('API错误: '+m)}
    
    var data=await resp.json();
    var compressed=data.choices&&data.choices[0]?data.choices[0].message.content:'';
    if(!compressed){throw new Error('模型返回为空')}
    
    updateProgress(90,'✅ 压缩完成');
    await new Promise(function(r){setTimeout(r,400)});
    updateProgress(100,'✅ 压缩完成 · '+origChars+'→'+compressed.length+'字符 ('+Math.round(compressed.length/Math.max(1,origChars)*100)+'%)');
    
    // Store result and show modal
    _compressedText=compressed;
    _compressStats='原文 '+origChars.toLocaleString()+' 字符 → 压缩后 '+compressed.length.toLocaleString()+' 字符 ('+Math.round(compressed.length/Math.max(1,origChars)*100)+'%)';
    
    await new Promise(function(r){setTimeout(r,800)});
    hideProgress(500);
    
    var statsEl=G('compressStats');
    if(statsEl)statsEl.textContent=_compressStats;
    var resultEl=G('compressResult');
    if(resultEl)resultEl.innerHTML=renderMD(compressed);
    var modal=G('compressModal');
    if(modal){modal.style.display='flex'}
    
    toast('✅ 压缩完成','success');
  }catch(e){
    if(e.name==='AbortError'){hideProgress(500);toast('已取消','info');compressBtn.disabled=false;return}
    _abortController=null;
    updateProgress(100,'❌ 失败: '+e.message);
    G('pubFill').style.background='#e05555';
    await new Promise(function(r){setTimeout(r,2000)});
    hideProgress(500);
    toast('❌ 压缩失败: '+e.message,'error');
  }
  compressBtn.disabled=false;
}`;

const newCC = `async function compressContext(){
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast('请先配置API','error');return}
  var conv=getActive(); if(!conv||!conv.msgs.length){toast('当前对话为空','error');return}
  
  // Build conversation text
  var convText='';
  for(var i=0;i<conv.msgs.length;i++){
    var m=conv.msgs[i];
    var roleLabel=m.role==='user'?'用户':'助手';
    var content=typeof m.content==='string'?m.content:JSON.stringify(m.content);
    if(m.error){convText+=roleLabel+': [错误] '+m.error+'\\n';continue}
    if(!content||!content.trim())continue;
    convText+=roleLabel+': '+content+'\\n\\n';
  }
  if(!convText.trim()){toast('无可压缩内容','error');return}
  
  var compressBtn=G('compressBtn');
  compressBtn.disabled=true;
  showProgress('🗜️ Lorebook 世界观提取中...');
  updateProgress(10,'📊 分析对话 ('+convText.length.toLocaleString()+'字)...');
  await new Promise(function(r){setTimeout(r,300)});
  
  var origChars=convText.length;
  updateProgress(25,'📤 发送至 '+s.modelName+'...');
  
  try{
    var extractPrompt='你是一个小说世界观提取助手（Lorebook模式）。从以下对话中提取所有小说创作相关的结构化信息。\\n\\n要求：\\n1. 尽可能全面，不要遗漏次要角色、伏笔、细节设定\\n2. 描述要具体（如外貌特征、关系细节），避免空泛\\n3. 从"用户"的发言中提取设定，从"助手"的生成内容中确认并补充\\n\\n严格输出以下JSON格式（不要markdown代码块，只输出纯JSON）：\\n\\n{\\n  "characters":[{"name":"角色名","alias":"别名/称号","role":"主角/配角/反派/龙套","gender":"性别","age":"年龄","appearance":"外貌特征","personality":"性格","background":"背景故事","relationships":"与其他角色关系","arc":"角色弧光/成长线","notes":"补充"}],\\n  "settings":[{"name":"场景/地点名","type":"城市/建筑/自然/室内","era":"时代背景","description":"详细描述","atmosphere":"氛围/基调","significance":"叙事作用","notes":"补充"}],\\n  "plotPoints":[{"event":"事件描述","chapter":"所在章节/位置","type":"主线/支线/伏笔/转折","significance":"重要性说明","status":"已完成/进行中/待展开","relatedChars":"涉及角色","notes":"补充"}],\\n  "worldRules":[{"rule":"规则/设定","category":"魔法/科技/社会/历史/文化/生物","scope":"适用范围","details":"详细说明","notes":"补充"}]\\n}\\n\\n--- 对话内容 ---\\n'+convText+'\\n--- 结束 ---\\n\\n只输出JSON：';
    
    var apiMsgs=[{role:'user',content:extractPrompt}];
    var body=JSON.stringify({model:s.modelName,messages:apiMsgs,temperature:0.2,stream:false,max_tokens:8192});
    
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},180000);
    
    updateProgress(50,'⏳ '+s.modelName+' 提取中...');
    var resp=await fetch(s.apiBaseUrl.replace(/\\/+$/,'')+'/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},
      body:body,
      signal:_abortController.signal
    });
    clearTimeout(timeoutId);
    _abortController=null;
    
    updateProgress(75,'📥 解析结果...');
    if(!resp.ok){var t=await resp.text(),m=t;try{m=JSON.parse(t).error?.message||t}catch(_){}throw new Error('API: '+m)}
    
    var data=await resp.json();
    var raw=data.choices&&data.choices[0]?data.choices[0].message.content:'';
    if(!raw)throw new Error('模型返回为空');
    
    // Parse JSON from response (handle markdown code blocks)
    var jsonStr=raw;
    var m=raw.match(/\\x60\\x60\\x60(?:json)?\\s*\\n?([\\s\\S]*?)\\n?\\x60\\x60\\x60/);
    if(m)jsonStr=m[1];
    m=jsonStr.match(/(\\{[\\s\\S]*\\})/);
    if(m)jsonStr=m[1];
    
    var lore;
    try{lore=JSON.parse(jsonStr)}catch(e){
      // Try to fix common JSON issues
      jsonStr=jsonStr.replace(/,\\s*}/g,'}').replace(/,\\s*]/g,']');
      try{lore=JSON.parse(jsonStr)}catch(e2){throw new Error('JSON解析失败，模型返回格式不正确')}
    }
    
    // Ensure all categories exist
    lore.characters=lore.characters||[];
    lore.settings=lore.settings||[];
    lore.plotPoints=lore.plotPoints||[];
    lore.worldRules=lore.worldRules||[];
    
    var totalCards=lore.characters.length+lore.settings.length+lore.plotPoints.length+lore.worldRules.length;
    if(totalCards===0)throw new Error('未提取到任何内容，对话中可能没有小说相关内容');
    
    updateProgress(90,'✅ 提取 '+totalCards+' 张卡片');
    await new Promise(function(r){setTimeout(r,400)});
    
    var stats='原文 '+origChars.toLocaleString()+' 字 → ';
    if(lore.characters.length)stats+='👤'+lore.characters.length+' ';
    if(lore.settings.length)stats+='🏰'+lore.settings.length+' ';
    if(lore.plotPoints.length)stats+='📖'+lore.plotPoints.length+' ';
    if(lore.worldRules.length)stats+='🌍'+lore.worldRules.length+' ';
    updateProgress(100,'✅ '+stats.trim());
    
    // Store for modal
    _loreData=lore;
    _loreStats=stats;
    await new Promise(function(r){setTimeout(r,600)});
    hideProgress(500);
    
    // Show modal
    renderLoreModal(lore,stats);
    var modal=G('compressModal');
    if(modal)modal.style.display='flex';
    
    toast('✅ 提取 '+totalCards+' 张世界观卡片','success');
  }catch(e){
    if(e.name==='AbortError'){hideProgress(500);toast('已取消','info');compressBtn.disabled=false;return}
    _abortController=null;
    updateProgress(100,'❌ '+e.message);
    G('pubFill').style.background='#e05555';
    await new Promise(function(r){setTimeout(r,2500)});
    hideProgress(500);
    toast('❌ '+e.message,'error');
  }
  compressBtn.disabled=false;
}`;

if (c.includes(oldCC)) {
  c = c.replace(oldCC, newCC);
  patches++;
  console.log("Patch 1 OK: Lorebook compressContext");
} else console.log("Patch 1 FAILED");

// ============================================================
// PATCH 2: Replace old compress helpers with Lorebook helpers
// ============================================================
const oldHelpers = `
function closeCompress(){G('compressModal').style.display='none'}

function copyCompressed(){
  if(!_compressedText){toast('无内容','error');return}
  navigator.clipboard.writeText(_compressedText).then(function(){toast('已复制','success')}).catch(function(){toast('复制失败','error')});
}

function useCompressed(){
  if(!_compressedText){toast('无内容','error');return}
  userInput.value=_compressedText;
  closeCompress();
  userInput.focus();
  userInput.style.height='auto';
  userInput.style.height=userInput.scrollHeight+'px';
}

var _compressedText='';
var _compressStats='';`;

const newHelpers = `
function closeCompress(){G('compressModal').style.display='none'}

var _loreData=null;
var _loreStats='';
var _loreTab='characters';

function renderLoreModal(lore,stats){
  G('compressStats').textContent=stats;
  _loreTab='characters';
  renderLoreTab();
}

function switchLoreTab(tab){
  _loreTab=tab;
  renderLoreTab();
}

function renderLoreTab(){
  var tabs=G('loreTabs').querySelectorAll('.lore-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].dataset.tab===_loreTab);
  var data=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var list=data[_loreTab]||[];
  var el=G('loreCardList');
  if(!list.length){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px">此类别暂无提取内容</div>';return}
  
  var labels={characters:'👤',settings:'🏰',plotPoints:'📖',worldRules:'🌍'};
  var titles={characters:'角色',settings:'场景',plotPoints:'情节',worldRules:'世界观'};
  
  el.innerHTML=list.map(function(card,i){
    var lines=[];
    for(var k in card){if(card[k]&&typeof card[k]==='string'&&card[k].trim())lines.push('<div class="lore-line"><span class="lore-key">'+k+'</span> <span class="lore-val">'+esc(card[k])+'</span></div>')}
    return '<div class="lore-card"><div class="lore-card-hdr">'+labels[_loreTab]+' <b>'+(card.name||card.event||card.rule||('#'+(i+1)))+'</b></div>'+lines.join('')+'</div>';
  }).join('');
}

function saveLorebook(){
  if(!_loreData)return;
  st.lorebook=st.lorebook||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var cats=['characters','settings','plotPoints','worldRules'];
  var added=0,updated=0;
  for(var ci=0;ci<cats.length;ci++){
    var cat=cats[ci];
    var newCards=_loreData[cat]||[];
    for(var ni=0;ni<newCards.length;ni++){
      var nc=newCards[ni];
      var nameKey=nc.name||nc.event||nc.rule;
      if(!nameKey)continue;
      var existing=st.lorebook[cat].find(function(x){return (x.name||x.event||x.rule)===nameKey});
      if(existing){
        for(var k in nc){if(nc[k])existing[k]=nc[k]}
        updated++;
      }else{
        st.lorebook[cat].push(nc);
        added++;
      }
    }
  }
  save();
  renderLoreSidebar();
  closeCompress();
  toast('✅ 已保存'+added+'张新卡片'+(updated?'，更新'+updated+'张':''),'success');
}

function copyCompressed(){
  if(!_loreData){toast('无内容','error');return}
  var text='';
  var cats={characters:'角色',settings:'场景',plotPoints:'情节',worldRules:'世界观'};
  for(var k in cats){
    var cards=_loreData[k]||[];
    if(!cards.length)continue;
    text+='## '+cats[k]+'\\n';
    for(var i=0;i<cards.length;i++){
      var c=cards[i];
      text+='- '+(c.name||c.event||c.rule||('#'+(i+1)));
      for(var f in c){if(f!=='name'&&f!=='event'&&f!=='rule'&&c[f])text+=' | '+f+': '+c[f]}
      text+='\\n';
    }
    text+='\\n';
  }
  navigator.clipboard.writeText(text).then(function(){toast('已复制','success')}).catch(function(){toast('复制失败','error')});
}

function useCompressed(){
  if(!_loreData){toast('无内容','error');return}
  var lore=st.lorebook||_loreData;
  var text=buildLoreContext(lore);
  userInput.value='请根据以下世界观设定继续创作：\\n\\n'+text+'\\n\\n请继续。';
  closeCompress();
  userInput.focus();
  userInput.style.height='auto';
  userInput.style.height=userInput.scrollHeight+'px';
}

function buildLoreContext(lore){
  lore=lore||st.lorebook||{};
  var parts=[];
  if(lore.characters&&lore.characters.length){
    parts.push('## 角色');
    for(var i=0;i<lore.characters.length;i++){
      var c=lore.characters[i];
      parts.push('- '+c.name+(c.role?' ('+c.role+')':'')+(c.personality?': '+c.personality:''));
    }
  }
  if(lore.settings&&lore.settings.length){
    parts.push('## 场景');
    for(var i=0;i<lore.settings.length;i++){
      var s=lore.settings[i];
      parts.push('- '+s.name+(s.type?' ['+s.type+']':'')+(s.description?': '+s.description.substring(0,80):''));
    }
  }
  if(lore.plotPoints&&lore.plotPoints.length){
    parts.push('## 情节节点');
    for(var i=0;i<lore.plotPoints.length;i++){
      var p=lore.plotPoints[i];
      parts.push('- '+p.event+(p.status?' ['+p.status+']':''));
    }
  }
  if(lore.worldRules&&lore.worldRules.length){
    parts.push('## 世界观规则');
    for(var i=0;i<lore.worldRules.length;i++){
      var w=lore.worldRules[i];
      parts.push('- '+w.rule+(w.category?' ['+w.category+']':''));
    }
  }
  return parts.join('\\n');
}

// Delete a lorebook card from sidebar
function delLoreCard(cat,idx){
  if(!confirm('删除这张卡片？'))return;
  st.lorebook[cat].splice(idx,1);
  save(); renderLoreSidebar();
  toast('已删除','info');
}`;

if (c.includes(oldHelpers)) {
  c = c.replace(oldHelpers, newHelpers);
  patches++;
  console.log("Patch 2 OK: Lorebook helpers");
} else console.log("Patch 2 FAILED");

// ============================================================
// PATCH 3: Replace compress modal HTML
// ============================================================
const oldModal = `<div class="modal-overlay" id="compressModal">
  <div class="modal" style="max-width:700px;max-height:80vh">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:15px;font-weight:600">🗜️ 上下文压缩结果</div>
      <div style="display:flex;gap:6px">
        <span id="compressStats" style="font-size:11px;color:var(--text-secondary)"></span>
        <button class="btn-sm" onclick="copyCompressed()" style="padding:4px 10px;font-size:11px">📋 复制</button>
        <button class="btn-sm" onclick="useCompressed()" style="padding:4px 10px;font-size:11px;background:var(--accent);color:#fff">💬 作为新消息</button>
        <button class="btn-sm" onclick="closeCompress()" style="padding:4px 10px;font-size:11px">✕</button>
      </div>
    </div>
    <div id="compressResult" style="background:var(--hover);border-radius:8px;padding:16px;max-height:55vh;overflow-y:auto;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word"></div>
  </div>
</div>`;

const newModal = `<div class="modal-overlay" id="compressModal">
  <div class="modal" style="max-width:750px;max-height:88vh">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <div style="font-size:15px;font-weight:600">📖 世界观 Lorebook · 提取结果</div>
      <div style="display:flex;gap:6px;align-items:center">
        <span id="compressStats" style="font-size:11px;color:var(--text-secondary);margin-right:4px"></span>
        <button class="btn-sm" onclick="saveLorebook()" style="padding:5px 12px;font-size:12px;background:var(--accent);color:#fff;font-weight:600">💾 保存全部</button>
        <button class="btn-sm" onclick="copyCompressed()" style="padding:5px 10px;font-size:12px">📋 复制</button>
        <button class="btn-sm" onclick="useCompressed()" style="padding:5px 10px;font-size:12px">💬 注入上下文</button>
        <button class="btn-sm" onclick="closeCompress()" style="padding:5px 10px;font-size:12px">✕</button>
      </div>
    </div>
    <div id="loreTabs" style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px">
      <button class="lore-tab active" data-tab="characters" onclick="switchLoreTab('characters')">👤 角色 <span id="loreCount_c" style="font-size:10px"></span></button>
      <button class="lore-tab" data-tab="settings" onclick="switchLoreTab('settings')">🏰 场景 <span id="loreCount_s" style="font-size:10px"></span></button>
      <button class="lore-tab" data-tab="plotPoints" onclick="switchLoreTab('plotPoints')">📖 情节 <span id="loreCount_p" style="font-size:10px"></span></button>
      <button class="lore-tab" data-tab="worldRules" onclick="switchLoreTab('worldRules')">🌍 世界观 <span id="loreCount_w" style="font-size:10px"></span></button>
    </div>
    <div id="loreCardList" style="max-height:60vh;overflow-y:auto;padding-right:4px"></div>
  </div>
</div>`;

if (c.includes(oldModal)) {
  c = c.replace(oldModal, newModal);
  patches++;
  console.log("Patch 3 OK: Lorebook modal");
} else console.log("Patch 3 FAILED");

// ============================================================
// PATCH 4: Add Lorebook CSS
// ============================================================
const cssMarker = `.compress-btn:disabled{opacity:0.5;cursor:not-allowed}`;
const newCss = `.compress-btn:disabled{opacity:0.5;cursor:not-allowed}
.lore-tab{background:none;border:none;color:var(--text-secondary);padding:6px 12px;cursor:pointer;font-size:12px;border-radius:6px;transition:all 0.15s;font-weight:500}
.lore-tab:hover{background:var(--hover);color:var(--text)}
.lore-tab.active{background:var(--accent);color:#fff}
.lore-card{background:var(--hover);border-radius:8px;padding:10px 14px;margin-bottom:6px;border-left:3px solid var(--accent)}
.lore-card-hdr{font-size:13px;margin-bottom:4px;color:var(--text)}
.lore-line{font-size:11px;padding:2px 0;display:flex;gap:6px}
.lore-key{color:var(--accent);font-weight:600;min-width:60px;flex-shrink:0}
.lore-val{color:var(--text-secondary);word-break:break-word}
.lore-side-card{background:var(--hover);border-radius:6px;padding:6px 10px;margin:3px 0;font-size:11px;display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
.lore-side-card .lore-side-name{color:var(--text);font-weight:600;font-size:12px}
.lore-side-card .lore-side-del{background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:10px;padding:0 3px;flex-shrink:0}
.lore-side-card .lore-side-del:hover{color:var(--danger)}`;

if (c.includes(cssMarker)) {
  c = c.replace(cssMarker, newCss);
  patches++;
  console.log("Patch 4 OK: Lorebook CSS");
} else console.log("Patch 4 FAILED");

// ============================================================
// PATCH 5: Update renderLoreModal to show card counts
// PATCH 6: Add lorebook injection to system prompt
// PATCH 7: Add st.lorebook initialization
// PATCH 8: Add lorebook sidebar section
// ============================================================

// Update renderLoreModal to also set tab counts
const oldRLM = `function renderLoreModal(lore,stats){
  G('compressStats').textContent=stats;
  _loreTab='characters';
  renderLoreTab();
}`;

const newRLM = `function renderLoreModal(lore,stats){
  G('compressStats').textContent=stats;
  _loreTab='characters';
  // Set tab counts
  G('loreCount_c').textContent='('+((lore.characters||[]).length)+')';
  G('loreCount_s').textContent='('+((lore.settings||[]).length)+')';
  G('loreCount_p').textContent='('+((lore.plotPoints||[]).length)+')';
  G('loreCount_w').textContent='('+((lore.worldRules||[]).length)+')';
  renderLoreTab();
}`;

if (c.includes(oldRLM)) {
  c = c.replace(oldRLM, newRLM);
  patches++;
  console.log("Patch 5 OK: tab counts");
} else console.log("Patch 5 FAILED");

// Add lorebook to state initialization in load()
const oldLoad = `st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0; st.rvEntries=st.rvEntries||[];`;
const newLoad = `st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0; st.lorebook=st.lorebook||{characters:[],settings:[],plotPoints:[],worldRules:[]}; st.rvEntries=st.rvEntries||[];`;
if (c.includes(oldLoad)) {
  c = c.replace(oldLoad, newLoad);
  patches++;
  console.log("Patch 6 OK: lorebook state init");
} else console.log("Patch 6 FAILED");

// Add lorebook to system prompt (after long-term memory injection)
const oldSys = `  if(memLines.length)sys=(sys?sys+'\\n\\n':'')+'# 长期记忆\\n'+memLines.map(function(m){return'- '+m}).join('\\n');
  if(sys)apiMsgs.push({role:'system',content:sys});`;

const newSys = `  if(memLines.length)sys=(sys?sys+'\\n\\n':'')+'# 长期记忆\\n'+memLines.map(function(m){return'- '+m}).join('\\n');
  var lorebook=st.lorebook;
  if(lorebook){
    var loreText=buildLoreContext(lorebook);
    if(loreText)sys=(sys?sys+'\\n\\n':'')+'# 小说世界观 (Lorebook)\\n'+loreText;
  }
  if(sys)apiMsgs.push({role:'system',content:sys});`;

if (c.includes(oldSys)) {
  c = c.replace(oldSys, newSys);
  patches++;
  console.log("Patch 7 OK: lorebook injection");
} else console.log("Patch 7 FAILED");

// ============================================================
// PATCH 8: Add lorebook sidebar section (after 长期记忆)
// ============================================================
const memSidebarEnd = `</div></div></div>\r\n      <div class="side-sec" id="secBackup"`;

const loreSidebar = `</div></div></div>\r\n      <div class="side-sec" id="secLore">
        <div class="side-sec-hdr collapsed" onclick="toggleSec('secLore')"><span>📖 世界观 <span class="arr">▼</span></span></div>
        <div class="side-sec-body hidden"><div class="pad" id="loreSideList"><div style="padding:8px;font-size:11px;color:var(--text-secondary);text-align:center">点击 🗜️ 提取世界观</div></div></div>
      </div>\r\n      <div class="side-sec" id="secBackup"`;

if (c.includes(memSidebarEnd)) {
  c = c.replace(memSidebarEnd, loreSidebar);
  patches++;
  console.log("Patch 8 OK: lorebook sidebar");
} else console.log("Patch 8 FAILED");

// Add renderLoreSidebar function before renderMems
const oldRenderMems = `function renderMems(){`;
const renderLoreFn = `function renderLoreSidebar(){
  var el=G('loreSideList');
  if(!el)return;
  var lore=st.lorebook||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var cats=[{key:'characters',label:'👤 角色',icon:'👤'},{key:'settings',label:'🏰 场景',icon:'🏰'},{key:'plotPoints',label:'📖 情节',icon:'📖'},{key:'worldRules',label:'🌍 世界观',icon:'🌍'}];
  var html='';
  var total=0;
  for(var ci=0;ci<cats.length;ci++){
    var cat=cats[ci];
    var cards=lore[cat.key]||[];
    if(!cards.length)continue;
    total+=cards.length;
    html+='<div style="font-size:11px;font-weight:600;color:var(--text-secondary);margin:8px 0 4px">'+cat.label+'</div>';
    for(var i=0;i<cards.length;i++){
      var card=cards[i];
      var name=card.name||card.event||card.rule||'#'+(i+1);
      html+='<div class="lore-side-card"><div><div class="lore-side-name">'+esc(name)+'</div><div style="color:var(--text-secondary);font-size:10px">'+(card.role||card.type||card.category||'')+'</div></div><button class="lore-side-del" onclick="delLoreCard(\\''+cat.key+'\\','+i+')">✕</button></div>';
    }
  }
  if(!total)html='<div style="padding:8px;font-size:11px;color:var(--text-secondary);text-align:center">点击 🗜️ 提取世界观</div>';
  el.innerHTML=html;
}

function renderMems(){`;

if (c.includes(oldRenderMems)) {
  c = c.replace(oldRenderMems, renderLoreFn);
  patches++;
  console.log("Patch 9 OK: renderLoreSidebar");
} else console.log("Patch 9 FAILED");

// Add renderLoreSidebar call to renderAll or wherever renderMems is called
const oldRenderAll = `renderMems();renderSidebar();`;
if (c.includes(oldRenderAll)) {
  c = c.replace(oldRenderAll, `renderLoreSidebar();renderMems();renderSidebar();`);
  patches++;
  console.log("Patch 10 OK: renderAll hook");
}

// Also find standalone renderMems calls
// Find renderMems() calls and add renderLoreSidebar before them
// Look for patterns like "save(); renderMems()" or "; renderMems()"
// Actually, let me just update the call sites I know about

// Verify
let b = 0; for (let ch of c) { if (ch==='{') b++; if (ch==='}') b--; }
console.log("Braces:", b);
const ss = c.indexOf("<script>");
const se = c.indexOf("</script>", ss);
try { new Function(c.substring(ss+8, se)); console.log("JS: OK"); }
catch(e) { console.log("JS:", e.message); }

if (b === 0) {
  fs.writeFileSync("C:/Users/zhong/Documents/ChatStory/index.html", c, "utf8");
  console.log("Written, patches:", patches);
} else console.log("BRACE ERROR, not written");