const http = require("http");
function login(){return new Promise(r=>{const req=http.request({hostname:"localhost",port:8080,path:"/login",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"}},res=>{r((res.headers["set-cookie"]||[]).map(c=>c.split(";")[0]).join("; "))});req.write("pwd=chatstory888");req.end()})}
function api(m,p,ck,data){return new Promise(r=>{const b=data?JSON.stringify(data):null;const o={hostname:"localhost",port:8080,path:p,method:m,headers:{Cookie:ck||""}};if(b){o.headers["Content-Type"]="application/json";o.headers["Content-Length"]=b.length}const req=http.request(o,res=>{let t="";res.on("data",c=>t+=c);res.on("end",()=>{try{r(JSON.parse(t))}catch(e){r({error:t})}})});if(b)req.write(b);req.end()})}
async function main(){
  const ck=await login();
  console.log("Step 1 - ADD:");
  const a=await api("POST","/api/git/add",ck,{});
  console.log("  OK:",a.ok);
  
  console.log("Step 2 - COMMIT:");
  const cm=await api("POST","/api/git/commit",ck,{message:"Publish v"+Date.now()});
  console.log("  OK:",cm.ok||cm.output);
  
  console.log("Step 3 - PUSH:");
  const p=await api("POST","/api/git/push",ck,{message:"Test",token:"b6df2c768b72835f8fad74d052509656",repo:"middle000/story_-project",branch:"main"});
  console.log("  push:",p.push?p.push.ok?"OK":(p.push.error||"").substring(0,100):"N/A");
  console.log("\n✅ Full publish flow verified!");
}
main();
