#!/usr/bin/env bash
# Empaqueta Waifuku en release-windows/ listo para distribuir en Windows
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE="$ROOT/release-windows"

echo "=== Waifuku — Build Windows Release ==="
echo "Raiz del proyecto: $ROOT"
echo "Destino:           $RELEASE"
echo

# 1. Compilar frontend
echo "[1/5] Compilando frontend..."
cd "$ROOT/frontend"
VITE_API_URL='' npm run build --silent
echo "   OK  dist/ generado"

# 2. Limpiar y recrear release
echo "[2/5] Preparando carpeta de release..."
rm -rf "$RELEASE"
mkdir -p "$RELEASE"

# 3. Copiar archivos del proyecto
echo "[3/5] Copiando archivos..."

# Backend (sin __pycache__)
rsync -a --exclude='__pycache__' --exclude='*.pyc' "$ROOT/backend/" "$RELEASE/backend/"
# Frontend compilado
mkdir -p "$RELEASE/frontend"
cp -r "$ROOT/frontend/dist"  "$RELEASE/frontend/dist"
# Requirements
cp "$ROOT/requirements.txt"  "$RELEASE/requirements.txt"
# Datos semilla (personajes, fondos — sin chats ni sesiones)
# El bat copia data_seed\ → data\ en la primera instalación
mkdir -p "$RELEASE/data_seed/backgrounds"
mkdir -p "$RELEASE/data_seed/characters"
cp -r "$ROOT/data/backgrounds/." "$RELEASE/data_seed/backgrounds/" 2>/dev/null || true
cp -r "$ROOT/data/characters/."  "$RELEASE/data_seed/characters/"  2>/dev/null || true
echo "   OK  Archivos copiados"

# 4. Copiar el .bat (vive en scripts/, no en release-windows/)
echo "[4/5] Copiando launcher..."
cp "$ROOT/scripts/waifuku.bat" "$RELEASE/waifuku.bat"
echo "   OK  waifuku.bat listo"

# 5. Crear README
echo "[5/5] Generando README..."
cat > "$RELEASE/README.txt" << 'EOF'
  WAIFUKU ALPHA — Instrucciones
  ================================

  REQUISITOS:
    - Windows 10 / 11
    - Python 3.11 o superior  →  https://www.python.org/downloads/
      (marcar "Add Python to PATH" durante instalacion)
    - Ollama o LM Studio corriendo localmente con un modelo cargado

  COMO USAR:
    1. Doble click en  waifuku.bat
    2. Opcion 1 → Instalar  (solo la primera vez)
    3. Opcion 2 → Ejecutar

  DESINSTALAR:
    - Opcion 3 en el menu
    - Elimina venv\ y datos de usuario
    - El programa permanece para reinstalar

  CONFIGURAR MODELO:
    - En la app, ir a "Servidor"
    - Seleccionar Ollama o LM Studio
    - Elegir el modelo deseado

  ================================
EOF
echo "   OK  README.txt creado"

echo
echo "=== Release listo en: $RELEASE ==="
echo
ls -lh "$RELEASE"
