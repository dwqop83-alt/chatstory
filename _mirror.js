const https = require("https");

const token = "b6df2c768b72835f8fad74d052509656";
const owner = "middle000";
const repo = "story_-project";

// 1. First check if mirror already exists
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "gitee.com",
      path: "/api/v5/repos/" + owner + "/" + repo + path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    };
    const req = https.request(opts, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("1. Checking existing mirrors...");
  const mirrors = await api("GET", "/mirrors");
  console.log("Mirrors:", JSON.stringify(mirrors, null, 2).substring(0, 500));

  if (Array.isArray(mirrors) && mirrors.length > 0) {
    console.log("\n✅ Mirror(s) already exist!");
    return;
  }

  console.log("\n2. Creating new mirror...");
  try {
    const result = await api("POST", "/mirrors", {
      url: "https://github.com/dwqop83-alt/chatstory.git",
      active: true
    });
    console.log("Result:", JSON.stringify(result, null, 2));
    if (result.id) {
      console.log("\n✅ Mirror created! Gitee will now auto-push to GitHub.");
    }
  } catch(e) {
    console.log("Error:", e.message);
  }
}
main();
