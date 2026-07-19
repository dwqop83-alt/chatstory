const fs = require("fs");
let c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/js/main.js", "utf8");

// 1. In sendMsg: add abort + stop button + signal
c = c.replace(
  "streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;",
  "streaming=true; sendBtn.classList.add('loading'); sendBtn.disabled=true;\n  _streamAbort=new AbortController();\n  sendBtn.querySelector('.btn-text').textContent='\u505c\u6b62';\n  sendBtn.onclick=stopStream;"
);

// 2. Add signal to the fetch in sendMsg
c = c.replace(
  "body:JSON.stringify(body)});",
  "body:JSON.stringify(body),signal:_streamAbort.signal});"
);

// 3. Cleanup finally in sendMsg
c = c.replace(
  "finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}",
  "finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='\u53d1\u9001';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}"
);

// 4. In regenerateResponse: same abort + stop button
c = c.replace(
  "streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;",
  "streaming=true;sendBtn.classList.add('loading');sendBtn.disabled=true;\n  _streamAbort=new AbortController();\n  sendBtn.querySelector('.btn-text').textContent='\u505c\u6b62';\n  sendBtn.onclick=stopStream;"
);

// 5. Add signal to regenerate fetch
c = c.replace(
  "body:JSON.stringify(body)});",
  "body:JSON.stringify(body),signal:_streamAbort.signal});"
);

// 6. Cleanup finally in regenerateResponse
c = c.replace(
  "finally{streaming=false;sendBtn.classList.remove('loading');sendBtn.disabled=false;userInput.focus();save();renderAll();scrollBottom()}",
  "finally{streaming=false;_streamAbort=null;sendBtn.classList.remove('loading');sendBtn.disabled=false;sendBtn.querySelector('.btn-text').textContent='\u53d1\u9001';sendBtn.onclick=sendMsg;userInput.focus();save();renderAll();scrollBottom()}"
);

fs.writeFileSync("C:/Users/zhong/Documents/ChatStory/js/main.js", c);
console.log("Done. Length:", c.length);
