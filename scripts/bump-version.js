/**
 * Incrementa a versão patch (x.y.Z) do package.json e do package-lock.json antes de cada
 * empacotamento. Necessário porque o instalador (build/installer.nsh) não reinstala quando
 * a mesma versão já está instalada.
 *
 * Não roda no CI (variável CI definida pelo GitHub Actions), onde a versão define a tag da release,
 * nem quando SKIP_VERSION_BUMP=1.
 */
const fs = require('fs');
const path = require('path');

if (process.env.CI || process.env.SKIP_VERSION_BUMP === '1') {
  console.log('Bump de versão ignorado (CI ou SKIP_VERSION_BUMP=1).');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const match = /^(\d+)\.(\d+)\.(\d+)/.exec(pkg.version);
if (!match) {
  console.error(`Versão inválida no package.json: ${pkg.version}`);
  process.exit(1);
}

const previous = pkg.version;
const next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  lock.version = next;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = next;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

console.log(`Versão: ${previous} -> ${next}`);
