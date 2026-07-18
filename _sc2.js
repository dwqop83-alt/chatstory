const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/server.js", "utf8");
const lines = c.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("gitee.com")) {
    console.log((i+1) + ": " + lines[i]);
    console.log((i+2) + ": " + (lines[i+1]||""));
    console.log((i+3) + ": " + (lines[i+2]||""));
    console.log("---");
  }
}
