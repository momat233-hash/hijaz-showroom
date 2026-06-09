const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const USER = 'gkldeed';
const PASS = 'Alpha02#';

// Try Namecheap API to log in and get server info
function post(url, data, secure = true) {
  return new Promise((resolve, reject) => {
    const lib = secure ? https : http;
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || (secure ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0',
      },
      rejectUnauthorized: false,
      timeout: 10000,
    };
    const req = lib.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function main() {
  // Try cPanel API login
  console.log('Trying cPanel API on server2...');
  const loginData = `user=${USER}&pass=${encodeURIComponent(PASS)}`;
  try {
    const r = await post('https://server2.web-hosting.com:2083/login/', loginData);
    console.log(`cPanel login: ${r.status}`);
    if (r.status === 200) {
      // Check for cpsess token in response
      const match = r.body.match(/cpsess[0-9]+/);
      if (match) {
        console.log('Session token found:', match[0]);
        // Try to upload via FileManager API
        const files = fs.readdirSync(path.join(__dirname, 'build'));
        for (const f of files) {
          const fp = path.join(__dirname, 'build', f);
          const stat = fs.statSync(fp);
          if (stat.isFile()) {
            // Try cPanel API upload
            console.log(`Would upload: ${f} (${stat.size} bytes)`);
          }
        }
      } else {
        console.log('No session token');
        console.log(r.body.substring(0, 500));
      }
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main();
