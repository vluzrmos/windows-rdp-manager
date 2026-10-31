using System;
using System.Runtime.InteropServices;

namespace RdpManager.Host
{
    /// <summary>
    /// Restaura (se minimizada) e traz para frente a janela de uma sessão já aberta.
    /// Roda como processo iniciado pelo Electron — que está em primeiro plano após o clique
    /// do usuário — e por isso tem permissão do Windows para chamar SetForegroundWindow.
    /// </summary>
    public static class WindowFocus
    {
        private const int SW_RESTORE = 9;

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

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

            if (IsIconic(hWnd))
            {
                ShowWindow(hWnd, SW_RESTORE);
            }
            SetForegroundWindow(hWnd);
            return true;
        }
    }
}
