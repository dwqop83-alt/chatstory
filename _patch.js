
// patch.js - Safe file modifications
const fs=require("fs");

// === 1. Fix main.js BOM ===
let m=fs.readFileSync("js/main.js","utf8");
m=m.replace(/^\uFEFF+/,"");
// Find addProject and add modal fns before it
let modalFns="function showNewProjectModal(){G("newProjModal").classList.remove("hidden");setTimeout(function(){G("newProjName").focus()},100)}function closeNewProjectModal(){G("newProjModal").classList.add("hidden");G("newProjName").value=""}\n";
m=m.replace("function addProject", modalFns+"function addProject");
// Change projectName to newProjName
m=m.replace("G('‘projectName’.value.trim()", "G('‘newProjName’.value.trim()");
// Actually, just use regex
m=m.replace("G(\"projectName\").value.trim()", "G(\"newProjName\").value.trim()");
// Add closeNewProjectModal and render calls
m=m.replace("save(); renderProjects(); renderProjBody();\n  toast('\u5df2\u521b\u5efa\u5de5\u7a0b", "closeNewProjectModal();\n  save(); renderProjects(); renderProjBody();\n  renderRVs(); renderGVs(); renderMems(); renderLorebookList();\n  toast('\u5df2\u521b\u5efa\u5de5\u7a0b");
fs.writeFileSync("js/main.js", m, "utf8");
console.log("1. main.js patched");
