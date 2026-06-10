# EC2 Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the student React dashboard from its nested location into `frontend/`, replace the GitHub Pages CI with an EC2 rsync deploy, and add a `services/data.ts` data layer ready to consume Dagster-exported JSON.

**Architecture:** Flatten the repo so `frontend/` is the Vite app root. Two independent CI workflows: MkDocs → GitHub Pages (unchanged), Vite → EC2 (new). A single `services/data.ts` module handles all data fetching via the manifest pattern. Component wiring to real data is deferred until Dagster schema is confirmed.

**Tech Stack:** React 18, Vite 5, TypeScript, Vitest (added), Nginx, GitHub Actions, rsync over SSH.

**Spec:** `docs/superpowers/specs/2026-06-09-ec2-deployment-design.md`

---

## File Map

| Action | Path |
|---|---|
| Move (from) | `frontend/indoor-heat-project/frontend/**` |
| Move (to) | `frontend/**` |
| Create dir | `source/` |
| Move source materials | `frontend/indoor-heat-project/W4_*.pdf` → `source/` |
| Move source materials | `frontend/indoor-heat-project/*.pdf`, `*.xlsx`, `*.jpg`, `requirements.txt`, `scripts/` → `source/` |
| Delete | `frontend/README.md` (outdated Next.js placeholder) |
| Modify | `.github/workflows/deploy.yml` (strip Next.js block, keep MkDocs) |
| Create | `.github/workflows/deploy-frontend.yml` |
| Modify | `frontend/package.json` (add test script) |
| Modify | `frontend/vite.config.ts` (add vitest config) |
| Create | `frontend/src/services/data.ts` |
| Create | `frontend/src/services/data.test.ts` |

---

## Task 1: Restructure the repository

Move the React app from its nested location to `frontend/`. Move source materials to `source/`.

**Files:**
- Move: `frontend/indoor-heat-project/frontend/` → `frontend/`
- Create: `source/`

- [ ] **Step 1: Move the React app contents up to `frontend/`**

Run from the repo root:

```bash
git mv frontend/indoor-heat-project/frontend/src frontend/src
git mv frontend/indoor-heat-project/frontend/public frontend/public
git mv frontend/indoor-heat-project/frontend/index.html frontend/index.html
git mv frontend/indoor-heat-project/frontend/package.json frontend/package.json
git mv frontend/indoor-heat-project/frontend/package-lock.json frontend/package-lock.json
git mv frontend/indoor-heat-project/frontend/postcss.config.js frontend/postcss.config.js
git mv frontend/indoor-heat-project/frontend/tailwind.config.js frontend/tailwind.config.js
git mv frontend/indoor-heat-project/frontend/tsconfig.json frontend/tsconfig.json
git mv frontend/indoor-heat-project/frontend/vite.config.ts frontend/vite.config.ts
git mv frontend/indoor-heat-project/frontend/.npmrc frontend/.npmrc
```

- [ ] **Step 2: Create `source/` and move reference materials**

```bash
mkdir -p source
git mv frontend/indoor-heat-project/W4_1.pdf source/
git mv frontend/indoor-heat-project/W4_2.pdf source/
git mv frontend/indoor-heat-project/W4_3.pdf source/
git mv frontend/indoor-heat-project/W4_4.pdf source/
git mv frontend/indoor-heat-project/W4_5.pdf source/
git mv frontend/indoor-heat-project/W4_6.pdf source/
git mv frontend/indoor-heat-project/W4_7.pdf source/
git mv "frontend/indoor-heat-project/Dashboard sketch.pdf" source/
git mv "frontend/indoor-heat-project/Right sensor 2026-05-03 00_36_52 EDT (Data EDT).xlsx" source/
git mv frontend/indoor-heat-project/sky_mccorm.jpg source/
git mv frontend/indoor-heat-project/requirements.txt source/
git mv frontend/indoor-heat-project/scripts source/
git mv frontend/indoor-heat-project/README.md source/
```

- [ ] **Step 3: Remove the outdated placeholder README and now-empty directory**

```bash
git rm frontend/README.md
# indoor-heat-project/ should now be empty
rmdir frontend/indoor-heat-project 2>/dev/null || git rm -r frontend/indoor-heat-project
```

