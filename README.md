# 🔑 DentaDesk License Generator

Professional GUI application for generating license keys for DentaDesk software.

## 🆕 **NEW!** Auto Device ID Detection
The app now **automatically detects** the current device ID when launched! 🎉

## 🚀 Quick Start

### Method 1: Run GUI directly
```
Double-click: run_gui.bat
```

### Method 2: Manual installation
```bash
pip install customtkinter
python license_generator_gui.py
```

## 📋 Requirements

- **Python 3.7+** - [Download](https://python.org)
- **Node.js** - [Download](https://nodejs.org)

## 🎯 How to Use

1. **Select Project Path** - Click "Browse" and select DentaDesk folder
2. **Enter Device ID** - 32 hex characters from customer
3. **Choose License Type** - STANDARD, PROFESSIONAL, ENTERPRISE, PREMIUM, ULTIMATE
4. **Choose Region** - GLOBAL, SAUDI, UAE, KUWAIT, QATAR, BAHRAIN, OMAN, GCC, MENA
5. **Click "Generate License Key"**
6. **Copy Key** - Click "Copy Key" button

## 🔧 Troubleshooting

### ❌ "Node.js not installed"
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart Command Prompt

### ❌ "generateKeyForDevice.js not found"
- Make sure you selected the correct project path
- Should contain `scripts` folder

### ❌ "Invalid device ID"
- Must be 32 hex characters
- Example: `40677b86a3f4d164d1d5e8f9a2b3c4d5`

## 📁 Files

- `license_generator_gui.py` - Main GUI application
- `run_gui.bat` - Quick start script
- `requirements.txt` - Python dependencies
- `test_generator.py` - Test script
- `LICENSE_GENERATOR_README.md` - Detailed documentation

## 🎨 Features

- Modern GUI with CustomTkinter
- Easy project path selection
- Device ID validation
- Multiple license types
- Multiple regions
- Copy to clipboard
- Save results to file
- Real-time status updates

## 🔒 Security

- All keys are encrypted and device-bound
- Keys cannot be used on other devices
- Lifetime validity
- No internet required for activation

---

**Developed for DentaDesk** 🔑