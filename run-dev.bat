@echo off
setlocal enabledelayedexpansion
title Waifuku - Dev

:: ============================================================================
::  Waifuku - Launcher de DESARROLLO para Windows (autocontenido)
::  Backend: uvicorn --reload (FastAPI)  ->  http://localhost:8000
::  Frontend: vite dev + HMR             ->  http://localhost:5173
::
::  Todo vive dentro del proyecto (cero dependencias del sistema), en runtime\:
::    - Python embebido portable -> runtime\python\
::    - Node portable            -> runtime\node\
::  Ambos se descargan en el primer arranque. Para reinstalar limpio:
::  borra la carpeta runtime\ entera y vuelve a ejecutar este .bat.
:: ============================================================================

:: -- Rutas base --------------------------------------------------------------
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

:: -- Carpeta unica de runtimes regenerables (borrable de un tiron) -----------
set "RUNTIME=%ROOT%\runtime"

:: -- Python embebido ---------------------------------------------------------
set "PY_DIR=%RUNTIME%\python"
set "PYTHON=%PY_DIR%\python.exe"
set "PY_VERSION=3.11.9"
set "PY_PTH=%PY_DIR%\python311._pth"
set "PY_ZIP_URL=https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
set "GET_PIP_URL=https://bootstrap.pypa.io/get-pip.py"
set "PY_MARKER=%PY_DIR%\.deps_ready"

:: -- Node portable -----------------------------------------------------------
set "NODE_VERSION=22.13.0"
set "NODE_DIR=%RUNTIME%\node"
set "NODE_HOME=%NODE_DIR%\node-v%NODE_VERSION%-win-x64"
set "NODE_EXE=%NODE_HOME%\node.exe"
set "NPM_CMD=%NODE_HOME%\npm.cmd"
set "NODE_ZIP_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-win-x64.zip"

echo.
echo   =========================================
echo      W A I F U K U   -   D E V
echo   =========================================
echo.

:: ====================================================================
:: [1/5] Python portable
:: ====================================================================
echo   [1/5] Python portable...
if exist "%PYTHON%" (
    echo         OK  ya presente.
    goto :PY_DEPS
)
echo         Descargando Python %PY_VERSION% embebido...
if not exist "%RUNTIME%" mkdir "%RUNTIME%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -Uri '%PY_ZIP_URL%' -OutFile '%TEMP%\waifuku_py.zip' -UseBasicParsing"
if errorlevel 1 ( echo   ERROR: fallo al descargar Python. & pause & exit /b 1 )
if not exist "%PY_DIR%" mkdir "%PY_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -Path '%TEMP%\waifuku_py.zip' -DestinationPath '%PY_DIR%' -Force"
del "%TEMP%\waifuku_py.zip" >nul 2>&1

:: Reescribir el _pth del Python embebido con contenido conocido:
::   - 'import site' habilita site-packages (pip / imports)
::   - '..\..' agrega la raiz del proyecto a sys.path para que 'backend' sea importable
::     (python esta en runtime\python\, su abuelo es la raiz del proyecto)
> "%PY_PTH%" echo python311.zip
>>"%PY_PTH%" echo .
>>"%PY_PTH%" echo ..\..
>>"%PY_PTH%" echo import site
echo         Instalando pip...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -Uri '%GET_PIP_URL%' -OutFile '%TEMP%\get-pip.py' -UseBasicParsing"
if errorlevel 1 ( echo   ERROR: fallo al descargar pip. & pause & exit /b 1 )
"%PYTHON%" "%TEMP%\get-pip.py" --quiet --no-warn-script-location
del "%TEMP%\get-pip.py" >nul 2>&1
echo         OK  Python %PY_VERSION% listo.

:PY_DEPS
:: ====================================================================
:: [2/5] Dependencias Python
:: ====================================================================
echo   [2/5] Dependencias Python...
if exist "%PY_MARKER%" (
    echo         OK  ya instaladas.
) else (
    "%PYTHON%" -m pip install -r "%ROOT%\requirements.txt" ^
        --quiet --no-warn-script-location --disable-pip-version-check
    if errorlevel 1 ( echo   ERROR: fallo al instalar requirements. & pause & exit /b 1 )
    echo %PY_VERSION% > "%PY_MARKER%"
    echo         OK  instaladas.
)

:: ====================================================================
:: [3/5] Node portable
:: ====================================================================
echo   [3/5] Node portable...
if exist "%NODE_EXE%" (
    echo         OK  ya presente.
) else (
    echo         Descargando Node v%NODE_VERSION% portable...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Invoke-WebRequest -Uri '%NODE_ZIP_URL%' -OutFile '%TEMP%\waifuku_node.zip' -UseBasicParsing"
    if errorlevel 1 ( echo   ERROR: fallo al descargar Node. & pause & exit /b 1 )
    if not exist "%NODE_DIR%" mkdir "%NODE_DIR%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Expand-Archive -Path '%TEMP%\waifuku_node.zip' -DestinationPath '%NODE_DIR%' -Force"
    del "%TEMP%\waifuku_node.zip" >nul 2>&1
    echo         OK  Node v%NODE_VERSION% listo.
)

:: ====================================================================
:: [4/5] Dependencias frontend (node_modules)
:: ====================================================================
:: Verificar el shim de Windows de vite, no solo la carpeta: un node_modules
:: copiado de Linux "existe" pero no tiene los .cmd ni el esbuild de win32.
echo   [4/5] Dependencias frontend...
if exist "%ROOT%\frontend\node_modules\.bin\vite.cmd" (
    echo         OK  node_modules valido para Windows.
) else (
    if exist "%ROOT%\frontend\node_modules" (
        echo         node_modules invalido ^(otra plataforma^); reinstalando...
        rmdir /s /q "%ROOT%\frontend\node_modules"
    ) else (
        echo         Instalando con npm portable ^(puede tardar^)...
    )
    pushd "%ROOT%\frontend"
    call "%NPM_CMD%" install --no-audit --no-fund
    if errorlevel 1 ( echo   ERROR: fallo npm install. & popd & pause & exit /b 1 )
    popd
    echo         OK  node_modules instalado.
)

:: ====================================================================
:: [5/5] Lanzar servicios
:: ====================================================================
echo   [5/5] Lanzando servicios en ventanas separadas...
echo         Backend  ^>  http://localhost:8000
echo         Frontend ^>  http://localhost:5173
echo.
echo         Cierra cada ventana para detener su servicio.
echo.

:: Anteponer ambos runtimes portables al PATH; las ventanas hijas lo heredan,
:: asi 'python' y 'npm' resuelven a los binarios del proyecto (sin comillas anidadas).
set "PATH=%PY_DIR%;%NODE_HOME%;%PATH%"

:: Backend con auto-reload (sirve la API; el frontend vive en vite)
start "Waifuku Backend"  /D "%ROOT%" cmd /k python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

:: Frontend con HMR (vite)
start "Waifuku Frontend" /D "%ROOT%\frontend" cmd /k npm run dev

:: Abrir el navegador en el frontend cuando vite haya tenido tiempo de levantar
start "" cmd /c "timeout /t 6 >nul && start http://localhost:5173"

echo   Servicios lanzados. Esta ventana puede cerrarse.
timeout /t 4 >nul
exit /b 0
