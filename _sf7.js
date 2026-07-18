const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");
const rn = "\r\n";

// Fix push to use --force-with-lease for publish workflow
c = c.replace(
  "if (token) { push = git('push ' + remote + ' ' + b); }",
  "if (token) { push = git('push ' + remote + ' ' + b + ' --force-with-lease'); }"
);

console.log("force push:", c.includes("--force-with-lease"));
fs.writeFileSync(path, c, "utf8");
console.log("Saved.");
