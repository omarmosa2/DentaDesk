; Directory auto-completion fix for electron-builder
; This include adds automatic directory path completion when user selects drive only (e.g., C:\, D:\, etc.)

!include "LogicLib.nsh"

; ❗ تأكد من تعريف اسم المنتج هنا إذا لم يكن معرفاً في مكان آخر
!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "DentalClinic - DentaDesk"
!endif

!macro customInstall
Function .onVerifyInstDir
  Call FixDirectoryPath
FunctionEnd
!macroend

Function FixDirectoryPath
  Call CheckDirectoryPath
FunctionEnd

Function CheckDirectoryPath
  ; الحصول على نافذة اختيار المجلد
  FindWindow $0 "#32770" "" $HWNDPARENT
  ${If} $0 != 0
    ; الحصول على حقل المجلد
    GetDlgItem $1 $0 1019
    ${If} $1 != 0
      ; قراءة النص الحالي من الحقل
      System::Call "user32::GetWindowText(i $1, t .r2, i 1024)"

      ; الحصول على طول النص
      StrLen $3 $2

      ; الحالة الأولى: مثل D:
      ${If} $3 == 2
        StrCpy $2 "$2\${PRODUCT_NAME}"
        System::Call "user32::SetWindowText(i $1, t '$2')"
        StrCpy $INSTDIR $2
      ${ElseIf} $3 == 3
        ; الحالة الثانية: مثل D:\
        StrCpy $4 $2 1 -1 ; آخر حرف
        ${If} $4 == "\"
          StrCpy $2 "$2${PRODUCT_NAME}"
          System::Call "user32::SetWindowText(i $1, t '$2')"
          StrCpy $INSTDIR $2
        ${EndIf}
      ${EndIf}

      ; تفعيل زر التثبيت
      GetDlgItem $0 $HWNDPARENT 1
      EnableWindow $0 1
    ${EndIf}
  ${EndIf}
FunctionEnd
