// ChatStory Server - with password protection
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 8080;
const DIR = __dirname;
const PASSWORD = 'chatstory888';
const GIT = process.platform === 'win32' ? '"C:\\Program Files\\Git\\bin\\git.exe"' : 'git';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.md': 'text/markdown'
};

// Simple session tokens
var sessions = {};

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

function git(args) {
  try {
    return { ok: true, output: execSync(GIT + ' ' + args, { cwd: DIR, encoding: 'utf8', timeout: 30000 }).trim() };
  } catch (e) {
    return { ok: false, error: (e.stderr || e.message || '').toString().trim() };
  }
}

function getSession(req) {
  var cookie = req.headers.cookie || '';
  var match = cookie.match(/chatstory_session=([^;]+)/);
  return match ? sessions[match[1]] : null;
}

function setSession(res) {
  var token = crypto.randomBytes(16).toString('hex');
  sessions[token] = { time: Date.now() };
  res.setHeader('Set-Cookie', 'chatstory_session=' + token + '; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax');
  return token;
}

// Clean old sessions every hour
setInterval(function() {
  var now = Date.now();
  for (var k in sessions) { if (now - sessions[k].time > 86400000) delete sessions[k]; }
}, 3600000);

// Login page HTML
var loginPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ChatStory</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#1a1a2e;display:flex;align-items:center;justify-content:center;height:100vh;color:#e0e0e0}
.box{background:#222240;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;min-width:300px}
h1{font-size:24px;margin-bottom:8px;background:linear-gradient(135deg,#4f6ef7,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#999;font-size:14px;margin-bottom:20px}
input{width:100%;padding:12px;border:1px solid #333;border-radius:8px;background:#2a2a50;color:#e0e0e0;font-size:16px;outline:none;margin-bottom:12px;text-align:center}
input:focus{border-color:#4f6ef7}
button{width:100%;padding:12px;background:#4f6ef7;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600}
button:hover{background:#3b5de7}
.error{color:#e05555;font-size:13px;margin-top:8px}
</style></head>
<body>
<div class="box">
<h1>💬 ChatStory</h1>
<p>请输入访问密码</p>
<form method="post" action="/login">
<input type="password" name="pwd" placeholder="密码" autofocus>
<button type="submit">进入</button>
</form>
<div class="error" id="err"></div>
</div>
<script>
var p=new URLSearchParams(window.location.search);
if(p.get('e')) document.getElementById('err').textContent='密码错误';
</script>
</body></html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://x');
  const apiPath = url.pathname;

  // Login endpoint
  if (apiPath === '/login' && req.method === 'POST') {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    if (params.get('pwd') === PASSWORD) {
      setSession(res);
      res.writeHead(302, { 'Location': '/' });
      res.end();
    } else {
      res.writeHead(302, { 'Location': '/?e=1' });
      res.end();
    }
    return;
  }

  // Auth check (skip for manifest/sw.js so PWA works)
  if (apiPath !== '/manifest.json' && apiPath !== '/sw.js' && apiPath !== '/icon-192.png' && apiPath !== '/icon-512.png') {
    if (!getSession(req)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(loginPage);
      return;
    }
  }

  try {
    // Git Status
    if (apiPath === '/api/git/status' && req.method === 'GET') {
      return json(res, git('status --porcelain'));
    }
    // Git Pull
    if (apiPath === '/api/git/pull' && req.method === 'POST') {
      const body = await readBody(req);
      const { branch, token, repo } = JSON.parse(body || '{}');
      const b = branch || 'main';
      let remote = 'origin';
      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';
      git('stash');
      const result = git('pull ' + remote + ' ' + b + ' --rebase');
      git('stash pop');
      return json(res, { pull: result });
    }
    // Git Push
    if (apiPath === '/api/git/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { branch, message, token, repo } = JSON.parse(body || '{}');
      const b = branch || 'main';
      const m = message || 'Sync from ChatStory';
      let remote = 'origin';
      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';
      const add = git('add -A');
      const commit = git('commit -m "' + m.replace(/"/g, '\\"') + '"');
      let push = { ok: true, output: '(skipped - no token)' };
      if (token) { push = git('push ' + remote + ' ' + b); }
      return json(res, { add, commit, push });
    }
    // Data Upload
    if (apiPath === '/api/data/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const fpath = path.join(DIR, 'app-data.json');
      fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
      const add = git('add app-data.json');
      const commit = git('commit -m "App data: ' + new Date().toLocaleString('zh-CN') + '"');
      return json(res, { saved: true, add, commit });
    }
    // Data Download
    if (apiPath === '/api/data/download' && req.method === 'GET') {
      const fpath = path.join(DIR, 'app-data.json');
      if (fs.existsSync(fpath)) {
        const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        return json(res, data);
      }
      return json(res, { error: 'No data file found' }, 404);
    }
    // Git Log
    if (apiPath === '/api/git/log' && req.method === 'GET') {
      return json(res, git('log --oneline -10'));
    }

    // Static files
    let filePath = path.join(DIR, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    if (!filePath.startsWith(DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('404 Not Found'); return; }
      res.writeHead(200); res.end(data);
    });

  } catch (e) {
    json(res, { error: e.message }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('ChatStory Server: http://localhost:' + PORT);
  const s = git('status --porcelain');
  if (s.ok) console.log('Git: OK' + (s.output ? '\n' + s.output : ' (clean)'));
  else console.log('Git: not available');
});
