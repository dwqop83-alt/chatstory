const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/index.html";
let c = fs.readFileSync(path, "utf8");

// Replace from PUBLISH marker to GITEE SYNC marker
const oldPublishRegex = /\/\/ ===== PUBLISH \(GitHub \+ Render\) =====[\s\S]*?\/\/ ===== GITEE SYNC =====/;

const newPublishBlock = `// ===== PUBLISH (Gitee) =====
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
// ===== GITEE SYNC =====`;

if (oldPublishRegex.test(c)) {
  c = c.replace(oldPublishRegex, newPublishBlock);
  console.log("Replaced OK");
} else {
  console.log("Regex NO MATCH");
  process.exit(1);
}

const jsMatch = c.match(/<script>([\s\S]*?)<\/script>/);
if (jsMatch) {
  try { new Function(jsMatch[1].trim()); console.log('JS OK'); }
  catch(e) { console.log('JS ERR:', e.message); process.exit(1); }
}

console.log("updateVersion:", c.includes("function updateVersion"));
console.log("appVersion:", c.includes("appVersion"));
console.log("暂存中:", c.includes("暂存中"));

const opens = (c.match(/\{/g)||[]).length;
const closes = (c.match(/\}/g)||[]).length;
console.log('Braces:', opens, '/', closes, 'Diff:', opens-closes);

fs.writeFileSync(path, c, "utf8");
console.log('SAVED. Size:', c.length);
