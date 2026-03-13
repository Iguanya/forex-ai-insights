import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd(), '..');

console.log('[v0] Starting npm dependency fix...');
console.log('[v0] Project root:', projectRoot);

try {
  // Change to project root
  process.chdir(projectRoot);
  
  // Remove existing lock file if it exists
  const lockFilePath = path.join(projectRoot, 'package-lock.json');
  if (fs.existsSync(lockFilePath)) {
    console.log('[v0] Removing corrupted package-lock.json');
    fs.unlinkSync(lockFilePath);
  }
  
  // Run npm install to regenerate lock file with correct versions
  console.log('[v0] Running npm install to regenerate lock file...');
  execSync('npm install', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  console.log('[v0] Successfully regenerated package-lock.json');
  process.exit(0);
} catch (error) {
  console.error('[v0] Error during npm fix:', error.message);
  process.exit(1);
}
