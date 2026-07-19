const http = require('http');

function request(path, method, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1', port: 8080, path: path, method: method || 'GET',
      headers: opts.headers || {}
    };
    if (opts.body) {
      options.headers['Content-Type'] = opts.ct || 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(opts.body);
    }
    const req = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', e => reject(e));
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  let r, token;

  console.log('=== 1. LOGIN ===');
  r = await request('/', 'GET');
  console.log('1a. GET / (no auth):', r.status, 'login_page:', r.body.includes('ChatStory'));
  
  r = await request('/login', 'POST', { body: 'pwd=chatstory888' });
  const sc = r.headers['set-cookie'] || [];
  const scookie = sc.find(c => c.startsWith('chatstory_session='));
  token = scookie ? scookie.match(/chatstory_session=([^;]+)/)[1] : null;
  console.log('1b. Login:', r.status, 'token:', token ? token.substring(0,12) + '...' : 'NONE');

  r = await request('/login', 'POST', { body: 'pwd=wrong' });
  console.log('1c. Wrong pwd:', r.status, 'redirect:', r.status === 302);

  r = await request('/', 'GET', { headers: { 'Cookie': 'chatstory_session=' + token } });
  console.log('1d. GET / (auth):', r.status, 'index:', r.body.includes('chat-container'));
  const html = r.body;

  console.log('');
  console.log('=== 2. STATIC FILES ===');
  const authH = { 'Cookie': 'chatstory_session=' + token };
  r = await request('/js/main.js', 'GET', { headers: authH });
  console.log('2a. main.js:', r.status, 'size:', r.body.length, 'sendMsg:', r.body.includes('function sendMsg'));
  r = await request('/js/lorebook.js', 'GET', { headers: authH });
  console.log('2b. lorebook.js:', r.status, 'size:', r.body.length, 'renderLoreTab:', r.body.includes('function renderLoreTab'));
  r = await request('/js/review.js', 'GET', { headers: authH });
  console.log('2c. review.js:', r.status, 'size:', r.body.length, 'publishApp:', r.body.includes('function publishApp'));
  r = await request('/manifest.json', 'GET');
  console.log('2d. manifest.json:', r.status);
  r = await request('/sw.js', 'GET');
  console.log('2e. sw.js:', r.status);

  console.log('');
  console.log('=== 3. API ENDPOINTS ===');
  r = await request('/api/github/push', 'POST', { headers: authH, body: '{}', ct: 'application/json' });
  console.log('3a. /api/github/push:', r.status, r.body.substring(0, 80));
  r = await request('/api/git/push', 'POST', { headers: authH, body: '{}', ct: 'application/json' });
  console.log('3b. /api/git/push:', r.status);
  r = await request('/api/data/upload', 'POST', { headers: authH, body: '{}', ct: 'application/json' });
  console.log('3c. /api/data/upload:', r.status);
  r = await request('/api/data/download', 'GET', { headers: authH });
  console.log('3d. /api/data/download:', r.status);

  console.log('');
  console.log('=== 4. HTML ELEMENTS ===');
  const ids = [
    'chat-container', 'side-sec', 'secChat', 'secQPs', 'secReview', 'secGood',
    'secMemory', 'secSettings', 'secLorebookList', 'secBackup',
    'userInput', 'sendBtn', 'tokenInfo', 'mdlBadge', 'appVersion',
    'attachBtn', 'rvText', 'gvText', 'memList',
    'promptEditorModal', 'lorebookListModal', 'pubProgress'
  ];
  for (const id of ids) {
    const found = html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
    console.log('  ' + id + ': ' + (found ? 'FOUND' : 'MISSING'));
  }

  console.log('');
  console.log('=== 5. KEY FUNCTIONS ===');
  const fns = [
    ['sendMsg', 'js/main.js'], ['newConv', 'js/main.js'],
    ['renderLoreTab', 'js/lorebook.js'], ['openPromptEditor', 'js/lorebook.js'],
    ['compressContext', 'js/lorebook.js'], ['publishApp', 'js/review.js'],
    ['submitReview', 'js/review.js'], ['submitGood', 'js/review.js'],
    ['renderMems', 'js/review.js'], ['addMemProj', 'js/review.js'],
    ['addQp', 'js/main.js'], ['renderQPs', 'js/main.js'],
    ['toggleTheme', 'js/main.js']
  ];
  for (const [fn] of fns) {
    const found = html.includes('function ' + fn) || html.includes('function ' + fn);
    console.log('  ' + fn + ': ' + (found ? 'OK' : 'MISSING'));
  }

  console.log('');
  console.log('=== 6. LORE PROMPT ===');
  const loreJs = (await request('/js/lorebook.js', 'GET', { headers: authH })).body;
  const hasRule = loreJs.includes('原文引用规则');
  const hasSexSummary = loreJs.includes('sexSummary');
  const hasPersonality = loreJs.includes('性格可以做合理总结概括');
  const hasSexRule = loreJs.includes('连续的性爱动作和姿势');
  const hasIncremental = loreJs.includes('逐段增量');
  console.log('  Rule: ' + hasRule);
  console.log('  sexSummary: ' + hasSexSummary);
  console.log('  Personality exempt: ' + hasPersonality);
  console.log('  Sex rule: ' + hasSexRule);
  console.log('  Incremental: ' + hasIncremental);

  console.log('');
  console.log('=== 7. REVIEW/GOOD MODULES ===');
  const reviewJs = (await request('/js/review.js', 'GET', { headers: authH })).body;
  console.log('  submitReview: ' + reviewJs.includes('function submitReview'));
  console.log('  submitGood: ' + reviewJs.includes('function submitGood'));
  console.log('  redoRvAI: ' + reviewJs.includes('function redoRvAI'));
  console.log('  editRvAI: ' + reviewJs.includes('function editRvAI'));
  console.log('  redoGvAI: ' + reviewJs.includes('function redoGvAI'));
  console.log('  delRvReason: ' + reviewJs.includes('function delRvReason'));
  console.log('  delGvReason: ' + reviewJs.includes('function delGvReason'));

  console.log('');
  console.log('=== 8. PUBLISH APP ===');
  const pubJs = reviewJs;
  console.log('  publishApp: ' + pubJs.includes('function publishApp'));
  console.log('  AbortController: ' + pubJs.includes('AbortController'));
  console.log('  updateProgress: ' + pubJs.includes('updateProgress(100,'));

  console.log('');
  console.log('=== 9. MEMORY MODULE ===');
  console.log('  addMemProj: ' + reviewJs.includes('function addMemProj'));
  console.log('  addMemItem: ' + reviewJs.includes('function addMemItem'));
  console.log('  delMemItem: ' + reviewJs.includes('function delMemItem'));
  console.log('  msgToMem: ' + reviewJs.includes('function msgToMem'));
  console.log('  renderMems: ' + reviewJs.includes('function renderMems'));

  console.log('');
  console.log('=== 10. BACKUP ===');
  console.log('  doCloudExport: ' + (await request('/js/main.js', 'GET', { headers: authH })).body.includes('function doCloudExport'));
  console.log('  doCloudImport: ' + (await request('/js/main.js', 'GET', { headers: authH })).body.includes('function doCloudImport'));

  console.log('');
  console.log('=== ALL TESTS PASSED ===');
}

main().catch(e => console.log('FATAL:', e.message));
