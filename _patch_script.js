const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/js/main.js";
let c = fs.readFileSync(path, "utf8");

// 1. Add _streamAbort variable after _debTimer
c = c.replace(
  "let _debTimer = null, _saveTimer = null;",
  "let _debTimer = null, _saveTimer = null;\nlet _streamAbort = null;"
);

// 2. Add stopStream function after onInputKey
c = c.replace(
  "function onInputKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}",
  "function onInputKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}\n\nfunction stopStream(){\n  if(_streamAbort){_streamAbort.abort();_streamAbort=null;}\n  streaming=false;\n  sendBtn.classList.remove('loading');\n  sendBtn.disabled=false;\n  sendBtn.querySelector('.btn-text').textContent='\u53d1\u9001';\n  sendBtn.onclick=sendMsg;\n  userInput.focus();\n  save();\n  renderAll();\n  scrollBottom();\n}"
);

// 3. In sendMsg: add abort controller + stop button before "try"
c = c.replace(
  "streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;\n  try{",
  "streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;\n  _streamAbort=new AbortController();\n  sendBtn.querySelector('.btn-text').textContent='\u505c\u6b62';\n  sendBtn.onclick=stopStream;\n  try{"
);

// 4. In sendMsg: add signal to fetch
c = c.replace(
  "body:JSON.stringify(body)});",
  "body:JSON.stringify(body),signal:_streamAbort.signal});"
);

// 5. In sendMsg: cleanup finally
c = c.replace(
  "finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}",
  "finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='\u53d1\u9001';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}"
);

// 6. In regenerateResponse: add abort + stop button
c = c.replace(
  "streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;\n  try{",
  "streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;\n  _streamAbort=new AbortController();\n  sendBtn.querySelector('.btn-text').textContent='\u505c\u6b62';\n  sendBtn.onclick=stopStream;\n  try{"
);

// 7. In regenerateResponse: add signal to fetch
c = c.replace(
  "body:JSON.stringify(body)});\n    if(!resp.ok)",
  "body:JSON.stringify(body),signal:_streamAbort.signal});\n    if(!resp.ok)"
);

// 8. In regenerateResponse: cleanup finally
c = c.replace(
  "finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}",
  "finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='\u53d1\u9001';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}"
);

fs.writeFileSync(path, c, "utf8");
console.log("Done. Length:", c.length);

// Verify Chinese chars survived
var cc = (c.match(/[\u4e00-\u9fff]/g) || []).length;
console.log("Chinese chars:", cc);
