/**
 * Compila o RdpHost.exe (host do controle ActiveX do Remote Desktop) usando o csc.exe
 * do .NET Framework 4.x, que já acompanha o Windows — não exige SDK nem runtime extra.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'native', 'RdpHost');
const outDir = path.join(root, 'dist-native');
const outFile = path.join(outDir, 'RdpHost.exe');

const windir = process.env.WINDIR || 'C:\\Windows';
const cscCandidates = [
  path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe'),
];
const csc = cscCandidates.find((c) => fs.existsSync(c));

if (!csc) {
  console.error('csc.exe do .NET Framework 4.x não encontrado. O RdpHost.exe requer Windows com .NET Framework 4.x.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const sources = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith('.cs'))
  .map((f) => path.join(srcDir, f));

const args = [
  '/nologo',
  '/target:winexe',
  '/platform:x64',
  '/optimize+',
  `/out:${outFile}`,
  `/win32icon:${path.join(root, 'build', 'icon.ico')}`,
  `/win32manifest:${path.join(srcDir, 'app.manifest')}`,
  '/r:System.dll',
  '/r:System.Core.dll',
  '/r:System.Drawing.dll',
  '/r:System.Windows.Forms.dll',
  '/r:System.Web.Extensions.dll',
  '/r:Microsoft.CSharp.dll',
  ...sources,
];

try {
  execFileSync(csc, args, { stdio: 'inherit' });
  console.log(`RdpHost.exe compilado em ${path.relative(root, outFile)}`);
} catch {
  console.error('Falha ao compilar o RdpHost.exe');
  process.exit(1);
}
