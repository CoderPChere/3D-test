# CityFluxy — Project Documentation & Summary

> **"Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence"**

*This project is made by **TEAM VICTOR** which is a Hackathon specific team.*

---

## 🌆 What is CityFluxy?

**CityFluxy** is an advanced, full-stack smart-city traffic management and surveillance platform built to give city authorities, traffic operators, and security teams a powerful, unified control center. The platform fuses **AI-powered vehicle detection**, **live CCTV feeds**, **neural traffic prediction**, and a **stunning 3D city simulation** into a single, cohesive web interface — all underpinned by a secure, cloud-backed authentication system.

The tagline says it all: *"Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence."*

---

## 🗂️ Project Architecture

The codebase is cleanly divided into three top-level layers:

```
CityFluxy/
├── front-end/      ← Next.js 16 / TypeScript / Three.js / GSAP
├── back-end/       ← Node.js / Express 5 / Supabase / JWT
├── ai-ml/          ← AI/ML pipeline (Python, YOLOv8, Ollama integration)
└── requirements.txt ← Python dependencies for the AI/ML & CCTV stack
```

---

## 🖥️ Front-End — The Command Interface

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS v4, Three.js (via `@react-three/fiber` + `@react-three/drei`), Framer Motion, GSAP, Lucide React

The front-end is a visually immersive, futuristic dark-mode web app with neon-cyan/purple aesthetics, glassmorphism panels, and cinematic scroll transitions. It is internally named **"VisionPlate"**.

### Pages

| Route | Page | Description |
|---|---|---|
| `/` | **Home / Landing** | 3D city hero, scroll-driven storytelling sections, Investigation Dashboard |
| `/cctv` | **Live CCTV Terminal** | Authenticated live video stream from Python backend |
| `/ai-prediction` | **Neural Traffic Predictor** | AI chatbot + Animated traffic signal |
| `/real-time-traffic` | **Real-Time Traffic Dashboard** | Embedded map-based live traffic dashboard |

---

### 🏙️ Feature 1 — Interactive 3D Smart City (Three.js)

The homepage hero is a **fully procedurally generated 3D city** rendered in-browser using `@react-three/fiber`. It contains:

