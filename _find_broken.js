const fs = require('fs');
let c = fs.readFileSync('C:/Users/zhong/Documents/ChatStory/server.js', 'utf8');

// Find the githubRequest function range
const start = c.indexOf('function githubRequest');
const end = c.indexOf('// GitHub API Push single file');
const fnCode = c.substring(start, end);

// Show all lines with actual \r or \n inside string literals (they should be literal \\r\\n)
const lines = fnCode.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("'") && (lines[i].includes('\r') || lines[i].endsWith("'") === false)) {
    // Check if line has problematic patterns
    if (lines[i].match(/indexOf\(|split\(|write\(|'\s*$/) ) {
      console.log('Line ' + i + ': ' + JSON.stringify(lines[i]));
    }
  }
}
