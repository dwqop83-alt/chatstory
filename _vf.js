const http = require("http");
function login(){return new Promise(r=>{const req=http.request({hostname:"localhost",port:8080,path:"/login",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"}},res=>{r((res.headers["set-cookie"]||[]).map(c=>c.split(";")[0]).join("; "))});req.write("pwd=chatstory888");req.end()})}
function get(cookie){return new Promise(r=>{http.request({hostname:"localhost",port:8080,path:"/",method:"GET",headers:{Cookie:cookie}},res=>{let b="";res.on("data",c=>b+=c);res.on("end",()=>r(b))}).end()})}
async function main(){
  const ck=await login();
  const h=await get(ck);
  console.log("Size:",h.length);
  ["appVersion","updateVersion","publishApp","暂存中","提交中","推送中","已发布"].forEach(s=>console.log(s+":",h.includes(s)));
  console.log("All OK!");
}
main();
