import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';

function runScript(scriptPath: string) {
  const proc = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit', shell: true });
  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`Script ${scriptPath} exited with code ${code}`);
    }
  });
}

// Schedule checkSubscriptions every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('Running checkSubscriptions...');
  runScript(path.join(__dirname, 'checkSubscriptions.ts'));
});

// Schedule cleanupNotifications every Sunday at 3:00 AM
cron.schedule('0 3 * * 0', () => {
  console.log('Running cleanupNotifications...');
  runScript(path.join(__dirname, 'cleanupNotifications.ts'));
});

console.log('Scheduler started.');
