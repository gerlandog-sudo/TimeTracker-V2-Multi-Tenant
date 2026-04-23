import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const readyDir = path.resolve('ready_for_deploy');
const distDir = path.resolve('dist');
const apiDir = path.resolve('api');

try {
  // 1. Clean ready_for_deploy
  if (fs.existsSync(readyDir)) {
    console.log('Cleaning ready_for_deploy folder...');
    fs.emptyDirSync(readyDir);
  } else {
    fs.ensureDirSync(readyDir);
  }

  // 2. Build the app
  console.log('Compiling app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Copy dist to ready_for_deploy
  console.log('Copying dist to ready_for_deploy...');
  if (fs.existsSync(distDir)) {
    fs.copySync(distDir, readyDir);
  }

  // 4. Copy api to ready_for_deploy/api
  console.log('Copying api folder...');
  if (fs.existsSync(apiDir)) {
    fs.copySync(apiDir, path.join(readyDir, 'api'));
  }

  // 4.1 Copy .htaccess to ready_for_deploy
  const htaccessPath = path.resolve('.htaccess');
  if (fs.existsSync(htaccessPath)) {
    console.log('Copying .htaccess...');
    fs.copySync(htaccessPath, path.join(readyDir, '.htaccess'));
  }

  // 4.2 Copy install.php and setup.sql to ready_for_deploy
  const rootFilesToCopy = ['install.php', 'setup.sql'];
  rootFilesToCopy.forEach(file => {
    const filePath = path.resolve(file);
    if (fs.existsSync(filePath)) {
      console.log(`Copying ${file}...`);
      fs.copySync(filePath, path.join(readyDir, file));
    }
  });

  // 5. Update config.php
  const configPath = path.join(readyDir, 'api', 'config.php');
  if (fs.existsSync(configPath)) {
    console.log('Updating config.php with production credentials...');
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent
      .replace(/define\('DB_HOST',\s*getenv\('DB_HOST'\)\s*\|\|\s*'localhost'\);/, "define('DB_HOST', 'localhost');")
      .replace(/define\('DB_NAME',\s*getenv\('DB_NAME'\)\s*\|\|\s*'(.*?)'\);/, "define('DB_NAME', 'admglobal_timesheet');")
      .replace(/define\('DB_USER',\s*getenv\('DB_USER'\)\s*\|\|\s*'(.*?)'\);/, "define('DB_USER', 'admglobal_admin');")
      .replace(/define\('DB_PASS',\s*getenv\('DB_PASSWORD'\)\s*\|\|\s*'(.*?)'\);/, "define('DB_PASS', 'PMaaS_2026');")
      // Handle the array format if that's what it uses
      .replace(/'host'\s*=>\s*'.*'/, "'host' => 'localhost'")
      .replace(/'dbname'\s*=>\s*'.*'/, "'dbname' => 'admglobal_timesheet'")
      .replace(/'user'\s*=>\s*'.*'/, "'user' => 'admglobal_admin'")
      .replace(/'password'\s*=>\s*'.*'/, "'password' => 'PMaaS_2026'");
    
    fs.writeFileSync(configPath, configContent);
    console.log('config.php updated successfully.');
  }

  console.log('Deployment preparation complete.');
} catch (error) {
  console.error('Error during preparation:', error);
  process.exit(1);
}
