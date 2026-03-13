#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

console.log('Regenerating package-lock.json...');

try {
  execSync('npm install', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('Successfully regenerated package-lock.json');
} catch (error) {
  console.error('Failed to regenerate package-lock.json:', error.message);
  process.exit(1);
}
