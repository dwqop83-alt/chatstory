const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Increase git timeout from 30000 to 120000 (2 minutes)
c = c.replace("timeout: 30000", "timeout: 120000");

console.log("timeout 120000:", c.includes("timeout: 120000"));
fs.writeFileSync(path, c, "utf8");
console.log("Saved.");
