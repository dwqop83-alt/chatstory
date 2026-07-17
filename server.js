// ChatStory Server - Static files + Git sync API
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8080;
const DIR = __dirname;
const GIT = '"C:\\Program Files\\Git\\bin\\git.exe"';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.md': 'text/markdown'
};

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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://x');
  const apiPath = url.pathname;

  try {
    // === Git Status ===
    if (apiPath === '/api/git/status' && req.method === 'GET') {
      return json(res, git('status --porcelain'));
    }

    // === Git Pull ===
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

    // === Git Push ===
    if (apiPath === '/api/git/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { branch, message, token, repo } = JSON.parse(body || '{}');
      const b = branch || 'main';
      const m = message || 'Sync from ChatStory';
      let remote = 'origin';
      if (token && repo) remote = 'https://oauth2:' + token + '@gitee.com/' + repo + '.git';
      const add = git('add -A');
      const commit = git('commit -m "' + m.replace(/"/g, '\"') + '"');
      const push = git('push ' + remote + ' ' + b);
      return json(res, { add, commit, push });
    }

    // === Data Upload ===
    if (apiPath === '/api/data/upload' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const fpath = path.join(DIR, 'app-data.json');
      fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
      const add = git('add app-data.json');
      const commit = git('commit -m "App data: ' + new Date().toLocaleString('zh-CN') + '"');
      return json(res, { saved: true, add, commit });
    }

    // === Data Download ===
    if (apiPath === '/api/data/download' && req.method === 'GET') {
      git('pull origin main --rebase');
      const fpath = path.join(DIR, 'app-data.json');
      if (fs.existsSync(fpath)) {
        const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        return json(res, data);
      }
      return json(res, { error: 'No data file found' }, 404);
    }

    // === Git Log ===
    if (apiPath === '/api/git/log' && req.method === 'GET') {
      return json(res, git('log --oneline -10'));
    }

    // === Static files ===
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

server.listen(PORT, () => {
  console.log('ChatStory Server: http://localhost:' + PORT);
  const s = git('status --porcelain');
  if (s.ok) console.log('Git: OK' + (s.output ? '\n' + s.output : ' (clean)'));
  else console.log('Git: not available');
});