- **Procedural buildings** — randomly generated skyscraper grid (10×10, with road gaps), each with randomized heights and emissive lit windows for a living-city effect.
- **Road network** — grid of horizontal and vertical roads with dashed lane markings, all using GPU-instanced geometry for performance.
- **Dynamic traffic system** — animated cars following road paths, obeying a synchronized traffic light cycle (Green → Yellow → Red, 10-second full cycle), with both horizontal and vertical lane logic.
- **CCTV camera points** — 4 glowing red-sphere cameras placed on buildings with holographic cyan rings, visually marking surveillance nodes.
- **Street lights** — instanced emissive light poles along all road edges.
- **Road signs** — 3D signage reading "SECTOR 07", "AI PATROL", "NEURAL NET ACTIVE", and "SPEED LIMIT: 60", reinforcing the futuristic city-ops aesthetic.
- **Traffic lights at every intersection** — 3×3 = 9 intersections, each with 4 directional poles reacting to the global traffic cycle.
- **Cinematic camera** — [CinematicCamera.tsx](file:///e:/CityFluxy/front-end/src/components/Three/CinematicCamera.tsx) provides smooth, dynamic camera movement over the city.

---

### 📹 Feature 2 — Live CCTV Surveillance Terminal (`/cctv`)

A **guarded, authentication-required** surveillance feed page. Key aspects:

- **Access control:** Unauthenticated users see a red "Unauthorized Access – SECURITY_VIOLATION_DETECTED" screen and must authenticate first.
- **Live video stream:** Connects to a local Python/FastAPI backend (`http://127.0.0.1:8000/video`) streaming an MJPEG feed from a camera or video file.
- **YOLOv8 neural engine:** The Python backend runs YOLOv8 for **helmet violation detection** on the live feed in real time.
- **Status indicators:** Shows live STREAM status, DETECTION: ACTIVE / AWAITING PYTHON SCRIPT, camera ID (CAM_07_A), and REC overlay with timestamp when the stream is active.
- **Detection capability panel:** Displays current status of four modules — Helmet Detection, Facial Recognition, Plate Indexing, and Anomaly Analysis.

---

### 🤖 Feature 3 — Neural Traffic Predictor AI (`/ai-prediction`)

An **AI-powered conversational assistant** for traffic intelligence queries:

- **AIChatbot component:** A full chat interface that connects to a **locally-run Ollama LLM** (`llama3.2:3b` model) exposed via an **ngrok tunnel**.
- The AI is prompted to behave as *"CityFluxy AI — a futuristic traffic intelligence system"* with a cybernetic, analytical tone.
- **AnimatedTrafficSignal component:** A live animated traffic signal displayed alongside the chatbot for context and visual richness.
- **Auth-gated:** Unauthenticated users are blocked with an "Access Denied – Restricted Sector" screen.

---

### 🗺️ Feature 4 — Real-Time Traffic Dashboard (`/real-time-traffic`)

- **Auth-gated with auto-redirect** — unauthenticated users are redirected to home.
- **Iframe-embedded map dashboard** — loads [realtime-traffic.html](file:///e:/CityFluxy/front-end/delhi-realtime-traffic.html) (a rich standalone HTML dashboard) in a full-screen iframe, providing a live map-based city traffic overview. This is built as a standalone HTML page ([delhi-realtime-traffic.html](file:///e:/CityFluxy/front-end/delhi-realtime-traffic.html)) with full traffic data visualization.

---

### 📋 Feature 5 — Investigation Dashboard (Home Page Section)

A **live-data command table** integrated directly into the homepage scroll:

- Logs vehicle scans with: **Scan ID**, **Number Plate**, **Vehicle Type**, **Status** (CLEARED / VIOLATION / PENDING), **AI Confidence %**, and **Timestamp**.
- Color-coded status badges (green/red/yellow with glow effects).
- Visual confidence bar per scan entry.
- **System Alerts** panel with flagged violations and automated citation triggers.
- **Network Load** panel showing live utilization of Neural Engine, Stream Synthesis, and Data Indexing.
- **"Live CCTV Access" button** for authenticated users to jump directly to the CCTV page.

---

### 🔐 Feature 6 — Authentication System

A full auth flow built into the UI:

- **`AuthSection`** — A modal for **Sign Up** and **Log In**, collecting name, email, password, organization, and role (`user` / `admin`).
- Calls the back-end REST API (`/api/v1/auth/signup` and `/api/v1/auth/login`).
- **`ProfileModal`** — Lets logged-in users view and update their profile details or **log out** (clears `localStorage` session).
- **`Navbar`** — Adaptive navbar showing login button for guests, user avatar + name for authenticated users.
- Session persisted in `localStorage` (token, name, email, role).

---

### 🎨 UI/UX Components

| Component | Purpose |
|---|---|
| [CursorGlow.tsx](file:///e:/CityFluxy/front-end/src/components/UI/CursorGlow.tsx) | Custom glowing cursor that follows mouse movement |
| [CityHUD.tsx](file:///e:/CityFluxy/front-end/src/components/UI/CityHUD.tsx) | Futuristic heads-up display overlay on the 3D city |
| [AIDetectionView.tsx](file:///e:/CityFluxy/front-end/src/components/UI/AIDetectionView.tsx) | Visual AI detection metrics panel in homepage scroll |
| [AnimatedTrafficSignal.tsx](file:///e:/CityFluxy/front-end/src/components/UI/AnimatedTrafficSignal.tsx) | Animated traffic signal widget |
| [Navbar.tsx](file:///e:/CityFluxy/front-end/src/components/UI/Navbar.tsx) | Global navigation with auth state awareness |

---

## ⚙️ Back-End — Secure API Server

**Tech Stack:** Node.js, Express 5, Supabase (cloud Postgres + Auth), JSON Web Tokens (JWT), bcryptjs, dotenv, CORS

The back-end is a lean REST API with one primary concern: **authentication**.

### Architecture

```
back-end/
├── server.js          ← Express app, Supabase client init, middleware
├── routes/
│   └── auth.js        ← POST /signup, POST /login
├── verify-auth.js     ← Dev utility to verify Supabase connectivity
└── .env               ← SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET
```

### Authentication Flow

1. **Sign Up** (`POST /api/v1/auth/signup`)  
   → Registers user in **Supabase Auth** (cloud)  
   → Inserts user record into `public.users` table  
   → Returns a signed **JWT** (24h expiry) with user ID and role

2. **Log In** (`POST /api/v1/auth/login`)  
   → Authenticates against **Supabase Auth** (email + password)  
   → Returns a signed **JWT** with user metadata (role, name)

3. **JWT** is stored client-side in `localStorage` and sent with subsequent requests for protected operations.

> The back-end was migrated from a local MongoDB setup to **Supabase** for fully managed cloud authentication, as evidenced by the [verify-auth.js](file:///e:/CityFluxy/back-end/verify-auth.js) test script.

---

## 🤖 AI / ML Layer

The AI/ML directory is initialized and represents the **Python-side computer vision pipeline**. Based on references throughout the codebase:

- **YOLOv8x** is used for vehicle and helmet violation detection from CCTV footage.
- A **FastAPI / uvicorn** server streams processed video output (`/video` endpoint on port 8000) to the front-end CCTV page.
- The **Ollama** LLM (`llama3.2:3b`) serves as the traffic prediction AI chatbot backend, exposed via an ngrok tunnel for the hosted front-end to reach the local model.
- A previous session involved setting up the **ngrok tunnel** (via `pyngrok`) for the Ollama API to be reachable from the deployed Next.js front-end.

---

## 🏗️ Technology Map

| Layer | Technology |
|---|---|
| **Front-End Framework** | Next.js 16 + React 19 + TypeScript |
| **3D Rendering** | Three.js, `@react-three/fiber`, `@react-three/drei` |
| **Animations** | Framer Motion, GSAP |
| **Styling** | TailwindCSS v4, Custom CSS (glassmorphism, neon effects) |
| **Icons** | Lucide React |
| **Back-End** | Node.js + Express 5 |
| **Database / Auth** | Supabase (Cloud Postgres + Auth) |
| **Token Auth** | JSON Web Tokens (JWT, 24h expiry) |
| **AI — Detection** | YOLOv8x (Python, OpenCV) |
| **AI — LLM** | Ollama (`llama3.2:3b`) + ngrok tunnel |
| **Video Streaming** | Python FastAPI / uvicorn (MJPEG stream) |

---

## 🚀 How to Run Locally

This project has **three independent services** that all need to be running for the full experience. Follow the steps below in order.

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Front-end & Back-end |
| [npm](https://www.npmjs.com/) | v9+ | Package management |
| [Python](https://www.python.org/) | v3.9+ | YOLOv8 AI pipeline |
| [pip](https://pip.pypa.io/) | v23+ | Python package manager |
| [Git](https://git-scm.com/) | Any | Clone the repo |

---

### Step 0 — Download & Install Node.js

Node.js is required to run both the front-end and back-end. **Install this first before anything else.**

1. Go to **[https://nodejs.org](https://nodejs.org)**
2. Download the **LTS version** (v18 or higher)
3. Run the installer and follow the prompts
4. Verify the installation:

```bash
node -v   # should print v18.x.x or higher
npm -v    # should print v9.x.x or higher
```

> [!IMPORTANT]
> npm comes bundled with Node.js — you do **not** need to install it separately.

---

### Step 1a — Clone the Repository

```bash
git clone https://github.com/Shubham-N11/CityFluxy.git
cd CityFluxy
```

---

### Step 1b — Install Python Dependencies

A [requirements.txt](file:///e:/CityFluxy/requirements.txt) is provided at the root of the project for all Python dependencies (CCTV stream, YOLOv8, pyngrok, etc.).

```bash
# From the project root:
pip install -r requirements.txt
```

This installs:

| Package | Purpose |
|---|---|
| `fastapi` + `uvicorn` | CCTV video streaming server |
| `ultralytics` | YOLOv8 helmet violation detection |
| `opencv-python` | Camera frame processing |
| `pyngrok` | Expose Ollama (Colab) via ngrok tunnel |
| `requests` | API calls to Ollama from Python |
| `python-dotenv` | Environment variable management |
| `numpy` + `pillow` | Image processing utilities |

---

### Step 2 — Start the Back-End Server

The back-end handles user authentication via Supabase.

```bash
cd back-end
npm install
```

Create a [.env](file:///e:/CityFluxy/back-end/.env) file inside `back-end/` with your credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-super-secret-jwt-key
PORT=8000
```

> **How to get Supabase credentials:** Go to [supabase.com](https://supabase.com), create a project, and find your URL and anon key under **Project Settings → API**.

Start the server:

```bash
node server.js
```

The back-end will be running at: `http://localhost:8000`  
Verify it works: open `http://localhost:8000/api/v1/health` — you should see `{ "status": "ok" }`.

---

### Step 3 — Start the Front-End

Open a **new terminal** and run:

```bash
cd front-end
npm install
npm run dev
```

The front-end will be running at: `http://localhost:3000`

Open your browser and go to `http://localhost:3000` — you should see the **CityFluxy 3D city landing page**.

---

### Step 4 — Start the AI/ML Python Server (CCTV Live Feed)

This service powers the `/cctv` page with YOLOv8 helmet detection.

Open another **new terminal**:

```bash
cd ai-ml
python -m venv venv

# Activate virtual environment:
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies:
pip install fastapi uvicorn ultralytics opencv-python
```

Then start the FastAPI stream server:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

> **Note:** The CCTV page at `/cctv` will stream video from `http://127.0.0.1:8000/video`. Make sure your Python [server.py](file:///e:/CityFluxy/front-end/server.py) exposes a `/video` MJPEG endpoint using your YOLOv8 inference logic.

---

### Step 5 — Run Ollama on Google Colab (AI Chatbot)

The `/ai-prediction` AI chatbot is powered by **Ollama running on Google Colab**, tunneled to the front-end via **ngrok**. No local Ollama installation is needed.

> [!IMPORTANT]
> **Before running any cells, set your runtime to T4 GPU:**
> 1. In Colab, click **Runtime → Change runtime type**
> 2. Under **Hardware accelerator**, select **T4 GPU**
> 3. Click **Save** — Colab will restart with GPU enabled
>
> This is required for Ollama to run efficiently on Colab.

Open your Colab notebook and run the following cells **in order**:

---

**Cell 1 — Install dependencies and Ollama**

```python
import subprocess
subprocess.run(['sudo', 'apt-get', 'update'])
subprocess.run(['sudo', 'apt-get', 'install', '-y', 'zstd'])
print('zstd installed successfully.')
!curl -fsSL https://ollama.com/install.sh | sh
```

---

**Cell 2 — Start Ollama server**

```python
import subprocess

process = subprocess.Popen(
    ["ollama", "serve"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

print("Ollama started")
```

---

**Cell 3 — Pull the model and verify**

> [!NOTE]
> ⏳ **Please wait patiently.** The `llama3.2:3b` model is **~2.0 GB** and may take **3–8 minutes** to download depending on Colab's network speed. Do not interrupt the cell while it is running.

```bash
!ollama pull llama3.2:3b
```

```bash
!ollama ls
```

---

**Cell 4 — Install pyngrok**

```bash
!pip install pyngrok
```



```python
from pyngrok import ngrok
import os
import subprocess
import time

# Set ngrok auth token
ngrok.set_auth_token("YOUR_NGROK_AUTH_TOKEN")

# Start Ollama binding to all interfaces
os.environ["OLLAMA_HOST"] = "0.0.0.0"
subprocess.Popen(["ollama", "serve"])

# Kill any existing ngrok tunnels to free up resources
ngrok.kill()

# Open tunnel with proper host header
public_url = ngrok.connect(
    addr=11434,
    proto="http",
    host_header="localhost:11434"
)

print("Public URL:", public_url)
```

> Copy the **Public URL** printed above — you'll need it in cell 6 below.

---

**Cell 5 — Interactive chatbot loop (optional Colab test)**

```python
import requests

NGROK_URL = "https://your-tunnel.ngrok-free.dev"   # paste your URL here

messages = [
    {"role": "system", "content": "You are a helpful AI assistant."}
]

print("🤖 Chatbot Ready\n")

while True:
    user_input = input("You: ")

    if user_input.lower() == "exit":
        break

    messages.append({"role": "user", "content": user_input})

    try:
        response = requests.post(
            f"{NGROK_URL}/api/chat",
            headers={"ngrok-skip-browser-warning": "true"},
            json={
                "model": "traffic-analyst",
                "messages": messages,
                "stream": False
            },
            timeout=300
        )

        response.raise_for_status()
        ai_reply = response.json()["message"]["content"]

        print("\nAI:", ai_reply, "\n")
        messages.append({"role": "assistant", "content": ai_reply})

    except Exception as e:
        print("Error:", e)
```

---

**Cell 6 — Update the front-end with your ngrok URL**

Open [front-end/src/components/UI/AIChatbot.tsx](file:///e:/CityFluxy/front-end/src/components/UI/AIChatbot.tsx) and update this line with the Public URL from Cell 3:

```typescript
const response = await fetch("https://YOUR-TUNNEL.ngrok-free.dev/api/generate", {
```



Replace the URL with the one printed in your Colab output (e.g. `https://xxxx-xx-xx-xxx-xxx.ngrok-free.app`).

---

### All Services Running — Quick Reference

| Service | Command | URL |
|---|---|---|
| **Back-End API** | `node server.js` (in `back-end/`) | `http://localhost:8000` |
| **Front-End** | `npm run dev` (in `front-end/`) | `http://localhost:3000` |
| **Python CCTV Stream** | `uvicorn server:app` (in `ai-ml/`) | `http://127.0.0.1:8000/video` |
| **Ollama LLM** | `ollama serve` | `http://localhost:11434` |
| **ngrok tunnel** | `ngrok http 11434` | Your generated URL |

> [!NOTE]
> You can use the website with just Steps 2 & 3 (back-end + front-end). Steps 4 and 5 are only needed to activate the CCTV live feed and AI chatbot features respectively.

---

## 🔑 Key Design Principles

1. **Security-first access control** — every sensitive page and feature is gated by JWT authentication. Unauthenticated users receive styled "ACCESS DENIED" screens, not silent redirects.
2. **Futuristic UX** — neon-cyan/purple color palette, glassmorphism, hologram text effects, animated micro-interactions (cursor glows, pulsing indicators, GSAP scroll transitions).
3. **Modular architecture** — clean separation of concerns: 3D engine, UI components, auth, AI chatbot, and video feed are all independent modules.
4. **Performance-conscious 3D** — GPU instancing used extensively for buildings, windows, road dashes, and street lights to keep the WebGL scene performant.
5. **AI hybridization** — combines classical computer vision (YOLOv8) for real-time detection with a conversational LLM (Ollama) for predictive intelligence queries.

---

## 📊 Current Project State

| Module | Status |
|---|---|
| 3D Smart City Visualization | ✅ Complete |
| Auth System (Supabase + JWT) | ✅ Complete |
| Investigation Dashboard | ✅ Complete (demo data) |
| CCTV Live Feed Page | ✅ Complete (requires Python backend) |
| AI Chatbot (Ollama) | ✅ Complete (requires local Ollama + ngrok) |
| Real-Time Traffic Dashboard | ✅ Complete (standalone HTML) |
| AI/ML Python Pipeline | 🔄 In Progress (YOLOv8, FastAPI) |
| AI/ML Production Deployment | ⬜ Planned |

---

*CityFluxy — built to make cities safer, smarter, and more adaptive through the power of real-time AI.*
