; تكوين الألوان والخطوط للمثبت
; Theme and Font Configuration for Arabic Installer

!include "WinMessages.nsh"

; تعريف الألوان (بتنسيق RGB)
!define COLOR_PRIMARY 0x2E86AB      ; أزرق أساسي
!define COLOR_SECONDARY 0xA23B72    ; بنفسجي ثانوي
!define COLOR_SUCCESS 0x28A745      ; أخضر للنجاح
!define COLOR_WARNING 0xFFC107      ; أصفر للتحذير
!define COLOR_DANGER 0xDC3545       ; أحمر للخطر
!define COLOR_INFO 0x17A2B8         ; أزرق فاتح للمعلومات
!define COLOR_LIGHT 0xF8F9FA        ; رمادي فاتح
!define COLOR_DARK 0x343A40         ; رمادي داكن
!define COLOR_WHITE 0xFFFFFF        ; أبيض
!define COLOR_BLACK 0x000000        ; أسود

; ألوان مخصصة للواجهة
!define COLOR_BACKGROUND ${COLOR_LIGHT}
!define COLOR_TEXT ${COLOR_DARK}
!define COLOR_BUTTON ${COLOR_PRIMARY}
!define COLOR_BUTTON_TEXT ${COLOR_WHITE}
!define COLOR_HEADER ${COLOR_PRIMARY}
!define COLOR_HEADER_TEXT ${COLOR_WHITE}

; إعدادات الخطوط للغة العربية
!define FONT_ARABIC "Tahoma"
!define FONT_ARABIC_SIZE 9
!define FONT_ARABIC_WEIGHT 400

!define FONT_TITLE "Segoe UI"
!define FONT_TITLE_SIZE 12
!define FONT_TITLE_WEIGHT 600

!define FONT_BUTTON "Segoe UI"
!define FONT_BUTTON_SIZE 9
!define FONT_BUTTON_WEIGHT 400

; دالة تطبيق الثيم العربي
Function ApplyArabicTheme
  ; تطبيق إعدادات RTL
  System::Call "user32::SetProcessDefaultLayout(i 1)"
  
  ; تطبيق الخط العربي
  System::Call "gdi32::CreateFont(i ${FONT_ARABIC_SIZE}, i 0, i 0, i 0, i ${FONT_ARABIC_WEIGHT}, i 0, i 0, i 0, i 178, i 0, i 0, i 0, i 0, t '${FONT_ARABIC}') i .r0"
  
  ; تطبيق الألوان
  SetCtlColors $mui.WelcomePage.Text ${COLOR_TEXT} ${COLOR_BACKGROUND}
  SetCtlColors $mui.LicensePage.Text ${COLOR_TEXT} ${COLOR_BACKGROUND}
  SetCtlColors $mui.DirectoryPage.Text ${COLOR_TEXT} ${COLOR_BACKGROUND}
  SetCtlColors $mui.InstFilesPage.Text ${COLOR_TEXT} ${COLOR_BACKGROUND}
  SetCtlColors $mui.FinishPage.Text ${COLOR_TEXT} ${COLOR_BACKGROUND}
FunctionEnd

; دالة تخصيص الأزرار
Function CustomizeButtons
  ; تخصيص زر التالي
  GetDlgItem $0 $HWNDPARENT 1
  SetCtlColors $0 ${COLOR_BUTTON_TEXT} ${COLOR_BUTTON}
  
  ; تخصيص زر السابق
  GetDlgItem $0 $HWNDPARENT 3
  SetCtlColors $0 ${COLOR_BUTTON_TEXT} ${COLOR_BUTTON}
  
  ; تخصيص زر الإلغاء
  GetDlgItem $0 $HWNDPARENT 2
  SetCtlColors $0 ${COLOR_BUTTON_TEXT} ${COLOR_DANGER}
FunctionEnd

; دالة تخصيص العناوين
Function CustomizeHeaders
  ; تخصيص عنوان الصفحة
  GetDlgItem $0 $HWNDPARENT 1037
  SetCtlColors $0 ${COLOR_HEADER_TEXT} ${COLOR_HEADER}
  
  ; تخصيص العنوان الفرعي
  GetDlgItem $0 $HWNDPARENT 1038
  SetCtlColors $0 ${COLOR_TEXT} ${COLOR_BACKGROUND}
FunctionEnd

; دالة تطبيق الثيم الحديث
Function ApplyModernTheme
  ; تطبيق تأثيرات بصرية حديثة
  System::Call "uxtheme::SetWindowTheme(i $HWNDPARENT, w 'Explorer', w 0)"
  
  ; تفعيل الشفافية
  System::Call "user32::SetLayeredWindowAttributes(i $HWNDPARENT, i 0, i 240, i 2)"
  
  ; تطبيق الظلال
  System::Call "dwmapi::DwmExtendFrameIntoClientArea(i $HWNDPARENT, i 0)"
