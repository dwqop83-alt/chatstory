const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");

// Find the compressContext function
const ccStart = c.indexOf("async function compressContext");
const ccEnd = c.indexOf("function closeCompress", ccStart);
console.log("=== compressContext ===");
console.log(c.substring(ccStart, ccEnd));

// Find the compress modal HTML
const modalStart = c.indexOf("compressModal");
console.log("\n=== compressModal location ===", modalStart);
const modalEnd = c.indexOf("</div>", c.indexOf("compressResult", modalStart) + 50);
console.log(c.substring(modalStart - 30, modalEnd + 10));

// Find st initialization in load()
const loadStart = c.indexOf("function load()");
const loadEnd = c.indexOf("function save()", loadStart);
console.log("\n=== load() function ===");
console.log(c.substring(loadStart, loadEnd));

// Find system prompt injection
const sysIdx = c.indexOf("var sys=s.systemPrompt");
if (sysIdx > 0) {
  console.log("\n=== System prompt injection ===");
  console.log(c.substring(sysIdx - 20, sysIdx + 300));
}