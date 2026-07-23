// ChatStory Server - with password protection and SQLite database
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const database = require('./database.js');

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

async function githubRequest(url, options) {
  return new Promise(function(resolve, reject) {
    var u = new URL(url);
    var bodyStr = '';
    if (options.body) {
      bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
    var opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false
    };
    if (bodyStr) {
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json;charset=UTF-8';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    var proto = u.protocol === 'https:' ? require('https') : require('http');
    var req = proto.request(opts, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        res.body = body;
        resolve(res);
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://x');
  const apiPath = url.pathname;

  try {
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

    // ===== DATABASE API ENDPOINTS =====

    // Load full app data from SQLite
    if (apiPath === '/api/data/load' && req.method === 'GET') {
      const state = await database.loadState();
      if (state) {
        return json(res, { ok: true, data: state.data, version: state.version });
      }
      return json(res, { ok: true, data: null, version: 0 });
    }

    // Save full app data to SQLite
    if (apiPath === '/api/data/save' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      await database.saveState(data);
      return json(res, { ok: true, saved: true });
    }

    // Upload database to Gitee
// Upload database to Gitee (using Git Data API for >1MB support)
    if (apiPath === '/api/sync/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch } = JSON.parse(body || '{}');
      if (!token || !repo) return json(res, { error: 'Missing token or repo' }, 400);

      const dbBuffer = database.getDbBuffer();
      if (!dbBuffer) return json(res, { error: 'No database file' }, 404);

      const base64 = dbBuffer.toString('base64');
      const [owner, repoName] = repo.split('/');
      const branchName = branch || 'main';
      const commitMessage = 'DB backup: ' + new Date().toISOString();
      const api = 'https://gitee.com/api/v5';

      try {
        // 1. Create a blob from the database content
        const blobRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/blobs', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: base64, encoding: 'base64' })
        });
        if (blobRes.statusCode !== 201) {
          const err = JSON.parse(blobRes.body).message || blobRes.body.substring(0,200);
          throw new Error('创建 blob 失败: ' + err);
        }
        const blobSha = JSON.parse(blobRes.body).sha;

        // 2. Get current branch ref + commit + tree SHA
        let baseTreeSha = null, parentCommitSha = null;
        try {
          const refRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/refs/heads/' + branchName, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (refRes.statusCode === 200) {
            parentCommitSha = JSON.parse(refRes.body).object.sha;
            const commitRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/commits/' + parentCommitSha, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (commitRes.statusCode === 200) {
              baseTreeSha = JSON.parse(commitRes.body).tree.sha;
            }
          }
        } catch(e) {} // First commit - no parent

        // 3. Create tree with the new blob
        const treeRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/trees', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_tree: baseTreeSha || undefined,
            tree: [{ path: 'chatstory.db', mode: '100644', type: 'blob', sha: blobSha }]
          })
        });
        if (treeRes.statusCode !== 201) {
          const err = JSON.parse(treeRes.body).message || treeRes.body.substring(0,200);
          throw new Error('创建 tree 失败: ' + err);
        }
        const treeSha = JSON.parse(treeRes.body).sha;

        // 4. Create commit
        const commitRes2 = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/commits', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commitMessage,
            tree: treeSha,
            parents: parentCommitSha ? [parentCommitSha] : []
          })
        });
        if (commitRes2.statusCode !== 201) {
          const err = JSON.parse(commitRes2.body).message || commitRes2.body.substring(0,200);
          throw new Error('创建 commit 失败: ' + err);
        }
        const newCommitSha = JSON.parse(commitRes2.body).sha;

        // 5. Update branch reference
        const refRes2 = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/refs/heads/' + branchName, {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommitSha, force: false })
        });
        if (refRes2.statusCode !== 200) {
          const err = JSON.parse(refRes2.body).message || refRes2.body.substring(0,200);
          throw new Error('更新分支引用失败: ' + err);
        }

        return json(res, { ok: true, message: '数据库已上传到 Gitee', size: dbBuffer.length });
      } catch(e) {
        return json(res, { ok: false, error: '上传失败: ' + e.message }, 500);
      }
    }

    // Download database from Gitee (using Git Data API)
    if (apiPath === '/api/sync/download' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch } = JSON.parse(body || '{}');
      if (!token || !repo) return json(res, { error: 'Missing token or repo' }, 400);

      const [owner, repoName] = repo.split('/');
      const branchName = branch || 'main';
      const api = 'https://gitee.com/api/v5';

      try {
        // 1. Get branch ref → commit SHA
        const refRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/refs/heads/' + branchName, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (refRes.statusCode !== 200) throw new Error('分支不存在或无法访问');
        const commitSha = JSON.parse(refRes.body).object.sha;

        // 2. Get the commit tree
        const treeRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/trees/' + commitSha + '?recursive=1', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (treeRes.statusCode !== 200) throw new Error('无法获取文件树');
        const tree = JSON.parse(treeRes.body);
        const entry = tree.tree.find(function(e) { return e.path === 'chatstory.db' && e.type === 'blob'; });
        if (!entry) throw new Error('chatstory.db 不存在于仓库中');

        // 3. Get the blob content
        const blobRes = await githubRequest(api + '/repos/' + owner + '/' + repoName + '/git/blobs/' + entry.sha, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (blobRes.statusCode !== 200) throw new Error('无法下载文件内容');
        const blobData = JSON.parse(blobRes.body);
        const content = blobData.content.replace(/\n/g, '');
        const buffer = Buffer.from(content, 'base64');

        database.restoreDb(buffer);
        return json(res, { ok: true, message: '数据库已从 Gitee 恢复', size: buffer.length });
      } catch(e) {
        return json(res, { ok: false, error: '下载失败: ' + e.message }, 404);
      }
    }
    // Get database info
    if (apiPath === '/api/data/info' && req.method === 'GET') {
      const state = await database.loadState();
      const dbPath = database.getDbPath();
      const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
      return json(res, {
        ok: true,
        dbSize: dbSize,
        hasData: !!state,
        version: state ? state.version : 0,
        dbPath: dbPath
      });
    }

    // ===== LEGACY GITEE API (keep for backward compatibility) =====

    // Git Pull
    if (apiPath === '/api/git/pull' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch } = JSON.parse(body || '{}');
      if (!token || !repo) return json(res, { error: 'Missing token or repo' }, 400);
      const r = git('pull origin ' + (branch || 'main'));
      return json(res, r);
    }

    // Git Push
    if (apiPath === '/api/git/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { token, repo, branch, message } = JSON.parse(body || '{}');
      if (!token || !repo) return json(res, { error: 'Missing token or repo' }, 400);
      const add = git('add -A');
      const commit = git('commit -m "' + (message || 'Update: ' + new Date().toLocaleString('zh-CN')) + '"');
      const push = git('push origin ' + (branch || 'main'));
      return json(res, { add, commit, push });
    }

    // Git Log
    if (apiPath === '/api/git/log' && req.method === 'GET') {
      return json(res, git('log --oneline -10'));
    }

    // ===== LEGACY DATA UPLOAD/DOWNLOAD (keep for backward compatibility) =====
    if (apiPath === '/api/data/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const fpath = path.join(DIR, 'app-data.json');
      fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
      const add = git('add app-data.json');
      const commit = git('commit -m "App data: ' + new Date().toLocaleString('zh-CN') + '"');
      return json(res, { saved: true, add, commit });
    }
    if (apiPath === '/api/data/download' && req.method === 'GET') {
      const fpath = path.join(DIR, 'app-data.json');
      if (fs.existsSync(fpath)) {
        const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        return json(res, data);
      }
      return json(res, { error: 'No data file found' }, 404);
    }

    // ===== GITHUB API (keep for backward compatibility) =====
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
          let sha = null;
          try {
            const getRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file + '?ref=' + (branch||'main'), {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (getRes.statusCode === 200) {
              const data = JSON.parse(getRes.body);
              sha = data.sha;
            }
          } catch(e) {}
          const putBody = JSON.stringify({
            message: message || 'Publish from ChatStory',
            content: base64,
            branch: branch || 'main',
            sha: sha || undefined
          });
          const putRes = await githubRequest('https://api.github.com/repos/' + owner + '/' + repoName + '/contents/' + file, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token },
            body: putBody
          });
          if (putRes.statusCode === 200 || putRes.statusCode === 201) {
            results.push({ file: file, status: 'ok' });
          } else {
            const errText = putRes.body.substring(0,300);
            let errMsg = errText;
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

    // ===== STATIC FILES =====
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
server.timeout = 300000; // 5 min timeout
server.on('error', function(err) { console.error('Server error:', err.message); });
// Initialize database and start server
async function start() {
  try {
    await database.getDb();
    console.log('SQLite database initialized');
  } catch(e) {
    console.error('Database init error:', e.message);
  }
  server.listen(PORT, '0.0.0.0', () => {
    console.log('ChatStory Server: http://localhost:' + PORT);
    const s = git('status --porcelain');
    if (s.ok) console.log('Git: OK' + (s.output ? '\n' + s.output : ' (clean)'));
    else console.log('Git: not available');
  });
}

start();
