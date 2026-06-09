const { execSync, spawn } = require('child_process');
const path = require('path');
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
process.env.CI = 'false';
process.env.BROWSER = 'none';
process.env.PORT = '3000';
const proc = spawn('node', ['node_modules/react-scripts/bin/react-scripts.js', 'start'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env },
  timeout: 15000,
});
let output = '';
proc.stdout.on('data', (d) => { output += d.toString(); if (output.length > 3000) proc.kill() });
proc.stderr.on('data', (d) => { output += d.toString(); if (output.length > 3000) proc.kill() });
setTimeout(() => { proc.kill(); process.exit(0) }, 25000);
proc.on('exit', () => { console.log(output.substring(0, 2000)); process.exit(0) });