- [ ] **Step 4: Verify the new structure looks correct**

```bash
ls frontend/
```

Expected output includes: `index.html  package.json  postcss.config.js  public/  src/  tailwind.config.js  tsconfig.json  vite.config.ts`

```bash
ls frontend/public/floorplans/
```

Expected: `floor-1.png  floor-2.png  floor-3.png  floor-4.png  floor-5.png  floor-6.png  floor-7.png`

```bash
ls source/
```

Expected: PDF files, xlsx, scripts/, README.md

- [ ] **Step 5: Commit the restructure**

```bash
git add -A
git commit -m "refactor: lift React app to frontend/, move source materials to source/"
```

---

## Task 2: Verify the build works in its new location

Confirm `npm run build` succeeds from `frontend/` before touching CI.

**Files:**
- No file changes — verification only

- [ ] **Step 1: Install dependencies**

```bash
npm ci --prefix frontend
```

Expected: packages installed, no errors. If SSL error on your network, the `.npmrc` with `node-options=--use-system-ca` handles it automatically.

- [ ] **Step 2: Run the build**

```bash
npm run build --prefix frontend
```

Expected:
```
vite v5.x.x building for production...
✓ N modules transformed.
dist/index.html          x.xx kB
dist/assets/index-[hash].js   xxx.xx kB
✓ built in x.xxs
```

`dist/` will appear under `frontend/dist/`. TypeScript errors will surface here if any — fix them before continuing.

- [ ] **Step 3: Confirm dist output**

```bash
ls frontend/dist/
```

Expected: `assets/  floorplans/  index.html  sky_mccorm.jpg`

---

## Task 3: Update CI workflows

Strip the Next.js block from `deploy.yml` (MkDocs only). Create a new `deploy-frontend.yml` for EC2.

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `.github/workflows/deploy-frontend.yml`

- [ ] **Step 1: Strip the Next.js block from `deploy.yml`**

Open `.github/workflows/deploy.yml`. Replace the entire `Build Next.js static export` step with nothing. The result should be:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up uv
        uses: astral-sh/setup-uv@v5
        with:
          enable-cache: true
          python-version: "3.11"

      - name: Install Python dependencies
        run: uv sync --frozen

      - name: Build MkDocs site
        run: uv run mkdocs build --strict

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: "./site"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create `.github/workflows/deploy-frontend.yml`**

```yaml
name: Deploy Frontend to EC2

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  workflow_dispatch:

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

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
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

- [ ] **Step 3: Add the three GitHub secrets**

In the GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `EC2_SSH_KEY` | Contents of the private key file used to SSH into EC2 (the full PEM/RSA key, including `-----BEGIN...` and `-----END...` lines) |
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH login user (e.g. `ubuntu`) |

- [ ] **Step 4: Commit the workflow changes**

```bash
git add .github/workflows/deploy.yml .github/workflows/deploy-frontend.yml
git commit -m "ci: replace Next.js GitHub Pages deploy with Vite EC2 rsync deploy"
```

---

## Task 4: EC2 one-time setup

Manual steps on the EC2 host. Run once; nothing in this repo automates them.

**Files:** None — EC2 configuration only.

- [ ] **Step 1: Create the web root directories**

SSH into EC2, then:

```bash
sudo mkdir -p /var/www/indoor-heat-2026/app
sudo mkdir -p /var/www/indoor-heat-2026/data
sudo chown -R ubuntu:www-data /var/www/indoor-heat-2026/app
sudo chmod -R 755 /var/www/indoor-heat-2026/app
sudo chmod 755 /var/www/indoor-heat-2026/data
```

Replace `ubuntu` with the actual SSH deploy user if different.

- [ ] **Step 2: Write the Nginx server block**

Create `/etc/nginx/sites-available/indoor-heat-2026`:

```nginx
server {
    listen 8080;
    root /var/www/indoor-heat-2026/app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /data/ {
        alias /var/www/indoor-heat-2026/data/;
        add_header Cache-Control "no-cache";
    }

    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(png|jpg|ico|woff2?)$ {
        expires 7d;
    }
}
```

- [ ] **Step 3: Enable the site and reload Nginx**

```bash
sudo ln -s /etc/nginx/sites-available/indoor-heat-2026 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Expected from `nginx -t`: `syntax is ok` and `test is successful`

