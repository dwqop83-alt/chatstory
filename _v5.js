const http = require("http");
function login(){return new Promise(r=>{const req=http.request({hostname:"localhost",port:8080,path:"/login",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"}},res=>{r((res.headers["set-cookie"]||[]).map(c=>c.split(";")[0]).join("; "))});req.write("pwd=chatstory888");req.end()})}
function post(path,ck,data){return new Promise(r=>{const b=JSON.stringify(data);const req=http.request({hostname:"localhost",port:8080,path,method:"POST",headers:{Cookie:ck||"","Content-Type":"application/json","Content-Length":b.length}},res=>{let t="";res.on("data",c=>t+=c);res.on("end",()=>r(JSON.parse(t)))});req.write(b);req.end()})}
async function main(){
  const ck=await login();
  console.log("=== Test Gitee Push ===");
  const t0=Date.now();
  const r=await post("/api/git/push",ck,{message:"Test gitee",token:"b6df2c768b72835f8fad74d052509656",repo:"middle000/story_-project",branch:"main"});
  console.log("Time:",(Date.now()-t0)+"ms");
  console.log("add:",r.add?r.add.ok?"OK":r.add.error:"N/A");
  console.log("commit:",r.commit?r.commit.ok?"OK":(r.commit.output||r.commit.error||"").substring(0,80):"N/A");
  console.log("push:",r.push?r.push.ok?"OK":(r.push.error||r.push.output||"").substring(0,200):"N/A");
}
main();
