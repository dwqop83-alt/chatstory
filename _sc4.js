const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/server.js", "utf8");
// Check line endings
console.log("Has CR:", c.includes("\r"));
console.log("Has CRLF:", c.includes("\r\n"));
// Try to match with \r\n
const line = "      let remote = 'origin';\r\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';\r\n      const add = git('add -A');";
console.log("Match with CRLF:", c.includes(line));
