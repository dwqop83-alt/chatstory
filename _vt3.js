const http = require("http");
function login(){return new Promise(r=>{const req=http.request({hostname:"localhost",port:8080,path:"/login",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"}},res=>{r((res.headers["set-cookie"]||[]).map(c=>c.split(";")[0]).join("; "))});req.write("pwd=chatstory888");req.end()})}
function get(cookie){return new Promise(r=>{http.request({hostname:"localhost",port:8080,path:"/",method:"GET",headers:{Cookie:cookie}},res=>{let b="";res.on("data",c=>b+=c);res.on("end",()=>r(b))}).end()})}
async function main(){
  const ck=await login();
  const h=await get(ck);
  console.log("Size:",h.length);
  console.log("appVersion:",h.includes("appVersion"));
  console.log("updateVersion:",h.includes("updateVersion"));
  console.log("publishApp:",h.includes("function publishApp"));
  console.log("⏳ 暂存中:",h.includes("暂存中"));
  console.log("⏳ 提交中:",h.includes("提交中"));
  console.log("⏳ 推送中:",h.includes("推送中"));
}
main();
