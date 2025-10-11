; Custom NSIS script for automatic directory path completion
; This script adds functionality to automatically append application name when user selects drive only

!include "LogicLib.nsh"
!include "WinMessages.nsh"

; Variables for directory monitoring
Var PreviousPath
Var CurrentPath
Var DirectoryField

; Override the directory page show function
Function .onGUIInit
  ; Initialize our custom variables
  StrCpy $PreviousPath ""
  StrCpy $CurrentPath ""
  StrCpy $DirectoryField 0
FunctionEnd

; Custom directory page show function
!define MUI_PAGE_CUSTOMFUNCTION_SHOW DirectoryPageShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryPageLeave

Function DirectoryPageShow
  ; Get the directory text field handle
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $DirectoryField $0 1019

  ; Store current path
  System::Call "user32::GetWindowText(i $DirectoryField, t .r1, i 1024)"
  StrCpy $CurrentPath $1
  StrCpy $PreviousPath $1

  ; Update path immediately when page is shown
  Call UpdateDirectoryPath

  ; Force enable the Next button
  Call ForceEnableNextButton

  ; Set up monitoring timer
  Call SetupDirectoryMonitoring
FunctionEnd

Function DirectoryPageLeave
  ; Final path update before leaving
  Call UpdateDirectoryPath

  ; Ensure directory exists
  CreateDirectory $INSTDIR
FunctionEnd

; Function to update directory path with application name
Function UpdateDirectoryPath
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  
  ; Get current text from directory field
  System::Call "user32::GetWindowText(i $DirectoryField, t .r0, i 1024)"
  StrCpy $R0 $0
  
  ; Skip if empty
  StrCmp $R0 "" update_done
  
  ; Check if path changed
  StrCmp $R0 $PreviousPath update_done
  
  ; Store new previous path
  StrCpy $PreviousPath $R0
  
  ; Remove trailing spaces and backslashes for consistency
  Call TrimPath
  StrCpy $R0 $R3
  
  ; Check if user selected only a drive (like C: or C:\)
  StrLen $R1 $R0
  
  ; Handle drive-only selection (2 or 3 characters)
  ${If} $R1 == 2
    ; Add backslash if missing (e.g., "C:" -> "C:\")
    StrCpy $R0 "$R0\"
    StrCpy $R2 "$R0${PRODUCT_NAME}"
    Goto update_field
  ${ElseIf} $R1 == 3
    ; Check if it's drive with backslash (e.g., "C:\")
    StrCpy $R3 $R0 1 -1
    ${If} $R3 == "\"
      StrCpy $R2 "$R0${PRODUCT_NAME}"
      Goto update_field
    ${EndIf}
  ${EndIf}
  
  ; Check if path already ends with product name
  StrLen $R1 "${PRODUCT_NAME}"
  StrLen $R3 $R0
  ${If} $R3 >= $R1
    IntOp $R3 $R3 - $R1
    StrCpy $R1 $R0 "" $R3
    ${If} $R1 == "${PRODUCT_NAME}"
      ; Already has product name, no change needed
      Goto update_done
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
    ; Update the directory field with new path
    System::Call "user32::SetWindowText(i $DirectoryField, t '$R2')"
    StrCpy $INSTDIR $R2
    StrCpy $CurrentPath $R2
    
    ; Force enable the Next button after update
    Call ForceEnableNextButton
  
  update_done:
    Pop $R3
    Pop $R2
    Pop $R1
    Pop $R0
FunctionEnd

; Function to trim trailing spaces and normalize path
Function TrimPath
  Push $R0
  Push $R1
  Push $R2
  
  StrCpy $R0 $R0  ; Input path
  StrLen $R1 $R0
  
  ; Remove trailing spaces
  ${Do}
    ${If} $R1 == 0
      ${Break}
    ${EndIf}
    IntOp $R2 $R1 - 1
    StrCpy $R2 $R0 1 $R2
    ${If} $R2 != " "
      ${Break}
    ${EndIf}
    StrCpy $R0 $R0 $R2
    StrLen $R1 $R0
  ${Loop}
  
  StrCpy $R3 $R0  ; Output trimmed path
  
  Pop $R2
  Pop $R1
  Pop $R0
FunctionEnd

; Function to force enable the Next button
Function ForceEnableNextButton
  ; Try multiple button IDs to ensure we catch the right one
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
  
  ; Also try to find and enable directory page specific buttons
  FindWindow $1 "#32770" "" $HWNDPARENT
  GetDlgItem $0 $1 1
  EnableWindow $0 1
FunctionEnd

; Function to set up continuous directory monitoring
Function SetupDirectoryMonitoring
  ; Simple monitoring approach - check for changes periodically
  Call MonitorDirectoryChanges
FunctionEnd

; Function to monitor directory changes
Function MonitorDirectoryChanges
  ; Get current text from field
  System::Call "user32::GetWindowText(i $DirectoryField, t .r0, i 1024)"
  
  ; Check if it changed
  StrCmp $0 $CurrentPath monitoring_done
  
  ; Path changed, update it
  StrCpy $CurrentPath $0
  Call UpdateDirectoryPath
  
  monitoring_done:
    ; Continue monitoring (this creates a simple polling effect)
    ; Note: In a real implementation, you might want to use Windows timers
FunctionEnd

; Additional initialization
Function .onInit
  ; Set default installation directory
  StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCT_NAME}"

  ; Initialize our variables
  StrCpy $PreviousPath ""
  StrCpy $CurrentPath ""
  StrCpy $DirectoryField 0
FunctionEnd
