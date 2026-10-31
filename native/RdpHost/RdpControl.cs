using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace RdpManager.Host
{
    /// <summary>
    /// Hospeda o controle ActiveX do Remote Desktop (mstscax.dll) — o mesmo motor do mstsc.exe —
    /// sem depender de assemblies de interop gerados (AxMSTSCLib). O acesso às propriedades é feito
    /// por late binding (dynamic) e os eventos por connection point.
    /// </summary>
    public class RdpControl : AxHost
    {
        // Do mais novo para o mais antigo; o primeiro que puder ser instanciado é usado
        // (algumas versões são registradas mas não fornecem a classe, ex.: .13 no Windows 11).
        private static readonly string[] ProgIds =
        {
            "MsTscAx.MsTscAx.13",
            "MsTscAx.MsTscAx.12",
            "MsTscAx.MsTscAx.11",
            "MsTscAx.MsTscAx.10",
            "MsTscAx.MsTscAx.9",
        };

        private readonly object eventSink;
        private ConnectionPointCookie cookie;

        public RdpControl(object eventSink) : base(ResolveClsid())
        {
            this.eventSink = eventSink;
        }

        public dynamic Ocx
        {
            get { return GetOcx(); }
        }

        private static string ResolveClsid()
        {
            foreach (string progId in ProgIds)
            {
                Type type = Type.GetTypeFromProgID(progId, false);
                if (type == null)
                {
                    continue;
                }

                try
                {
                    object probe = Activator.CreateInstance(type);
                    Marshal.ReleaseComObject(probe);
                    return type.GUID.ToString();
                }
                catch
                {
                    // Versão registrada mas indisponível; tenta a anterior
                }
            }
            throw new InvalidOperationException("Controle ActiveX do Remote Desktop (mstscax.dll) não encontrado neste Windows.");
        }

        protected override void CreateSink()
        {
            try
            {
                cookie = new ConnectionPointCookie(GetOcx(), eventSink, typeof(IMsTscAxEvents));
            }
            catch (Exception ex)
            {
                Ipc.Send("warning", "Falha ao assinar eventos do controle RDP: " + ex.Message);
            }
        }

        protected override void DetachSink()
        {
            if (cookie != null)
            {
                cookie.Disconnect();
                cookie = null;
            }
        }

        /// <summary>
        /// Define a senha diretamente na memória do controle (IMsTscNonScriptable::ClearTextPassword).
        /// </summary>
        public void SetPassword(string password)
        {
            IMsTscNonScriptable nonScriptable = GetOcx() as IMsTscNonScriptable;
            if (nonScriptable != null)
            {
                nonScriptable.ClearTextPassword = password;
                return;
            }
            Ocx.AdvancedSettings2.ClearTextPassword = password;
        }
    }

    [ComImport]
    [Guid("C1E6743A-41C1-4A74-832A-0DD06C1C7A0E")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMsTscNonScriptable
    {
        string ClearTextPassword { [param: MarshalAs(UnmanagedType.BStr)] set; }
    }

    /// <summary>
    /// Subconjunto do dispinterface de eventos IMsTscAxEvents.
    /// </summary>
    [ComImport]
    [Guid("336D5562-EFA8-482E-8CB3-C5C0FC7A7DB6")]
    [InterfaceType(ComInterfaceType.InterfaceIsIDispatch)]
    public interface IMsTscAxEvents
    {
        [DispId(1)] void OnConnecting();
        [DispId(2)] void OnConnected();
        [DispId(3)] void OnLoginComplete();
        [DispId(4)] void OnDisconnected(int discReason);
        [DispId(5)] void OnEnterFullScreenMode();
        [DispId(6)] void OnLeaveFullScreenMode();
        [DispId(8)] void OnRequestGoFullScreen();
        [DispId(9)] void OnRequestLeaveFullScreen();
        [DispId(10)] void OnFatalError(int errorCode);
        [DispId(11)] void OnWarning(int warningCode);
        [DispId(14)] void OnRequestContainerMinimize();
        [DispId(15)] void OnConfirmClose(out bool pfAllowClose);
    }
}
