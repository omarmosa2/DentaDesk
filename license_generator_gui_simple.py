#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DentaDesk License Key Generator GUI - Standalone Version
واجهة توليد مفاتيح الترخيص لبرنامج DentaDesk - نسخة مستقلة
"""

import tkinter as tk
from tkinter import messagebox, filedialog, ttk, font
import subprocess
import os
import sys
import json
import threading
from datetime import datetime

class LicenseGeneratorGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("DentaDesk - License Generator")
        
        # ألوان احترافية ومريحة للعين
        self.colors = {
            'bg': '#f5f7fa',           # خلفية فاتحة ناعمة
            'fg': '#2c3e50',           # نص داكن واضح
            'primary': '#e8f4f8',      # أزرق فاتح جداً
            'secondary': '#ffffff',    # أبيض نقي
            'accent': '#ff6b6b',       # أحمر ناعم
            'success': '#51cf66',      # أخضر ناعم
            'warning': '#ffa94d',      # برتقالي ناعم
            'info': '#4dabf7',         # أزرق ناعم
            'border': '#dee2e6',       # رمادي فاتح للحدود
            'hover': '#e9ecef'         # رمادي للـ hover
        }
        
        # تكوين الألوان
        self.root.configure(bg=self.colors['bg'])
        
        # متغيرات الواجهة
        self.device_id = tk.StringVar()
        self.generated_key = tk.StringVar()
        
        # إعداد الخطوط
        self.setup_fonts()
        
        # إعداد الواجهة
        self.setup_ui()
        
        # تحديث النافذة لتتناسب مع المحتوى
        self.root.update_idletasks()
        
        # حساب الحجم المناسب
        self.adjust_window_size()
        
        # توسيط النافذة
        self.center_window()
        
        # منع تغيير الحجم (اختياري)
        self.root.resizable(True, True)
        
    def setup_fonts(self):
        """إعداد الخطوط"""
        self.title_font = font.Font(family="Segoe UI", size=28, weight="bold")
        self.subtitle_font = font.Font(family="Segoe UI", size=13)
        self.heading_font = font.Font(family="Segoe UI", size=15, weight="bold")
        self.normal_font = font.Font(family="Segoe UI", size=12)
        self.button_font = font.Font(family="Segoe UI", size=14, weight="bold")
        
    def setup_ui(self):
        """إعداد واجهة المستخدم"""
        
        # إطار رئيسي مع scroll
        main_canvas = tk.Canvas(self.root, bg=self.colors['bg'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=main_canvas.yview)
        main_frame = tk.Frame(main_canvas, bg=self.colors['bg'])
        
        main_frame.bind(
            "<Configure>",
            lambda e: main_canvas.configure(scrollregion=main_canvas.bbox("all"))
        )
        
        main_canvas.create_window((0, 0), window=main_frame, anchor="nw")
        main_canvas.configure(yscrollcommand=scrollbar.set)
        
        main_canvas.pack(side="left", fill="both", expand=True, padx=10, pady=10)
        scrollbar.pack(side="right", fill="y")
        
        # العنوان الرئيسي
        title_frame = tk.Frame(main_frame, bg=self.colors['bg'])
        title_frame.pack(pady=(30, 30))
        
        title_label = tk.Label(
            title_frame,
            text="🦷 DentaDesk License Generator",
            font=self.title_font,
            bg=self.colors['bg'],
            fg='#1e3a8a'  # أزرق داكن جميل
        )
        title_label.pack()
        
        subtitle = tk.Label(
            title_frame,
            text="مولد مفاتيح الترخيص الاحترافي",
            font=self.subtitle_font,
            bg=self.colors['bg'],
            fg='#64748b'  # رمادي متوسط
        )
        subtitle.pack(pady=(5, 0))
        
        # إضافة مسافة علوية
        spacer_top = tk.Frame(main_frame, bg=self.colors['bg'], height=20)
        spacer_top.pack()
        
        # إطار بيانات الترخيص (معرف الجهاز فقط)
        self.create_device_id_frame(main_frame)
        
        # أزرار التحكم
        self.create_buttons(main_frame)
        
        # إطار المفتاح المُولد
        self.create_key_frame(main_frame)
        
        # إضافة مسافة سفلية
        spacer_bottom = tk.Frame(main_frame, bg=self.colors['bg'], height=20)
        spacer_bottom.pack()
        
        # شريط الحالة
        status_frame = tk.Frame(main_frame, bg='#e0f2fe', relief=tk.FLAT, bd=1)
        status_frame.pack(fill="x", padx=100, pady=20)
        
        self.status_label = tk.Label(
            status_frame,
            text="✨ جاهز للتوليد | Ready to generate",
            font=font.Font(family="Segoe UI", size=10),
            bg='#e0f2fe',
            fg='#0369a1',
            pady=8
        )
        self.status_label.pack()
        
    def create_device_id_frame(self, parent):
        """إنشاء إطار معرف الجهاز"""
        # إطار خارجي للتوسيط
        outer_frame = tk.Frame(parent, bg=self.colors['bg'])
        outer_frame.pack(fill="both", expand=True, padx=100, pady=15)
        
        frame = tk.LabelFrame(
            outer_frame,
            text="  🆔 Device ID | معرف الجهاز  ",
            font=self.heading_font,
            bg=self.colors['secondary'],
            fg='#1e3a8a',
            padx=25,
            pady=25,
            relief=tk.FLAT,
            bd=2,
            highlightthickness=1,
            highlightbackground=self.colors['border'],
            highlightcolor=self.colors['info']
        )
        frame.pack(fill="x")
        
        # معرف الجهاز
        device_label = tk.Label(
            frame,
            text="Device ID (32 hex characters) | معرف الجهاز:",
            font=self.normal_font,
            bg=self.colors['secondary'],
            fg=self.colors['fg']
        )
        device_label.pack(anchor="w", pady=(5, 5))
        
        # حقل معرف الجهاز فقط
        self.device_entry = tk.Entry(
            frame,
            textvariable=self.device_id,
            font=font.Font(family="Consolas", size=13),
            bg='#ffffff',
            fg='#1e293b',
            insertbackground='#4dabf7',
            relief=tk.FLAT,
            bd=0,
            highlightthickness=2,
            highlightbackground=self.colors['border'],
            highlightcolor=self.colors['info'],
            state='normal'
        )
        self.device_entry.pack(fill="x", ipady=12, pady=(0, 10))
        
        # تأكيد focus على الحقل
        self.device_entry.focus_set()
        
    def create_buttons(self, parent):
        """إنشاء أزرار التحكم"""
        # إطار خارجي للتوسيط
        outer_frame = tk.Frame(parent, bg=self.colors['bg'])
        outer_frame.pack(fill="both", expand=True, padx=100, pady=25)
        
        button_frame = tk.Frame(outer_frame, bg=self.colors['bg'])
        button_frame.pack(fill="x")
        
        # زر توليد المفتاح
        generate_btn = tk.Button(
            button_frame,
            text="🔑 Generate Key\nتوليد المفتاح",
            command=self.generate_license_key,
            font=font.Font(family="Segoe UI", size=14, weight="bold"),
            bg='#10b981',
            fg='white',
            activebackground='#059669',
            activeforeground='white',
            cursor="hand2",
            relief=tk.FLAT,
            bd=0,
            padx=35,
            pady=20
        )
        generate_btn.pack(side="left", padx=12, expand=True, fill="x")
        generate_btn.bind("<Enter>", lambda e: generate_btn.config(bg='#059669'))
        generate_btn.bind("<Leave>", lambda e: generate_btn.config(bg='#10b981'))
        
        # زر نسخ المفتاح
        copy_btn = tk.Button(
            button_frame,
            text="📋 Copy Key\nنسخ المفتاح",
            command=self.copy_license_key,
            font=font.Font(family="Segoe UI", size=14, weight="bold"),
            bg='#3b82f6',
            fg='white',
            activebackground='#2563eb',
            activeforeground='white',
            cursor="hand2",
            relief=tk.FLAT,
            bd=0,
            padx=35,
            pady=20
        )
        copy_btn.pack(side="left", padx=12, expand=True, fill="x")
        copy_btn.bind("<Enter>", lambda e: copy_btn.config(bg='#2563eb'))
        copy_btn.bind("<Leave>", lambda e: copy_btn.config(bg='#3b82f6'))
        
    def create_key_frame(self, parent):
        """إنشاء إطار المفتاح المُولد"""
        # إطار خارجي للتوسيط
        outer_frame = tk.Frame(parent, bg=self.colors['bg'])
        outer_frame.pack(fill="both", expand=True, padx=100, pady=15)
        
        frame = tk.LabelFrame(
            outer_frame,
            text="  🔑 Generated License Key | مفتاح الترخيص المُولد  ",
            font=self.heading_font,
            bg=self.colors['secondary'],
            fg='#1e3a8a',
            padx=25,
            pady=25,
            relief=tk.FLAT,
            bd=2,
            highlightthickness=1,
            highlightbackground=self.colors['border'],
            highlightcolor='#10b981'
        )
        frame.pack(fill="x")
        
        key_entry = tk.Entry(
            frame,
            textvariable=self.generated_key,
            font=font.Font(family="Consolas", size=15, weight="bold"),
            bg='#f0fdf4',
            fg='#15803d',
            insertbackground='#10b981',
            state="readonly",
            justify="center",
            relief=tk.FLAT,
            bd=0,
            highlightthickness=2,
            highlightbackground='#86efac',
            highlightcolor='#10b981'
        )
        key_entry.pack(fill="x", ipady=14)
        
    def adjust_window_size(self):
        """ضبط حجم النافذة تلقائياً حسب المحتوى"""
        self.root.update_idletasks()
        
        # حجم مريح ومناسب لجميع العناصر
        width = 850
        height = 700
        
        self.root.geometry(f"{width}x{height}")
    
    def center_window(self):
        """توسيط النافذة على الشاشة"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        
    def get_current_device_id(self):
        """الحصول على معرف الجهاز الحالي"""
        try:
            import hashlib
            import platform
            import uuid
            
            # محاولة الحصول على معرف الجهاز بنفس طريقة licenseManager
            machine_id = None
            
            # Try to get machine ID
            try:
                # Windows: Get computer UUID
                if platform.system() == 'Windows':
                    import subprocess
                    result = subprocess.run(
                        ['wmic', 'csproduct', 'get', 'UUID'],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            machine_id = lines[1].strip()
                
                # Fallback: use MAC address
                if not machine_id:
                    machine_id = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff)
                                          for elements in range(0, 8*6, 8)][::-1])
                
                # Create hash similar to licenseManager
                if machine_id:
                    hash_obj = hashlib.sha256()
                    hash_obj.update((machine_id + 'dental-clinic-license-salt-2025').encode())
                    device_id = hash_obj.hexdigest()[:32]
                    
                    # عرض معرف الجهاز
                    self.device_id.set(device_id)
                    self.update_status(f"Current device ID loaded: {device_id[:12]}...")
                    return device_id
            except Exception as e:
                print(f"Error getting machine ID: {e}")
            
            # Fallback: create a unique ID based on platform info
            fallback_data = f"{platform.platform()}-{platform.machine()}-{platform.node()}"
            hash_obj = hashlib.sha256()
            hash_obj.update((fallback_data + 'dental-clinic-license-salt-2025').encode())
            device_id = hash_obj.hexdigest()[:32]
            
            self.device_id.set(device_id)
            self.update_status(f"Device ID (fallback) loaded: {device_id[:12]}...")
            return device_id
            
        except Exception as e:
            self.update_status(f"Could not get device ID: {str(e)}")
            return None
    
    def browse_project_path(self):
        """اختيار مسار المشروع"""
        path = filedialog.askdirectory(
            title="Select Project Folder",
            initialdir=self.project_path.get()
        )
        if path:
            self.project_path.set(path)
            self.update_status(f"Path selected: {path}")
    
    def validate_device_id(self, device_id):
        """التحقق من صحة معرف الجهاز"""
        if not device_id or len(device_id) != 32:
            return False
        
        try:
            int(device_id, 16)
            return True
        except ValueError:
            return False
    
    def update_status(self, message):
        """تحديث شريط الحالة"""
        self.status_label.config(text=message)
        self.root.update()
    
    def generate_license_key(self):
        """توليد مفتاح الترخيص"""
        if not self.device_id.get():
            messagebox.showerror("Error", "Please enter device ID")
            return
        
        if not self.validate_device_id(self.device_id.get()):
            messagebox.showerror(
                "Error", 
                "Invalid device ID!\nMust be 32 hex characters\nExample: 40677b86a3f4d164d1d5e8f9a2b3c4d5"
            )
            return
        
        self.update_status("Generating license key...")
        
        def generate_thread():
            try:
                # استخدام مسار المشروع الحالي
                # إذا كان التطبيق EXE، استخدم المجلد الحالي
                if getattr(sys, 'frozen', False):
                    # Running as compiled exe
                    project_path = os.path.dirname(sys.executable)
                else:
                    # Running as script
                    project_path = os.path.dirname(os.path.abspath(__file__))
                
                script_path = os.path.join(project_path, "scripts", "generateKeyForDevice.js")
                
                if not os.path.exists(script_path):
                    # إذا لم يوجد السكريبت، نعرض رسالة خطأ واضحة
                    self.update_status("Error: Script not found")
                    messagebox.showerror(
                        "Script Not Found",
                        f"Cannot find:\n{script_path}\n\nPlease ensure the scripts folder exists."
                    )
                    return
                
                # استخدام قيم افتراضية
                cmd = [
                    "node",
                    script_path,
                    self.device_id.get(),
                    "STANDARD",  # نوع الترخيص الافتراضي
                    "GLOBAL"     # المنطقة الافتراضية
                ]
                
                process = subprocess.run(
                    cmd,
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    encoding='utf-8'
                )
                
                if process.returncode == 0:
                    self.update_status("License key generated successfully!")
                    
                    # استخراج المفتاح من النتائج
                    lines = process.stdout.split('\n')
                    for line in lines:
                        if ':' in line and len(line.split(':')[-1].strip()) > 10:
                            key = line.split(':')[-1].strip()
                            if '-' in key and len(key) > 15:
                                self.generated_key.set(key)
                                messagebox.showinfo(
                                    "Success!",
                                    f"License key generated successfully!\n\nKey: {key}"
                                )
                                break
                else:
                    self.update_status("Failed to generate key")
                    messagebox.showerror("Error", f"Failed to generate key:\n{process.stderr}")
                
            except FileNotFoundError:
                self.update_status("Error: Node.js not installed")
                messagebox.showerror(
                    "Node.js Not Found",
                    "Node.js is not installed or not in PATH.\nPlease install from: https://nodejs.org"
                )
            except Exception as e:
                self.update_status(f"Error: {str(e)}")
                messagebox.showerror("Error", f"Unexpected error:\n{str(e)}")
        
        thread = threading.Thread(target=generate_thread)
        thread.daemon = True
        thread.start()
    
    def copy_device_id(self):
        """نسخ معرف الجهاز"""
        if self.device_id.get():
            self.root.clipboard_clear()
            self.root.clipboard_append(self.device_id.get())
            self.update_status("Device ID copied to clipboard!")
            messagebox.showinfo("Success", "Device ID copied to clipboard!")
        else:
            messagebox.showwarning("Warning", "No device ID to copy")
    
    def copy_license_key(self):
        """نسخ مفتاح الترخيص"""
        if self.generated_key.get():
            self.root.clipboard_clear()
            self.root.clipboard_append(self.generated_key.get())
            self.update_status("License key copied to clipboard!")
            messagebox.showinfo("Success", "License key copied to clipboard!")
        else:
            messagebox.showwarning("Warning", "No license key to copy")
    
    def clear_data(self):
        """مسح جميع البيانات"""
        self.device_id.set("")
        self.generated_key.set("")
        self.update_status("Data cleared | تم مسح البيانات")
    
    def run(self):
        """تشغيل الواجهة"""
        self.root.mainloop()

def main():
    """الدالة الرئيسية"""
    try:
        app = LicenseGeneratorGUI()
        app.run()
    except Exception as e:
        messagebox.showerror("Error", f"Failed to start application: {str(e)}")

if __name__ == "__main__":
    main()
