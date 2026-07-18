const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Fix push endpoint - support platform param
c = c.replace(
  "let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';\n      const add = git('add -A');",
  "let platform = bodyObj.platform || 'gitee';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + (platform==='github'?'github.com':'gitee.com') + '/' + repo + '.git';\n      const add = git('add -A');"
);

// Fix pull endpoint - support platform param
c = c.replace(
  "let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';\n      git('stash');",
  "let platform = bodyObj.platform || 'gitee';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + (platform==='github'?'github.com':'gitee.com') + '/' + repo + '.git';\n      git('stash');"
);

console.log("Push fixed:", c.includes("platform==='github'"));
fs.writeFileSync(path, c, "utf8");
console.log("Server saved. Size:", c.length);
