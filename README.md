# 🖥️ Windows RDP Manager

Aplicação desktop profissional, moderna e de alta segurança para gerenciar conexões e perfis de Área de Trabalho Remota (**RDP**) no Windows, com integração nativa ao **`mstsc.exe`**.

---

## 🔒 Segurança e Armazenamento de Senhas

1. **Windows DPAPI (Data Protection API)**:
   - Todas as senhas salvas são criptografadas em repouso utilizando a API de Proteção de Dados nativa do Windows (`safeStorage`).
   - A chave de criptografia é vinculada à sua conta de usuário do Windows e ao hardware da máquina (TPM). Mesmo que o arquivo de dados seja copiado para outro computador ou lido por outro usuário, ele **não pode ser descriptografado**.
2. **Conexão Direta sem Prompt de Senha**:
   - Ao clicar em "Conectar", o aplicativo registra com segurança a credencial no **Windows Credential Manager** para o destino RDP (`cmdkey /generic:TERMSRV/<host>`).
   - O cliente nativo `mstsc.exe` é aberto com o arquivo de perfil `.rdp` gerado dinamicamente e autentica instantaneamente sem necessidade de digitar a senha manualmente.
3. **Backup e Exportação com Senha Mestra (AES-256-GCM + PBKDF2)**:
   - Para migrar perfis para outro computador ou guardar backup em local seguro, a exportação utiliza criptografia autenticada AES-256-GCM com chave derivada por PBKDF2 (100.000 iterações SHA-256).

---

## 🚀 Funcionalidades

- ⚡ **Abertura Nativa RDP**: Abre diretamente o cliente oficial do Windows (`mstsc.exe`), garantindo suporte total a aceleração de vídeo, redirecionamento de som, microfone, discos e impressoras.
- 🎯 **Verificador de Porta TCP (Ping 3389)**: Teste em tempo real para verificar se o servidor está online e aceitando conexões antes de tentar conectar.
- 🖥️ **Configurações Avançadas de Tela**:
  - Tela Cheia (Fullscreen)
  - Resoluções personalizadas (Full HD, 2K, 4K)
  - Smart Sizing (redimensionamento dinâmico ao ajustar a janela)
  - Suporte a múltiplos monitores (`/multimon`)
- 📁 **Organização por Grupos e Tags**: Categorize servidores por ambiente (*Produção*, *Homologação*, *Infra*, *Clientes*) e adicione tags personalizadas.
- ⭐ **Favoritos e Acesso Rápido**: Fixe seus servidores mais utilizados no topo.
- 🔍 **Busca Instantânea**: Atalho global `Ctrl + K` para localizar qualquer host ou servidor em milissegundos.
- 🗂️ **Dois Modos de Visualização**:
  - Grade de Cards com visual moderno
  - Tabela densa para gerenciamento de grande volume de servidores
- 🛡️ **Sessão Administrativa / Console**: Opção para conectar à sessão zero/console físico do Windows Server (`/admin`).
- 🌐 **Suporte a RD Gateway**: Conecte a servidores corporativos protegidos por Gateway de Área de Trabalho Remota.

---

## 🛠️ Como Executar

### 1. Requisitos
- Windows 10 ou Windows 11
- Node.js 18+ (testado no Node v22)

### 2. Rodar em Modo de Desenvolvimento
```powershell
# Inicia o Vite e o Electron com Live Reload
npm run dev
```

### 3. Rodar a Aplicação Compilada
```powershell
# Constrói o frontend e o backend
npm run build

# Inicia o aplicativo
npm start
```

### 4. Gerar Instalador Executável (.exe)
```powershell
npm run dist
```
O instalador será gerado na pasta `dist/`.

---

## ⌨️ Atalhos de Teclado

- `Ctrl + K`: Focar campo de busca
- `Ctrl + N`: Abrir formulário de nova conexão
- `F5`: Atualizar status de conectividade (ping em lote)
- `Duplo Clique`: Conectar imediatamente ao servidor
