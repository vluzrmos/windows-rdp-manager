using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace RdpManager.Host
{
    /// <summary>
    /// Janela de sessão RDP com título personalizado, barra de ferramentas e painel de status.
    /// </summary>
    public class SessionForm : Form
    {
        private static readonly Color Background = Color.FromArgb(15, 23, 42);   // slate-900
        private static readonly Color Surface = Color.FromArgb(30, 41, 59);      // slate-800
        private static readonly Color Hover = Color.FromArgb(51, 65, 85);        // slate-700
        private static readonly Color TextColor = Color.FromArgb(226, 232, 240); // slate-200
        private static readonly Color MutedText = Color.FromArgb(148, 163, 184); // slate-400

        private readonly Config config;
        private readonly string host;
        private readonly string screenMode;
        private string password;

        private readonly RdpControl rdp;
        private readonly ToolStrip toolbar;
        private readonly ToolStripLabel statusLabel;
        private readonly ToolStripButton fullScreenButton;
        private readonly ToolStripButton smartSizingButton;
        private readonly ToolStripButton reconnectButton;
        private readonly ToolStripButton disconnectButton;
        private readonly Panel statusPanel;
        private readonly Label statusPanelText;
        private readonly Timer resizeTimer;

        private bool loggedIn;
        private bool closeRequested;
        private bool inFullScreen;
        private bool fullScreenOnConnect;
        private FormWindowState restoreState = FormWindowState.Normal;
        private Rectangle restoreBounds;

        public SessionForm(Config config)
        {
            this.config = config;
            host = config.Str("host", string.Empty);
            screenMode = config.Str("screenMode", "fullscreen");
            password = config.Str("password", null);
            config.Forget("password");

            string name = config.Str("title", host);
            Text = name == host ? host + " — Windows RDP Manager" : name + " (" + host + ") — Windows RDP Manager";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            Font = new Font("Segoe UI", 9f);
            AutoScaleDimensions = new SizeF(96f, 96f);
            AutoScaleMode = AutoScaleMode.Dpi;
            BackColor = Background;
            ForeColor = TextColor;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(480, 360);
            Size = new Size(1280, 800);
            KeyPreview = true;

            // Barra de ferramentas
            toolbar = new ClickThroughToolStrip();
            toolbar.GripStyle = ToolStripGripStyle.Hidden;
            toolbar.Renderer = new DarkRenderer();
            toolbar.BackColor = Surface;
            toolbar.ForeColor = TextColor;
            toolbar.Padding = new Padding(6, 3, 6, 3);

            statusLabel = new ToolStripLabel("Conectando a " + host + "…");
            statusLabel.ForeColor = MutedText;

            disconnectButton = MakeButton("Desconectar", "Encerra a conexão RDP");
            disconnectButton.Click += delegate { Disconnect(); };
            reconnectButton = MakeButton("Reconectar", "Reconecta a sessão");
            reconnectButton.Click += delegate { Reconnect(); };
            smartSizingButton = MakeButton("Ajustar à janela", "Escala a área de trabalho remota para caber na janela");
            smartSizingButton.CheckOnClick = true;
            smartSizingButton.Checked = config.Bool("smartSizing", true);
            smartSizingButton.CheckedChanged += delegate { ApplySmartSizing(); };
            fullScreenButton = MakeButton("Tela cheia", "Alterna para tela cheia (Ctrl+Alt+Break)");
            fullScreenButton.Click += delegate { EnterFullScreen(); };

            toolbar.Items.Add(statusLabel);
            toolbar.Items.Add(disconnectButton);
            toolbar.Items.Add(reconnectButton);
            toolbar.Items.Add(smartSizingButton);
            toolbar.Items.Add(fullScreenButton);

            // Controle RDP
            RdpEvents events = new RdpEvents(this);
            rdp = new RdpControl(events);
            rdp.Dock = DockStyle.Fill;

            // Painel exibido durante a conexão e quando a sessão está desconectada
            statusPanel = new Panel();
            statusPanel.Dock = DockStyle.Fill;
            statusPanel.BackColor = Surface;

            statusPanelText = new Label();
            statusPanelText.Dock = DockStyle.Fill;
            statusPanelText.TextAlign = ContentAlignment.MiddleCenter;
            statusPanelText.ForeColor = TextColor;
            statusPanelText.Font = new Font("Segoe UI", 11f);
            statusPanelText.Text = "Conectando a " + host + "…";
            statusPanel.Controls.Add(statusPanelText);

            Controls.Add(rdp);
            Controls.Add(statusPanel);
            Controls.Add(toolbar);
            statusPanel.BringToFront();
            toolbar.SendToBack();

            resizeTimer = new Timer();
            resizeTimer.Interval = 500;
            resizeTimer.Tick += delegate
            {
                resizeTimer.Stop();
                UpdateRemoteResolution();
            };

            UpdateButtons(false);
        }

        private ToolStripButton MakeButton(string text, string tooltip)
        {
            ToolStripButton button = new ToolStripButton(text);
            button.Alignment = ToolStripItemAlignment.Right;
            button.DisplayStyle = ToolStripItemDisplayStyle.Text;
            button.ToolTipText = tooltip;
            button.ForeColor = TextColor;
            button.Margin = new Padding(2, 1, 2, 1);
            return button;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            // Barra de título escura (Windows 10 20H1+ / Windows 11)
            int enabled = 1;
            try { DwmSetWindowAttribute(Handle, 20, ref enabled, sizeof(int)); } catch { }
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            Activate();

            try
            {
                Configure();
                Connect();
            }
            catch (Exception ex)
            {
                Ipc.Send("fatal", ex.Message);
                ShowStatusPanel("Não foi possível iniciar a conexão:\n" + ex.Message);
            }
        }

        private void Configure()
        {
            dynamic ocx = rdp.Ocx;
            dynamic adv = GetAdvancedSettings(ocx);

            ocx.Server = host;
            TrySet("UserName", delegate { ocx.UserName = config.Str("username", string.Empty); });
            string domain = config.Str("domain", string.Empty);
            if (domain.Length > 0) TrySet("Domain", delegate { ocx.Domain = domain; });
            TrySet("FullScreenTitle", delegate { ocx.FullScreenTitle = Text; });
            TrySet("ColorDepth", delegate { ocx.ColorDepth = config.Int("colorDepth", 32); });

            // Resolução inicial
            if (screenMode == "custom")
            {
                int width = config.Int("width", 1280);
                int height = config.Int("height", 800);
                Rectangle area = Screen.FromControl(this).WorkingArea;
                ClientSize = new Size(Math.Min(width, area.Width), Math.Min(height + toolbar.Height, area.Height));
                CenterToScreen();
                SetDesktopSize(ocx, width, height);
            }
            else if (screenMode == "fullscreen")
            {
                // A janela entra em tela cheia só depois de conectar (ver HandleConnected)
                Rectangle bounds = Screen.FromControl(this).Bounds;
                SetDesktopSize(ocx, bounds.Width, bounds.Height);
                fullScreenOnConnect = true;
            }
            else
            {
                SetDesktopSize(ocx, rdp.ClientSize.Width, rdp.ClientSize.Height);
            }

            // Segurança: NLA (CredSSP) e aviso de certificado igual ao mstsc
            TrySet("RDPPort", delegate { adv.RDPPort = config.Int("port", 3389); });
            TrySet("EnableCredSspSupport", delegate { adv.EnableCredSspSupport = true; });
            TrySet("AuthenticationLevel", delegate { adv.AuthenticationLevel = 2; });
            TrySet("EnableAutoReconnect", delegate { adv.EnableAutoReconnect = true; });
            TrySet("DisplayConnectionBar", delegate { adv.DisplayConnectionBar = true; });
            // A tela cheia é feita por esta janela (o controle só a solicita), evitando uma
            // segunda janela de tela cheia criada pelo próprio controle.
            TrySet("ContainerHandledFullScreen", delegate { adv.ContainerHandledFullScreen = 1; });
            TrySet("SmartSizing", delegate { adv.SmartSizing = smartSizingButton.Checked; });

            // Recursos locais
            TrySet("RedirectClipboard", delegate { adv.RedirectClipboard = config.Bool("redirectClipboard", true); });
            TrySet("RedirectPrinters", delegate { adv.RedirectPrinters = config.Bool("redirectPrinters", false); });
            TrySet("RedirectDrives", delegate { adv.RedirectDrives = config.Bool("redirectDrives", false); });
            TrySet("AudioRedirectionMode", delegate { ocx.SecuredSettings2.AudioRedirectionMode = config.Int("audioMode", 0); });
            TrySet("KeyboardHookMode", delegate { ocx.SecuredSettings2.KeyboardHookMode = 2; });
            TrySet("AudioCaptureRedirectionMode", delegate { adv.AudioCaptureRedirectionMode = config.Bool("audioCapture", false); });
            if (config.Bool("adminConsole", false))
            {
                TrySet("ConnectToAdministerServer", delegate { adv.ConnectToAdministerServer = true; });
            }

            // Experiência
            int connectionType = config.Int("connectionType", 7);
            TrySet("NetworkConnectionType", delegate { adv.NetworkConnectionType = connectionType; });
            TrySet("BandwidthDetection", delegate { adv.BandwidthDetection = connectionType == 7; });
            int flags = 0;
            if (!config.Bool("enableWallpaper", true)) flags |= 0x1;   // TS_PERF_DISABLE_WALLPAPER
            if (!config.Bool("enableTheme", true)) flags |= 0x8;       // TS_PERF_DISABLE_THEMING
            if (config.Bool("enableFontSmoothing", true)) flags |= 0x80;        // TS_PERF_ENABLE_FONT_SMOOTHING
            if (config.Bool("enableDesktopComposition", true)) flags |= 0x100;  // TS_PERF_ENABLE_DESKTOP_COMPOSITION
            TrySet("PerformanceFlags", delegate { adv.PerformanceFlags = flags; });

            // RD Gateway
            if (config.Bool("gatewayEnabled", false))
            {
                string gatewayHost = config.Str("gatewayHostname", string.Empty);
                string gatewayUser = config.Str("gatewayUsername", string.Empty);
                int usage = config.Int("gatewayUsageMethod", 1);
                TrySet("Gateway", delegate
                {
                    dynamic transport = ocx.TransportSettings2;
                    transport.GatewayHostname = gatewayHost;
                    transport.GatewayUsageMethod = usage;
                    transport.GatewayProfileUsageMethod = 1;
                    transport.GatewayCredsSource = 4;
                    transport.GatewayCredSharing = gatewayUser.Length == 0 ? 1 : 0;
                    if (gatewayUser.Length > 0) transport.GatewayUsername = gatewayUser;
                });
            }
        }

        private static dynamic GetAdvancedSettings(dynamic ocx)
        {
            try { return ocx.AdvancedSettings9; } catch { }
            try { return ocx.AdvancedSettings8; } catch { }
            try { return ocx.AdvancedSettings7; } catch { }
            return ocx.AdvancedSettings2;
        }

        private static void SetDesktopSize(dynamic ocx, int width, int height)
        {
            ocx.DesktopWidth = ClampDimension(width);
            ocx.DesktopHeight = ClampDimension(height);
        }

        private static int ClampDimension(int value)
        {
            int clamped = Math.Max(200, Math.Min(8192, value));
            return clamped - (clamped % 2);
        }

        private static void TrySet(string what, Action action)
        {
            try
            {
                action();
            }
            catch (Exception ex)
            {
                Ipc.Send("warning", what + ": " + ex.Message);
            }
        }

        private void Connect()
        {
            loggedIn = false;
            statusLabel.Text = "Conectando a " + host + "…";
            ShowLoadingPanel();

            if (!string.IsNullOrEmpty(password))
            {
                rdp.SetPassword(password);
            }

            rdp.Ocx.Connect();
            UpdateButtons(true);
            // Durante a conexão a janela permanece normal; tela cheia só após o servidor responder
            fullScreenButton.Enabled = false;
        }

        private void Reconnect()
        {
            if (IsConnected())
            {
                return;
            }
            try
            {
                if (screenMode != "custom")
                {
                    SetDesktopSize(rdp.Ocx, rdp.ClientSize.Width, rdp.ClientSize.Height);
                }
                Connect();
            }
            catch (Exception ex)
            {
                ShowStatusPanel("Falha ao reconectar:\n" + ex.Message);
            }
        }

        private void Disconnect()
        {
            if (IsConnected())
            {
                try { rdp.Ocx.Disconnect(); } catch { }
            }
        }

        private bool IsConnected()
        {
            try { return (int)rdp.Ocx.Connected != 0; } catch { return false; }
        }

        private void EnterFullScreen()
        {
            if (!IsConnected() || inFullScreen)
            {
                return;
            }

            TrySet("FullScreen", delegate
            {
                dynamic ocx = rdp.Ocx;
                // Ao sair da tela cheia pela barra de conexão, a propriedade pode continuar "true";
                // nesse caso a primeira atribuição seria ignorada, então forçamos a transição.
                if ((bool)ocx.FullScreen)
                {
                    ocx.FullScreen = false;
                }
                ocx.FullScreen = true;
            });

            // O controle exibe a barra de conexão; a janela assume o monitor inteiro
            ApplyFullScreenLayout(true);
        }

        /// <summary>
        /// Tela cheia gerenciada pela própria janela: sem borda, sem barra de ferramentas,
        /// cobrindo o monitor atual. Ao sair, restaura posição, tamanho e estado anteriores.
        /// </summary>
        private void ApplyFullScreenLayout(bool fullScreen)
        {
            if (fullScreen == inFullScreen)
            {
                return;
            }
            inFullScreen = fullScreen;
            fullScreenButton.Checked = fullScreen;

            if (fullScreen)
            {
                restoreState = WindowState == FormWindowState.Minimized ? FormWindowState.Normal : WindowState;
                restoreBounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;

                Rectangle screen = Screen.FromControl(this).Bounds;
                WindowState = FormWindowState.Normal;
                toolbar.Visible = false;
                FormBorderStyle = FormBorderStyle.None;
                Bounds = screen;
                Activate();
            }
            else
            {
                FormBorderStyle = FormBorderStyle.Sizable;
                toolbar.Visible = true;
                Bounds = restoreBounds;
                WindowState = restoreState;
            }

            rdp.Focus();
            resizeTimer.Stop();
            resizeTimer.Start();
        }

        private void ApplySmartSizing()
        {
            dynamic ocx = rdp.Ocx;
            TrySet("SmartSizing", delegate { GetAdvancedSettings(ocx).SmartSizing = smartSizingButton.Checked; });
            if (!smartSizingButton.Checked)
            {
                UpdateRemoteResolution();
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (resizeTimer != null && loggedIn && WindowState != FormWindowState.Minimized)
            {
                resizeTimer.Stop();
                resizeTimer.Start();
            }
        }

        /// <summary>
        /// Ajusta a resolução remota ao tamanho da janela (servidores Windows 8.1/2012 R2+).
        /// Só se aplica quando a escala local (smart sizing) está desligada e a resolução não é fixa.
        /// </summary>
        private void UpdateRemoteResolution()
        {
            if (!loggedIn || smartSizingButton.Checked || screenMode == "custom")
            {
                return;
            }

            int width = ClampDimension(rdp.ClientSize.Width);
            int height = ClampDimension(rdp.ClientSize.Height);
            ApplyDisplaySettings(width, height);
        }

        private void ApplyDisplaySettings(int width, int height)
        {
            float dpi;
            using (Graphics g = CreateGraphics())
            {
                dpi = g.DpiX;
            }
            uint scale = (uint)Math.Max(100, Math.Round(dpi * 100 / 96));
            uint deviceScale = scale >= 200 ? 180u : (scale >= 140 ? 140u : 100u);
            uint physicalWidth = (uint)(width * 25.4 / dpi);
            uint physicalHeight = (uint)(height * 25.4 / dpi);

            try
            {
                rdp.Ocx.UpdateSessionDisplaySettings((uint)width, (uint)height, physicalWidth, physicalHeight, 0u, scale, deviceScale);
            }
            catch
            {
                // Servidor antigo ou sessão ainda não pronta: mantém a resolução atual.
            }
        }

        private void UpdateButtons(bool active)
        {
            disconnectButton.Enabled = active;
            fullScreenButton.Enabled = active;
            reconnectButton.Enabled = !active;
        }

        private void ShowStatusPanel(string message)
        {
            statusPanelText.Text = message + "\n\nUse \"Reconectar\" na barra acima ou feche a janela.";
            statusPanel.Visible = true;
            statusPanel.BringToFront();
        }

        /// <summary>
        /// Cobre o controle RDP (que pinta fundo branco antes de conectar) enquanto a conexão é estabelecida.
        /// </summary>
        private void ShowLoadingPanel()
        {
            statusPanelText.Text = "Conectando a " + host + "…";
            statusPanel.Visible = true;
            statusPanel.BringToFront();
        }

        private void HideStatusPanel()
        {
            statusPanel.Visible = false;
        }

        protected override void OnActivated(EventArgs e)
        {
            base.OnActivated(e);
            if (!statusPanel.Visible)
            {
                rdp.Focus();
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (!closeRequested && IsConnected())
            {
                DialogResult answer = MessageBox.Show(this,
                    "A sessão remota será desconectada. Deseja continuar?",
                    Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question);

                e.Cancel = true;
                if (answer == DialogResult.Yes)
                {
                    closeRequested = true;
                    Disconnect();
                }
                return;
            }

            password = null;
            Ipc.Send("closed", null);
            base.OnFormClosing(e);
        }

        // ---- Eventos do controle (chamados na thread de UI) ----

        internal void HandleConnecting()
        {
            statusLabel.Text = "Conectando a " + host + "…";
            Ipc.Send("connecting", null);
        }

        internal void HandleConnected()
        {
            statusLabel.Text = "Autenticando em " + host + "…";
            HideStatusPanel();
            fullScreenButton.Enabled = true;
            rdp.Focus();
            Ipc.Send("connected", null);

            if (fullScreenOnConnect)
            {
                fullScreenOnConnect = false;
                EnterFullScreen();
            }
        }

        internal void HandleLoginComplete()
        {
            loggedIn = true;
            statusLabel.Text = "Conectado a " + host;
            Ipc.Send("login", null);
            UpdateRemoteResolution();
        }

        internal void HandleDisconnected(int reason)
        {
            loggedIn = false;
            UpdateButtons(false);
            ApplyFullScreenLayout(false);

            int extended = 0;
            try { extended = (int)rdp.Ocx.ExtendedDisconnectReason; } catch { }

            string description = null;
            try { description = (string)rdp.Ocx.GetErrorDescription((uint)reason, (uint)extended); } catch { }
            if (string.IsNullOrEmpty(description)) description = "Código " + reason;

            Ipc.Send("disconnected", reason + ":" + extended + ":" + description);
            statusLabel.Text = "Desconectado";

            // 1 = desconexão local, 2 = desconexão remota pelo usuário,
            // 3 + extended 1/2/12 = desconexão/logoff iniciado pelo usuário no servidor
            bool userInitiated = reason == 1 || reason == 2 ||
                (reason == 3 && (extended == 1 || extended == 2 || extended == 12));

            if (closeRequested || userInitiated)
            {
                closeRequested = true;
                BeginInvoke(new MethodInvoker(Close));
                return;
            }

            ShowStatusPanel("A conexão com " + host + " foi encerrada.\n" + description);
        }

        internal void HandleFullScreenChanged(bool fullScreen)
        {
            ApplyFullScreenLayout(fullScreen);
        }

        internal void HandleMinimizeRequest()
        {
            WindowState = FormWindowState.Minimized;
        }

        internal void HandleFatalError(int code)
        {
            Ipc.Send("fatal", "Erro fatal do controle RDP: " + code);
            ShowStatusPanel("Erro fatal do cliente RDP (código " + code + ").");
        }

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        /// <summary>
        /// ToolStrip que aceita o clique mesmo quando o foco está na sessão remota
        /// (por padrão o primeiro clique apenas ativa a barra e é descartado).
        /// </summary>
        private class ClickThroughToolStrip : ToolStrip
        {
            private const int WM_MOUSEACTIVATE = 0x21;
            private const int MA_ACTIVATE = 1;
            private const int MA_ACTIVATEANDEAT = 2;

            protected override void WndProc(ref Message m)
            {
                base.WndProc(ref m);
                if (m.Msg == WM_MOUSEACTIVATE && m.Result == (IntPtr)MA_ACTIVATEANDEAT)
                {
                    m.Result = (IntPtr)MA_ACTIVATE;
                }
            }
        }

        private class DarkRenderer : ToolStripProfessionalRenderer
        {
            protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
            {
            }

            protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
            {
                using (SolidBrush brush = new SolidBrush(Surface))
                {
                    e.Graphics.FillRectangle(brush, e.AffectedBounds);
                }
            }

            protected override void OnRenderButtonBackground(ToolStripItemRenderEventArgs e)
            {
                ToolStripButton button = e.Item as ToolStripButton;
                bool highlight = e.Item.Selected || e.Item.Pressed || (button != null && button.Checked);
                if (!highlight || !e.Item.Enabled) return;

                using (SolidBrush brush = new SolidBrush(Hover))
                {
                    e.Graphics.FillRectangle(brush, new Rectangle(Point.Empty, e.Item.Size));
                }
            }

            protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
            {
                e.TextColor = e.Item.Enabled ? e.Item.ForeColor : Hover;
                base.OnRenderItemText(e);
            }
        }
    }

    /// <summary>
    /// Sink COM dos eventos do controle RDP; repassa para a janela.
    /// </summary>
    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.None)]
    public class RdpEvents : IMsTscAxEvents
    {
        private readonly SessionForm form;

        public RdpEvents(SessionForm form)
        {
            this.form = form;
        }

        public void OnConnecting() { form.HandleConnecting(); }
        public void OnConnected() { form.HandleConnected(); }
        public void OnLoginComplete() { form.HandleLoginComplete(); }
        public void OnDisconnected(int discReason) { form.HandleDisconnected(discReason); }
        public void OnEnterFullScreenMode() { form.HandleFullScreenChanged(true); }
        public void OnLeaveFullScreenMode() { form.HandleFullScreenChanged(false); }
        public void OnRequestGoFullScreen() { form.HandleFullScreenChanged(true); }
        public void OnRequestLeaveFullScreen() { form.HandleFullScreenChanged(false); }
        public void OnRequestContainerMinimize() { form.HandleMinimizeRequest(); }
        public void OnConfirmClose(out bool pfAllowClose) { pfAllowClose = true; }
        public void OnFatalError(int errorCode) { form.HandleFatalError(errorCode); }
        public void OnWarning(int warningCode) { Ipc.Send("warning", "Aviso do controle RDP: " + warningCode); }
    }
}
