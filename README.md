# CityFluxy — Project Documentation & Summary

> **"Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence"**

*This project is made by **TEAM VICTOR** which is a Hackathon specific team.*

---

## 🌆 What is CityFluxy?

**CityFluxy** is an advanced, full-stack smart-city traffic management and surveillance platform built to give city authorities, traffic operators, and security teams a powerful, unified control center. The platform fuses **AI-powered vehicle detection**, **live CCTV feeds**, **neural traffic prediction**, and a **stunning 3D city simulation** into a single, cohesive web interface — all underpinned by a secure, cloud-backed authentication system.

The tagline says it all: *"Next-Gen Autonomous City Surveillance & Neural Traffic Intelligence."*

---

## 🗂️ Project Architecture

```
CityFluxy/
└── front-end/      ← Next.js 16 / TypeScript / Three.js / GSAP
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
- Calls the REST API (`/api/v1/auth/signup` and `/api/v1/auth/login`).
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

## 🏗️ Technology Map

| Layer | Technology |
|---|---|
| **Front-End Framework** | Next.js 16 + React 19 + TypeScript |
| **3D Rendering** | Three.js, `@react-three/fiber`, `@react-three/drei` |
| **Animations** | Framer Motion, GSAP |
| **Styling** | TailwindCSS v4, Custom CSS (glassmorphism, neon effects) |
| **Icons** | Lucide React |

---

## 🚀 How to Run Locally

The frontend runs as a single service. Follow the steps below.

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Front-end |
| [npm](https://www.npmjs.com/) | v9+ | Package management |
| [Git](https://git-scm.com/) | Any | Clone the repo |

---

### Step 0 — Download & Install Node.js

Node.js is required to run the front-end. **Install this first before anything else.**

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

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Shubham-N11/CityFluxy.git
cd CityFluxy
```

---

### Step 2 — Start the Front-End

Open a **new terminal** and run:

```bash
cd front-end
npm install
npm run dev
```

The front-end will be running at: `http://localhost:3000`

Open your browser and go to `http://localhost:3000` — you should see the **CityFluxy 3D city landing page**.

---

### All Services Running — Quick Reference

| Service | Command | URL |
|---|---|---|
| **Front-End** | `npm run dev` (in `front-end/`) | `http://localhost:3000` |

---

## 🔑 Key Design Principles

1. **Security-first access control** — every sensitive page and feature is gated by JWT authentication. Unauthenticated users receive styled "ACCESS DENIED" screens, not silent redirects.
2. **Futuristic UX** — neon-cyan/purple color palette, glassmorphism, hologram text effects, animated micro-interactions (cursor glows, pulsing indicators, GSAP scroll transitions).
3. **Modular architecture** — clean separation of concerns: 3D engine, UI components, auth, AI chatbot, and video feed are all independent modules.
4. **Performance-conscious 3D** — GPU instancing used extensively for buildings, windows, road dashes, and street lights to keep the WebGL scene performant.

---

## 📊 Current Project State

| Module | Status |
|---|---|
| 3D Smart City Visualization | ✅ Complete |
| Auth System (Supabase + JWT) | ✅ Complete (requires external service) |
| Investigation Dashboard | ✅ Complete (demo data) |
| CCTV Live Feed Page | ✅ Complete (requires external service) |
| AI Chatbot (Ollama) | ✅ Complete (requires external service) |
| Real-Time Traffic Dashboard | ✅ Complete (standalone HTML) |

---

*CityFluxy — built to make cities safer, smarter, and more adaptive through the power of real-time AI.*
