# Poll Automation App

Poll Automation App is a standalone, open-source web application designed to intelligently generate and manage live polls in real-time during lectures, webinars, or meetings — without being tied to any specific video conferencing platform.

## 📁 Monorepo Project Structure (Turborepo)

```
poll-automation/
├── apps/
│   ├── backend/                  # Express + WebSocket backend
│   │   ├── src/
│   │   │   ├── transcription/    # Whisper routing + service logic
│   │   │   ├── websocket/        # WS handlers and connections
│   │   │   └── index.ts          # Server entry point
│   │   └── package.json
│   └── frontend/                 # Vite + React + TypeScript frontend
│       ├── src/
│       │   ├── components/       # Reusable UI components
│       │   ├── utils/            # Microphone & upload logic
│       │   └── main.tsx         # App entry point
│       └── package.json
├── services/
│   ├── whisper/                  # Python transcription service (Faster-Whisper)
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── whisper-env/         # Virtual environment (local only)
│   ├── pollgen-llm/              # LLM-based poll generation (local/API)
│   │   ├── main.py
│   │   ├── server.py             # FastAPI backend for poll generation
│   │   └── vector.py             # Embedding-based logic
│   └── pollgen-gemini/           # Gemini API-based poll generation
│       ├── gemini.py
│       └── chunker.py
├── shared/
│   ├── types/                    # Shared types/interfaces (TypeScript)
│   └── utils/                    # Shared audio utilities
├── .github/
│   └── workflows/                # GitHub Actions (CI/CD)
├── package.json                  # Root config with workspaces
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # Defines all workspace packages
├── .gitignore
├── README.md
```

## 🚀 Getting Started

### 🔧 Python Environment Setup

1. **Navigate to the Whisper service folder:**

```bash
cd services/whisper
```

2. **Create and activate a Python virtual environment:**

```bash
# Windows
python -m venv whisper-env
whisper-env\Scripts\activate

# macOS/Linux
python3 -m venv whisper-env
source whisper-env/bin/activate
```

3.1 **For CPU-only**

```bash
pip install --upgrade pip
pip install -r requirements.txt
````

This installs everything except large GPU-related packages like `torch`.
Useful for quickly running the backend in **CPU mode** for testing or development.


3.2 **⚡ For GPU support (CUDA 12.1)**

If you have a CUDA-enabled GPU and want to use GPU acceleration:

```bash
pip install -r requirements.gpu.txt --extra-index-url https://download.pytorch.org/whl/cu121
```

This will install `torch`, `torchaudio`, and `torchvision` with CUDA 12.1 support.
Make sure your system has the correct CUDA runtime installed.

## 🔧 .env Configuration

### `apps/backend/.env`

```
PORT=3000
WHISPER_WS_URL=ws://localhost:8000
```

### `apps/frontend/.env`

```
VITE_BACKEND_WS_URL=ws://localhost:3000
```

### `services/whisper/.env`

```
# Configuration for the Whisper Service
WHISPER_MODEL_SIZE=small
BUFFER_DURATION_SECONDS=60
# Port for the Whisper service
WHISPER_SERVICE_PORT=8000

# -------------------------------------------
# Available Faster-Whisper model sizes:
# 
# 1. tiny
# 2. base
# 3. small
# 4. medium
# 5. large-v1
# 6. large-v2
# 7. large-v3
```

### Global Prerequisites
**Navigate to the root directory:**

Install `pnpm` and `turbo` globally (once):

```bash
npm install -g pnpm
pnpm add -g turbo
```
### 1. Install dependencies

```bash
pnpm install
```

### 2. Start all dev servers

```bash
pnpm dev
```
This starts:

* ✅ *Frontend* → [http://localhost:5173](http://localhost:5173)
* ✅ *Backend (WebSocket server)* → ws\://localhost:3000
* ✅ *Whisper Transcription Service* → ws\://localhost:8000 (Python FastAPI)

> Make sure the Python environment is set up correctly (faster-whisper, uvicorn, etc.)

## 🛆 Using Turborepo

* `pnpm build` → Build all apps/services
* `pnpm lint` → Lint all projects
* `pnpm test` → Run tests
* `turbo run <task>` → Run any task across monorepo


## 🗣 Phase 1 – Transcription Pipeline

> This outlines the current real-time transcription flow:

1. **Frontend** records or selects a `.wav` file and sends it over WebSocket (binary + metadata).
2. **Backend** WebSocket server receives and forwards it to the Whisper service.
3. **Whisper Service** processes audio using Faster-Whisper and returns transcription in JSON.
4. **Backend** sends transcription JSON back to the frontend or passes it to the LLM service.

> Currently, the transcription is **not displayed** to the user – it is **used internally** to generate polls using an LLM.

📅 Upcoming Phases:

* Phase 2: LLM-based Poll Generation
* Phase 3: Realtime Poll Launch and Analytics

