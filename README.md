# Creative Suite Hub (Creative Ecosystem & Adobe Bridge)

A centralized Play Store desktop application and universal host bridge for 15–20 Adobe After Effects & Premiere Pro extensions (Ghostae Text V2, SFX Studio Pro, 3D Emoji Motion, Subtitle Tools, etc.).

## 🚀 Key Architectural Capabilities

1. **Lovable.dev & Supabase Cloud Integration:**
   - Full PostgreSQL schema with Row-Level Security (RLS) in `packages/supabase-schema/schema.sql`.
   - Real-time catalog push when new products or versions are published in Lovable.
   - Secure temporary signed URLs for downloading encrypted extension packages.
   - Serverless Edge Function for self-updating the desktop app.

2. **Universal Adobe Host Bridge (Localhost WebSocket on port 49815):**
   - Zero-latency bidirectional bridge between Desktop Hub and Adobe After Effects / Premiere Pro (2021–2025+).
   - Atomic Undo Groups in ExtendScript (`app.beginUndoGroup`).
   - 1-Click Apply: Click a preset in the Desktop App and it immediately applies to the active composition timeline.

3. **Automated 1-Click CEP Installer & Registry Configuration:**
   - Detects all installed Adobe applications across Windows and macOS.
   - Automatically enables `PlayerDebugMode = 1` for CSXS.9 to CSXS.15 in the Windows Registry or macOS `defaults`.
   - Unprivileged NTFS Directory Junction (`mklink /J`) and POSIX symlinks to safely link CEP panels into Adobe extension folders without requiring administrator rights.

4. **Modern High-Performance UI:**
   - Linear & Raycast dark-mode minimalism.
   - Virtualized asset catalog capable of rendering 10,000+ presets with zero memory bloat.
   - Debounced video hover previews and single-instance Web Audio API waveform player.

---

## 📂 Project Structure

```text
creative-suite-hub/
├── apps/
│   ├── desktop/                 # Desktop Application (React 19, Vite, Tailwind v3/v4, Electron/Node)
│   │   ├── backend/             # Adobe Scanner, Registry Config, WebSocket Bridge, HWID
│   │   ├── electron/            # Electron native window launcher
│   │   └── src/                 # React UI (Virtualized Grid, Audio Player, TitleBar, Sidebar)
│   └── cep-bridge/              # Universal Headless CEP Extension (installed to Adobe)
│       ├── CSXS/manifest.xml    # Supports AEFT & PPRO 2021 through 2025+
│       ├── client/              # WebSocket client + CSInterface.js
│       └── jsx/                 # ExtendScript engines (ae.jsx, ppro.jsx, dispatcher.jsx)
├── packages/
│   ├── shared-types/            # Shared TypeScript types for IPC and Supabase models
│   └── supabase-schema/         # PostgreSQL schema & Edge Functions for Lovable.dev
```

---

## 🛠️ How to Run & Test

### 1. Test Adobe Scanner & Bridge Engine
```bash
cd apps/desktop
node backend/standalone-server.js
```
This will:
- Generate your system's hardware fingerprint (HWID).
- Scan and detect your installed Adobe apps (e.g., After Effects 2023/2024, Premiere 2024/2025).
- Configure `PlayerDebugMode = 1` across all CSXS registry versions.
- Link `com.creativesuite.hub.bridge` into `%APPDATA%\Adobe\CEP\extensions`.
- Start the WebSocket bridge server on `127.0.0.1:49815`.

### 2. Run the Desktop UI
```bash
cd apps/desktop
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Full Desktop Application (Electron)
```bash
cd apps/desktop
npm run electron:dev
```
