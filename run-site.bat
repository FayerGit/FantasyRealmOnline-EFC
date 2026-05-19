@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "PID_DIR=%ROOT%.site-run"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "PHP_EXE=C:\xampp\php\php.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

if not exist "%PID_DIR%" mkdir "%PID_DIR%" >nul 2>&1

:menu
cls
echo ======================================
echo Fantasy Realm Local Launcher
echo ======================================
echo.
echo 1^) Start site
echo 2^) Stop site
echo 3^) Restart site
echo 4^) Status
echo 5^) Exit
echo.
choice /c 12345 /n /m "Choose an option: "

if errorlevel 5 goto :eof
if errorlevel 4 goto status
if errorlevel 3 goto restart
if errorlevel 2 goto stop
if errorlevel 1 goto start

:start
call :StartSite
pause
goto menu

:stop
call :StopSite
pause
goto menu

:restart
call :StopSite
timeout /t 2 /nobreak >nul
call :StartSite
pause
goto menu

:status
call :ShowStatus

echo.
echo Press any key to return to the menu.
pause >nul
goto menu

:StartSite
if not exist "%PHP_EXE%" (
	echo PHP not found: %PHP_EXE%
	exit /b 1
)

if not exist "%NPM_CMD%" (
	echo npm not found: %NPM_CMD%
	exit /b 1
)

if not exist "%BACKEND_DIR%\index.php" (
	echo Backend folder not found: %BACKEND_DIR%
	exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
	echo Frontend folder not found: %FRONTEND_DIR%
	exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
	"$root = '%ROOT%';" ^
	"$pidDir = Join-Path $root '.site-run';" ^
	"$php = 'C:\xampp\php\php.exe';" ^
	"$npm = 'C:\Program Files\nodejs\npm.cmd';" ^
	"$backendDir = Join-Path $root 'backend';" ^
	"$frontendDir = Join-Path $root 'frontend';" ^
	"$backendPidFile = Join-Path $pidDir 'backend.pid';" ^
	"$frontendPidFile = Join-Path $pidDir 'frontend.pid';" ^
	"foreach ($port in @(8000, 5173)) {" ^
	"  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" ^
	"}" ^
	"Start-Sleep -Milliseconds 500;" ^
	"$backend = Start-Process -FilePath $php -ArgumentList @('-S','127.0.0.1:8000','-t',$backendDir) -WorkingDirectory $backendDir -PassThru;" ^
	"Set-Content -Path $backendPidFile -Value $backend.Id;" ^
	"$frontend = Start-Process -FilePath $npm -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') -WorkingDirectory $frontendDir -PassThru;" ^
	"Set-Content -Path $frontendPidFile -Value $frontend.Id;" ^
	"Write-Host ('Backend PID: ' + $backend.Id);" ^
	"Write-Host ('Frontend PID: ' + $frontend.Id);" ^
	"Write-Host 'Frontend: http://localhost:5173';" ^
	"Write-Host 'Backend:  http://localhost:8000';" ^
	"Write-Host 'Site started.'"

exit /b 0

:StopSite
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
	"$pidDir = '%PID_DIR%';" ^
	"Get-ChildItem -Path $pidDir -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {" ^
	"    $processId = (Get-Content $_.FullName | Select-Object -First 1).Trim();" ^
	"    if ($processId) {" ^
	"        Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue;" ^
	"        Write-Host ('Stopped ' + $_.BaseName + ' (PID ' + $processId + ').');" ^
	"    }" ^
	"};" ^
	"foreach ($port in @(8000, 5173)) {" ^
	"  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" ^
	"}" ^
	"Remove-Item -Path $pidDir -Recurse -Force -ErrorAction SilentlyContinue;" ^
	"Write-Host 'Site stopped.'"

exit /b 0

:ShowStatus
echo.
if exist "%PID_DIR%\backend.pid" (
	set /p BACKEND_PID=<"%PID_DIR%\backend.pid"
	echo Backend PID: !BACKEND_PID!
) else (
	echo Backend: stopped
)

if exist "%PID_DIR%\frontend.pid" (
	set /p FRONTEND_PID=<"%PID_DIR%\frontend.pid"
	echo Frontend PID: !FRONTEND_PID!
) else (
	echo Frontend: stopped
)

exit /b 0

