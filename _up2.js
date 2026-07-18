const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/index.html";
let c = fs.readFileSync(path, "utf8");

// 1. Add version to state
c = c.replace(
  "let st = { convs:[], activeCid:null, settings:{",
  "let st = { version:0, convs:[], activeCid:null, settings:{"
);

// 2. Add version display in sidebar header
c = c.replace(
  "<h1>💬 ChatStory</h1>",
  '<h1>💬 ChatStory <span id="appVersion" style="font-size:10px;color:var(--text-secondary);font-weight:400">v0</span></h1>'
);

// 3. Replace publishApp with step-by-step version
const newPublish = `// ===== PUBLISH (Gitee) =====
async function publishApp(){
  var s=st.settings;
  if(!s.giteeToken||!s.giteeRepo){toast('请先在设置中配置 Gitee Token 和仓库','error');return}
  var msg=prompt('发布说明:','发布更新 '+new Date().toLocaleString('zh-CN'));
  if(msg===null)return;
  var btn=document.querySelector('[onclick="publishApp()"]');
  if(!btn) return;
  var origHTML=btn.innerHTML; 
  function setStatus(txt){btn.innerHTML=txt;}
  btn.disabled=true;
  try{
    setStatus('⏳ 暂存中...');
    var r1=await fetch('/api/git/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    var d1=await r1.json();
    if(!d1.ok){throw new Error(d1.error||'暂存失败')}
    
    setStatus('⏳ 提交中...');
    var r2=await fetch('/api/git/commit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});
    var d2=await r2.json();
    if(!d2.ok&&!(d2.output||'').includes('nothing to commit')){throw new Error(d2.error||'提交失败')}
    
    setStatus('⏳ 推送中...');
    var r3=await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,token:s.giteeToken,repo:s.giteeRepo,branch:s.giteeBranch||'main'})});
    var d3=await r3.json();
    
    if(d3.push&&d3.push.ok){
      st.version=(st.version||0)+1; save(); updateVersion();
      setStatus('✅ 已发布 v'+st.version);
      toast('已发布 v'+st.version,'success');
      setTimeout(function(){btn.innerHTML=origHTML; btn.disabled=false},2000);
    }else if(d3.commit&&d3.commit.output&&(d3.commit.output.indexOf('nothing to commit')>=0)){
      setStatus('✅ 无变更');
      toast('没有变更需要发布','success');
      setTimeout(function(){btn.innerHTML=origHTML; btn.disabled=false},2000);
    }else{
      var err=(d3.push?d3.push.error:(d3.commit?d3.commit.error:'未知错误'));
      setStatus('❌ 失败');
      toast('发布失败: '+err,'error');
      btn.innerHTML=origHTML; btn.disabled=false;
    }
  }catch(e){
    setStatus('❌ 失败');
    toast('发布失败: '+e.message,'error');
    btn.innerHTML=origHTML; btn.disabled=false;
  }
}
function updateVersion(){
  var el=document.getElementById('appVersion');
  if(el) el.textContent='v'+(st.version||0);
}
`;

c = c.replace(/\/\/ ===== PUBLISH[\s\S]*?\nfunction updateVersion/, newPublish + '\nfunction updateVersion');

// 4. Init version on load + call in renderAll
c = c.replace(
  "st.convs=st.convs||[]; st.settings=st.settings||{};",
  "st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0;"
);
c = c.replace(
  "function renderAll(){renderSidebar();renderChat();renderMdlDrop();renderTokenInfo();renderHeader()}",
  "function renderAll(){renderSidebar();renderChat();renderMdlDrop();renderTokenInfo();renderHeader();updateVersion()}"
);

// Server: add /api/git/add and /api/git/commit, remove add+commit from push
const serverPath = "C:/Users/zhong/Documents/ChatStory/server.js";
let sc = fs.readFileSync(serverPath, "utf8");
const rn = "\r\n";

// Add new endpoints before Git Status
sc = sc.replace(
  "    // Git Status",
  "    // Git Add" + rn +
  "    if (apiPath === '/api/git/add' && req.method === 'POST') {" + rn +
  "      const result = git('add -A');" + rn +
  "      return json(res, { ok: result.ok, error: result.error });" + rn +
  "    }" + rn +
  "    // Git Commit" + rn +
  "    if (apiPath === '/api/git/commit' && req.method === 'POST') {" + rn +
  "      const body = await readBody(req);" + rn +
  "      const { message } = JSON.parse(body || '{}');" + rn +
  "      const m = message || 'Sync from ChatStory';" + rn +
  "      const result = git('commit -m \"' + m.replace(/\"/g, '\\\\\"') + '\"');" + rn +
  "      return json(res, { ok: result.ok, output: result.output, error: result.error });" + rn +
  "    }" + rn +
  "    // Git Status"
);

// Remove add+commit from push endpoint
sc = sc.replace(
  "      const add = git('add -A');" + rn + "      const commit = git('commit -m \"' + m.replace(/\"/g, '\\\\\"') + '\");" + rn + "      ",
  ""
);

fs.writeFileSync(serverPath, sc, "utf8");
console.log("Server add:", sc.includes("/api/git/add"));
console.log("Server commit:", sc.includes("/api/git/commit"));

const jsMatch = c.match(/<script>([\s\S]*?)<\/script>/);
if (jsMatch) {
  try { new Function(jsMatch[1].trim()); console.log('JS OK'); }
  catch(e) { console.log('JS ERR:', e.message); process.exit(1); }
}

const opens = (c.match(/\{/g)||[]).length;
const closes = (c.match(/\}/g)||[]).length;
console.log('Braces:', opens, '/', closes, 'Diff:', opens-closes);

fs.writeFileSync(path, c, "utf8");
console.log('SAVED. Index:', c.length, 'Server:', sc.length);
