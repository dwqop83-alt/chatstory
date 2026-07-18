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

// 3. Update publishApp with step-by-step status
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
    if(!d2.ok&&!d2.output.includes('nothing to commit')){throw new Error(d2.error||'提交失败')}
    
    setStatus('⏳ 推送中...');
    var r3=await fetch('/api/git/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,token:s.giteeToken,repo:s.giteeRepo,branch:s.giteeBranch||'main'})});
    var d3=await r3.json();
    
    if(d3.push&&d3.push.ok){
      st.version=(st.version||0)+1; save(); updateVersion();
      setStatus('✅ 已发布 v'+st.version);
      toast('已发布 v'+st.version,'success');
      setTimeout(function(){btn.innerHTML=origHTML; btn.disabled=false},2000);
    }else if(d3.commit&&d3.commit.output&&d3.commit.output.indexOf('nothing to commit')>=0){
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

// Replace the old publishApp
c = c.replace(/\/\/ ===== PUBLISH[\s\S]*?function updateVersion/, 'PLACEHOLDER_PUBLISH');
c = c.replace('PLACEHOLDER_PUBLISH', newPublish + 'function updateVersion');

// 4. Call updateVersion on load
c = c.replace(
  "st.convs=st.convs||[]; st.settings=st.settings||{};",
  "st.convs=st.convs||[]; st.settings=st.settings||{}; st.version=st.version||0;"
);
// Add updateVersion call in renderAll or similar
c = c.replace(
  "function renderAll(){renderSidebar();renderChat();renderMdlDrop();renderTokenInfo();renderHeader()}",
  "function renderAll(){renderSidebar();renderChat();renderMdlDrop();renderTokenInfo();renderHeader();updateVersion()}"
);

// 5. Add /api/git/add and /api/git/commit endpoints to server
// These need to be added to server.js
const serverPath = "C:/Users/zhong/Documents/ChatStory/server.js";
let sc = fs.readFileSync(serverPath, "utf8");

// Add add+commit endpoints before "// Git Status"
const newEndpoints = `
    // Git Add
    if (apiPath === '/api/git/add' && req.method === 'POST') {
      const result = git('add -A');
      return json(res, { ok: result.ok, error: result.error });
    }
    // Git Commit
    if (apiPath === '/api/git/commit' && req.method === 'POST') {
      const body = await readBody(req);
      const { message } = JSON.parse(body || '{}');
      const m = message || 'Sync from ChatStory';
      const result = git('commit -m "' + m.replace(/"/g, '\\\\"') + '"');
      return json(res, { ok: result.ok, output: result.output, error: result.error });
    }
    // Git Status`;

sc = sc.replace('// Git Status', newEndpoints + '    // Git Status');

// Remove the add and commit from the push endpoint (now done separately)
sc = sc.replace("      const add = git('add -A');\r\n      const commit = git('commit -m \"' + m.replace(/\"/g, '\\\\\"') + '\");\r\n      ', '');
// Fix the remaining push endpoint
sc = sc.replace("let push = { ok: true, output: '(skipped - no token)' };", "let push = { ok: true, output: '(skipped - no token)' };");

fs.writeFileSync(serverPath, sc, "utf8");
console.log("Server updated. add endpoint:", sc.includes("/api/git/add"));
console.log("commit endpoint:", sc.includes("/api/git/commit"));

// Verify
const jsMatch = c.match(/<script>([\s\S]*?)<\/script>/);
if (jsMatch) {
  try { new Function(jsMatch[1].trim()); console.log('JS OK'); }
  catch(e) { console.log('JS ERR:', e.message); process.exit(1); }
}

const opens = (c.match(/\{/g)||[]).length;
const closes = (c.match(/\}/g)||[]).length;
console.log('Index Braces:', opens, '/', closes, 'Diff:', opens-closes);

fs.writeFileSync(path, c, "utf8");
console.log('Saved. Index:', c.length, 'Server:', sc.length);
