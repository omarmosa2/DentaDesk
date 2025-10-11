#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار سريع لمولد مفاتيح الترخيص
"""

import subprocess
import os
import sys

def test_license_generation():
    """اختبار توليد مفتاح ترخيص"""
    
    print("Test License Generator")
    print("=" * 50)
    
    # معرف جهاز تجريبي
    test_device_id = "40677b86a3f4d164d1d5e8f9a2b3c4d5"
    
    # مسار المشروع
    project_path = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(project_path, "scripts", "generateKeyForDevice.js")
    
    print(f"Project Path: {project_path}")
    print(f"Script File: {script_path}")
    print(f"Test Device ID: {test_device_id}")
    print()
    
    # التحقق من وجود الملف
    if not os.path.exists(script_path):
        print("Error: generateKeyForDevice.js not found")
        return False
    
    try:
        # تشغيل الأمر
        print("Generating license key...")
        cmd = [
            "node",
            script_path,
            test_device_id,
            "STANDARD",
            "GLOBAL"
        ]
        
        result = subprocess.run(
            cmd,
            cwd=project_path,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            print("License generated successfully!")
            print()
            print("Results:")
            print("-" * 30)
            print(result.stdout)
            return True
        else:
            print("Failed to generate license")
            print(f"Error: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("Error: Node.js not installed")
        print("Please install Node.js from https://nodejs.org")
        return False
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_license_generation()
    
    if success:
        print("\nTest passed! You can now run the GUI")
        print("Run: python license_generator_gui.py")
    else:
        print("\nTest failed! Please fix the issues first")
    
    input("\nPress Enter to exit...")
