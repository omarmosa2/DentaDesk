; Custom functions for automatic directory path completion
; This file contains functions to automatically append application name when user selects drive only

!include "LogicLib.nsh"

; Variables for path monitoring
Var CustomDirectoryField
Var CustomLastPath

; Override the default directory page show function
!define MUI_PAGE_CUSTOMFUNCTION_SHOW CustomDirectoryShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE CustomDirectoryLeave

; Function to be called when directory page is shown
Function CustomDirectoryShow
  ; Get the directory text field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $CustomDirectoryField $0 1019
  
  ; Get current path
  System::Call "user32::GetWindowText(i $CustomDirectoryField, t .r1, i 1024)"
  StrCpy $CustomLastPath $1
  
  ; Update path immediately
  Call CustomUpdatePath
  
  ; Enable install button
  Call CustomEnableButton
FunctionEnd

; Function to be called when leaving directory page
Function CustomDirectoryLeave
  Call CustomUpdatePath
  CreateDirectory $INSTDIR
FunctionEnd

; Function to update directory path with application name
Function CustomUpdatePath
  Push $R0
  Push $R1
  Push $R2
  
  ; Get current text from directory field
  System::Call "user32::GetWindowText(i $CustomDirectoryField, t .r0, i 1024)"
  StrCpy $R0 $0
  
  ; Skip if empty
  StrCmp $R0 "" custom_update_done
  
  ; Check if path changed
  StrCmp $R0 $CustomLastPath custom_update_done
  StrCpy $CustomLastPath $R0
  
  ; Get path length
  StrLen $R1 $R0
  
  ; Handle drive-only selection (2 or 3 characters like "C:" or "C:\")
  ${If} $R1 == 2
    ; Add backslash (C: -> C:\)
    StrCpy $R0 "$R0\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
    Goto custom_update_field
  ${ElseIf} $R1 == 3
    ; Check if it's drive with backslash (C:\)
    StrCpy $R1 $R0 1 -1
    ${If} $R1 == "\"
      StrCpy $R2 "$R0${PRODUCT_NAME}"
      Goto custom_update_field
    ${EndIf}
  ${EndIf}
  
  ; Check if path already contains product name
  StrLen $R1 "${PRODUCT_NAME}"
  StrLen $R2 $R0
  ${If} $R2 >= $R1
    IntOp $R2 $R2 - $R1
    StrCpy $R1 $R0 "" $R2
    ${If} $R1 == "${PRODUCT_NAME}"
      ; Already has product name
      Goto custom_update_done
    ${EndIf}
  ${EndIf}
  
  ; Add product name to path
  StrCpy $R1 $R0 1 -1
  ${If} $R1 == "\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
  ${Else}
    StrCpy $R2 "$R0\${PRODUCT_NAME}"
  ${EndIf}
  
  custom_update_field:
    ; Update the directory field
    System::Call "user32::SetWindowText(i $CustomDirectoryField, t '$R2')"
    StrCpy $INSTDIR $R2
    Call CustomEnableButton
  
  custom_update_done:
    Pop $R2
    Pop $R1
    Pop $R0
FunctionEnd

; Function to enable install button
Function CustomEnableButton
  ; Enable Next button
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  
  ; Enable other potential buttons
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
FunctionEnd

; Initialization function that will be called automatically
Function .onInit
  ; Initialize custom variables
  StrCpy $CustomDirectoryField 0
  StrCpy $CustomLastPath ""
FunctionEnd
