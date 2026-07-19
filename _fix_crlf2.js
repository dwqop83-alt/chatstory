const fs = require('fs');
let c = fs.readFileSync('C:/Users/zhong/Documents/ChatStory/server.js', 'utf8');

// Fix all broken \r\n in string literals within githubRequest
// Pattern 1: indexOf('\r\n\r\n') - has actual CRLF
c = c.replace(/connectStr\.indexOf\('\r\n\r\n'\)/g, "connectStr.indexOf('\\r\\n\\r\\n')");
// Pattern 2: split('\r\n') - has actual CRLF  
c = c.replace(/connectStr\.split\('\r\n'\)/g, "connectStr.split('\\r\\n')");

fs.writeFileSync('C:/Users/zhong/Documents/ChatStory/server.js', c, 'utf8');

// Verify syntax
try {
  new Function(c);
  console.log('Syntax OK');
} catch(e) {
  console.log('Syntax error:', e.message);
  // Show the error location
  const m = e.message.match(/\((\d+):(\d+)\)/);
  if (m) {
    const line = parseInt(m[1]);
    const lines = c.split('\n');
    console.log('Line ' + line + ':', JSON.stringify(lines[line-1]));
  }
}
