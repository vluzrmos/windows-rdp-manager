const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture(win, filename) {
  const image = await win.webContents.capturePage();
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, image.toPNG());
  console.log(`[SCREENSHOT] Salvo: ${filename} (${image.getSize().width}x${image.getSize().height})`);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    frame: false,
    show: true,
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, 'preload-screenshots.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  await win.loadFile(indexPath);

  console.log('App carregado. Aguardando renderização...');
  await sleep(1500);

  // 1. Dashboard em Grade (Grid View)
  console.log('1. Capturando Dashboard Grid View...');
  await capture(win, '01-dashboard-grid.png');

  // 2. Dashboard em Lista / Tabela (List View)
  console.log('2. Mudando para List View e capturando...');
  await win.webContents.executeJavaScript(`
    (() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-list'));
      if (listBtn) listBtn.click();
    })()
  `);
  await sleep(600);
  await capture(win, '02-dashboard-list.png');

  // 3. Modal de Conexão (Editar primeira conexão com todos os dados preenchidos)
  console.log('3. Abrindo Modal de Conexão e capturando aba Geral...');
  await win.webContents.executeJavaScript(`
    (() => {
      const gridBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-layout-grid'));
      if (gridBtn) gridBtn.click();
    })()
  `);
  await sleep(400);

  // Clica no botão de opções do primeiro card
  await win.webContents.executeJavaScript(`
    (() => {
      const moreBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-more-vertical'));
      if (moreBtn) moreBtn.click();
    })()
  `);
  await sleep(300);

  // Clica em "Editar"
  await win.webContents.executeJavaScript(`
    (() => {
      const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Editar'));
      if (editBtn) editBtn.click();
    })()
  `);
  await sleep(600);
  await capture(win, '03-connection-modal.png');

  // 4. Modal de Conexão - Aba Exibição & Tela
  console.log('4. Alternando para aba Exibição & Tela...');
  await win.webContents.executeJavaScript(`
    (() => {
      const displayTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exibição & Tela'));
      if (displayTab) displayTab.click();
    })()
  `);
  await sleep(400);
  await capture(win, '04-connection-display.png');

  // Fecha o Modal de Conexão
  await win.webContents.executeJavaScript(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancelar');
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(400);

  // 5. Modal de Configurações
  console.log('5. Abrindo Modal de Configurações e capturando...');
  await win.webContents.executeJavaScript(`
    (() => {
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Configurações'));
      if (settingsBtn) settingsBtn.click();
    })()
  `);
  await sleep(600);
  await capture(win, '05-settings-modal.png');

  // Fecha o modal de configurações
  await win.webContents.executeJavaScript(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancelar');
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(300);

  console.log('\n[SUCESSO] Todas as capturas de tela foram geradas com sucesso em docs/screenshots/!');
  app.quit();
});
