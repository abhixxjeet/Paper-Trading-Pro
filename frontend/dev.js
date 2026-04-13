import { spawn } from 'child_process';
import os from 'os';

const isWin = os.platform() === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

console.log('Starting local API server and Vite dev server...');

const backend = spawn('node', ['local-server.js'], { stdio: 'inherit' });
const frontend = spawn(npx, ['vite'], { stdio: 'inherit', shell: isWin });

const cleanup = () => {
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
