# EC2 Deployment Design: Static Frontend + Dagster Data Pipeline

**Date:** 2026-06-09
**Branch:** integration
**Status:** Approved

---

## Goal

Serve the student-built React dashboard on an existing EC2 instance using Nginx. Data is refreshed weekly by existing Dagster jobs (deployed via docker-compose) and exported as static JSON files. No browser-to-Postgres connection. No API layer. No Docker for the frontend. No S3.

---

## Architecture

```
Dropbox / source files
  ↓
Dagster ingest + clean  (docker-compose on EC2, separate repo)
  ↓
Postgres internal tables/views
  ↓
Dagster export asset → writes versioned JSON + manifest.json
  ↓
/var/www/student-app/data/   (Docker volume mount → host path)
  ↓
Nginx (specific port, e.g. 8080)
  ↓
Browser fetches /data/manifest.json → versioned data files
```

---

## Repository Restructure

The student's React app is currently nested at `frontend/indoor-heat-project/frontend/`. Floor plan PNGs are already generated and present. The restructure lifts the app to `frontend/` and moves source materials out of the build path.

### Target layout (this repo)

```
indoor-heat-2026/
├── frontend/                        ← Vite app root (package.json lives here)
│   ├── public/
│   │   ├── sky_mccorm.jpg
│   │   └── floorplans/              ← floor-1.png … floor-7.png (committed)
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── data/                    ← mockData.ts (replaced in data wiring phase)
│   │   ├── lib/
│   │   ├── pages/
│   │   └── services/
│   │       └── data.ts              ← NEW: manifest loading service
│   ├── package.json
│   └── vite.config.ts
├── source/                          ← reference materials, never deployed
│   ├── W4_1.pdf … W4_7.pdf
│   ├── Dashboard sketch.pdf
│   ├── Right sensor …xlsx
│   └── pdf_to_png.py                ← kept for reference, PNGs are committed
├── docs/                            ← MkDocs source (GitHub Pages, unchanged)
└── .github/workflows/
    └── deploy-frontend.yml          ← replaces existing GitHub Pages workflow
```

**Floor plan PNGs:** Already generated. Committed to `frontend/public/floorplans/`. The PDF → PNG conversion step is eliminated from CI entirely.

**MkDocs:** Stays on GitHub Pages at `mit-sustainability.github.io/indoor-heat-2026/`. Unaffected by this deployment.

---

## EC2 Directory Layout

```
/var/www/indoor-heat-2026/
├── app/      ← frontend build, written by GitHub Actions via rsync
│   ├── index.html
│   ├── assets/           ← Vite-hashed JS/CSS bundles
│   └── floorplans/       ← floor-1.png … floor-7.png
└── data/     ← written exclusively by Dagster via Docker volume mount
    ├── manifest.json
    ├── readings_20260609T120000Z.json
    └── readings_20260616T120000Z.json
```

**Invariant:** `app/` and `data/` are sibling directories. GitHub Actions only touches `app/`. Dagster only touches `data/`. Neither can clobber the other.

---

## Nginx Configuration

Served on a dedicated port (e.g. 8080). Key behaviors: React Router requires `try_files`; `/data/` is aliased to the Dagster-written sibling directory.

```nginx
server {
    listen 8080;
    root /var/www/indoor-heat-2026/app;
    index index.html;

    # React Router: non-file URLs return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Data files: served from Dagster's directory
    location /data/ {
        alias /var/www/indoor-heat-2026/data/;
        add_header Cache-Control "no-cache";
    }

    # Vite-hashed JS/CSS: content-addressed, cache forever
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Images and fonts: cache one week
    location ~* \.(png|jpg|ico|woff2?)$ {
        expires 7d;
    }
}
```

### Cache strategy

| Resource | Header | Rationale |
|---|---|---|
| `manifest.json` | `no-cache` | Always revalidate; tiny (~200 bytes) |
| Versioned data files | `no-cache` | Filename changes with each write anyway |
| JS/CSS bundles | `public, immutable, 1y` | Vite embeds content hash in filename |
| PNGs/images | `7d` | Static assets, never change |

