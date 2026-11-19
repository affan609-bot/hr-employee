import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting HCM Lite System (Backend & Frontend)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// 1. Start Server
const server = spawn('node', ['server/server.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// 2. Start Vite Frontend
const vite = spawn(npxCmd, ['vite'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

const cleanup = () => {
  console.log('\n🛑 Shutting down HCM Lite servers...');
  server.kill();
  vite.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
