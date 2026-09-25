# Ghostae Orbit Agent
## Secure Windows Desktop Execution Agent

**Ghostae Orbit Agent** is a production-ready Windows desktop execution client that connects the Ghostae Orbit server to the user's Windows computer, After Effects, and Premiere Pro.

> [!IMPORTANT]
> **Not an AI brain**: All AI reasoning, natural-language understanding, and task planning reside on the Ghostae Orbit server. This application is a silent, secure, lightweight execution agent.

---

## Architecture

```
Orbit Server (Cloud / Dedicated Host)
       ↓
Outbound TLS / Secure WebSocket
       ↓
Ghostae Orbit Agent (.NET 8 WPF, Windows-Native)
       ↓
Windows APIs  |  Ghost AE Bridge  |  Premiere UXP Bridge
```

- **Outbound Only**: The agent initiates all connections outbound. No inbound ports or port forwarding required.
- **Strict Allowlist**: Rejects arbitrary CMD, PowerShell, shell scripts, or unauthorized executables. Only 8 authorized execution tools are permitted.

---

## 8 V1 Capabilities & Exact Tools

| Tool Name | Parameters / Operations | Description |
|-----------|-------------------------|-------------|
| `desktop_status` | Telemetry query | Returns CPU %, RAM usage, storage volumes, OS version, and Adobe processes. |
| `screenshot` | `target`: `full_screen`, `monitor`, `active_window` | High performance native GDI/DWM screen capture saved to PNG. |
| `screen_record` | `operation`: `start`, `stop`, `status` | Direct video screen capture with live duration and frame counters. |
| `file_manager` | `operation`: `list`, `find`, `copy`, `move`, `rename`, `create_folder` | Bounded file system operations with path traversal guards. |
| `adobe_status` | Live status query | Detects After Effects & Premiere Pro processes, versions, and bridge state. |
| `adobe_project` | `operation`: `open`, `save`, `status` | Direct project control via local IPC bridge protocols. |
| `render` | `operation`: `start`, `status`, `cancel`, `verify` | Multi-step render pipeline with strict 6-point output verification. |
| `power` | `operation`: `shutdown`, `restart`, `cancel_shutdown`, `status` | Server-authorized power controls with render completion guards. |

---

## 6-Point Render Verification Checklist

Before returning `Render Successful`, the agent verifies all 6 criteria:
1. Render engine / bridge signals completion.
2. Output file exists on disk.
3. Output file size is stable across interval checks.
4. Application file handle is released (no lingering write locks).
5. No render errors or exceptions logged.
6. Output path is valid with non-zero byte size.

---

## Visual Design System

- **Clean White + Powerful Red**:
  - Base: White (`#FFFFFF`), light gray (`#F8F9FA`), subtle neutral borders (`#E5E7EB`).
  - Accent: Powerful Red (`#EB0029`) used for active states, primary actions, progress, and highlights.
- **Ratio**: 30% text (short, clear labels), 20% iconography, 50% whitespace & cards.
- **Responsive**: Tested and optimized for 1280×720, 1366×768, 1920×1080, and 2560×1440 resolutions.
- **System Tray**: Silent background minimization with context menu (Open, Status, Pause, Settings, Logs, Quit).

---

## Project Structure

```
Orbit/
├── src/
│   └── Ghostae.Orbit.Agent/       # .NET 8 WPF Windows Desktop Application
│       ├── Models/                # JSON schemas, task state, telemetry
│       ├── Services/              # WebSocket client, task engine, logging, tray
│       ├── Tools/                 # 8 allowlisted tool implementations
│       ├── Bridges/               # Local IPC bridge manager
│       ├── ViewModels/            # MVVM ViewModels
│       ├── Views/                 # WPF Views
│       └── Styles/                # Clean White + Powerful Red theme tokens
├── bridges/
│   ├── ghost-ae-bridge/           # After Effects CEP extension
│   └── premiere-uxp-bridge/       # Premiere Pro UXP plugin
├── tests/
│   └── Ghostae.Orbit.Tests/       # Mock Orbit Server & End-to-End Test Suite
└── dist/
    └── GhostaeOrbitAgent/         # Compiled release binaries
```

---

## Automated Verification Results

The automated test suite runs all unit tests and all 3 required end-to-end workflows:
1. **End-to-End Test 1**: "Render my current Premiere project" → Agent → Premiere → Render → 6-Point Verify → Return Result.
2. **End-to-End Test 2**: "Take a screenshot of my current Premiere window" → Agent → Windows capture → PNG → Return Result.
3. **End-to-End Test 3**: "Render the project and shut down my PC when it finishes" → Agent → Premiere → Render → Verify → Power Guard.

**Test Run Result**: `ALL TESTS PASSED! (24 passed, 0 failed)`
