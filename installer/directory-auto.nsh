; directory-auto.nsh
; NSIS include for automatic directory path completion
; Automatically appends product name to drive-only paths (e.g., C: or C:\)

!include "LogicLib.nsh"
!include "WinMessages.nsh"

; Ensure PRODUCT_NAME is defined
!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "DentalClinic - DentaDesk"
!endif

; Variables for directory monitoring
Var DirField
Var LastDirPath

; Override default directory page show and leave functions
!define MUI_PAGE_CUSTOMFUNCTION_SHOW AutoDirShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE AutoDirLeave

; Function to initialize variables
Function .onInit
  StrCpy $DirField 0
  StrCpy $LastDirPath ""
FunctionEnd

; Function called when directory page is shown
Function AutoDirShow
  ; Get directory text field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $DirField $0 1019 ; Directory text field ID

  ; Store initial path
  System::Call "user32::GetWindowText(i $DirField, t .r1, i 1024)"
  StrCpy $LastDirPath $1

  ; Update path immediately
  Call UpdateDirPath

  ; Enable Next button
  Call EnableNextButton
FunctionEnd

; Function called when leaving directory page
Function AutoDirLeave
  Call UpdateDirPath
  CreateDirectory $INSTDIR
FunctionEnd

; Function to update directory path with product name
Function UpdateDirPath
  Push $R0
  Push $R1
  Push $R2

  ; Get current text from directory field
  System::Call "user32::GetWindowText(i $DirField, t .r0, i 1024)"
  StrCpy $R0 $0

  ; Skip if empty or unchanged
  StrCmp $R0 "" update_done
  StrCmp $R0 $LastDirPath update_done

  ; Update last known path
  StrCpy $LastDirPath $R0

  ; Get path length
  StrLen $R1 $R0

  ; Handle drive-only paths (C: or C:\)
  ${If} $R1 == 2
    StrCpy $R0 "$R0\" ; Add backslash if missing
    StrCpy $R2 "$R0${PRODUCT_NAME}"
    Goto update_field
  ${ElseIf} $R1 == 3
    StrCpy $R1 $R0 1 -1 ; Check last character
    ${If} $R1 == "\"
      StrCpy $R2 "$R0${PRODUCT_NAME}"
      Goto update_field
    ${EndIf}
  ${EndIf}

  ; Check if path already ends with product name
  StrLen $R1 "${PRODUCT_NAME}"
  StrLen $R2 $R0
  ${If} $R2 >= $R1
    IntOp $R2 $R2 - $R1
    StrCpy $R1 $R0 "" $R2
    ${If} $R1 == "${PRODUCT_NAME}"
      Goto update_done ; Path already has product name
    ${EndIf}
  ${EndIf}

  ; Add product name to path
  StrCpy $R1 $R0 1 -1
  ${If} $R1 == "\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
  ${Else}
    StrCpy $R2 "$R0\${PRODUCT_NAME}"
  ${EndIf}

update_field:
  ; Update directory field and INSTDIR
  System::Call "user32::SetWindowText(i $DirField, t '$R2')"
  StrCpy $INSTDIR $R2
  Call EnableNextButton

update_done:
  Pop $R2
  Pop $R1
  Pop $R0
FunctionEnd

; Function to enable Next button
Function EnableNextButton
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
FunctionEnd