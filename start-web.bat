@echo off
title Khoi Dong Web Server
cd /d "%~dp0"

REM Kiem tra py launcher truoc (tranh loi Windows redirect sang Microsoft Store)
py -V >nul 2>&1
if %errorlevel%==0 (
    py server.py
) else (
    python server.py
)
pause
