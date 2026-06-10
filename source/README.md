# Indoor Heat Project — MITOS Dashboard

A research dashboard for the **MIT Indoor Heat Study** at Stanley McCormick Hall (Building W4). Hobo temperature and humidity sensors are deployed in West Tower dorm rooms. The dashboard lets you explore per-room thermal data, visualize intervention outcomes, and compare rooms against indoor control and outdoor courtyard readings — all layered over interactive building floor plans.

**Repository:** [github.com/vivi050607/test-repo](https://github.com/vivi050607/test-repo)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Architecture](#project-architecture)
3. [Using the Dashboard](#using-the-dashboard)
4. [UI Overview](#ui-overview)
5. [Codebase Structure](#codebase-structure)
6. [Configuration](#configuration)

---

## Quick Start

### Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org) — includes npm |
| Python | v3.9+ | For the one-time PDF → PNG conversion |

### 1. Clone the repository

```bash
git clone https://github.com/vivi050607/test-repo.git
cd test-repo
```

### 2. Set up Python and generate floor plans

Floor plan PNGs are generated from the source PDFs and are not committed to the repo. Create a virtual environment, install dependencies, and run the conversion script once:

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python scripts/pdf_to_png.py
```

This reads `W4_1.pdf` through `W4_7.pdf` and writes `frontend/public/floorplans/floor-1.png` through `floor-7.png` at 2× resolution (2448×1584 px each).

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

If `npm install` fails with an SSL certificate error on your network, the project includes `frontend/.npmrc` with `node-options=--use-system-ca` to work around it.

### 4. Start the development server

```bash
npm run dev
```

Open **http://localhost:5173**. The server hot-reloads on file saves.

### 5. Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`. Deploy that folder to any static host (Netlify, Vercel, GitHub Pages, etc.).

### Cursor / VS Code

The workspace is configured in `.vscode/settings.json` to activate the `.venv` Python environment and prepend Node.js to the terminal `PATH`. Open a new terminal after cloning so those settings take effect.

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                        │
│                                                             │
│  Landing page          Floor view           Room popup      │
│  (sky_mccorm.jpg)  →   (floor plan PNG  →   (stats +        │
│  + floor buttons       + sensor nodes)      chart +         │
│                                             interventions)  │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Routing | React Router v6 |
| PDF conversion | PyMuPDF (one-shot Python script) |

Sensor readings are currently **mock data** in `frontend/src/data/mockData.ts`. Instrumented rooms are on floors **3, 5, and 7** only.

---

## Using the Dashboard

1. Open **http://localhost:5173** (or your deployed URL).
2. On the **landing page**, click a floor button (1–7) over the McCormick Hall photo.
3. On the **floor view**, colored nodes mark instrumented West Tower rooms (floors 3, 5, and 7 have sensors; other floors show the plan with no nodes).
4. **Hover** a node for room number and average temperature.
5. **Click** a node to open the room popup with stats, interventions, and a temperature chart.
6. Use **← All floors** in the sidebar to return to the landing page.

### Instrumented rooms

| Floor | Rooms |
|-------|-------|
| 3 | 304, 309, 314 |
| 5 | 504, 514 |
| 7 | 704, 709, 714 |

---

## UI Overview

### Landing page

- Full-bleed aerial photo of McCormick Hall (`sky_mccorm.jpg`).
- Floor buttons (1–7) positioned over the right tower.
- Footer: "Click a floor to explore sensor readings."

### Floor view

```
┌──────────────────────┬──────────────────────────────────────────┐
│  SIDE PANEL (left)   │  FLOOR PLAN CANVAS (right)               │
│                      │                                          │
│  ← All floors        │  [W4 floor plan PNG]                     │
│  Floor 5             │    ●  504  (red — hottest)               │
│  West Tower          │    ●  514  (blue — coolest)              │
│  FLOOR AVERAGES      │                                          │
│  Tip + color legend  │  red → purple → blue                     │
└──────────────────────┴──────────────────────────────────────────┘
```

**Node color scale:** red = hottest on the floor, purple = mid-range, blue = coolest. The scale is normalized per floor so relative differences are easy to see.

**Node placement:** Each node sits just above its room label using `(xNorm, yNorm)` coordinates in `rooms.ts`. A `ResizeObserver` keeps nodes aligned with the floor plan at any viewport size.

### Room popup

Overlays the East Tower half of the plan and shows room stats, intervention cards, and a 3-line temperature chart (room, indoor control, courtyard).

---

## Codebase Structure

```
test-repo/
│
├── W4_1.pdf – W4_7.pdf        Source floor plan PDFs
├── sky_mccorm.jpg              Landing page hero image
├── requirements.txt            Python deps (PyMuPDF)
├── scripts/
│   └── pdf_to_png.py           PDF → PNG conversion
│
├── frontend/
│   ├── public/
│   │   ├── sky_mccorm.jpg
│   │   └── floorplans/         Generated PNGs (git-ignored)
│   ├── src/
│   │   ├── pages/              Landing.tsx, FloorView.tsx
│   │   ├── components/         SidePanel, RoomNode, RoomPopup, chart
│   │   ├── config/             floors.ts, rooms.ts
│   │   ├── data/               mockData.ts
│   │   └── lib/                colorScale.ts, useElementSize.ts
│   └── .npmrc                  Node SSL workaround (if needed)
│
└── .vscode/                    Workspace terminal + Python settings
```

---

## Configuration

### Adding or moving a sensor room

Edit [`frontend/src/config/rooms.ts`](frontend/src/config/rooms.ts). Each entry needs a room number, floor, orientation, and normalized position:

```ts
room(506, 5, { xNorm: 0.314, yNorm: 0.377 }, "South-east facing"),
```

`xNorm` and `yNorm` are fractions of the floor plan image (0 = left/top, 1 = right/bottom). `yNorm` should target the center of the room label; the node renders above it. Adjust values and hot-reload to fine-tune placement.

### Adjusting floor buttons on the landing page

Edit `buttonX` / `buttonY` in [`frontend/src/config/floors.ts`](frontend/src/config/floors.ts).

### Changing the color scale

[`frontend/src/lib/colorScale.ts`](frontend/src/lib/colorScale.ts) maps temperature to **blue → purple → red**. Per-floor min/max is computed in `FloorView.tsx`.

### Swapping the landing page photo

Replace `frontend/public/sky_mccorm.jpg` with any image using the same filename.

---

*MIT MITOS Indoor Heat Project · West Tower, Stanley McCormick Hall (Building W4)*
