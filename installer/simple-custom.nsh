; Simple custom NSIS script for directory auto-completion
; This script adds automatic directory path completion when user selects drive only

!include "LogicLib.nsh"

; Custom function to handle directory page
Function .onGUIInit
  ; This function is called when the GUI is initialized
FunctionEnd

; Custom function to handle directory page
Function DirectoryPageShow
  ; Get directory field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1019

  ; Get current path
  System::Call "user32::GetWindowText(i $1, t .r2, i 1024)"

  ; Check if it's a drive only (like "D:" or "D:\")
  StrLen $3 $2
  ${If} $3 == 2
    ; Add backslash and product name
    StrCpy $2 "$2\${PRODUCT_NAME}"
    System::Call "user32::SetWindowText(i $1, t '$2')"
    StrCpy $INSTDIR $2
  ${ElseIf} $3 == 3
    StrCpy $4 $2 1 -1
    ${If} $4 == "\"
      ; Add product name
      StrCpy $2 "$2${PRODUCT_NAME}"
      System::Call "user32::SetWindowText(i $1, t '$2')"
      StrCpy $INSTDIR $2
    ${EndIf}
  ${EndIf}

  ; Enable install button
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
FunctionEnd

; Custom function for directory leave
Function DirectoryPageLeave
  ; Ensure directory exists
  CreateDirectory $INSTDIR
FunctionEnd
