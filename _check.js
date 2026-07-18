const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");

// Count occurrences of sendMsg marker
const count = (c.match(/async function sendMsg\(\)\{/g) || []).length;
console.log("sendMsg occurrences:", count);

// Also check if there are other matches for this pattern
const indices = [];
let idx = 0;
while ((idx = c.indexOf('async function sendMsg(){', idx)) !== -1) {
  console.log("Found at:", idx);
  indices.push(idx);
  idx++;
}