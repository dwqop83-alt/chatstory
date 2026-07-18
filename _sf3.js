const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Fix line 136 - pull endpoint
c = c.replace(
  "const { branch, token, repo } = JSON.parse(body || '{}');",
  "const { branch, token, repo, platform } = JSON.parse(body || '{}');"
);

// Fix line 138-139
c = c.replace(
  "      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';\n      git('stash');",
  "      const host = platform === 'github' ? 'github.com' : 'gitee.com';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';\n      git('stash');"
);

// Fix line 148 - push endpoint
c = c.replace(
  "const { branch, message, token, repo } = JSON.parse(body || '{}');",
  "const { branch, message, token, repo, platform } = JSON.parse(body || '{}');"
);

// Fix line 151-152
c = c.replace(
  "      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';\n      const add = git('add -A');",
  "      const host = platform === 'github' ? 'github.com' : 'gitee.com';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';\n      const add = git('add -A');"
);

console.log("github.com in server:", c.includes("github.com"));
console.log("platform === 'github':", c.includes("platform === 'github'"));

fs.writeFileSync(path, c, "utf8");
console.log("Saved. Size:", c.length);
