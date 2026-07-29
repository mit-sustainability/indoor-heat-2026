# Indoor Heat 2026 — MITOS Dashboard

Static dashboard for the MIT Indoor Heat Study at Stanley McCormick Hall (Building W4).
The frontend is a presentation-only React/Vite app; all data processing happens upstream
in the Python export script, which reads sensor files from Dropbox and writes versioned
JSON per study phase.

```
Dropbox sensor files
  → scripts/export_indoor_phase.py   (clean, bin, compute heat index, flag skips)
  → output/<phase>/manifest.json + readings_*.json (+ optional metadata.json)
  → frontend reads /data/<phase>/manifest.json
```

Phases: `phase1`–`phase4`, `heat_event`.

---

## Frontend — local dev

```bash
cd frontend
npm install
npm run dev:local      # serves the real phase data in ../output at /data
```

Open **http://localhost:5173**.

> **Use `npm run dev:local`, not `npm run dev`.** `dev:local` sets `DATA_DIR=../output`,
> so the dev server serves the exported phase folders (`output/phase1/…`, etc.) at `/data`.
> Plain `npm run dev` only serves `frontend/public/data/`, which does **not** contain the
> phase data — the app will fail to load readings and show no selectable floors.

Other scripts: `npm run build` (production build to `frontend/dist/`), `npm run test`
(vitest).

---

## Exporting phase data

Regenerate a phase's JSON from the Dropbox source files. Requires Dropbox app
credentials in the environment (`DROPBOX_REFRESH_TOKEN`, `DROPBOX_APP_KEY`,
`DROPBOX_APP_SECRET`) and Python deps `pandas numpy openpyxl dropbox`.

```bash
python scripts/export_indoor_phase.py --phase phase3
```

Writes `output/phase3/manifest.json`, `readings_*.json`, and `readings.csv`. Per-room
skip windows and node positions come from each phase's config (see the script's `PHASES`
table). Tests: `pytest scripts/test_export_indoor_phase.py`.

---

## Deployment

Two independent tracks — they write sibling directories on the server and never clobber
each other:

| | What | How |
|---|---|---|
| **Frontend** (`app/`) | The built React app | **Automatic.** GitHub Actions (`.github/workflows/deploy-frontend.yml`) builds Vite and rsyncs `frontend/dist/` to `/var/www/indoor-heat-2026/app/` on every push to `main` touching `frontend/**`. |
| **Data** (`data/`) | The exported phase JSON | **Manual.** Run `scripts/deploy_data.sh` after each export you want live. |

### `scripts/deploy_data.sh`

Uploads `output/` to `/var/www/indoor-heat-2026/data/` on the EC2 box, preserving the
`<phase>/` subfolders the nginx `/data/` alias expects.

```bash
# preview what would transfer (recommended first)
EC2_HOST=<ip> EC2_USER=ubuntu ./scripts/deploy_data.sh --dry-run

# then upload for real
EC2_HOST=<ip> EC2_USER=ubuntu ./scripts/deploy_data.sh
```

| Env var | Required | Default |
|---|---|---|
| `EC2_HOST` | yes | — |
| `EC2_USER` | yes | — |
| `EC2_SSH_KEY` | no | your ssh config / agent |
| `EC2_DATA_DIR` | no | `/var/www/indoor-heat-2026/data` |

Behavior:
- Refuses to run if `output/` has no phase manifests (won't push an empty/half-baked export).
- Sets `--chmod=D755,F644` so nginx (`www-data`) can read the files.
- **No `--delete`** — phases you didn't re-export are left in place. Pass `--delete`
  explicitly only when you intend `data/` to mirror `output/` exactly.
- Extra arguments (e.g. `--dry-run`) pass through to `rsync`.

See `docs/superpowers/specs/2026-06-09-ec2-deployment-design.md` for the full server
layout, nginx config, and one-time EC2 setup.
