@echo off
setlocal
rem Limit the execution-policy override to this launcher process.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-desktop.ps1" %*
exit /b %errorlevel%