FunctionEnd

; دالة تخصيص شريط التقدم
Function CustomizeProgressBar
  ; الحصول على مؤشر شريط التقدم
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1004
  
  ; تطبيق الألوان المخصصة
  System::Call "user32::SendMessage(i $1, i ${PBM_SETBARCOLOR}, i 0, i ${COLOR_SUCCESS}) i .r2"
  System::Call "user32::SendMessage(i $1, i ${PBM_SETBKCOLOR}, i 0, i ${COLOR_LIGHT}) i .r2"
FunctionEnd

; دالة تخصيص قائمة الملفات
Function CustomizeFilesList
  ; الحصول على مؤشر قائمة الملفات
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1016
  
  ; تطبيق الألوان
  SetCtlColors $1 ${COLOR_TEXT} ${COLOR_WHITE}
  
  ; تطبيق الخط العربي
  System::Call "user32::SendMessage(i $1, i ${WM_SETFONT}, i $R0, i 1)"
FunctionEnd

; دالة تخصيص مربعات الحوار
Function CustomizeDialogs
  ; تخصيص مربع حوار التأكيد
  System::Call "user32::MessageBox(i $HWNDPARENT, t 'هل أنت متأكد من المتابعة؟', t 'تأكيد', i 0x40) i .r0"
FunctionEnd

; دالة إنشاء تأثيرات بصرية
Function CreateVisualEffects
  ; تأثير التلاشي عند الفتح
  System::Call "user32::AnimateWindow(i $HWNDPARENT, i 300, i 0x80000)"
  
  ; تأثير الانزلاق للصفحات
  System::Call "user32::AnimateWindow(i $HWNDPARENT, i 200, i 0x40000)"
FunctionEnd

; دالة تطبيق الثيم الداكن (اختياري)
Function ApplyDarkTheme
  ; ألوان الثيم الداكن
  !define DARK_BACKGROUND 0x2D2D30
  !define DARK_TEXT 0xF1F1F1
  !define DARK_BUTTON 0x0E639C
  
  ; تطبيق الألوان الداكنة
  SetCtlColors $mui.WelcomePage.Text ${DARK_TEXT} ${DARK_BACKGROUND}
  SetCtlColors $mui.LicensePage.Text ${DARK_TEXT} ${DARK_BACKGROUND}
  SetCtlColors $mui.DirectoryPage.Text ${DARK_TEXT} ${DARK_BACKGROUND}
  SetCtlColors $mui.InstFilesPage.Text ${DARK_TEXT} ${DARK_BACKGROUND}
  SetCtlColors $mui.FinishPage.Text ${DARK_TEXT} ${DARK_BACKGROUND}
FunctionEnd

; دالة تخصيص الرسائل
Function CustomizeMessages
  ; رسائل مخصصة باللغة العربية
  !define MSG_WELCOME "مرحباً بك في معالج تثبيت نظام إدارة العيادة السنية"
  !define MSG_LICENSE "يرجى قراءة وقبول شروط الترخيص"
  !define MSG_DIRECTORY "اختر مجلد التثبيت"
  !define MSG_INSTALLING "جاري تثبيت البرنامج..."
  !define MSG_FINISH "تم تثبيت البرنامج بنجاح"
  !define MSG_ERROR "حدث خطأ أثناء التثبيت"
  !define MSG_CANCEL "هل تريد إلغاء التثبيت؟"
FunctionEnd

; دالة تطبيق التخطيط المتجاوب
Function ApplyResponsiveLayout
  ; تحديد حجم الشاشة
  System::Call "user32::GetSystemMetrics(i 0) i .r0"  ; عرض الشاشة
  System::Call "user32::GetSystemMetrics(i 1) i .r1"  ; ارتفاع الشاشة
  
  ; تطبيق حجم مناسب للنافذة
  IntCmp $0 1920 hd_resolution
  IntCmp $0 1366 hd_resolution
  Goto standard_resolution
  
  hd_resolution:
    ; حجم أكبر للشاشات عالية الدقة
    System::Call "user32::SetWindowPos(i $HWNDPARENT, i 0, i 0, i 0, i 600, i 450, i 0x16)"
    Goto end_resolution
    
  standard_resolution:
    ; حجم قياسي للشاشات العادية
    System::Call "user32::SetWindowPos(i $HWNDPARENT, i 0, i 0, i 0, i 500, i 400, i 0x16)"
    
  end_resolution:
FunctionEnd
