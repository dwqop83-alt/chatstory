const jsFns = `async function compressContext(){
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast('请先配置API','error');return}
  var conv=getActive(); if(!conv||!conv.msgs.length){toast('当前对话为空','error');return}
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
  var compressBtn=G('compressBtn');compressBtn.disabled=true;
  showProgress('🗜️ Lorebook 世界观提取中...');
  updateProgress(10,'📊 分析对话 ('+convText.length.toLocaleString()+'字)...');
  await new Promise(function(r){setTimeout(r,300)});
  var origChars=convText.length;
  updateProgress(25,'📤 发送至 '+s.modelName+'...');
  try{
    var extractPrompt='你是一个小说世界观提取助手（Lorebook模式）。从以下对话中提取所有小说创作相关的结构化信息。要求：1. 尽可能全面 2. 描述要具体 3. 从用户发言中提取设定，从助手生成内容中确认并补充。严格输出JSON格式...';
    var apiMsgs=[{role:'user',content:extractPrompt}];
    var body=JSON.stringify({model:s.modelName,messages:apiMsgs,temperature:0.2,stream:false,max_tokens:8192});
    _abortController=new AbortController();
    var timeoutId=setTimeout(function(){_abortController.abort()},180000);
    updateProgress(50,'⏳ '+s.modelName+' 提取中...');
    var resp=await fetch(s.apiBaseUrl.replace(/\\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:body,signal:_abortController.signal});
    clearTimeout(timeoutId);_abortController=null;
    updateProgress(75,'📥 解析结果...');
    if(!resp.ok){var t=await resp.text(),eMsg=t;try{eMsg=JSON.parse(t).error?.message||t}catch(_){}throw new Error('API: '+eMsg)}
    var data=await resp.json();
    var raw=data.choices&&data.choices[0]?data.choices[0].message.content:'';
    if(!raw)throw new Error('模型返回为空');
    var lore;
    try{lore=JSON.parse(raw)}catch(e){throw new Error('JSON解析失败')}
    lore.characters=lore.characters||[];lore.settings=lore.settings||[];
    lore.plotPoints=lore.plotPoints||[];lore.worldRules=lore.worldRules||[];
    var totalCards=lore.characters.length+lore.settings.length+lore.plotPoints.length+lore.worldRules.length;
    if(totalCards===0)throw new Error('未提取到任何内容');
    updateProgress(90,'✅ 提取 '+totalCards+' 张卡片');
    _loreData=lore;
    renderLoreModal(lore,'✅');
    G('compressModal').style.display='flex';
    toast('✅ 提取 '+totalCards+' 张世界观卡片','success');
  }catch(e){
    if(e.name==='AbortError'){toast('已取消','info');compressBtn.disabled=false;return}
    _abortController=null;
    updateProgress(100,'❌ '+e.message);
    toast('❌ '+e.message,'error');
  }
  compressBtn.disabled=false;
}

function closeCompress(){G('compressModal').style.display='none'}
var _loreData=null;var _loreTab='characters';

function renderLoreModal(lore,stats){
  G('loreCount_c').textContent='('+((lore.characters||[]).length)+')';
  G('loreCount_s').textContent='('+((lore.settings||[]).length)+')';
  G('loreCount_p').textContent='('+((lore.plotPoints||[]).length)+')';
  G('loreCount_w').textContent='('+((lore.worldRules||[]).length)+')';
  _loreTab='characters';renderLoreTab();
}

function switchLoreTab(tab){_loreTab=tab;renderLoreTab()}

function renderLoreTab(){
  var tabs=G('loreTabs').querySelectorAll('.lore-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].dataset.tab===_loreTab);
  var data=_loreData||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var list=data[_loreTab]||[];
  var el=G('loreCardList');
  if(!list.length){el.innerHTML='<div>暂无</div>';return}
  var labels={characters:'👤',settings:'🏰',plotPoints:'📖',worldRules:'🌍'};
  el.innerHTML=list.map(function(card,i){
    var lines=[];
    for(var k in card){if(card[k]&&typeof card[k]==='string')lines.push('<div><span>'+k+'</span> '+esc(card[k])+'</div>')}
    return '<div><b>'+(card.name||card.event||card.rule||('#'+i))+'</b>'+lines.join('')+'</div>';
  }).join('');
}

function saveLorebook(){
  if(!_loreData)return;
  st.lorebook=st.lorebook||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var cats=['characters','settings','plotPoints','worldRules'];var added=0;
  for(var ci=0;ci<cats.length;ci++){
    var cat=cats[ci];var newCards=_loreData[cat]||[];
    for(var ni=0;ni<newCards.length;ni++){
      var nc=newCards[ni];var nameKey=nc.name||nc.event||nc.rule;if(!nameKey)continue;
      var existing=st.lorebook[cat].find(function(x){return (x.name||x.event||x.rule)===nameKey});
      if(existing){for(var k in nc){if(nc[k])existing[k]=nc[k]}}
      else{st.lorebook[cat].push(nc);added++}
    }
  }
  save();renderLoreSidebar();closeCompress();
  toast('✅ 已保存'+added+'张新卡片','success');
}

function copyCompressed(){
  var text='';var cats={characters:'角色',settings:'场景',plotPoints:'情节',worldRules:'世界观'};
  for(var k in cats){var cards=(_loreData||{})[k]||[];if(!cards.length)continue;
    text+='## '+cats[k]+'\\n';
    for(var i=0;i<cards.length;i++){text+='- '+(cards[i].name||cards[i].event||cards[i].rule)+'\\n';}
  }
  navigator.clipboard.writeText(text).then(function(){toast('已复制','success')});
}

function useCompressed(){
  var lore=st.lorebook||_loreData||{};var text=buildLoreContext(lore);
  userInput.value='请根据以下世界观设定继续创作：\\n\\n'+text;
  closeCompress();userInput.focus();
}

function buildLoreContext(lore){
  var parts=[];
  if(lore.characters&&lore.characters.length){parts.push('## 角色');
    for(var i=0;i<lore.characters.length;i++){var c=lore.characters[i];parts.push('- '+c.name+(c.role?'('+c.role+')':''));}}
  if(lore.settings&&lore.settings.length){parts.push('## 场景');
    for(var i=0;i<lore.settings.length;i++){var s=lore.settings[i];parts.push('- '+s.name);}}
  if(lore.plotPoints&&lore.plotPoints.length){parts.push('## 情节');
    for(var i=0;i<lore.plotPoints.length;i++){parts.push('- '+lore.plotPoints[i].event);}}
  if(lore.worldRules&&lore.worldRules.length){parts.push('## 世界观');
    for(var i=0;i<lore.worldRules.length;i++){parts.push('- '+lore.worldRules[i].rule);}}
  return parts.join('\\n');
}

function delLoreCard(cat,idx){
  if(!confirm('删除？'))return;
  st.lorebook[cat].splice(idx,1);save();renderLoreSidebar();
}

function renderLoreSidebar(){
  var el=G('loreSideList');if(!el)return;
  var lore=st.lorebook||{characters:[],settings:[],plotPoints:[],worldRules:[]};
  var html='';var total=0;
  var cats=[{key:'characters',label:'👤 角色'},{key:'settings',label:'🏰 场景'},{key:'plotPoints',label:'📖 情节'},{key:'worldRules',label:'🌍 世界观'}];
  for(var ci=0;ci<cats.length;ci++){
    var cat=cats[ci];var cards=lore[cat.key]||[];if(!cards.length)continue;total+=cards.length;
    html+='<div>'+cat.label+'</div>';
    for(var i=0;i<cards.length;i++){
      var card=cards[i];var name=card.name||card.event||card.rule||('#'+(i+1));
      html+='<div>'+esc(name)+'<button onclick="delLoreCard(\\''+cat.key+'\\','+i+')">✕</button></div>';
    }
  }
  if(!total)html='<div>点击 🗜️ 提取世界观</div>';
  el.innerHTML=html;
}

async function sendMsg(){`;

let open = 0, close = 0;
for (let ch of jsFns) {
  if (ch === '{') open++;
  if (ch === '}') close++;
}
console.log("Open:", open, "Close:", close, "Net:", open - close);