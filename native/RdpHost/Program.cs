using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace RdpManager.Host
{
    /// <summary>
    /// Ponto de entrada do RdpHost.exe.
    /// Todos os dados (inclusive senhas) chegam via stdin em JSON — nunca pela linha de comando.
    ///   RdpHost.exe connect      -> abre a janela de sessão RDP (controle ActiveX mstscax)
    ///   RdpHost.exe cred-write   -> grava credencial TERMSRV/* no Credential Manager (CredWriteW)
    ///   RdpHost.exe cred-delete  -> remove credenciais TERMSRV/* (CredDeleteW)
    /// </summary>
    public static class Program
    {
        [STAThread]
        public static int Main(string[] args)
        {
            string mode = args.Length > 0 ? args[0] : string.Empty;

            try
            {
                Config input = new Config(ReadStdinJson());

                switch (mode)
                {
                    case "connect":
                        Application.EnableVisualStyles();
                        Application.SetCompatibleTextRenderingDefault(false);
                        Application.Run(new SessionForm(input));
                        return 0;

                    case "cred-write":
                        return CredentialStore.Write(input) ? 0 : 1;

                    case "cred-delete":
                        CredentialStore.Delete(input);
                        return 0;

                    default:
                        Ipc.Send("fatal", "Modo inválido: " + mode);
                        return 2;
                }
            }
            catch (Exception ex)
            {
                Ipc.Send("fatal", ex.Message);
                return 1;
            }
        }

        private static Dictionary<string, object> ReadStdinJson()
        {
            string json;
            using (StreamReader reader = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)))
            {
                json = reader.ReadToEnd();
            }

            if (string.IsNullOrWhiteSpace(json))
            {
                return new Dictionary<string, object>();
            }

            Dictionary<string, object> data = new JavaScriptSerializer().DeserializeObject(json) as Dictionary<string, object>;
            return data ?? new Dictionary<string, object>();
        }
    }

    /// <summary>
    /// Acesso tipado ao JSON recebido via stdin.
    /// </summary>
    public class Config
    {
        private readonly Dictionary<string, object> data;

        public Config(Dictionary<string, object> data)
        {
            this.data = data;
        }

        public string Str(string key, string fallback)
        {
            object value;
            if (data.TryGetValue(key, out value) && value != null)
            {
                return Convert.ToString(value);
            }
            return fallback;
        }

        public int Int(string key, int fallback)
        {
            object value;
            if (data.TryGetValue(key, out value) && value != null)
            {
                try { return Convert.ToInt32(value); } catch { }
            }
            return fallback;
        }

        public bool Bool(string key, bool fallback)
        {
            object value;
            if (data.TryGetValue(key, out value) && value is bool)
            {
                return (bool)value;
            }
            return fallback;
        }

        public List<string> List(string key)
        {
            List<string> result = new List<string>();
            object value;
            if (data.TryGetValue(key, out value) && value is object[])
            {
                foreach (object item in (object[])value)
                {
                    if (item != null) result.Add(Convert.ToString(item));
                }
            }
            return result;
        }

        /// <summary>
        /// Remove um valor sensível do dicionário após o uso.
        /// </summary>
        public void Forget(string key)
        {
            data.Remove(key);
        }
    }

    /// <summary>
    /// Eventos enviados ao processo Electron como linhas JSON no stdout.
    /// </summary>
    public static class Ipc
    {
        private static readonly object Sync = new object();
        private static readonly JavaScriptSerializer Serializer = new JavaScriptSerializer();
        private static StreamWriter writer;

        public static void Send(string evt, string detail)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            payload["event"] = evt;
            if (detail != null) payload["detail"] = detail;

            lock (Sync)
            {
                try
                {
                    if (writer == null)
                    {
                        writer = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
                    }
                    writer.WriteLine(Serializer.Serialize(payload));
                    writer.Flush();
                }
                catch
                {
                    // O processo pai pode ter sido encerrado; a sessão continua normalmente.
                }
            }
        }
    }
}
