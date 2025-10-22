const fs = require('fs');
const path = require('path');

// Copy WASM files to dist folder
function copyWasmFiles() {
  const wasmDir = path.join(__dirname, '../wasm');
  const distDir = path.join(__dirname, '../dist');

  // Create dist folder if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy all .js files from wasm folder
  const files = fs.readdirSync(wasmDir);

  files.forEach((file) => {
    if (file.endsWith('.js')) {
      const srcPath = path.join(wasmDir, file);
      const destPath = path.join(distDir, file);

      console.log(`Copying ${file} to dist/`);
      fs.copyFileSync(srcPath, destPath);
    }
  });

  console.log('WASM files copied successfully!');
}

copyWasmFiles();
