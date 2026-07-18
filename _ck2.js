const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");
const idx = c.indexOf("// ===== PUBLISH");
console.log("PUBLISH at:", idx);
if (idx > 0) {
  console.log(c.substring(idx, idx + 1500));
}
