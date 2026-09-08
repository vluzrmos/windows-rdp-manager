import { RdpService } from './electron/services/rdpService';
import { PingService } from './electron/services/pingService';
import { CryptoService } from './electron/services/cryptoService';
import { RdpConnection } from './src/types/rdp';

async function runTests() {
  console.log('--- TESTANDO SERVIÇOS DO RDP MANAGER ---');

  // 1. Teste de geração de conteúdo .rdp
  const testConn: RdpConnection = {
    id: 'test-123',
    name: 'Servidor Teste',
    group: 'Produção',
    host: '192.168.1.50',
    port: 3389,
    username: 'Administrator',
    domain: 'CORP',
    tags: ['teste', 'lab'],
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    display: {
      screenMode: 'fullscreen',
      smartSizing: true,
      useMultimon: true,
      colorDepth: 32,
    },
    resources: {
      redirectClipboard: true,
      redirectPrinters: false,
      redirectDrives: true,
      drivesToRedirect: ['*'],
      audioMode: 0,
      audioCapture: false,
    },
    experience: {
      connectionType: 7,
      enableWallpaper: true,
      enableFontSmoothing: true,
      enableDesktopComposition: true,
      enableTheme: true,
      adminConsole: true,
    },
  };

  console.log('1. Testando gerador de arquivo .rdp...');
  const rdpContent = RdpService.buildRdpContent(testConn);
  console.log('Conteúdo gerado:\n', rdpContent);

  if (!rdpContent.includes('full address:s:192.168.1.50')) throw new Error('Host não encontrado');
  if (!rdpContent.includes('username:s:CORP\\Administrator')) throw new Error('Usuário/domínio não encontrado');
  if (!rdpContent.includes('screen mode id:i:2')) throw new Error('Modo tela cheia não encontrado');
  if (!rdpContent.includes('administrative session:i:1')) throw new Error('Modo admin não encontrado');
  console.log('✔ Geração de arquivo .rdp validada com sucesso!\n');

  // 2. Teste de Master Password AES-256-GCM
  console.log('2. Testando Criptografia de Exportação (AES-256-GCM + PBKDF2)...');
  const secretData = { server: 'prod-01', password: 'SuperSecretPassword!@#123' };
  const masterPass = 'MinhaSenhaMestraForte2025';
  const encryptedPayload = CryptoService.exportWithPassword(secretData, masterPass);
  console.log('Payload exportado:', encryptedPayload);

  const decryptedData = CryptoService.importWithPassword<typeof secretData>(encryptedPayload, masterPass);
  if (decryptedData.password !== secretData.password) {
    throw new Error('Falha ao descriptografar backup!');
  }
  console.log('✔ Criptografia e decriptografia AES-256-GCM com senha mestra funcionando perfeitamente!\n');

  // 3. Teste de Socket Ping
  console.log('3. Testando PingService (TCP Port Checker)...');
  const pingRes = await PingService.checkPort('127.0.0.1', 80, 500);
  console.log('Resultado do teste de porta TCP local:', pingRes);
  console.log('✔ PingService funcionando sem erros!');

  console.log('\n======================================');
  console.log('TODOS OS TESTES DE CORE PASSARAM COM SUCESSO!');
  console.log('======================================');
}

runTests().catch((err) => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
