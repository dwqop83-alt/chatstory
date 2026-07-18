const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/index.html";
let c = fs.readFileSync(path, "utf8");

// 1. Fix double renderXxxReasons calls
c = c.replace("renderRvReasons(); renderRvReasons();", "renderRvReasons();");
c = c.replace("renderGvReasons(); renderGvReasons();", "renderGvReasons();");

// 2. Fix toast text
c = c.replace('toast("???","success")', 'toast("\u5df2\u5220\u9664","success")');

// 3. Update renderRvReasons with tag chips
c = c.replace(
  /function renderRvReasons\(\)\{[^}]+\}/,
  'function renderRvReasons(){G(\'rvReason\').innerHTML=\'<option value="">-- \u9009\u62e9\u539f\u56e0 --</option>\'+st.rvReasons.map(r=>\'<option>\'+esc(r)+\'</option>\').join(\'\');var tc=G(\'rvTagChips\');if(tc)tc.innerHTML=st.rvReasons.map(function(r,i){return\'<span class="tag-chip">\'+esc(r)+\'<button class="tag-chip-del" onclick="delRvReason(\'+i+\')">\u2715</button></span>\'}).join(\'\')}'
);

// 4. Update renderGvReasons with tag chips
c = c.replace(
  /function renderGvReasons\(\)\{[^}]+\}/,
  'function renderGvReasons(){G(\'gvReason\').innerHTML=\'<option value="">-- \u9009\u62e9\u6807\u7b7e --</option>\'+st.gvReasons.map(r=>\'<option>\'+esc(r)+\'</option>\').join(\'\');var tc=G(\'gvTagChips\');if(tc)tc.innerHTML=st.gvReasons.map(function(r,i){return\'<span class="tag-chip">\'+esc(r)+\'<button class="tag-chip-del" onclick="delGvReason(\'+i+\')">\u2715</button></span>\'}).join(\'\')}'
);

// 5. Update renderRVs to include redo/edit buttons on AI analysis
c = c.replace(
  /function renderRVs\(\)\{[\s\S]*?\n\}/,
`function renderRVs(){
  var el=G('rvList');
  if(!st.rvEntries.length){el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-secondary)">\u6682\u65e0\u8bb0\u5f55</div>';return}
  el.innerHTML=[...st.rvEntries].reverse().map(e=>'<div class="review-entry"><button class="review-entry-del" onclick="delRv(\\''+e.id+'\\')">\u2715</button><span class="review-entry-num">#'+e.num+'</span> <span class="review-entry-date">'+new Date(e.date).toLocaleString('zh-CN')+'</span><div class="review-entry-text">'+esc(e.text.slice(0,300))+(e.text.length>300?'...':'')+'</div><div class="review-entry-reason"><strong>\u539f\u56e0\uff1a</strong>'+esc(e.reason)+'</div><div class="review-entry-ai"><strong>\ud83e\udd16 AI\u5206\u6790\uff1a</strong> <span class="rv-actions"><button class="rv-act" onclick="redoRvAI(\\''+e.id+'\\')" title="\u91cd\u65b0\u5206\u6790">\ud83d\udd04</button><button class="rv-act" onclick="editRvAI(\\''+e.id+'\\')" title="\u7f16\u8f91">\u270f\ufe0f</button></span><br><span id="rvai-'+e.id+'">'+esc(e.aiAnalysis)+'</span></div></div>').join('');
}`.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
);

// Verify
console.log('renderRvReasons tag-chip:', c.includes('tag-chip'));
console.log('renderGvReasons tag-chip:', c.match(/function renderGvReasons\(\)\{[^}]+\}/)?.[0].includes('tag-chip'));
console.log('redoRvAI:', c.includes('redoRvAI'));
console.log('editRvAI:', c.includes('editRvAI'));

