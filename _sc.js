const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/server.js", "utf8");
// Find push endpoint area
const idx = c.indexOf("api/git/push");
console.log(c.substring(idx, idx + 600));
