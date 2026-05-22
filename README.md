# WAIFUKU

> Local AI companion interface · Interfaz de compañía IA local

![License: Personal Use Only](https://img.shields.io/badge/license-Personal%20Use%20Only-blueviolet)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![React](https://img.shields.io/badge/react-19-61dafb)

---

## English

### What is Waifuku?

Waifuku is a **local, privacy-first AI companion interface** that runs entirely on your machine. It connects to local LLM servers (Ollama, LM Studio, or any OpenAI-compatible backend) and provides a polished frontend for character-driven roleplay and direct inference — no cloud, no subscriptions, no data leaving your device.

### Features

- **Visual Novel scene** — Twitch-style chat panel with character sprite, scene backgrounds, and narrative text rendering
- **Vanilla Chat** — Direct inference mode with no character, for general-purpose LLM interaction
- **Character system** — Import SillyTavern cards (PNG/JSON), create characters from scratch, manage with a 3-tier grid (Recent · Favorites · Others)
- **Character Creator** — Full SillyTavern V2-compatible field editor: description, personality, first message, scenario, dialogue examples, system prompt, alternate greetings, metadata
- **Persona system** — Multiple user profiles (name + description) to use in roleplay, with a default persona selector
- **Server profiles** — Switch between Ollama, LM Studio, and OpenAI-compatible endpoints; local network discovery for LAN servers
- **Inference parameters** — Temperature, Top P, Top K, Repeat Penalty, Max Tokens, context window, thinking mode (for models that support it)
- **LLM Stats HUD** — Draggable overlay showing tokens/sec, context usage (tokens used / max), and VRAM load
- **Themes** — Multiple visual themes with GSAP-powered animations and particle effects on the welcome screen
- **Multilingual UI** — Full English and Spanish interface, switchable in Settings
- **Streaming** — Real-time token streaming via WebSocket

### Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Python · FastAPI · Uvicorn · WebSocket |
| Frontend | React 19 · Vite · Zustand · GSAP · i18next |
| Storage  | Local JSON files (no database required) |
| LLM      | Ollama / LM Studio / any OpenAI-compatible server |

### Current Status

The application is **functional and actively developed**. Core features are stable:

| Feature | Status |
|---------|--------|
| VN Scene chat | ✅ Stable |
| Vanilla Chat | ✅ Stable |
| Character Manager (3-tier + favorites) | ✅ Stable |
| Character Creator (full V2 fields) | ✅ Stable |
| Persona Manager | ✅ Stable |
| Model / Server Config | ✅ Stable |
| LLM Stats HUD | ✅ Stable |
| Themes + animations | ✅ Stable |
| EN / ES i18n | ✅ Stable |
| Avatar upload for personas | 🔧 Planned |
| Slot / item system (Waifuku Format v1) | 🔧 Planned |
| Precise token counter | 🔧 Planned |

### Requirements

- Python 3.11+
- Node.js 18+ (for development)
- [Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), or any OpenAI-compatible local server

### Quick Start

```bash
git clone https://github.com/yourusername/waifuku.git
cd waifuku
bash run.sh
```

`run.sh` will create a virtual environment, install dependencies, and launch the backend. Open `http://localhost:5173` for the frontend in dev mode, or serve `frontend/dist/` after running `npm run build`.

### License

**Personal, non-commercial use only.** See [LICENSE](LICENSE) for full terms. Forks must use the same license.

---

## Español

### ¿Qué es Waifuku?

Waifuku es una **interfaz de compañía IA local y orientada a la privacidad** que corre completamente en tu máquina. Se conecta a servidores LLM locales (Ollama, LM Studio, o cualquier backend compatible con OpenAI) y ofrece un frontend refinado para roleplay con personajes e inferencia directa — sin nube, sin suscripciones, sin datos que salgan de tu dispositivo.

### Características

- **Escena Visual Novel** — Panel de chat estilo Twitch con sprite del personaje, fondos de escena y renderizado de texto narrativo
- **Vanilla Chat** — Modo de inferencia directa sin personaje, para interacción general con el LLM
- **Sistema de personajes** — Importa cards de SillyTavern (PNG/JSON), crea personajes desde cero, gestiona con una cuadrícula de 3 niveles (Reciente · Favoritos · Otros)
- **Creador de personajes** — Editor completo compatible con SillyTavern V2: descripción, personalidad, primer mensaje, escenario, ejemplos de diálogo, system prompt, saludos alternativos, metadatos
- **Sistema de personas** — Múltiples perfiles de usuario (nombre + descripción) para usar en el roleplay, con selector de persona por defecto
- **Perfiles de servidor** — Cambia entre Ollama, LM Studio y endpoints compatibles con OpenAI; descubrimiento automático en red local
- **Parámetros de inferencia** — Temperature, Top P, Top K, Repeat Penalty, Max Tokens, ventana de contexto, thinking mode (para modelos que lo soporten)
- **LLM Stats HUD** — Overlay arrastrable con tokens/seg, uso de contexto (tokens usados / máximo) y carga de VRAM
- **Temas** — Múltiples temas visuales con animaciones GSAP y efectos de partículas en la pantalla de bienvenida
- **UI multilingüe** — Interfaz completa en inglés y español, cambiable en Ajustes
- **Streaming** — Generación de tokens en tiempo real vía WebSocket

### Stack

| Capa     | Tecnología |
|----------|-----------|
| Backend  | Python · FastAPI · Uvicorn · WebSocket |
| Frontend | React 19 · Vite · Zustand · GSAP · i18next |
| Almacenamiento | Archivos JSON locales (sin base de datos) |
| LLM      | Ollama / LM Studio / cualquier servidor compatible con OpenAI |

### Estado actual

La aplicación es **funcional y está en desarrollo activo**. Las funcionalidades principales son estables:

| Característica | Estado |
|----------------|--------|
| Escena VN chat | ✅ Estable |
| Vanilla Chat | ✅ Estable |
| Gestor de personajes (3 niveles + favoritos) | ✅ Estable |
| Creador de personajes (campos completos V2) | ✅ Estable |
| Gestor de personas | ✅ Estable |
| Configuración de modelo / servidor | ✅ Estable |
| LLM Stats HUD | ✅ Estable |
| Temas + animaciones | ✅ Estable |
| i18n EN / ES | ✅ Estable |
| Upload de avatar para personas | 🔧 Planificado |
| Sistema de slots / items (Waifuku Format v1) | 🔧 Planificado |
| Contador de tokens preciso | 🔧 Planificado |

### Requisitos

- Python 3.11+
- Node.js 18+ (para desarrollo)
- [Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), o cualquier servidor local compatible con OpenAI

### Inicio rápido

```bash
git clone https://github.com/yourusername/waifuku.git
cd waifuku
bash run.sh
```

`run.sh` creará un entorno virtual, instalará dependencias y lanzará el backend. Abre `http://localhost:5173` para el frontend en modo desarrollo, o sirve `frontend/dist/` después de ejecutar `npm run build`.

### Licencia

**Solo uso personal y no comercial.** Ver [LICENSE](LICENSE) para los términos completos. Los forks deben usar la misma licencia.
