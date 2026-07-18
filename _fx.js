const fs = require("fs");
const path = "C:/Users/zhong/Documents/ChatStory/server.js";
let c = fs.readFileSync(path, "utf8");

// Add global error handlers before server.listen
c = c.replace(
  "server.listen(PORT, '0.0.0.0', () => {",
  "process.on('uncaughtException', function(err) { console.error('Uncaught:', err.message); });\nprocess.on('unhandledRejection', function(err) { console.error('Unhandled:', err.message); });\nserver.on('error', function(err) { console.error('Server error:', err.message); });\nserver.listen(PORT, '0.0.0.0', () => {"
);

fs.writeFileSync(path, c, "utf8");
console.log("Added error handlers");
