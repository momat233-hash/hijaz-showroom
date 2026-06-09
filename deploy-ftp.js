const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const buildDir = path.join(__dirname, 'build');

async function tryUpload(host, port = 21) {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host,
      port,
      user: 'gkldeed',
      password: 'Alpha02#',
      secure: false,
      timeout: 5000,
    });
    console.log(`SUCCESS connected to ${host}:${port}`);
    await client.clearWorkingDir();
    await client.uploadFromDir(buildDir);
    console.log('Upload complete!');
    await client.uploadFrom( path.join(buildDir, '.htaccess'), '.htaccess');
    console.log('.htaccess uploaded!');
    return true;
  } catch (err) {
    console.log(`FAIL ${host}:${port} - ${err.message.slice(0, 80)}`);
    return false;
  } finally {
    client.close();
  }
}

async function main() {
  const hosts = [
    'server1.web-hosting.com',
    'server2.web-hosting.com',
    'server3.web-hosting.com',
    'server5.web-hosting.com',
    'server8.web-hosting.com',
    'server10.web-hosting.com',
  ];

  for (const host of hosts) {
    const ok = await tryUpload(host, 21);
    if (ok) return;
  }

  console.log('Could not connect via FTP to any server');
  console.log('Trying FTPS on port 990...');
  for (const host of hosts) {
    const ok = await tryUpload(host, 990);
    if (ok) return;
  }

  console.log('All attempts failed.');
}

main().catch(console.error);
