/**
 * Gera o número de build incremental usado no empacotamento (não altera a versão do app).
 *
 * - Local: incrementa o contador em .build-number (fora do git).
 * - CI (GitHub Actions): usa GITHUB_RUN_NUMBER.
 *
 * Grava build-info.json (lido pelo Vite para a tela "Sobre" e pelos scripts de empacotamento)
 * e build/build-info.nsh (lido pelo instalador para diferenciar builds da mesma versão).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const counterPath = path.join(root, '.build-number');
const pkg = require('../package.json');

let buildNumber;
if (process.env.GITHUB_RUN_NUMBER) {
  buildNumber = Number(process.env.GITHUB_RUN_NUMBER);
} else {
  const previous = fs.existsSync(counterPath) ? Number(fs.readFileSync(counterPath, 'utf-8').trim()) || 0 : 0;
  buildNumber = previous + 1;
  fs.writeFileSync(counterPath, `${buildNumber}\n`, 'utf-8');
}

const info = { version: pkg.version, buildNumber, buildDate: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(info, null, 2) + '\n', 'utf-8');
fs.writeFileSync(path.join(root, 'build', 'build-info.nsh'), `!define APP_BUILD_NUMBER "${buildNumber}"\n`, 'utf-8');

console.log(`Build: ${pkg.version} (build ${buildNumber})`);
