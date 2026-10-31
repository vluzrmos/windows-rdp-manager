using System;
using System.Runtime.InteropServices;
using System.Text;

namespace RdpManager.Host
{
    /// <summary>
    /// Grava/remove credenciais TERMSRV/* no Windows Credential Manager via CredWriteW/CredDeleteW,
    /// substituindo o uso de "cmdkey /pass:..." (que expunha a senha na linha de comando do processo).
    /// As credenciais são gravadas com persistência de sessão de logon (somem no logoff).
    /// </summary>
    public static class CredentialStore
    {
        private const int CRED_TYPE_GENERIC = 1;
        private const int CRED_PERSIST_SESSION = 1;

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct CREDENTIAL
        {
            public int Flags;
            public int Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public int CredentialBlobSize;
            public IntPtr CredentialBlob;
            public int Persist;
            public int AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CredWrite(ref CREDENTIAL credential, int flags);

        [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CredDelete(string target, int type, int flags);

        public static bool Write(Config input)
        {
            string username = input.Str("username", string.Empty);
            string password = input.Str("password", string.Empty);
            input.Forget("password");

            if (username.Length == 0 || password.Length == 0)
            {
                return false;
            }

            byte[] blob = Encoding.Unicode.GetBytes(password);
            IntPtr blobPtr = Marshal.AllocHGlobal(blob.Length);
            bool allOk = true;

            try
            {
                Marshal.Copy(blob, 0, blobPtr, blob.Length);

                foreach (string target in input.List("targets"))
                {
                    CREDENTIAL cred = new CREDENTIAL();
                    cred.Type = CRED_TYPE_GENERIC;
                    cred.TargetName = target;
                    cred.UserName = username;
                    cred.CredentialBlob = blobPtr;
                    cred.CredentialBlobSize = blob.Length;
                    cred.Persist = CRED_PERSIST_SESSION;

                    if (!CredWrite(ref cred, 0))
                    {
                        allOk = false;
                        Ipc.Send("warning", "CredWrite falhou para " + target + " (erro " + Marshal.GetLastWin32Error() + ")");
                    }
                }
            }
            finally
            {
                // Zera as cópias da senha que controlamos antes de liberar a memória
                Marshal.Copy(new byte[blob.Length], 0, blobPtr, blob.Length);
                Marshal.FreeHGlobal(blobPtr);
                Array.Clear(blob, 0, blob.Length);
            }

            return allOk;
        }

        public static void Delete(Config input)
        {
            foreach (string target in input.List("targets"))
            {
                CredDelete(target, CRED_TYPE_GENERIC, 0);
            }
        }
    }
}
