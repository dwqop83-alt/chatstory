const fs = require("fs");
const c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");
const ccStart = c.indexOf("async function compressContext(){");
const ccEnd = c.indexOf("\r\nfunction closeCompress()", ccStart);
console.log(c.substring(ccStart, ccEnd));