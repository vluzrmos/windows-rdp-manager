/**
 * Executa o electron-builder com o número de build gerado por scripts/build-number.js.
 * O build entra na FileVersion do executável (x.y.z.build) e no nome dos artefatos.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const info = require('../build-info.json');

const cli = path.join(path.dirname(require.resolve('electron-builder/package.json')), 'cli.js');
const args = [
  cli,
  ...process.argv.slice(2),
  `-c.buildNumber=${info.buildNumber}`,
  `-c.buildVersion=${info.version}.${info.buildNumber}`,
];

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env: { ...process.env, APP_BUILD_NUMBER: String(info.buildNumber) },
});
process.exit(result.status ?? 1);
