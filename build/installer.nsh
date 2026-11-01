!include "WordFunc.nsh"
; Define APP_BUILD_NUMBER (gerado por scripts/build-number.js)
!include "${BUILD_RESOURCES_DIR}\build-info.nsh"

!macro customInit
  ; 1. Verifica se a aplicação já está instalada
  ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ; Lê a versão e o build já instalados no registro do Windows
    ReadRegStr $0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
    ReadRegStr $2 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "BuildNumber"
    ${If} $2 == ""
      StrCpy $2 0
    ${EndIf}
    ${If} $0 != ""
      ; Compara a versão instalada ($0) com a versão deste executável (${VERSION})
      ; $1 = 0: mesma versão já instalada
      ; $1 = 1: versão instalada é mais nova que este executável
      ${VersionCompare} "$0" "${VERSION}" $1
      ; Mesma versão: só reinstala se este executável for de um build mais novo
      ${If} $1 == 0
      ${AndIf} $2 < ${APP_BUILD_NUMBER}
        StrCpy $1 2
      ${EndIf}
      ${If} $1 == 0
      ${OrIf} $1 == 1
        ; Coleta argumentos passados pela linha de comando
        ${StdUtils.GetAllParameters} $R0 0
        ; Executa a versão instalada imediatamente e encerra o instalador (< 50ms)
        ExecShell "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" $R0
        Quit
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; 2. Se for a primeira instalação ou uma atualização de versão/build,
  ; exibe uma splash screen elegante durante o processo de cópia
  InitPluginsDir
  File /oname=$PLUGINSDIR\splash.bmp "${BUILD_RESOURCES_DIR}\splash.bmp"
  advsplash::show 1000 300 300 -1 "$PLUGINSDIR\splash"
  Pop $0
!macroend

!macro customInstall
  ; Registra o build instalado para comparação na próxima execução do instalador
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "BuildNumber" "${APP_BUILD_NUMBER}"
!macroend