---

## Permissions

Dagster container runs as `uid=0 (root)`. Files written via the volume mount land on the host as `root:root 644`. Nginx (`www-data`) reads them as "other."

### One-time setup on EC2

```bash
sudo mkdir -p /var/www/indoor-heat-2026/app
sudo mkdir -p /var/www/indoor-heat-2026/data
sudo chmod 755 /var/www/indoor-heat-2026/data

# app/ owned by the deploy SSH user so rsync can write
sudo chown -R ubuntu:www-data /var/www/indoor-heat-2026/app
sudo chmod -R 755 /var/www/indoor-heat-2026/app
```

### Dagster docker-compose.yml (other repo)

```yaml
services:
  dagster:
    volumes:
      - /var/www/indoor-heat-2026/data:/opt/dagster/output
```

Dagster writes to `/opt/dagster/output/` inside the container; files appear at `/var/www/indoor-heat-2026/data/` on the host.

---

## GitHub Actions Workflow

Replaces the existing GitHub Pages + Next.js workflow. Triggers on pushes to `main` that touch `frontend/**`. Builds Vite, rsyncs `dist/` to `/var/www/indoor-heat-2026/app/` via SSH.

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
        working-directory: frontend

      - run: npm run build
        working-directory: frontend

      - name: Deploy to EC2
        run: |
          echo "${{ secrets.EC2_SSH_KEY }}" > /tmp/deploy_key
          chmod 600 /tmp/deploy_key
          rsync -avz --delete \
            -e "ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no" \
            frontend/dist/ \
            ${{ secrets.EC2_USER }}@${{ secrets.EC2_HOST }}:/var/www/indoor-heat-2026/app/
          rm /tmp/deploy_key
```

### GitHub secrets required

| Secret | Value |
|---|---|
| `EC2_SSH_KEY` | Private SSH key for the deploy user |
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH user (e.g. `ubuntu`) |

The `--delete` flag removes stale hashed bundles from previous deploys so `app/` does not grow unbounded.

---

## Frontend Data Layer

### `src/services/data.ts` (new file)

Single point of entry for all data. Components stop importing from `mockData.ts` and call this instead.

```typescript
interface Manifest {
  generated_at: string;
  files: {
    readings: string;
  };
}

export interface SensorReading {
  room: string;
  floor: number;
  timestamp: string;
  temperature_f: number;
  humidity_pct: number;
}

export async function loadReadings(): Promise<SensorReading[]> {
  const manifest: Manifest = await fetch('/data/manifest.json')
    .then(r => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json(); });

  return fetch(manifest.files.readings)
    .then(r => { if (!r.ok) throw new Error(`readings ${r.status}`); return r.json(); });
}
```

The `SensorReading` shape is a stub. Finalize field names once the Dagster export schema is defined in the other session.

### Wiring

`FloorView.tsx` and `RoomPopup.tsx` currently import from `src/data/mockData.ts`. They will be updated to call `loadReadings()` in a `useEffect` with loading and error state. This is implementation work scoped to the data-wiring phase, after the Dagster schema is known.

---

## Dagster Contract (other repo)

Two requirements this repo depends on from the Dagster side:

1. **Write order:** Dagster writes `readings_<ISO8601>.json` first, then atomically replaces `manifest.json`. Never the reverse. This guarantees a reader always finds what the manifest points to.

2. **Retention:** Dagster deletes the superseded versioned file when writing a new one (or keeps the last 2 for a one-week rollback window). Without this, `data/` accumulates ~52 files per dataset per year.

---

## Out of Scope

- MkDocs / GitHub Pages (unchanged)
- Dagster asset implementation (separate repo and session)
- Docker packaging of the frontend
- S3 or CDN
- API layer
- Authentication / access control
