import fs from 'fs';
import path from 'path';

// Use synchronous operations to ensure order
console.log('Cleaning ready_for_deploy...');
fs.rmSync('ready_for_deploy', { recursive: true, force: true });
fs.mkdirSync('ready_for_deploy', { recursive: true });

if (fs.existsSync('dist')) {
    console.log('Copying dist to ready_for_deploy...');
    fs.cpSync('dist', 'ready_for_deploy', { recursive: true });
}

if (fs.existsSync('api')) {
    console.log('Copying api to ready_for_deploy...');
    fs.cpSync('api', 'ready_for_deploy/api', { recursive: true });
}

if (fs.existsSync('.htaccess')) {
    console.log('Copying .htaccess...');
    fs.cpSync('.htaccess', 'ready_for_deploy/.htaccess');
}

if (fs.existsSync('documentacion')) {
    console.log('Copying documentacion and generate_docs.js...');
    fs.cpSync('documentacion', 'ready_for_deploy/documentacion', { recursive: true });
    // Also include the generator script just in case
    fs.cpSync('generate_docs.js', 'ready_for_deploy/documentacion/generate_docs.js');
}

// Update config.php in ready_for_deploy/api
const configPath = 'ready_for_deploy/api/config.php';
if (fs.existsSync(configPath)) {
    console.log('Updating database credentials in config.php...');
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/define\s*\(\s*['"]DB_HOST['"]\s*,\s*['"].*?['"]\s*\);/, "define('DB_HOST', 'localhost');");
    configContent = configContent.replace(/define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"].*?['"]\s*\);/, "define('DB_NAME', 'admglobal_timesheet');");
    configContent = configContent.replace(/define\s*\(\s*['"]DB_USER['"]\s*,\s*['"].*?['"]\s*\);/, "define('DB_USER', 'admglobal_admin');");
    configContent = configContent.replace(/define\s*\(\s*['"]DB_PASS['"]\s*,\s*['"].*?['"]\s*\);/, "define('DB_PASS', 'PMaaS_2026');");
    fs.writeFileSync(configPath, configContent);
}

// List files in the new directory for verification
function listFiles(dir, indent = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            console.log(`${indent}DIR: ${file}`);
            listFiles(filePath, indent + '  ');
        } else {
            console.log(`${indent}FILE: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        }
    });
}

console.log('Final folder structure:');
listFiles('ready_for_deploy');
console.log('Deployment preparation complete.');
