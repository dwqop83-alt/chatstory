const fs = require('fs');
let c = fs.readFileSync('C:/Users/zhong/Documents/ChatStory/server.js', 'utf8');

// The broken line has actual newlines inside a string literal
// Need to replace with literal \r\n (backslash r backslash n)
// Pattern in file: 'CONNECT ' + u.hostname + ':443 HTTP/1.1<LF>Host: ' + u.hostname + ':443<LF><LF>'

// Find and fix
const idx = c.indexOf("HTTP/1.1\nHost");
if (idx >= 0) {
  // Replace \n with \\n (literal backslash-n) in this specific area
  const before = c.substring(0, idx);
  const after = c.substring(idx);
  // Only fix the CONNECT line
  const fixed = after.replace(/HTTP\/1\.1\n/, 'HTTP/1.1\\r\\n')
                     .replace(/:443\n\n/, ':443\\r\\n\\r\\n');
  c = before + fixed;
  console.log('Fixed!');
} else {
  console.log('Pattern not found, trying CRLF variant');
  const idx2 = c.indexOf("HTTP/1.1\r\nHost");
  if (idx2 >= 0) {
    console.log('CRLF variant found at:', idx2);
    // Replace actual CRLF with literal \r\n
    c = c.replace(/HTTP\/1\.1\r\n/, 'HTTP/1.1\\r\\n')
         .replace(/:443\r\n\r\n/, ':443\\r\\n\\r\\n');
    console.log('Fixed CRLF!');
  }
}

fs.writeFileSync('C:/Users/zhong/Documents/ChatStory/server.js', c, 'utf8');

// Verify syntax
try {
  new Function(c);
  console.log('Syntax OK');
} catch(e) {
  console.log('Syntax error:', e.message);
}
