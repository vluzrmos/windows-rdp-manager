using System;
using System.Runtime.InteropServices;

namespace RdpManager.Host
{
    /// <summary>
    /// Pede à janela de uma sessão já aberta que se restaure e venha para frente.
    /// Roda como processo iniciado pelo Electron — que está em primeiro plano após o clique
    /// do usuário — e por isso pode repassar a permissão de primeiro plano ao processo da sessão.
    /// A restauração em si é feita pela própria sessão (SessionForm.WM_RESTORE_SESSION), para que
    /// o controle RDP perceba a mudança e volte a desenhar a tela remota.
    /// </summary>
    public static class WindowFocus
    {
        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        [DllImport("user32.dll")]
        private static extern bool AllowSetForegroundWindow(uint processId);

        [DllImport("user32.dll")]
        private static extern bool PostMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

        public static bool Bring(Config input)
        {
            long handle;
            if (!long.TryParse(input.Str("hwnd", string.Empty), out handle))
            {
                return false;
            }

            IntPtr hWnd = new IntPtr(handle);
            if (!IsWindow(hWnd))
            {
                return false;
            }

            uint processId;
            GetWindowThreadProcessId(hWnd, out processId);
            AllowSetForegroundWindow(processId);

            return PostMessage(hWnd, SessionForm.WM_RESTORE_SESSION, IntPtr.Zero, IntPtr.Zero);
        }
    }
}
