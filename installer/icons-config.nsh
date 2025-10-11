; تكوين الأيقونات والصور للمثبت
; Icons and Images Configuration for Installer

; مسارات الأيقونات
!define ICON_MAIN "icon.ico"
!define ICON_UNINSTALL "icon.ico"
!define ICON_INSTALLER "icon.ico"

; صور المثبت
!define IMAGE_HEADER "assets\header.bmp"
!define IMAGE_WIZARD "assets\wizard.bmp"
!define IMAGE_BANNER "assets\banner.bmp"

; إعدادات الأيقونات
; إذا لم تتوفر أيقونة صالحة، استخدم أيقونة افتراضية من NSIS
!undef ICON_MAIN
!undef ICON_UNINSTALL
!undef ICON_INSTALLER
!define ICON_MAIN "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define ICON_UNINSTALL "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define ICON_INSTALLER "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"

Icon "${ICON_INSTALLER}"
UninstallIcon "${ICON_UNINSTALL}"

; إعدادات صور الواجهة
!define MUI_ICON "${ICON_MAIN}"
!define MUI_UNICON "${ICON_UNINSTALL}"

; صورة الرأس
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_UNBITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_RIGHT

; صور صفحات الترحيب والانتهاء
!define MUI_WELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"

; إعدادات إضافية للصور
!define MUI_HEADERIMAGE_BITMAP_NOSTRETCH
!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH

; Function to create icons and shortcuts
Function CreateIcons
  ; Create Start Menu folder
  CreateDirectory "$SMPROGRAMS\DentalClinic - DentaDesk"

  ; Main program shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - DentaDesk\DentalClinic - DentaDesk.lnk" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Comprehensive Dental Clinic Management System"

  ; Uninstall shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - DentaDesk\Uninstall DentalClinic - DentaDesk.lnk" \
                 "$INSTDIR\uninstall.exe" \
                 "" \
                 "$INSTDIR\uninstall.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Uninstall DentalClinic - DentaDesk"

  ; Help file shortcut
  CreateShortCut "$SMPROGRAMS\DentalClinic - DentaDesk\User Guide.lnk" \
                 "$INSTDIR\README.txt" \
                 "" \
                 "$INSTDIR\README.txt" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "User Guide and Help"

  ; Website shortcut
  WriteINIStr "$SMPROGRAMS\DentalClinic - DentaDesk\Website.url" \
              "InternetShortcut" \
              "URL" \
              "https://DentaDesk.com"

  ; Desktop shortcut
  CreateShortCut "$DESKTOP\DentalClinic - DentaDesk.lnk" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "Comprehensive Dental Clinic Management System"

  ; Quick Launch shortcut (if available)
  CreateShortCut "$QUICKLAUNCH\DentalClinic - DentaDesk.lnk" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 "" \
                 "$INSTDIR\dentalclinic-DentaDesk.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "DentalClinic - DentaDesk"
FunctionEnd

; Function to remove icons and shortcuts
Function un.RemoveIcons
  ; Delete Start Menu shortcuts
  Delete "$SMPROGRAMS\DentalClinic - DentaDesk\DentalClinic - DentaDesk.lnk"
  Delete "$SMPROGRAMS\DentalClinic - DentaDesk\Uninstall DentalClinic - DentaDesk.lnk"
  Delete "$SMPROGRAMS\DentalClinic - DentaDesk\User Guide.lnk"
  Delete "$SMPROGRAMS\DentalClinic - DentaDesk\Website.url"
  RMDir "$SMPROGRAMS\DentalClinic - DentaDeskcode"

  ; Delete desktop shortcut
  Delete "$DESKTOP\DentalClinic - DentaDeskcode.lnk"

  ; Delete Quick Launch shortcut
  Delete "$QUICKLAUNCH\DentalClinic - DentaDeskcode.lnk"
FunctionEnd

; دالة تسجيل أنواع الملفات
Function RegisterFileTypes
  ; تسجيل امتداد .dcm (Dental Clinic Management)
  WriteRegStr HKCR ".dcm" "" "DentalClinic.DataFile"
  WriteRegStr HKCR "DentalClinic.DataFile" "" "ملف بيانات العيادة السنية"
  WriteRegStr HKCR "DentalClinic.DataFile\DefaultIcon" "" "$INSTDIR\dental-clinic.exe,0"
  WriteRegStr HKCR "DentalClinic.DataFile\shell\open\command" "" '"$INSTDIR\dental-clinic.exe" "%1"'
  
  ; تسجيل امتداد .dcb (Dental Clinic Backup)
  WriteRegStr HKCR ".dcb" "" "DentalClinic.BackupFile"
  WriteRegStr HKCR "DentalClinic.BackupFile" "" "ملف نسخة احتياطية للعيادة السنية"
  WriteRegStr HKCR "DentalClinic.BackupFile\DefaultIcon" "" "$INSTDIR\dental-clinic.exe,1"
  WriteRegStr HKCR "DentalClinic.BackupFile\shell\open\command" "" '"$INSTDIR\dental-clinic.exe" --restore "%1"'
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; دالة إلغاء تسجيل أنواع الملفات
Function un.UnregisterFileTypes
  ; إلغاء تسجيل امتدادات الملفات
  DeleteRegKey HKCR ".dcm"
  DeleteRegKey HKCR "DentalClinic.DataFile"
  DeleteRegKey HKCR ".dcb"
  DeleteRegKey HKCR "DentalClinic.BackupFile"
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; Function to create application info file
Function CreateAppInfo
  ; Create application info file
  FileOpen $0 "$INSTDIR\app-info.txt" w
  FileWrite $0 "DentalClinic - DentaDeskcode$\r$\n"
  FileWrite $0 "Version: v2.1$\r$\n"
  FileWrite $0 "Installation Date: $\r$\n"
  FileWrite $0 "Installation Folder: $INSTDIR$\r$\n"
  FileWrite $0 "Application ID: com.DentaDeskcode.dentalclinic$\r$\n"
  FileWrite $0 "Publisher: DentaDeskCode Team$\r$\n"
  FileWrite $0 "Website: https://DentaDeskcode.com$\r$\n"
  FileWrite $0 "Technical Support: dev@DentaDeskcode.com$\r$\n"
  FileClose $0
FunctionEnd
