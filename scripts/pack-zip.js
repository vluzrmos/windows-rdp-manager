const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sevenZip = require('7zip-bin');
const pkg = require('../package.json');

const releaseDir = path.resolve(__dirname, '..', 'release');
const unpackedDir = path.join(releaseDir, 'win-unpacked');
const zipFileName = `Windows-RDP-Manager-v${pkg.version}-win-x64.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

if (!fs.existsSync(unpackedDir)) {
  console.error(`Directory not found: ${unpackedDir}`);
  console.error('Run "npm run pack" first.');
  process.exit(1);
}

if (fs.existsSync(zipFilePath)) {
  console.log(`Removing old archive: ${zipFileName}`);
  fs.rmSync(zipFilePath, { force: true });
}

console.log(`Creating ZIP archive: ${zipFileName}...`);
try {
  execFileSync(
    sevenZip.path7za,
    ['a', '-tzip', '-r', '-y', zipFilePath, `${unpackedDir}\\*`],
    { stdio: 'inherit' }
  );
  console.log(`Archive created successfully: ${zipFilePath}`);
} catch (error) {
  console.error('Failed to create ZIP archive:', error);
  process.exit(1);
}
