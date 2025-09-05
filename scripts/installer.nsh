; Configuração personalizada do instalador NSIS para Filipeta
; Este arquivo é incluído automaticamente pelo electron-builder

; Definições personalizadas
!define APP_NAME "Filipeta - Assistente de Balcão"
!define COMPANY_NAME "Filipeta"
!define PRODUCT_VERSION "1.2.1"

; Configurações visuais
!define MUI_ICON "assets\icons\icon.ico"
!define MUI_UNICON "assets\icons\icon.ico"

; Customizar textos do instalador
LangString APP_RUNNING ${LANG_ENGLISH} "The application is running. Please close it first and try again."
LangString APP_RUNNING ${LANG_PORTUGUESE} "A aplicação está em execução. Por favor, feche-a primeiro e tente novamente."

; Função executada no início da instalação
Function .onInit
    ; Verificar se a aplicação está rodando
    FindWindow $0 "" "${APP_NAME}"
    StrCmp $0 0 continuar
        MessageBox MB_ICONSTOP|MB_OK $(APP_RUNNING)
        Abort
    continuar:
    
    ; Verificar versões anteriores
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{${PRODUCT_UNINST_KEY}}" "DisplayVersion"
    StrCmp $R0 "" done
    
    ; Perguntar sobre atualização
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Uma versão do ${APP_NAME} já está instalada ($R0).$\n$\nDeseja continuar com a atualização?" \
        IDYES done
    Abort
    
    done:
FunctionEnd

; Função executada após a instalação
Function .onInstSuccess
    ; Criar entrada no menu Iniciar
    CreateShortcut "$SMPROGRAMS\${APP_NAME}.lnk" "$INSTDIR\${APP_FILENAME}.exe" \
        "" "$INSTDIR\${APP_FILENAME}.exe" 0
    
    ; Criar atalho na área de trabalho (opcional)
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Deseja criar um atalho na área de trabalho?" \
        IDNO skip_desktop
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_FILENAME}.exe" \
        "" "$INSTDIR\${APP_FILENAME}.exe" 0
    skip_desktop:
    
    ; Registrar protocolo personalizado (opcional)
    WriteRegStr HKCR "filipeta" "" "URL:Filipeta Protocol"
    WriteRegStr HKCR "filipeta" "URL Protocol" ""
    WriteRegStr HKCR "filipeta\DefaultIcon" "" "$INSTDIR\${APP_FILENAME}.exe,0"
    WriteRegStr HKCR "filipeta\shell" "" ""
    WriteRegStr HKCR "filipeta\shell\Open" "" ""
    WriteRegStr HKCR "filipeta\shell\Open\command" "" '"$INSTDIR\${APP_FILENAME}.exe" "%1"'
    
    ; Registrar no Windows como aplicação de negócios
    WriteRegStr HKLM "Software\RegisteredApplications" "${APP_NAME}" "Software\${COMPANY_NAME}\${APP_NAME}\Capabilities"
    WriteRegStr HKLM "Software\${COMPANY_NAME}\${APP_NAME}\Capabilities" "ApplicationName" "${APP_NAME}"
    WriteRegStr HKLM "Software\${COMPANY_NAME}\${APP_NAME}\Capabilities" "ApplicationDescription" "Sistema de recomendações inteligentes para estabelecimentos comerciais"
    
    ; Configurar auto-start se solicitado
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Deseja que o ${APP_NAME} seja iniciado automaticamente com o Windows?" \
        IDNO skip_autostart
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" "$INSTDIR\${APP_FILENAME}.exe --autostart"
    skip_autostart:
FunctionEnd

; Função de desinstalação
Function un.onInit
    ; Verificar se a aplicação está rodando
    FindWindow $0 "" "${APP_NAME}"
    StrCmp $0 0 continuar
        MessageBox MB_ICONSTOP|MB_OK \
            "A aplicação está em execução. Por favor, feche-a primeiro." \
            IDOK continuar
    continuar:
    
    ; Confirmar desinstalação
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Tem certeza que deseja remover completamente o ${APP_NAME}?" \
        IDYES continuar_desinst
    Abort
    continuar_desinst:
FunctionEnd

Function un.onUninstSuccess
    ; Remover atalhos
    Delete "$SMPROGRAMS\${APP_NAME}.lnk"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    
    ; Remover auto-start
    DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
    
    ; Remover protocolo
    DeleteRegKey HKCR "filipeta"
    
    ; Remover registro de aplicação
    DeleteRegKey HKLM "Software\${COMPANY_NAME}\${APP_NAME}"
    DeleteRegValue HKLM "Software\RegisteredApplications" "${APP_NAME}"
    
    ; Perguntar sobre dados do usuário
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Deseja também remover as configurações e dados do usuário?" \
        IDNO skip_userdata
    
    ; Remover dados do usuário (cuidado!)
    RMDir /r "$APPDATA\${APP_NAME}"
    RMDir /r "$LOCALAPPDATA\${APP_NAME}"
    
    skip_userdata:
    
    MessageBox MB_OK|MB_ICONINFORMATION \
        "O ${APP_NAME} foi removido com sucesso.$\n$\nObrigado por usar nosso software!"
FunctionEnd

; Seção personalizada para componentes opcionais
Section "Componentes Principais" SEC01
    SectionIn RO  ; Obrigatório
    ; Os arquivos principais já são instalados pelo electron-builder
SectionEnd

Section /o "Atalho na Área de Trabalho" SEC02
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_FILENAME}.exe"
SectionEnd

Section /o "Inicialização Automática" SEC03
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" "$INSTDIR\${APP_FILENAME}.exe --autostart"
SectionEnd

; Descrições das seções
LangString DESC_SEC01 ${LANG_ENGLISH} "Main application files (required)"
LangString DESC_SEC01 ${LANG_PORTUGUESE} "Arquivos principais da aplicação (obrigatório)"

LangString DESC_SEC02 ${LANG_ENGLISH} "Create a shortcut on the desktop"
LangString DESC_SEC02 ${LANG_PORTUGUESE} "Criar atalho na área de trabalho"

LangString DESC_SEC03 ${LANG_ENGLISH} "Start automatically with Windows"
LangString DESC_SEC03 ${LANG_PORTUGUESE} "Iniciar automaticamente com o Windows"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC01} $(DESC_SEC01)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC02} $(DESC_SEC02)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC03} $(DESC_SEC03)
!insertmacro MUI_FUNCTION_DESCRIPTION_END