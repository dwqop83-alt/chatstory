const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/server.js", "utf8");
const lines = c.split("\n");
// Show lines around pull endpoint
for (let i = 134; i < 145; i++) console.log((i+1) + ": " + lines[i]);
console.log("---PUSH---");
for (let i = 146; i < 160; i++) console.log((i+1) + ": " + lines[i]);