- [ ] **Step 4: Update Dagster docker-compose.yml (other repo)**

Add the volume mount to the Dagster service so it writes to the correct host path:

```yaml
services:
  dagster:
    volumes:
      - /var/www/indoor-heat-2026/data:/opt/dagster/output
```

The exact service name and path inside the container (`/opt/dagster/output`) may differ — match what your Dagster asset uses as its output directory.

---

## Task 5: Add Vitest and implement `services/data.ts`

TDD. Write the failing tests first, then implement.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/services/data.test.ts`
- Create: `frontend/src/services/data.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest jsdom --prefix frontend
```

- [ ] **Step 2: Add test config to `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to `frontend/package.json`**

`npm install --save-dev` from Step 1 already added `vitest` and `jsdom` to `devDependencies`. Only the `scripts` block needs a manual edit — add the `"test"` line:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run"
},
```

- [ ] **Step 4: Create `frontend/src/services/data.test.ts` (failing tests first)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadReadings, type SensorReading } from './data';

const mockManifest = {
  generated_at: '2026-06-09T12:00:00Z',
  files: {
    readings: '/data/readings_20260609T120000Z.json',
  },
};

const mockReadings: SensorReading[] = [
  { room: '304', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 78.2, humidity_pct: 65 },
  { room: '309', floor: 3, timestamp: '2026-06-09T12:00:00Z', temperature_f: 76.1, humidity_pct: 62 },
];

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('loadReadings', () => {
  it('fetches manifest then readings and returns the array', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockManifest })
      .mockResolvedValueOnce({ ok: true, json: async () => mockReadings }),
    );

    const result = await loadReadings();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/data/manifest.json');
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe('/data/readings_20260609T120000Z.json');
    expect(result).toEqual(mockReadings);
  });

  it('throws with "manifest <status>" when manifest fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }),
    );

    await expect(loadReadings()).rejects.toThrow('manifest 404');
  });

  it('throws with "readings <status>" when data file fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockManifest })
      .mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    await expect(loadReadings()).rejects.toThrow('readings 500');
  });
});
```

- [ ] **Step 5: Run the tests — confirm they fail**

```bash
npm test --prefix frontend
```

Expected: 3 failures — `loadReadings` is not defined yet.

- [ ] **Step 6: Create `frontend/src/services/data.ts`**

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
  const manifestRes = await fetch('/data/manifest.json');
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest: Manifest = await manifestRes.json();

  const readingsRes = await fetch(manifest.files.readings);
  if (!readingsRes.ok) throw new Error(`readings ${readingsRes.status}`);
  return readingsRes.json();
}
```

> **Note:** `SensorReading` field names are a stub matching the shape described in the spec. Finalize once the Dagster export schema is confirmed in the other session. Update both this file and `data.test.ts` together when the schema is known.

- [ ] **Step 7: Run the tests — confirm they pass**

```bash
npm test --prefix frontend
```

Expected:
```
 ✓ src/services/data.test.ts (3)
   ✓ loadReadings > fetches manifest then readings and returns the array
   ✓ loadReadings > throws with "manifest <status>" when manifest fetch fails
   ✓ loadReadings > throws with "readings <status>" when data file fetch fails

 Test Files  1 passed (1)
 Tests       3 passed (3)
```

- [ ] **Step 8: Confirm the build still passes**

```bash
npm run build --prefix frontend
```

Expected: no TypeScript errors, `dist/` produced.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/services/ frontend/package.json frontend/vite.config.ts frontend/package-lock.json
git commit -m "feat: add services/data.ts with manifest loading and Vitest"
```

---

## Out of Scope (future plan)

Component wiring — updating `FloorView.tsx` and `RoomPopup.tsx` to call `loadReadings()` instead of importing from `mockData.ts` — is deferred until the Dagster export schema is confirmed. That work gets its own plan once the field names are locked.
