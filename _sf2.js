const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Fix push endpoint - extract platform
c = c.replace(
  "const { branch, message, token, repo } = JSON.parse(body || '{}');\n      const b = branch || 'main';\n      const m = message || 'Sync from ChatStory';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';",
  "const { branch, message, token, repo, platform } = JSON.parse(body || '{}');\n      const b = branch || 'main';\n      const m = message || 'Sync from ChatStory';\n      const host = platform === 'github' ? 'github.com' : 'gitee.com';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';"
);

// Fix pull endpoint - extract platform
c = c.replace(
  "const { branch, token, repo } = JSON.parse(body || '{}');\n      const b = branch || 'main';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';",
  "const { branch, token, repo, platform } = JSON.parse(body || '{}');\n      const b = branch || 'main';\n      const host = platform === 'github' ? 'github.com' : 'gitee.com';\n      let remote = 'origin';\n      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';"
);

console.log("Push fixed:", c.includes("platform === 'github'"));
fs.writeFileSync(path, c, "utf8");
console.log("Saved. Size:", c.length);
