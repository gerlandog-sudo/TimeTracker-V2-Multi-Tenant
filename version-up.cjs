const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const parts = pkg.version.split('.');
if (parts.length === 3) {
    let patch = parseInt(parts[2]);
    patch++;
    // Mantener formato de 3 dígitos para la iteración
    parts[2] = patch.toString().padStart(3, '0');
    pkg.version = parts.join('.');
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Version incremented to: ${pkg.version}`);
}
