#!/usr/bin/env bash
set -e

echo "========================================"
echo "  Waifuku — Iniciando entorno de desarrollo"
echo "========================================"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"

# 1. Verificar/crear virtualenv
echo ""
echo "[1/4] Verificando entorno virtual Python..."
if [ ! -d "$VENV_DIR" ]; then
    echo "  → Creando venv..."
    python3 -m venv "$VENV_DIR"
    echo "  ✓ venv creado"
else
    echo "  ✓ venv existente encontrado"
fi

# 2. Activar venv
source "$VENV_DIR/bin/activate"
echo "  ✓ venv activado"

# 3. Instalar/verificar dependencias Python
echo ""
echo "[2/4] Verificando dependencias Python..."
pip install -q -r "$PROJECT_DIR/requirements.txt"
echo "  ✓ Dependencias Python OK"

# 4. Verificar dependencias frontend
echo ""
echo "[3/4] Verificando dependencias frontend..."
if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo "  → Instalando dependencias Node..."
    cd "$PROJECT_DIR/frontend" && npm install
    echo "  ✓ Dependencias Node instaladas"
else
    echo "  ✓ node_modules existente encontrado"
fi

# 5. Liberar puertos si hay procesos previos colgados
echo ""
echo "[4/4] Lanzando servicios..."

for PORT in 8000 5173; do
    PIDS=$(lsof -ti tcp:$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "  → Puerto $PORT ocupado — terminando proceso previo (PID $PIDS)..."
        kill $PIDS 2>/dev/null || true
        sleep 0.5
    fi
done

echo "  → Backend FastAPI en http://localhost:8000"
echo "  → Frontend React en http://localhost:5173"
echo ""

cd "$PROJECT_DIR"
trap "kill 0" EXIT

uvicorn backend.main:app --reload --port 8000 &
cd "$PROJECT_DIR/frontend" && npm run dev &

wait
