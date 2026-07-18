const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");
const rn = "\r\n";

// Fix line 136 - pull endpoint
c = c.replace(
  "const { branch, token, repo } = JSON.parse(body || '{}');",
  "const { branch, token, repo, platform } = JSON.parse(body || '{}');"
);

// Fix line 138-139 - pull
c = c.replace(
  "      let remote = 'origin';" + rn + "      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';" + rn + "      git('stash');",
  "      const host = platform === 'github' ? 'github.com' : 'gitee.com';" + rn + "      let remote = 'origin';" + rn + "      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';" + rn + "      git('stash');"
);

// Fix line 148 - push endpoint
c = c.replace(
  "const { branch, message, token, repo } = JSON.parse(body || '{}');",
  "const { branch, message, token, repo, platform } = JSON.parse(body || '{}');"
);

// Fix line 151-152 - push
c = c.replace(
  "      let remote = 'origin';" + rn + "      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';" + rn + "      const add = git('add -A');",
  "      const host = platform === 'github' ? 'github.com' : 'gitee.com';" + rn + "      let remote = 'origin';" + rn + "      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';" + rn + "      const add = git('add -A');"
);

console.log("github.com:", c.includes("github.com"));
console.log("platform:", c.includes("platform === 'github'"));

fs.writeFileSync(path, c, "utf8");
console.log("Saved.");
