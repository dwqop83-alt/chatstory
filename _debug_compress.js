async function compressContext(){
  var s=st.settings;
  if(!s.apiBaseUrl||!s.apiKey||!s.modelName){toast("请先配置API","error");return}
  var conv=getActive(); if(!conv||!conv.msgs.length){toast("当前对话为空","error");return}
  var compressBtn=G("compressBtn");compressBtn.disabled=true;
  showProgress("🗜️ Lorebook 世界观提取中...");
  updateProgress(3,"📊 扫描对话结构...");
  var convText="";var msgCount=0,userMsgs=0,aiMsgs=0;
  for(var i=0;i<conv.msgs.length;i++){
    var m=conv.msgs[i];
    var roleLabel=m.role==="user"?"用户":"助手";
    var content=typeof m.content==="string"?m.content:JSON.stringify(m.content);
    if(m.error){convText+=roleLabel+": [错误] "+m.error+"\n";msgCount++;continue}
    if(!content||!content.trim())continue;
    convText+=roleLabel+": "+content+"\n\n";msgCount++;
    if(m.role==="user")userMsgs++;else aiMsgs++;
  }
  if(!convText.trim()){toast("无可压缩内容","error");compressBtn.disabled=false;return}
  var origChars=convText.length;
  var dl=G("pubDetail");if(dl){dl.style.display="";dl.innerHTML="";}
  function addLog(txt){var d=G("pubDetail");if(d){d.innerHTML+=txt+"<br>";d.scrollTop=d.scrollHeight}}
  addLog("📊 共 "+msgCount+" 条消息 (👤"+userMsgs+" 🤖"+aiMsgs+"), "+origChars.toLocaleString()+" 字符");
  updateProgress(8,"📝 "+msgCount+"条消息, "+(origChars>1000?(origChars/1000).toFixed(1)+"K":origChars)+"字符");
  await new Promise(function(r){setTimeout(r,200)});
  updateProgress(12,"📋 构建提取Prompt...");
  var extractPrompt="你是一个小说世界观提取助手（Lorebook模式）。从以下对话中提取所有小说创作相关的结构化信息。\n\n要求：\n1. 尽可能全面，不要遗漏次要角色、伏笔、细节设定\n2. 描述要具体（如外貌特征、关系细节），避免空泛\n3. 从用户发言中提取设定，从助手生成内容中确认并补充\n\n严格输出以下JSON格式（不要markdown代码块，只输出纯JSON）：\n\n{\n  \"characters\":[{\"name\":\"角色名\",\"alias\":\"别名/称号\",\"role\":\"主角/配角/反派/龙套\",\"gender\":\"性别\",\"age\":\"年龄\",\"appearance\":\"外貌（五官、发型、配饰）\",\"sexualFeatures\":\"性器官特征\",\"fetish\":\"性癖\",\"personality\":\"性格\",\"background\":\"背景故事\",\"relationships\":\"与其他角色关系\",\"sexPositions\":\"出现过的做爱姿势及次数\",\"arc\":\"角色弧光/成长线\",\"notes\":\"补充\"}],\n  \"settings\":[{\"name\":\"场景/地点名\",\"type\":\"城市/建筑/自然/室内\",\"era\":\"时代背景\",\"description\":\"详细描述\",\"atmosphere\":\"氛围/基调\",\"significance\":\"叙事作用\",\"notes\":\"补充\"}],\n  \"plotPoints\":[{\"event\":\"事件描述\",\"chapter\":\"所在章节/位置\",\"type\":\"主线/支线/伏笔/转折\",\"significance\":\"重要性说明\",\"status\":\"已完成/进行中/待展开\",\"relatedChars\":\"涉及角色\",\"notes\":\"补充\"}],\n  \"worldRules\":[{\"rule\":\"规则/设定\",\"category\":\"魔法/科技/社会/历史/文化/生物\",\"scope\":\"适用范围\",\"details\":\"详细说明\",\"notes\":\"补充\"}]\n}\n\n--- 对话内容 ---\n"+convText+"\n--- 结束 ---\n\n只输出JSON：";
  var promptLen=extractPrompt.length;
  var estTokens=Math.round(promptLen*0.4);
  addLog("📋 Prompt: "+promptLen.toLocaleString()+" 字符 (~"+estTokens.toLocaleString()+" tokens)");
  updateProgress(18,"📋 Prompt: "+promptLen.toLocaleString()+"字符, ~"+estTokens+" tokens");
  await new Promise(function(r){setTimeout(r,200)});
  var apiMsgs=[{role:"user",content:extractPrompt}];
  var reqBody=JSON.stringify({model:s.modelName,messages:apiMsgs,temperature:0.2,stream:false,max_tokens:8192});
  updateProgress(22,"📤 发送至 "+s.modelName+"...");
  addLog("📤 发送至 "+s.modelName+" · max_tokens: 8192 · temp: 0.2");
  _abortController=new AbortController();
  var timeoutId=setTimeout(function(){_abortController.abort()},180000);
  var reqStart=Date.now();
  var resp=await fetch(s.apiBaseUrl.replace(/\/+$/,"")+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.apiKey},body:reqBody,signal:_abortController.signal});
  clearTimeout(timeoutId);_abortController=null;
  var reqTime=Date.now()-reqStart;
  updateProgress(45,"⏳ "+s.modelName+" 响应 ("+(reqTime/1000).toFixed(1)+"s)...");
  addLog("⏳ API响应: "+(reqTime/1000).toFixed(1)+"s · HTTP "+resp.status);
  if(!resp.ok){var rt=await resp.text(),eMsg=rt;try{eMsg=JSON.parse(rt).error?.message||rt}catch(_){}throw new Error("API "+resp.status+": "+eMsg)}
  updateProgress(60,"📥 接收响应数据...");
  var data=await resp.json();
  if(data.usage)addLog("📊 Token: 入"+data.usage.prompt_tokens+" + 出"+data.usage.completion_tokens+" = "+(data.usage.prompt_tokens+data.usage.completion_tokens));
  var raw=data.choices&&data.choices[0]?data.choices[0].message.content:"";
  if(!raw)throw new Error("模型返回为空");
  addLog("📥 响应: "+raw.length.toLocaleString()+" 字符");
  updateProgress(72,"🔍 解析JSON...");
  var jsonStr=raw;
  var BT="`";
  var btr=raw.match(new RegExp(BT+BT+BT+"(?:json)?\\s*\\n?([\\s\\S]*?)\\n?"+BT+BT+BT));
  if(btr){jsonStr=btr[1];addLog("🔍 检测到Markdown代码块")}
  btr=jsonStr.match(/(\{[\s\S]*\})/);
  if(btr){jsonStr=btr[1];addLog("🔍 JSON对象已定位")}
  var lore;
  try{lore=JSON.parse(jsonStr)}catch(e){
    addLog("⚠️ JSON解析失败，尝试修复...");
    jsonStr=jsonStr.replace(/,\s*}/g,"}").replace(/,\s*\]/g,"]");
    try{lore=JSON.parse(jsonStr)}catch(e2){throw new Error("JSON解析失败: "+e2.message)}
    addLog("✅ JSON修复成功");
  }
  updateProgress(80,"📊 分类统计...");
  lore.characters=lore.characters||[];lore.settings=lore.settings||[];
  lore.plotPoints=lore.plotPoints||[];lore.worldRules=lore.worldRules||[];
  var cC=lore.characters.length,cS=lore.settings.length,cP=lore.plotPoints.length,cR=lore.worldRules.length;
  var totalCards=cC+cS+cP+cR;
  if(cC)addLog("👤 角色: "+cC+" 张");if(cS)addLog("🏰 场景: "+cS+" 张");
  if(cP)addLog("📖 情节: "+cP+" 张");if(cR)addLog("🌍 世界观: "+cR+" 张");
  if(totalCards===0)throw new Error("未提取到任何内容");
  updateProgress(88,"✅ 提取: 👤"+cC+" 🏰"+cS+" 📖"+cP+" 🌍"+cR);
  await new Promise(function(r){setTimeout(r,400)});
  var stats="原文 "+origChars.toLocaleString()+" 字 → ";
  if(cC)stats+="👤"+cC+" ";if(cS)stats+="🏰"+cS+" ";
  if(cP)stats+="📖"+cP+" ";if(cR)stats+="🌍"+cR+" ";
  var totalTime=Date.now()-reqStart;
  addLog("⏱️ 总耗时: "+(totalTime/1000).toFixed(1)+"s · 共 "+totalCards+" 张卡片");
  updateProgress(100,"✅ "+stats.trim()+" · "+(totalTime/1000).toFixed(1)+"s");
  _loreData=lore;_loreStats=stats;
  await new Promise(function(r){setTimeout(r,600)});
  hideProgress(500);
  renderLoreModal(lore,stats);
  var modal=G("compressModal");if(modal)modal.style.display="flex";
  toast("✅ 提取 "+totalCards+" 张世界观卡片","success");
}

