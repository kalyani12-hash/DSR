const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');

console.log('Building CIEL by DSR static distribution...');

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

// Copy root files
const filesToCopy = ['index.html', 'index.standalone.html', 'README.md'];
for (const file of filesToCopy) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, file));
  }
}

// Copy directories
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(path.join(root, 'css'), path.join(dist, 'css'));
copyDir(path.join(root, 'js'), path.join(dist, 'js'));
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));

console.log('Build successful: dist/ folder created with all static assets!');
