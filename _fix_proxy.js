const fs = require('fs');
let c = fs.readFileSync('C:/Users/zhong/Documents/ChatStory/server.js','utf8');

const oldFn = `    // GitHub API helper using https module (more reliable than fetch)
function githubRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const https = require('https');
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: { 'User-Agent': 'ChatStory', ...options.headers },
      timeout: 30000
    };
    if (options.body) {
      reqOpts.headers['Content-Type'] = 'application/json';
      reqOpts.headers['Content-Length'] = Buffer.byteLength(options.body);
    }
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => { try { return Promise.resolve(JSON.parse(data)); } catch(e) { return Promise.reject(e); } },
          text: () => Promise.resolve(data)
        });
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', (e) => reject(new Error(e.message || 'Network error')));
    if (options.body) req.write(options.body);
    req.end();
  });
}`;

const newFn = `    // GitHub API helper with automatic proxy support (CONNECT tunnel)
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
}`;

if (!c.includes(oldFn)) { console.log('OLD FN NOT FOUND'); process.exit(1); }
c = c.replace(oldFn, newFn);
fs.writeFileSync('C:/Users/zhong/Documents/ChatStory/server.js', c, 'utf8');
console.log('Replaced githubRequest OK');
var ob = (c.match(/{/g)||[]).length, cb = (c.match(/}/g)||[]).length;
console.log('Braces:', ob, '/', cb, 'diff', ob-cb);
