@echo off
chcp 65001 >nul
title DentaDesk License Generator

echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █           DentaDesk License Generator                        █
echo █           مولد مفاتيح الترخيص - DentaDesk                    █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.

REM تشغيل التطبيق مباشرة
python license_generator_gui.py

pause
