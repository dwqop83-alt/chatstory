const fs = require("fs");
let c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");

// Use a diff approach - build all changes carefully
// First, let me find the exact brace imbalance location
let depth = 0;
let lastOk = 0;
for (let i = 0; i < c.length; i++) {
  if (c[i] === '{') depth++;
  if (c[i] === '}') depth--;
  if (depth < 0) {
    console.log("Extra } at index", i, "depth went to", depth);
    console.log("Context:", c.substring(Math.max(0,i-50), i+30));
    depth = 0; // reset to find more
  }
}
if (depth > 0) console.log("Unmatched { count:", depth);
if (depth === 0) console.log("Braces are already balanced");