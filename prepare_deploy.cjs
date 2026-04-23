const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const deployDir = path.join(__dirname, 'ready_for_deploy');

// Clean ready_for_deploy
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}

fs.mkdirSync(deployDir, { recursive: true });

// Copy dist to root of ready_for_deploy
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.readdirSync(distPath).forEach(item => {
    copyRecursiveSync(path.join(distPath, item), path.join(deployDir, item));
  });
}

// Copy api to ready_for_deploy/api
const apiPath = path.join(__dirname, 'api');
const deployApiPath = path.join(deployDir, 'api');
if (fs.existsSync(apiPath)) {
  copyRecursiveSync(apiPath, deployApiPath);
}

// Copy .htaccess to root of ready_for_deploy
const htaccessPath = path.join(__dirname, '.htaccess');
const deployHtaccessPath = path.join(deployDir, '.htaccess');
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, deployHtaccessPath);
}

console.log('Successfully prepared ready_for_deploy folder.');
