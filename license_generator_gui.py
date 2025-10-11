#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DentaDesk License Key Generator GUI
واجهة توليد مفاتيح الترخيص لبرنامج DentaDesk
"""

import tkinter as tk
from tkinter import messagebox, filedialog, ttk
import subprocess
import os
import sys
import json
import threading
from datetime import datetime
import webbrowser

# Try to import customtkinter, fall back to tkinter if not available
try:
    import customtkinter as ctk
    USE_CTK = True
except ImportError:
    import tkinter as ctk
    USE_CTK = False
    print("Warning: customtkinter not found, using standard tkinter")

# إعدادات الواجهة
if USE_CTK:
    ctk.set_appearance_mode("dark")  # Modes: "System" (standard), "Dark", "Light"
    ctk.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"

class LicenseGeneratorGUI:
    def __init__(self):
        self.root = ctk.CTk()
        self.root.title("DentaDesk - مولد مفاتيح الترخيص")
        self.root.geometry("1000x800")
        self.root.minsize(900, 700)
        
        # إعدادات إضافية للنافذة
        self.root.configure(fg_color=("gray95", "gray10"))
        
        # جعل النافذة في المنتصف
        self.center_window()
        
        # إعداد الأيقونة
        try:
            self.root.iconbitmap("icon.ico")
        except:
            pass
        
        # متغيرات الواجهة
        self.project_path = tk.StringVar()
        self.device_id = tk.StringVar()
        self.license_type = tk.StringVar(value="STANDARD")
        self.region = tk.StringVar(value="GLOBAL")
        self.generated_key = tk.StringVar()
        
        # قوائم الخيارات
        self.license_types = [
            "STANDARD", "PROFESSIONAL", "ENTERPRISE", 
            "PREMIUM", "ULTIMATE"
        ]
        
        self.regions = [
            "GLOBAL", "SAUDI", "UAE", "KUWAIT", 
            "QATAR", "BAHRAIN", "OMAN", "GCC", "MENA"
        ]
        
        self.setup_ui()
        
    def setup_ui(self):
        """إعداد واجهة المستخدم"""
        
        # إطار رئيسي
        main_frame = ctk.CTkFrame(self.root)
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # العنوان الرئيسي مع لوجو
        title_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        title_frame.pack(pady=(20, 10))
        
        # شعار التطبيق
        logo_label = ctk.CTkLabel(
            title_frame,
            text="🦷",
            font=ctk.CTkFont(size=48)
        )
        logo_label.pack()
        
        title_label = ctk.CTkLabel(
            title_frame, 
            text="DentaDesk License Generator",
            font=ctk.CTkFont(size=28, weight="bold")
        )
        title_label.pack()
        
        subtitle_label = ctk.CTkLabel(
            title_frame,
            text="مولد مفاتيح الترخيص الاحترافي",
            font=ctk.CTkFont(size=14),
            text_color="gray"
        )
        subtitle_label.pack(pady=(5, 20))
        
        # إطار إعدادات المشروع
        project_frame = ctk.CTkFrame(main_frame, corner_radius=15)
        project_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        project_title = ctk.CTkLabel(
            project_frame,
            text="📁 إعدادات المشروع",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=("#1976D2", "#42A5F5")
        )
        project_title.pack(pady=(15, 10))
        
        # اختيار مسار المشروع
        path_frame = ctk.CTkFrame(project_frame)
        path_frame.pack(fill="x", padx=15, pady=10)
        
        path_label = ctk.CTkLabel(path_frame, text="مسار المشروع:", font=ctk.CTkFont(size=14))
        path_label.pack(anchor="w", padx=10, pady=(10, 5))
        
        path_entry_frame = ctk.CTkFrame(path_frame)
        path_entry_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        self.path_entry = ctk.CTkEntry(
            path_entry_frame,
            textvariable=self.project_path,
            placeholder_text="اختر مجلد المشروع...",
            font=ctk.CTkFont(size=12),
            height=35
        )
        self.path_entry.pack(side="left", fill="x", expand=True, padx=(10, 5), pady=10)
        
        browse_btn = ctk.CTkButton(
            path_entry_frame,
            text="تصفح",
            command=self.browse_project_path,
            width=80,
            height=35,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        browse_btn.pack(side="right", padx=(5, 10), pady=10)
        
        # إطار إدخال البيانات
        input_frame = ctk.CTkFrame(main_frame, corner_radius=15)
        input_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        input_title = ctk.CTkLabel(
            input_frame,
            text="📝 بيانات الترخيص",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=("#2E7D32", "#66BB6A")
        )
        input_title.pack(pady=(15, 10))
        
        # معرف الجهاز
        device_frame = ctk.CTkFrame(input_frame)
        device_frame.pack(fill="x", padx=15, pady=10)
        
        device_label = ctk.CTkLabel(device_frame, text="معرف الجهاز:", font=ctk.CTkFont(size=14))
        device_label.pack(anchor="w", padx=10, pady=(10, 5))
        
        self.device_entry = ctk.CTkEntry(
            device_frame,
            textvariable=self.device_id,
            placeholder_text="أدخل معرف الجهاز (32 حرف hex)...",
            font=ctk.CTkFont(size=12),
            height=35
        )
        self.device_entry.pack(fill="x", padx=10, pady=(0, 10))
        
        # نوع الترخيص والمنطقة
        options_frame = ctk.CTkFrame(input_frame)
        options_frame.pack(fill="x", padx=15, pady=10)
        
        # نوع الترخيص
        license_frame = ctk.CTkFrame(options_frame)
        license_frame.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        license_label = ctk.CTkLabel(license_frame, text="نوع الترخيص:", font=ctk.CTkFont(size=14))
        license_label.pack(anchor="w", padx=10, pady=(10, 5))
        
        self.license_combo = ctk.CTkComboBox(
            license_frame,
            values=self.license_types,
            variable=self.license_type,
            font=ctk.CTkFont(size=12),
            height=35
        )
        self.license_combo.pack(fill="x", padx=10, pady=(0, 10))
        
        # المنطقة
        region_frame = ctk.CTkFrame(options_frame)
        region_frame.pack(side="right", fill="x", expand=True, padx=(5, 0))
        
        region_label = ctk.CTkLabel(region_frame, text="المنطقة:", font=ctk.CTkFont(size=14))
        region_label.pack(anchor="w", padx=10, pady=(10, 5))
        
        self.region_combo = ctk.CTkComboBox(
            region_frame,
            values=self.regions,
            variable=self.region,
            font=ctk.CTkFont(size=12),
            height=35
        )
        self.region_combo.pack(fill="x", padx=10, pady=(0, 10))
        
        # أزرار التحكم
        button_frame = ctk.CTkFrame(main_frame)
        button_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        # زر توليد المفتاح
        generate_btn = ctk.CTkButton(
            button_frame,
            text="🔑 توليد المفتاح",
            command=self.generate_license_key,
            height=50,
            font=ctk.CTkFont(size=16, weight="bold"),
            fg_color=("#2E7D32", "#1B5E20"),
            hover_color=("#388E3C", "#2E7D32"),
            corner_radius=10
        )
        generate_btn.pack(side="left", padx=(15, 5), pady=15)
        
        # زر نسخ المفتاح
        copy_btn = ctk.CTkButton(
            button_frame,
            text="📋 نسخ",
            command=self.copy_license_key,
            height=50,
            font=ctk.CTkFont(size=16, weight="bold"),
            fg_color=("#1976D2", "#0D47A1"),
            hover_color=("#2196F3", "#1976D2"),
            corner_radius=10
        )
        copy_btn.pack(side="left", padx=5, pady=15)
        
        # زر حفظ النتائج
        save_btn = ctk.CTkButton(
            button_frame,
            text="💾 حفظ",
            command=self.save_results,
            height=50,
            font=ctk.CTkFont(size=16, weight="bold"),
            fg_color=("#F57C00", "#E65100"),
            hover_color=("#FF9800", "#F57C00"),
            corner_radius=10
        )
        save_btn.pack(side="left", padx=5, pady=15)
        
        # زر مسح البيانات
        clear_btn = ctk.CTkButton(
            button_frame,
            text="🗑️ مسح",
            command=self.clear_data,
            height=50,
            font=ctk.CTkFont(size=16, weight="bold"),
            fg_color=("#C62828", "#B71C1C"),
            hover_color=("#D32F2F", "#C62828"),
            corner_radius=10
        )
        clear_btn.pack(side="right", padx=(5, 15), pady=15)
        
        # إطار المفتاح المُولد
        key_frame = ctk.CTkFrame(main_frame, corner_radius=15)
        key_frame.pack(fill="x", padx=20, pady=(0, 20))
        
        key_title = ctk.CTkLabel(
            key_frame,
            text="🔑 مفتاح الترخيص المُولد",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=("#F57C00", "#FFA726")
        )
        key_title.pack(pady=(15, 10))
        
        # حقل عرض المفتاح
        self.key_entry = ctk.CTkEntry(
            key_frame,
            textvariable=self.generated_key,
            placeholder_text="سيظهر مفتاح الترخيص هنا...",
            font=ctk.CTkFont(size=16, family="Consolas"),
            height=40,
            state="readonly"
        )
        self.key_entry.pack(fill="x", padx=15, pady=(0, 15))
        
        # إطار النتائج
        result_frame = ctk.CTkFrame(main_frame, corner_radius=15)
        result_frame.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        result_title = ctk.CTkLabel(
            result_frame,
            text="📋 تفاصيل النتائج",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=("#7E57C2", "#9575CD")
        )
        result_title.pack(pady=(15, 10))
        
        # منطقة عرض النتائج
        self.result_text = ctk.CTkTextbox(
            result_frame,
            font=ctk.CTkFont(size=12, family="Consolas"),
            height=150
        )
        self.result_text.pack(fill="both", expand=True, padx=15, pady=(0, 15))
        
        # شريط الحالة
        self.status_label = ctk.CTkLabel(
            main_frame,
            text="جاهز للتوليد",
            font=ctk.CTkFont(size=12)
        )
        self.status_label.pack(pady=(0, 10))
        
        # تعيين مسار افتراضي
        self.project_path.set(os.path.dirname(os.path.abspath(__file__)))
    
    def center_window(self):
        """توسيط النافذة على الشاشة"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        
    def browse_project_path(self):
        """اختيار مسار المشروع"""
        path = filedialog.askdirectory(
            title="اختر مجلد المشروع",
            initialdir=self.project_path.get()
        )
        if path:
            self.project_path.set(path)
            self.update_status(f"تم اختيار المسار: {path}")
    
    def validate_device_id(self, device_id):
        """التحقق من صحة معرف الجهاز"""
        if not device_id or len(device_id) != 32:
            return False
        
        # التحقق من أن المعرف يحتوي على أحرف hex فقط
        try:
            int(device_id, 16)
            return True
        except ValueError:
            return False
    
    def update_status(self, message):
        """تحديث شريط الحالة"""
        self.status_label.configure(text=message)
        self.root.update()
    
    def generate_license_key(self):
        """توليد مفتاح الترخيص"""
        # التحقق من البيانات المطلوبة
        if not self.project_path.get():
            messagebox.showerror("خطأ", "يرجى اختيار مسار المشروع")
            return
        
        if not self.device_id.get():
            messagebox.showerror("خطأ", "يرجى إدخال معرف الجهاز")
            return
        
        # التحقق من صحة معرف الجهاز
        if not self.validate_device_id(self.device_id.get()):
            messagebox.showerror(
                "خطأ", 
                "معرف الجهاز غير صالح!\nيجب أن يكون مكون من 32 حرف hex\nمثال: 40677b86a3f4d164d1d5e8f9a2b3c4d5"
            )
            return
        
        # تشغيل توليد المفتاح في thread منفصل
        self.update_status("جاري توليد مفتاح الترخيص...")
        
        def generate_thread():
            try:
                # مسح النتائج السابقة
                self.result_text.delete("1.0", "end")
                
                # بناء أمر Node.js
                script_path = os.path.join(self.project_path.get(), "scripts", "generateKeyForDevice.js")
                
                if not os.path.exists(script_path):
                    self.update_status("خطأ: لم يتم العثور على ملف generateKeyForDevice.js")
                    self.result_text.insert("1.0", "❌ خطأ: لم يتم العثور على ملف generateKeyForDevice.js\n")
                    self.result_text.insert("end", f"المسار المطلوب: {script_path}\n")
                    return
                
                # تشغيل الأمر
                cmd = [
                    "node",
                    script_path,
                    self.device_id.get(),
                    self.license_type.get(),
                    self.region.get()
                ]
                
                # تشغيل العملية
                process = subprocess.run(
                    cmd,
                    cwd=self.project_path.get(),
                    capture_output=True,
                    text=True,
                    encoding='utf-8'
                )
                
                # عرض النتائج
                if process.returncode == 0:
                    self.update_status("تم توليد المفتاح بنجاح!")
                    self.result_text.insert("1.0", "✅ تم توليد مفتاح الترخيص بنجاح!\n\n")
                    self.result_text.insert("end", process.stdout)
                    
                    # استخراج المفتاح من النتائج
                    lines = process.stdout.split('\n')
                    for line in lines:
                        if 'المفتاح:' in line or 'Key:' in line:
                            key = line.split(':')[-1].strip()
                            if key:
                                self.generated_key.set(key)
                                break
                else:
                    self.update_status("فشل في توليد المفتاح")
                    self.result_text.insert("1.0", "❌ فشل في توليد مفتاح الترخيص!\n\n")
                    self.result_text.insert("end", f"خطأ: {process.stderr}\n")
                    self.result_text.insert("end", f"كود الخطأ: {process.returncode}\n")
                
            except FileNotFoundError:
                self.update_status("خطأ: Node.js غير مثبت")
                self.result_text.insert("1.0", "❌ خطأ: Node.js غير مثبت أو غير موجود في PATH\n")
                self.result_text.insert("end", "يرجى تثبيت Node.js من https://nodejs.org\n")
            except Exception as e:
                self.update_status(f"خطأ: {str(e)}")
                self.result_text.insert("1.0", f"❌ خطأ غير متوقع: {str(e)}\n")
        
        # تشغيل Thread
        thread = threading.Thread(target=generate_thread)
        thread.daemon = True
        thread.start()
    
    def copy_license_key(self):
        """نسخ مفتاح الترخيص إلى الحافظة"""
        if self.generated_key.get():
            self.root.clipboard_clear()
            self.root.clipboard_append(self.generated_key.get())
            self.update_status("تم نسخ المفتاح إلى الحافظة")
            messagebox.showinfo("نجح", "تم نسخ مفتاح الترخيص إلى الحافظة")
        else:
            messagebox.showwarning("تحذير", "لا يوجد مفتاح للنسخ")
    
    def save_results(self):
        """حفظ النتائج في ملف"""
        if not self.result_text.get("1.0", "end").strip():
            messagebox.showwarning("تحذير", "لا توجد نتائج للحفظ")
            return
        
        # اختيار مكان الحفظ
        file_path = filedialog.asksaveasfilename(
            title="حفظ النتائج",
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            initialname=f"license_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write("DentaDesk License Generator Results\n")
                    f.write("=" * 50 + "\n\n")
                    f.write(f"تاريخ التوليد: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"معرف الجهاز: {self.device_id.get()}\n")
                    f.write(f"نوع الترخيص: {self.license_type.get()}\n")
                    f.write(f"المنطقة: {self.region.get()}\n")
                    f.write(f"مسار المشروع: {self.project_path.get()}\n\n")
                    f.write("النتائج:\n")
                    f.write("-" * 30 + "\n")
                    f.write(self.result_text.get("1.0", "end"))
                
                self.update_status(f"تم حفظ النتائج في: {file_path}")
                messagebox.showinfo("نجح", f"تم حفظ النتائج في:\n{file_path}")
            except Exception as e:
                messagebox.showerror("خطأ", f"فشل في حفظ الملف:\n{str(e)}")
    
    def clear_data(self):
        """مسح جميع البيانات"""
        self.device_id.set("")
        self.license_type.set("STANDARD")
        self.region.set("GLOBAL")
        self.generated_key.set("")
        self.result_text.delete("1.0", "end")
        self.update_status("تم مسح البيانات")
    
    def run(self):
        """تشغيل الواجهة"""
        self.root.mainloop()

def main():
    """الدالة الرئيسية"""
    try:
        app = LicenseGeneratorGUI()
        app.run()
    except Exception as e:
        messagebox.showerror("خطأ", f"فشل في تشغيل التطبيق: {str(e)}")

if __name__ == "__main__":
    main()
