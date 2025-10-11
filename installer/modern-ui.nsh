; Modern UI Configuration for English Installer
; Dental Clinic Management DentaDeskCode Installer

!include "MUI2.nsh"

; Modern UI Settings
!define MUI_CUSTOMFUNCTION_GUIINIT myGUIInit

; Modern Colors and Design
!define MUI_BGCOLOR 0xF8F9FA
!define MUI_TEXTCOLOR 0x212529
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"

; Font Settings for English
!define MUI_FONT "Segoe UI"
!define MUI_FONTSIZE 9

; Text Customization
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TITLE_3LINES

; Advanced UI Settings
!define MUI_COMPONENTSPAGE_SMALLDESC
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; Button Customization
!define MUI_BUTTONTEXT_NEXT "&Next >"
!define MUI_BUTTONTEXT_BACK "< &Back"
!define MUI_BUTTONTEXT_CANCEL "&Cancel"
!define MUI_BUTTONTEXT_CLOSE "&Close"
!define MUI_BUTTONTEXT_FINISH "&Finish"

; Custom Page Texts
!define MUI_TEXT_WELCOME_INFO_TITLE "Welcome to $(^NameDA) Setup Wizard"
!define MUI_TEXT_WELCOME_INFO_TEXT "This wizard will guide you through the installation of $(^NameDA).$\r$\n$\r$\nIt is recommended that you close all other applications before starting Setup. This will make it possible to update relevant system files without having to reboot your computer.$\r$\n$\r$\nClick Next to continue."

!define MUI_TEXT_LICENSE_TITLE "License Agreement"
!define MUI_TEXT_LICENSE_SUBTITLE "Please review the license terms before installing $(^NameDA)."

!define MUI_TEXT_COMPONENTS_TITLE "Choose Components"
!define MUI_TEXT_COMPONENTS_SUBTITLE "Choose which features of $(^NameDA) you want to install."

!define MUI_TEXT_DIRECTORY_TITLE "Choose Install Location"
!define MUI_TEXT_DIRECTORY_SUBTITLE "Choose the folder in which to install $(^NameDA)."

!define MUI_TEXT_INSTALLING_TITLE "Installing"
!define MUI_TEXT_INSTALLING_SUBTITLE "Please wait while $(^NameDA) is being installed."

!define MUI_TEXT_FINISH_TITLE "Installation Complete"
!define MUI_TEXT_FINISH_SUBTITLE "$(^NameDA) has been installed successfully."

!define MUI_TEXT_ABORT_TITLE "Installation Aborted"
!define MUI_TEXT_ABORT_SUBTITLE "Installation was not completed."

; Uninstall Texts
!define MUI_UNTEXT_WELCOME_INFO_TITLE "Welcome to $(^NameDA) Uninstall Wizard"
!define MUI_UNTEXT_WELCOME_INFO_TEXT "This wizard will guide you through the uninstallation of $(^NameDA).$\r$\n$\r$\nBefore starting the uninstallation, make sure that $(^NameDA) is not running.$\r$\n$\r$\nClick Next to continue."

!define MUI_UNTEXT_CONFIRM_TITLE "Uninstall $(^NameDA)"
!define MUI_UNTEXT_CONFIRM_SUBTITLE "Remove $(^NameDA) from your computer."

!define MUI_UNTEXT_UNINSTALLING_TITLE "Uninstalling"
!define MUI_UNTEXT_UNINSTALLING_SUBTITLE "Please wait while $(^NameDA) is being uninstalled."

!define MUI_UNTEXT_FINISH_TITLE "Uninstallation Complete"
!define MUI_UNTEXT_FINISH_SUBTITLE "$(^NameDA) has been uninstalled successfully."

; GUI Initialization Function
Function myGUIInit
  ; Apply standard LTR layout for English
  System::Call "user32::SetProcessDefaultLayout(i 0)"
FunctionEnd

; Custom Components Page
!macro CUSTOM_COMPONENTS_PAGE
  !insertmacro MUI_HEADER_TEXT "Choose Components" "Select the components you want to install"

  ; Main Component
  Section "Main Program" SEC_MAIN
    SectionIn RO
    SetDetailsPrint textonly
    DetailPrint "Installing core files..."
    SetDetailsPrint listonly
  SectionEnd

  ; Additional Components
  Section "Help Files" SEC_HELP
    SetDetailsPrint textonly
    DetailPrint "Installing help files..."
    SetDetailsPrint listonly
  SectionEnd

  Section "Desktop Shortcuts" SEC_DESKTOP
    SetDetailsPrint textonly
    DetailPrint "Creating desktop shortcuts..."
    SetDetailsPrint listonly
  SectionEnd

  ; Component Descriptions
  LangString DESC_SEC_MAIN ${LANG_ENGLISH} "Core files required to run the application"
  LangString DESC_SEC_HELP ${LANG_ENGLISH} "Help files and documentation"
  LangString DESC_SEC_DESKTOP ${LANG_ENGLISH} "Create shortcuts on desktop and start menu"

  !insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_MAIN} $(DESC_SEC_MAIN)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_HELP} $(DESC_SEC_HELP)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_DESKTOP} $(DESC_SEC_DESKTOP)
  !insertmacro MUI_FUNCTION_DESCRIPTION_END
!macroend

; Custom Finish Page
!macro CUSTOM_FINISH_PAGE
  !define MUI_FINISHPAGE_RUN_TEXT "Run DentalClinic - DentaDeskcode"
  !define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApplication"
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "View README file"
  !define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
  !define MUI_FINISHPAGE_LINK "Visit our website"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://DentaDeskcode.com"
!macroend

; Application Launch Function
Function LaunchApplication
  ExecShell "" "$INSTDIR\dentalclinic-DentaDeskcode.exe"
FunctionEnd
