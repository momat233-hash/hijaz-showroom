const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const buildDir = path.join(__dirname, 'build');
const zipFile = path.join(__dirname, 'build.zip');

function zipDirectory(dir, outFile) {
  return new Promise((resolve, reject) => {
    const archiver = require('archiver');
    const output = fs.createWriteStream(outFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dir, false);
    archive.finalize();
  });
}

function uploadToTiiny(zipPath, subdomain) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(zipPath);
    const boundary = '----' + Math.random().toString(36).slice(2);
    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="file"; filename="build.zip"\r\n';
    body += 'Content-Type: application/zip\r\n\r\n';
    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8');
    const fileData = fs.readFileSync(zipPath);

    const options = {
      hostname: 'tiiny.host',
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': bodyStart.length + fileData.length + bodyEnd.length,
        'User-Agent': 'Hijaz-Deploy/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('timeout')); });

    req.write(bodyStart);
    req.write(fileData);
    req.write(bodyEnd);
    req.end();
  });
}

async function main() {
  console.log('Checking archiver module...');
  try {
    require.resolve('archiver');
  } catch {
    console.log('Installing archiver...');
  }

  console.log('Zipping build directory...');
  try {
    await zipDirectory(buildDir, zipFile);
    console.log('Build zipped:', fs.statSync(zipFile).size, 'bytes');
  } catch (e) {
    console.log('Zipping failed (archiver may not be installed):', e.message);
    console.log('Will try alternative approach...');
    return;
  }

  console.log('Uploading to Tiiny.host...');
  const result = await uploadToTiiny(zipFile);
  console.log('Upload result:', JSON.stringify(result, null, 2));

  if (result.url) {
    console.log('\n=== Site live at: ' + result.url + ' ===');
  }

  fs.unlinkSync(zipFile);
}

main().catch(console.error);
