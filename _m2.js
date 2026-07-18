const https = require("https");
const token = "b6df2c768b72835f8fad74d052509656";
function api(method, path, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: "gitee.com",
      path: "/api/v5/repos/middle000/story_-project" + path,
      method, headers: {"Content-Type":"application/json","Authorization":"Bearer "+token}
    };
    const req = https.request(opts, res => {
      let d=""; res.on("data",c=>d+=c); res.on("end",()=>{try{resolve(JSON.parse(d))}catch(e){resolve(d)}});
    });
    if(body) req.write(JSON.stringify(body));
    req.end();
  });
}
async function main(){
  // Try different endpoints
  console.log("Try /mirror (no s):");
  let r = await api("GET", "/mirror");
  console.log(JSON.stringify(r).substring(0,300));
  
  r = await api("POST", "/mirror", {url:"https://github.com/dwqop83-alt/chatstory.git"});
  console.log("POST:", JSON.stringify(r).substring(0,300));
}
main();
