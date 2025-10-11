#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build EXE for DentaDesk License Generator
"""

import os
import subprocess
import sys
import io

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def build_exe():
    """Build standalone EXE using PyInstaller"""
    
    print("=" * 60)
    print("Building DentaDesk License Generator EXE")
    print("=" * 60)
    print()
    
    # Check if PyInstaller is installed
    print("[1/4] Checking PyInstaller...")
    try:
        import PyInstaller
        print("[OK] PyInstaller is installed")
    except ImportError:
        print("[INFO] PyInstaller not found, installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("[OK] PyInstaller installed")
    
    # Install required packages
    print()
    print("[2/4] Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("[OK] Dependencies installed")
    
    # Build PyInstaller command
    print()
    print("[3/4] Building EXE...")
    
    # Use simple GUI version
    pyinstaller_args = [
        "pyinstaller",
        "--onefile",                          # Single EXE file
        "--windowed",                         # No console window
        "--name=DentaDesk_License_Generator", # EXE name
        "--add-data=scripts;scripts",         # Include scripts folder
        "--noconsole",                        # No console
        "--clean",                            # Clean cache
        "license_generator_gui_simple.py"
    ]
    
    # Add icon if exists
    icon_path = os.path.join("assets", "icon.ico")
    if os.path.exists(icon_path):
        pyinstaller_args.insert(-1, f"--icon={icon_path}")
    elif os.path.exists("icon.ico"):
        pyinstaller_args.insert(-1, "--icon=icon.ico")
    
    try:
        subprocess.run(pyinstaller_args, check=True)
        print("[OK] EXE built successfully!")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Build failed: {e}")
        return False
    
    print()
    print("[4/4] Finalizing...")
    print()
    print("=" * 60)
    print("[SUCCESS] Build completed successfully!")
    print("=" * 60)
    print()
    print("Your EXE file is located at:")
    print("  dist\\DentaDesk_License_Generator.exe")
    print()
    print("You can now:")
    print("  1. Run the EXE directly")
    print("  2. Distribute it to users")
    print("  3. No Python installation required!")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = build_exe()
        if success:
            print("Press Enter to exit...")
            input()
        else:
            print("Build failed! Press Enter to exit...")
            input()
    except Exception as e:
        print(f"Error: {e}")
        print("Press Enter to exit...")
        input()
