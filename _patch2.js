const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/index.html";
let c = fs.readFileSync(path, "utf8");

// === RENDER FUNCTIONS WITH AI ACTION BUTTONS ===

// Update renderRVs
const newRenderRVs = `function renderRVs(){
  var el=G('rvList');
  if(!st.rvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无记录</div>';return}
  el.innerHTML=[...st.rvEntries].reverse().map(e=>'<div class="review-entry"><button class="review-entry-del" onclick="delRv(\\''+e.id+'\\')">✕</button><span class="review-entry-num">#'+e.num+'</span> <span class="review-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="review-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="review-entry-reason"><strong>原因：</strong>'+esc(e.reason)+'</div><div class="review-entry-ai"><strong>🤖 AI分析：</strong> <span class="rv-actions"><button class="rv-act" onclick="redoRvAI(\\''+e.id+'\\')" title="重新分析">🔄</button><button class="rv-act" onclick="editRvAI(\\''+e.id+'\\')" title="编辑">✏️</button></span><br><span id="rvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}`;
c = c.replace(/function renderRVs\(\)\{[\s\S]*?\n\}/, newRenderRVs);

// Update renderGVs
const newRenderGVs = `function renderGVs(){
  var el=G('gvList');
  if(!st.gvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">暂无记录</div>';return}
  el.innerHTML=[...st.gvEntries].reverse().map(e=>'<div class="good-entry"><button class="good-entry-del" onclick="delGv(\\''+e.id+'\\')">✕</button><span class="good-entry-num">#'+e.num+'</span> <span class="good-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="good-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="good-entry-reason"><strong>标签：</strong>'+esc(e.reason)+'</div><div class="good-entry-ai"><strong>🤖 AI分析：</strong> <span class="rv-actions"><button class="rv-act" onclick="redoGvAI(\\''+e.id+'\\')" title="重新分析">🔄</button><button class="rv-act" onclick="editGvAI(\\''+e.id+'\\')" title="编辑">✏️</button></span><br><span id="gvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}`;
c = c.replace(/function renderGVs\(\)\{[\s\S]*?\n\}/, newRenderGVs);

// === AI ACTION FUNCTIONS ===

// Add before genNegPrompt
const aiFuncs = `function editReviewPrompt(){
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
function genNegPrompt(){`;

c = c.replace('function genNegPrompt(){', aiFuncs);

// === UPDATE CALLAI/CALLGOODAI TO SUPPORT CUSTOM PROMPTS ===

// Update callAI
const newCallAI = `async function callAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('未配置API');
  var def='标记内容："""{text}"""\\n问题：{reason}\\n总结一条负向规则（不应做的事），只输出规则';
  var up=(s.reviewUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'你是审核助手'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(无结果)';
}`;
c = c.replace(/async function callAI\(text,reason\)\{[\s\S]*?\n\}/, newCallAI);

// Update callGoodAI
const newCallGoodAI = `async function callGoodAI(text,reason){
  var s=st.settings; if(!s.apiBaseUrl||!s.apiKey)throw new Error('未配置API');
  var def='优秀描写："""{text}"""\\n标签：{reason}\\n总结一条正向规则（应该效仿的技巧），只输出规则';
  var up=(s.goodUserPrompt||def).replace('{text}',text.slice(0,500)).replace('{reason}',reason);
  var r=await fetch(s.apiBaseUrl.replace(/\\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.modelName,messages:[{role:'system',content:'你是写作点评助手'},{role:'user',content:up}],max_tokens:200,temperature:0.3})});
  if(!r.ok){var t=await r.text(); var m=t; try{m=JSON.parse(t).error?.message||t}catch(_){} throw new Error(m)}
  var d=await r.json(); return d.choices?.[0]?.message?.content?.trim()||'(无结果)';
}`;
c = c.replace(/async function callGoodAI\(text,reason\)\{[\s\S]*?\n\}/, newCallGoodAI);

// === ADD CSS FOR rv-actions/rv-act ===
const rvCss = '.rv-actions{display:inline-flex;gap:2px;margin-left:4px}.rv-act{background:transparent;border:none;cursor:pointer;font-size:12px;padding:1px 4px;border-radius:3px;color:var(--text-secondary);opacity:0.5;transition:all 0.15s}.review-entry:hover .rv-act,.good-entry:hover .rv-act{opacity:1}.rv-act:hover{background:var(--hover);color:var(--text)}';
c = c.replace('/* Memory */', rvCss + '/* Memory */');

// === ADD EDIT PROMPT BUTTONS IN HTML ===
// Next to 记录并分析 button for review
c = c.replace(
  '<button class="btn-sm" id="btnRvAdd" onclick="submitReview()" style="flex:1">📌 记录并分析</button>',
  '<button class="btn-sm" id="btnRvAdd" onclick="submitReview()" style="flex:1">📌 记录并分析</button><button class="btn-sm" onclick="editReviewPrompt()" title="编辑分析Prompt" style="padding:5px 8px;font-size:11px">✏️</button>'
);

// Next to 记录并分析 button for good
c = c.replace(
  '<button class="btn-sm" id="btnGvAdd" onclick="submitGood()" style="flex:1">📌 记录并分析</button>',
  '<button class="btn-sm" id="btnGvAdd" onclick="submitGood()" style="flex:1">📌 记录并分析</button><button class="btn-sm" onclick="editGoodPrompt()" title="编辑分析Prompt" style="padding:5px 8px;font-size:11px">✏️</button>'
);

// === VERIFY ===
const checks = [
  'redoRvAI', 'editRvAI', 'redoGvAI', 'editGvAI',
  'editReviewPrompt', 'editGoodPrompt',
  'rv-actions', 'rv-act',
  'tag-chip'
];
let allOk = true;
for (const ch of checks) {
  const ok = c.includes(ch);
  if (!ok) { console.log('MISSING:', ch); allOk = false; }
  else console.log('OK:', ch);
}

const opens = (c.match(/\{/g)||[]).length;
const closes = (c.match(/\}/g)||[]).length;
console.log('Braces:', opens, '/', closes, 'Diff:', opens-closes);
if (opens !== closes) allOk = false;

if (allOk) {
  fs.writeFileSync(path, c, 'utf8');
  console.log('SAVED. Size:', c.length);
} else {
  console.log('NOT SAVED - fix issues first');
}
