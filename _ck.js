const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");
const m = c.match(/function publishApp\(\)\{[\s\S]*?\nfunction updateVersion/);
if (m) {
  console.log("publishApp found, length:", m[0].length);
  console.log("Has 暂存中:", m[0].includes("暂存中"));
  console.log("Has 提交中:", m[0].includes("提交中"));
  console.log("Has 推送中:", m[0].includes("推送中"));
} else {
  console.log("publishApp NOT FOUND");
}
console.log("\nupdateVersion:", c.includes("function updateVersion"));
