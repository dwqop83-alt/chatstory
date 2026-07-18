const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/index.html";
let c = fs.readFileSync(path, "utf8");

// Update publishApp to send platform
c = c.replace(
  "body:JSON.stringify({message:msg,token:s.githubToken,repo:s.githubRepo,branch:s.githubBranch||'main'})",
  "body:JSON.stringify({message:msg,token:s.githubToken,repo:s.githubRepo,branch:s.githubBranch||'main',platform:'github'})"
);

console.log("platform github in publish:", c.includes("platform:'github'"));

const jsMatch = c.match(/<script>([\s\S]*?)<\/script>/);
if (jsMatch) {
  try { new Function(jsMatch[1].trim()); console.log('JS OK'); }
  catch(e) { console.log('JS ERR:', e.message); process.exit(1); }
}

fs.writeFileSync(path, c, "utf8");
console.log("Saved.");
