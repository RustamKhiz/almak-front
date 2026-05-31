const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const packageJson = require(path.join(rootDir, 'package.json'));
const version = packageJson.version;
const installerName = `Almak-Setup-${version}.exe`;
const installerPath = path.join(releaseDir, installerName);
const latestInstallerPath = path.join(releaseDir, 'Almak-Setup-latest.exe');
const blockmapPath = path.join(releaseDir, `${installerName}.blockmap`);
const latestYmlPath = path.join(releaseDir, 'latest.yml');

function assertFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Required release file is missing: ${path.relative(rootDir, filePath)}`);
  }
}

assertFile(installerPath);
assertFile(blockmapPath);
assertFile(latestYmlPath);

fs.copyFileSync(installerPath, latestInstallerPath);

console.log(`Prepared desktop release ${version}`);
console.log(`- ${path.relative(rootDir, installerPath)}`);
console.log(`- ${path.relative(rootDir, blockmapPath)}`);
console.log(`- ${path.relative(rootDir, latestYmlPath)}`);
console.log(`- ${path.relative(rootDir, latestInstallerPath)}`);
