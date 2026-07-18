const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Change to --force instead of --force-with-lease
c = c.replace("--force-with-lease", "--force");

// Also add a git fetch before push to update refs
c = c.replace(
  "if (token) { push = git('push ' + remote + ' ' + b + ' --force'); }",
  "if (token) { git('fetch ' + remote + ' ' + b); push = git('push ' + remote + ' ' + b + ' --force'); }"
);

console.log("fetch+push:", c.includes("git('fetch"));
fs.writeFileSync(path, c, "utf8");
console.log("Saved.");
