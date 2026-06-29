@echo off
setlocal enabledelayedexpansion
title Waifuku Alpha

:: ── Rutas base ──────────────────────────────────────────────────────────────
set "ROOT=%~dp0"
:: Quitar barra final
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "PY_DIR=%ROOT%\python_embed"
set "PYTHON=%PY_DIR%\python.exe"
set "PY_VERSION=3.11.9"
set "PY_ZIP_URL=https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
set "GET_PIP_URL=https://bootstrap.pypa.io/get-pip.py"
set "MARKER=%PY_DIR%\.ready"

:MENU
cls
echo.
echo   =========================================
echo      W  A  I  F  U  K  U    A l p h a
echo   =========================================
echo.
echo    1.  Instalar ^/ Actualizar
echo    2.  Ejecutar
echo    3.  Desinstalar
echo    0.  Salir
echo.
echo   =========================================
echo.
set /p "OPT=   Selecciona [0-3]: "

if "%OPT%"=="1" goto INSTALL
if "%OPT%"=="2" goto RUN
if "%OPT%"=="3" goto UNINSTALL
if "%OPT%"=="0" goto :EOF
echo   Opcion invalida.
timeout /t 1 >nul
goto MENU


:: ════════════════════════════════════════════════════════════════════════════
:INSTALL
cls
echo.
echo   =========================================
echo      INSTALACION
echo   =========================================
echo.

:: ── Verificar PowerShell (necesario para descargas) ──────────────────────
powershell -NoProfile -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo   ERROR: PowerShell no esta disponible.
    echo   Requiere Windows 7 SP1 o superior.
    pause & goto MENU
)

:: ── 1. Python portable ────────────────────────────────────────────────────
echo   [1/4] Python portable...
if exist "%MARKER%" (
    echo         OK  ya instalado.
    goto :INSTALL_DEPS
)

if exist "%PYTHON%" (
    echo         OK  encontrado, configurando...
    goto :SETUP_PIP
)

echo         Descargando Python %PY_VERSION% portable...
echo         ^(~8 MB, puede tardar segun conexion^)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -Uri '%PY_ZIP_URL%' -OutFile '%TEMP%\waifuku_py.zip' -UseBasicParsing"
if errorlevel 1 (
    echo   ERROR: No se pudo descargar Python. Verifica tu conexion.
    pause & goto MENU
)

echo         Descomprimiendo...
if not exist "%PY_DIR%" mkdir "%PY_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -Path '%TEMP%\waifuku_py.zip' -DestinationPath '%PY_DIR%' -Force"
del "%TEMP%\waifuku_py.zip" >nul 2>&1
echo         OK  Python %PY_VERSION% listo.

:SETUP_PIP
:: Habilitar site-packages en el _pth (requerido para pip)
for %%F in ("%PY_DIR%\python*._pth") do (
    powershell -NoProfile -Command ^
      "(Get-Content '%%F') -replace '#import site','import site' | Set-Content '%%F'"
)

echo         Instalando pip...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -Uri '%GET_PIP_URL%' -OutFile '%TEMP%\get-pip.py' -UseBasicParsing"
if errorlevel 1 (
    echo   ERROR: No se pudo descargar pip.
    pause & goto MENU
)
"%PYTHON%" "%TEMP%\get-pip.py" --quiet --no-warn-script-location
del "%TEMP%\get-pip.py" >nul 2>&1
echo         OK  pip instalado.

:INSTALL_DEPS
:: ── 2. Dependencias Python ────────────────────────────────────────────────
echo   [2/4] Dependencias Python...
"%PYTHON%" -m pip install -r "%ROOT%\requirements.txt" ^
    --quiet --no-warn-script-location --disable-pip-version-check
if errorlevel 1 (
    echo   ERROR: Fallo al instalar dependencias.
    pause & goto MENU
)
echo         OK  dependencias instaladas.

:: ── 3. Datos de usuario ───────────────────────────────────────────────────
echo   [3/4] Datos de usuario...
if not exist "%ROOT%\data" (
    :: Primera instalacion: copiar datos semilla
    if exist "%ROOT%\data_seed" (
        xcopy "%ROOT%\data_seed" "%ROOT%\data" /e /i /q
        echo         OK  datos iniciales restaurados.
    ) else (
        mkdir "%ROOT%\data"
        mkdir "%ROOT%\data\characters"
        mkdir "%ROOT%\data\chats"
        mkdir "%ROOT%\data\personas"
        mkdir "%ROOT%\data\items"
        mkdir "%ROOT%\data\backgrounds"
        echo         OK  carpetas creadas.
    )
) else (
    echo         OK  datos existentes conservados.
)

:: ── 4. Marca de instalacion ───────────────────────────────────────────────
echo   [4/4] Finalizando...
echo %PY_VERSION% > "%MARKER%"
echo         OK

echo.
echo   =========================================
echo      Instalacion completa.
echo      Usa la opcion 2 para ejecutar.
echo   =========================================
echo.
pause
goto MENU


:: ════════════════════════════════════════════════════════════════════════════
:RUN
cls
if not exist "%PYTHON%" (
    echo.
    echo   ERROR: No hay instalacion.
    echo   Ejecuta primero la opcion 1.
    echo.
    pause & goto MENU
)
if not exist "%MARKER%" (
    echo.
    echo   Instalacion incompleta, reparando...
    goto INSTALL
)

echo.
echo   =========================================
echo      Iniciando Waifuku...
echo   =========================================
echo.
echo   Servidor ^>  http://localhost:8000
echo   Cierra esta ventana para detener la app.
echo.

:: Abrir el browser tras 3 segundos
start "" cmd /c "timeout /t 3 >nul && start http://localhost:8000"

cd /d "%ROOT%"
"%PYTHON%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

echo.
echo   Servidor detenido.
pause
goto MENU


:: ════════════════════════════════════════════════════════════════════════════
:UNINSTALL
cls
echo.
echo   =========================================
echo      DESINSTALAR
echo   =========================================
echo.
echo   Se eliminara:
echo     python_embed\   (Python portable)
echo     data\           (chats, personajes, items)
echo.
echo   Se conservara:
echo     data_seed\      (personajes iniciales)
echo     frontend\       (app compilada)
echo     backend\        (codigo del servidor)
echo.
set /p "CONF=   Escribe SI para confirmar: "
if /i not "%CONF%"=="SI" (
    echo   Cancelado.
    pause & goto MENU
)

echo.
echo   Eliminando Python portable...
if exist "%PY_DIR%" (
    rmdir /s /q "%PY_DIR%"
    echo      OK  python_embed eliminado.
)

echo   Eliminando datos de usuario...
if exist "%ROOT%\data" (
    rmdir /s /q "%ROOT%\data"
    echo      OK  data eliminado.
)

echo.
echo   =========================================
echo      Desinstalacion completa.
echo      La carpeta queda lista para reinstalar.
echo   =========================================
echo.
pause
goto MENU
