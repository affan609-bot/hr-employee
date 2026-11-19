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

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Backend server exited with code ${code}`);
  }
});

// 2. Start Vite Frontend
const vite = spawn(npxCmd, ['vite', '--host', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

vite.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Vite dev server exited with code ${code}`);
  }
});

const cleanup = () => {
  console.log('\n🛑 Shutting down HCM Lite servers...');
  try { server.kill(); } catch (e) {}
  try { vite.kill(); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep the event loop alive forever
setInterval(() => {}, 60000);
