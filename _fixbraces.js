const fs = require("fs");
let c = fs.readFileSync("C:/Users/zhong/Documents/ChatStory/index.html", "utf8");

// Apply all patches and write
let orig = c;
// P1: button
orig = orig.split('<button class="attach-btn" onclick="document.getElementById(\'attachInput\').click()">📎</button>').join('<button class="attach-btn" onclick="document.getElementById(\'attachInput\').click()">📎</button>\r\n      <button class="compress-btn" id="compressBtn" onclick="compressContext()" title="Lorebook世界观提取">🗜️</button>');
// P2: modal
const bodyEnd = orig.lastIndexOf('</body>');
orig = orig.substring(0, bodyEnd) + '<div class="modal-overlay" id="compressModal"><div class="modal" style="max-width:750px;max-height:88vh"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px"><div style="font-size:15px;font-weight:600">📖 世界观 Lorebook · 提取结果</div><div style="display:flex;gap:6px;align-items:center"><span id="compressStats" style="font-size:11px;color:var(--text-secondary)"></span><button class="btn-sm" onclick="saveLorebook()" style="padding:5px 12px;font-size:12px;background:var(--accent);color:#fff;font-weight:600">💾 保存全部</button><button class="btn-sm" onclick="copyCompressed()" style="padding:5px 10px;font-size:12px">📋 复制</button><button class="btn-sm" onclick="useCompressed()" style="padding:5px 10px;font-size:12px">💬 注入上下文</button><button class="btn-sm" onclick="closeCompress()" style="padding:5px 10px;font-size:12px">✕</button></div></div><div id="loreTabs" style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px"><button class="lore-tab active" data-tab="characters" onclick="switchLoreTab(\'characters\')">👤 角色 <span id="loreCount_c" style="font-size:10px"></span></button><button class="lore-tab" data-tab="settings" onclick="switchLoreTab(\'settings\')">🏰 场景 <span id="loreCount_s" style="font-size:10px"></span></button><button class="lore-tab" data-tab="plotPoints" onclick="switchLoreTab(\'plotPoints\')">📖 情节 <span id="loreCount_p" style="font-size:10px"></span></button><button class="lore-tab" data-tab="worldRules" onclick="switchLoreTab(\'worldRules\')">🌍 世界观 <span id="loreCount_w" style="font-size:10px"></span></button></div><div id="loreCardList" style="max-height:60vh;overflow-y:auto;padding-right:4px"></div></div></div>\r\n</body>';
// P3: CSS
orig = orig.split('.send-btn:disabled{opacity:0.5;cursor:not-allowed}').join('.compress-btn{background:var(--hover);color:var(--text-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:10px 10px;cursor:pointer;font-size:16px;display:flex;align-items:center;transition:all 0.15s;flex-shrink:0}.compress-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}.compress-btn:disabled{opacity:0.5;cursor:not-allowed}.send-btn:disabled{opacity:0.5;cursor:not-allowed}.lore-tab{background:none;border:none;color:var(--text-secondary);padding:6px 12px;cursor:pointer;font-size:12px;border-radius:6px;transition:all 0.15s;font-weight:500}.lore-tab:hover{background:var(--hover);color:var(--text)}.lore-tab.active{background:var(--accent);color:#fff}.lore-card{background:var(--hover);border-radius:8px;padding:10px 14px;margin-bottom:6px;border-left:3px solid var(--accent)}.lore-card-hdr{font-size:13px;margin-bottom:4px;color:var(--text)}.lore-line{font-size:11px;padding:2px 0;display:flex;gap:6px}.lore-key{color:var(--accent);font-weight:600;min-width:60px;flex-shrink:0}.lore-val{color:var(--text-secondary);word-break:break-word}.lore-side-card{background:var(--hover);border-radius:6px;padding:6px 10px;margin:3px 0;font-size:11px;display:flex;justify-content:space-between;align-items:flex-start;gap:6px}.lore-side-card .lore-side-name{color:var(--text);font-weight:600;font-size:12px}.lore-side-card .lore-side-del{background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:10px;padding:0 3px;flex-shrink:0}.lore-side-card .lore-side-del:hover{color:var(--danger)}');

// Now write this intermediate to test
// Count braces in CSS only  
let cssSection = orig.substring(orig.indexOf('<style>'), orig.indexOf('</style>'));
let cssOpen = (cssSection.match(/\{/g) || []).length;
let cssClose = (cssSection.match(/\}/g) || []).length;
console.log("CSS braces:", cssOpen, cssClose, "net:", cssOpen-cssClose);

// Count braces in JS
let jsSection = orig.substring(orig.indexOf('<script>'), orig.indexOf('</script>'));
let jsOpen = (jsSection.match(/\{/g) || []).length;
let jsClose = (jsSection.match(/\}/g) || []).length;
console.log("JS braces:", jsOpen, jsClose, "net:", jsOpen-jsClose);

// Count total (excluding style/script)
let withoutCSSJS = orig.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
let htmlOpen = (withoutCSSJS.match(/\{/g) || []).length;
let htmlClose = (withoutCSSJS.match(/\}/g) || []).length;
console.log("HTML braces:", htmlOpen, htmlClose, "net:", htmlOpen-htmlClose);

let total = cssOpen + jsOpen + htmlOpen - cssClose - jsClose - htmlClose;
console.log("Total net:", total);