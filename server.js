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
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8',
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
    return { ok: true, output: execSync(GIT + ' ' + args, { cwd: DIR, encoding: 'utf8', timeout: 120000 }).trim() };
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
.box{background:#222240;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;min-width:320px}
h1{font-size:24px;margin-bottom:8px;background:linear-gradient(135deg,#4f6ef7,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#999;font-size:14px;margin-bottom:20px}
input[type=password]{width:100%;padding:12px;border:1px solid #333;border-radius:8px;background:#2a2a50;color:#e0e0e0;font-size:16px;outline:none;margin-bottom:10px;text-align:center}
input:focus{border-color:#4f6ef7}
button{width:100%;padding:12px;background:#4f6ef7;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600}
button:hover{background:#3b5de7}
.error{color:#e05555;font-size:13px;margin-top:8px}
.remember{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:12px;font-size:13px;color:#999;cursor:pointer}
.remember input{width:auto;margin:0}
</style></head>
<body>
<div class="box">
<h1>💬 ChatStory</h1>
<p>请输入访问密码</p>
<form method="post" action="/login" onsubmit="return onLogin()">
<input type="password" name="pwd" id="pwd" placeholder="密码" autofocus>
<div class="remember"><input type="checkbox" id="remember"><label for="remember">记住密码</label></div>
<button type="submit">进入</button>
</form>
<div class="error" id="err"></div>
</div>
<script>
var p=new URLSearchParams(window.location.search);
if(p.get('e')) document.getElementById('err').textContent='密码错误';

// Load saved password
(function(){
  var saved = localStorage.getItem('chatstory_saved_pwd');
  if(saved) {
    document.getElementById('pwd').value = saved;
    document.getElementById('remember').checked = true;
  }
})();

function onLogin(){
  if(document.getElementById('remember').checked){
    localStorage.setItem('chatstory_saved_pwd', document.getElementById('pwd').value);
  } else {
    localStorage.removeItem('chatstory_saved_pwd');
  }
  return true;
}
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
    // Git Add
    if (apiPath === '/api/git/add' && req.method === 'POST') {
      const result = git('add -A');
      return json(res, { ok: result.ok, error: result.error });
    }
    // Git Commit
    if (apiPath === '/api/git/commit' && req.method === 'POST') {
      const body = await readBody(req);
      const { message } = JSON.parse(body || '{}');
      const m = message || 'Sync from ChatStory';
      const result = git('commit -m "' + m.replace(/"/g, '\\"') + '"');
      return json(res, { ok: result.ok, output: result.output, error: result.error });
    }
    // Git Status
    if (apiPath === '/api/git/status' && req.method === 'GET') {
      return json(res, git('status --porcelain'));
    }
    // Git Pull
    if (apiPath === '/api/git/pull' && req.method === 'POST') {
      const body = await readBody(req);
      const { branch, token, repo, platform } = JSON.parse(body || '{}');
      const b = branch || 'main';
      const host = platform === 'github' ? 'github.com' : 'gitee.com';
      let remote = 'origin';
      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';
      git('stash');
      const result = git('pull ' + remote + ' ' + b + ' --rebase');
      git('stash pop');
      return json(res, { pull: result });
    }
    // Git Push
    if (apiPath === '/api/git/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { branch, message, token, repo, platform } = JSON.parse(body || '{}');
      const b = branch || 'main';
      const m = message || 'Sync from ChatStory';
      const host = platform === 'github' ? 'github.com' : 'gitee.com';
      let remote = 'origin';
      if (token && repo) remote = 'https://oauth2:' + token + '@' + host + '/' + repo + '.git';
      const add = git('add -A');
      const commit = git('commit -m "' + m.replace(/"/g, '\\"') + '"');
      let push = { ok: true, output: '(skipped - no token)' };
      if (token) { git('fetch ' + remote + ' ' + b); push = git('push ' + remote + ' ' + b + ' --force'); }
      return json(res, { add, commit, push });
    }

    // GitHub API helper with automatic proxy support (CONNECT tunnel)
var _proxyUrl = process.env.PROXY_URL || '';
function detectProxy() {
  if (_proxyUrl) return Promise.resolve(_proxyUrl);
  try {
    var net = require('net');
    var s = net.connect(7890, '127.0.0.1');
    s.setTimeout(500);
    return new Promise(function(resolve) {
      s.on('connect', function() { s.destroy(); resolve('http://127.0.0.1:7890'); });
      s.on('timeout', function() { s.destroy(); resolve(''); });
      s.on('error', function() { s.destroy(); resolve(''); });
    });
  } catch(e) { return Promise.resolve(''); }
}
var _proxyCache = null;
async function getProxy() {
  if (_proxyCache !== null) return _proxyCache;
  _proxyCache = await detectProxy();
  console.log('[PROXY] Using:', _proxyCache || 'direct');
  return _proxyCache;
}
function githubRequest(url, options) {
  options = options || {};
  return new Promise(async function(resolve, reject) {
    var u = new URL(url);
    var https = require('https');
    var tls = require('tls');
    var net = require('net');
    var purl = await getProxy();
    var timeoutMs = options.timeout || 30000;

    function makeDirect() {
      var reqOpts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: Object.assign({ 'User-Agent': 'ChatStory' }, options.headers || {}),
        timeout: timeoutMs
      };
      if (options.body) {
        reqOpts.headers['Content-Type'] = 'application/json';
        reqOpts.headers['Content-Length'] = Buffer.byteLength(options.body);
      }
      var req = https.request(reqOpts, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: function() { try { return Promise.resolve(JSON.parse(data)); } catch(e) { return Promise.reject(e); } },
            text: function() { return Promise.resolve(data); }
          });
        });
      });
      req.on('timeout', function() { req.destroy(); reject(new Error('Request timeout (' + timeoutMs + 'ms)')); });
      req.on('error', function(e) { reject(new Error(e.message || 'Network error')); });
      if (options.body) req.write(options.body);
      req.end();
    }

    if (!purl) { makeDirect(); return; }
    var pu = new URL(purl);
    var sock = net.connect(parseInt(pu.port), pu.hostname);
    var connectStr = '';
    var timer = setTimeout(function() { sock.destroy(); reject(new Error('Proxy connect timeout')); }, 10000);
    sock.on('connect', function() {
      sock.write('CONNECT ' + u.hostname + ':443 HTTP/1.1\r\nHost: ' + u.hostname + ':443\r\n\r\n');
    });
    sock.on('data', function onData(chunk) {
      connectStr += chunk.toString();
      if (connectStr.indexOf('\r\n\r\n') >= 0) {
        clearTimeout(timer);
        sock.removeListener('data', onData);
        if (connectStr.indexOf('200') < 0) { sock.destroy(); reject(new Error('Proxy CONNECT failed: ' + connectStr.split('\r\n')[0])); return; }
        var reqOpts = {
          hostname: u.hostname,
          port: 443,
          path: u.pathname + u.search,
          method: options.method || 'GET',
          headers: Object.assign({ 'User-Agent': 'ChatStory' }, options.headers || {}),
          timeout: timeoutMs,
          createConnection: function() { return tls.connect({ socket: sock, servername: u.hostname }); }
        };
        if (options.body) {
          reqOpts.headers['Content-Type'] = 'application/json';
          reqOpts.headers['Content-Length'] = Buffer.byteLength(options.body);
        }
        var req = https.request(reqOpts, function(res) {
          var data = '';
          res.on('data', function(c) { data += c; });
          res.on('end', function() {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: function() { try { return Promise.resolve(JSON.parse(data)); } catch(e) { return Promise.reject(e); } },
              text: function() { return Promise.resolve(data); }
            });
          });
        });
        req.on('timeout', function() { req.destroy(); sock.destroy(); reject(new Error('Request timeout (' + timeoutMs + 'ms)')); });
        req.on('error', function(e) { sock.destroy(); reject(new Error(e.message || 'Network error')); });
        if (options.body) req.write(options.body);
        req.end();
      }
    });
    sock.on('error', function(e) { clearTimeout(timer); reject(new Error('Proxy error: ' + (e.message || 'unknown'))); });
  });
}

// GitHub API Push single file (with timing)
    if (apiPath === '/api/github/push-file' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch, file, message } = JSON.parse(body || '{}');
      if (!token || !repo || !file) return json(res, { error: 'Missing token, repo or file' }, 400);
      
      const [owner, repoName] = repo.split('/');
      const fpath = path.join(DIR, file);
      if (!fs.existsSync(fpath)) return json(res, { error: 'File not found: ' + file }, 404);
      
      const content = fs.readFileSync(fpath);
      const base64 = content.toString('base64');
      const fileSize = content.length;
      const t0 = Date.now();
      
      try {
        let sha = null;
        for (let retry = 0; retry < 3; retry++) {
          try {
            const getRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file + '?ref=' + (branch||'main'), {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (getRes.ok) {
              const data = await getRes.json();
              sha = data.sha;
              break;
            }
          } catch(e) {
            if (retry < 2) await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        const putBody = JSON.stringify({
          message: message || 'Publish from ChatStory',
          content: base64,
          branch: branch || 'main',
          sha: sha || undefined
        });
        
        let putRes;
        let putErr;
        for (let retry = 0; retry < 3; retry++) {
          try {
            putRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file, {
              method: 'PUT',
              headers: { 'Authorization': 'Bearer ' + token },
              body: putBody
            });
            putErr = null;
            break;
          } catch(e) {
            putErr = e;
            if (retry < 2) await new Promise(r => setTimeout(r, 2000));
          }
        }
        if (!putRes && putErr) throw putErr;
        
        const elapsed = Date.now() - t0;
        
        if (putRes.ok) {
          return json(res, { ok: true, file: file, size: fileSize, elapsedMs: elapsed, speedKBs: Math.round(fileSize / Math.max(1, elapsed) * 1000 / 1024 * 10) / 10 });
        } else {
          const errText = await putRes.text();
          let errMsg = errText.substring(0,300);
          try { const ej = JSON.parse(errText); errMsg = ej.message || errMsg; } catch(e) {}
          return json(res, { ok: false, file: file, error: errMsg, size: fileSize, elapsedMs: elapsed });
        }
      } catch(e) {
        return json(res, { ok: false, file: file, error: e.message, size: fileSize, elapsedMs: Date.now() - t0 });
      }
    }
    
    // GitHub API Push (direct file push via API)
    if (apiPath === '/api/github/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch, message } = JSON.parse(body || '{}');
      if (!token || !repo) return json(res, { error: 'Missing token or repo' }, 400);
      
      const files = ['index.html', 'server.js', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'render.yaml', 'Dockerfile', 'server-render.js'];
      const [owner, repoName] = repo.split('/');
      const results = [];
      
      for (const file of files) {
        const fpath = path.join(DIR, file);
        if (!fs.existsSync(fpath)) continue;
        const content = fs.readFileSync(fpath);
        const base64 = content.toString('base64');
        
        try {
          // Get current SHA if file exists
          let sha = null;
          try {
            const getRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file + '?ref=' + (branch||'main'), {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (getRes.ok) {
              const data = await getRes.json();
              sha = data.sha;
            }
          } catch(e) {}
          
          // Create or update file
          const body = JSON.stringify({
            message: message || 'Publish from ChatStory',
            content: base64,
            branch: branch || 'main',
            sha: sha || undefined
          });
          
          const putRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token },
            body: body
          });
          
          if (putRes.ok) {
            results.push({ file: file, status: 'ok' });
          } else {
            const errText = await putRes.text();
            let errMsg = errText.substring(0,300);
            try { const ej = JSON.parse(errText); errMsg = ej.message || errMsg; } catch(e) {}
            results.push({ file: file, status: 'error', error: errMsg });
          }
        } catch(e) {
          results.push({ file: file, status: 'error', error: e.message });
        }
      }
      
      const ok = results.filter(r=>r.status==='ok').length;
      const fail = results.filter(r=>r.status==='error').length;
      return json(res, { ok: fail === 0, pushed: ok, failed: fail, results });
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
    if (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('404 Not Found'); return; }
      res.writeHead(200); res.end(data);
    });

  } catch (e) {
    json(res, { error: e.message }, 500);
  }
});

process.on('uncaughtException', function(err) { console.error('Uncaught:', err.message); });
process.on('unhandledRejection', function(err) { console.error('Unhandled:', err.message); });
server.on('error', function(err) { console.error('Server error:', err.message); });
server.listen(PORT, '0.0.0.0', () => {
  console.log('ChatStory Server: http://localhost:' + PORT);
  const s = git('status --porcelain');
  if (s.ok) console.log('Git: OK' + (s.output ? '\n' + s.output : ' (clean)'));
  else console.log('Git: not available');
});
