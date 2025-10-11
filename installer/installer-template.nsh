; NSIS installer include with custom directory handling
; This include provides automatic directory path completion

!include "LogicLib.nsh"

; Variables
Var DirectoryField
Var LastPath

; Custom directory page show function
Function CustomDirectoryShow
  ; Get directory field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $DirectoryField $0 1019

  ; Store initial path
  System::Call "user32::GetWindowText(i $DirectoryField, t .r1, i 1024)"
  StrCpy $LastPath $1

  ; Update path immediately
  Call UpdateDirectoryPath

  ; Enable install button
  Call EnableInstallButton
FunctionEnd

; Custom directory page leave function
Function CustomDirectoryLeave
  Call UpdateDirectoryPath
  CreateDirectory $INSTDIR
FunctionEnd

; Custom directory page show function
Function DirectoryShow
  ; Get directory field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $DirectoryField $0 1019
  
  ; Store initial path
  System::Call "user32::GetWindowText(i $DirectoryField, t .r1, i 1024)"
  StrCpy $LastPath $1
  
  ; Update path immediately
  Call UpdateDirectoryPath
  
  ; Enable install button
  Call EnableInstallButton
  
  ; Start monitoring
  Call StartPathMonitoring
FunctionEnd

; Custom directory page leave function
Function DirectoryLeave
  Call UpdateDirectoryPath
  CreateDirectory $INSTDIR
FunctionEnd

; Function to update directory path
Function UpdateDirectoryPath
  Push $R0
  Push $R1
  Push $R2
  
  ; Get current path from field
  System::Call "user32::GetWindowText(i $DirectoryField, t .r0, i 1024)"
  StrCpy $R0 $0
  
  ; Skip if empty or unchanged
  StrCmp $R0 "" update_done
  StrCmp $R0 $LastPath update_done
  
  ; Update last path
  StrCpy $LastPath $R0
  
  ; Check path length for drive detection
  StrLen $R1 $R0
  
  ; Handle drive-only paths (C: or C:\)
  ${If} $R1 == 2
    StrCpy $R0 "$R0\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
    Goto update_field
  ${ElseIf} $R1 == 3
    StrCpy $R1 $R0 1 -1
    ${If} $R1 == "\"
      StrCpy $R2 "$R0${PRODUCT_NAME}"
      Goto update_field
    ${EndIf}
  ${EndIf}
  
  ; Check if already has product name
  StrLen $R1 "${PRODUCT_NAME}"
  StrLen $R2 $R0
  ${If} $R2 >= $R1
    IntOp $R2 $R2 - $R1
    StrCpy $R1 $R0 "" $R2
    ${If} $R1 == "${PRODUCT_NAME}"
      Goto update_done
    ${EndIf}
  ${EndIf}
  
  ; Add product name
  StrCpy $R1 $R0 1 -1
  ${If} $R1 == "\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
  ${Else}
    StrCpy $R2 "$R0\${PRODUCT_NAME}"
  ${EndIf}
  
  update_field:
    System::Call "user32::SetWindowText(i $DirectoryField, t '$R2')"
    StrCpy $INSTDIR $R2
    Call EnableInstallButton
  
  update_done:
    Pop $R2
    Pop $R1
    Pop $R0
FunctionEnd

; Function to enable install button
Function EnableInstallButton
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
FunctionEnd

; Function to start path monitoring
Function StartPathMonitoring
  ; Simple monitoring approach
  Call MonitorPath
FunctionEnd

; Function to monitor path changes
Function MonitorPath
  System::Call "user32::GetWindowText(i $DirectoryField, t .r0, i 1024)"
  StrCmp $0 $LastPath monitoring_done
  Call UpdateDirectoryPath
  monitoring_done:
FunctionEnd

; Initialization function
Function .onInit
  StrCpy $DirectoryField 0
  StrCpy $LastPath ""
FunctionEnd


