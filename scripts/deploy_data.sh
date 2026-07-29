#!/usr/bin/env bash
#
# Copy exported phase data (output/) to the EC2 box's nginx data dir.
#
# The frontend is deployed separately by GitHub Actions (writes app/).
# This script is the DATA half: it uploads the phaseN/ folders produced by
# `python scripts/export_indoor_phase.py --phase <phase>` so the live site can
# fetch /data/phaseN/manifest.json. Run it after every export you want live.
#
# Usage:
#   EC2_HOST=1.2.3.4 EC2_USER=ubuntu ./scripts/deploy_data.sh            # deploy
#   EC2_HOST=1.2.3.4 EC2_USER=ubuntu ./scripts/deploy_data.sh --dry-run  # preview
#
# Env:
#   EC2_HOST      (required) server IP / hostname
#   EC2_USER      (required) ssh user, e.g. ubuntu
#   EC2_SSH_KEY   (optional) path to private key file; falls back to your ssh config/agent
#   EC2_DATA_DIR  (optional) remote data dir (default: /var/www/indoor-heat-2026/data)
#
set -euo pipefail

: "${EC2_HOST:?set EC2_HOST (server IP/hostname)}"
: "${EC2_USER:?set EC2_USER (ssh user, e.g. ubuntu)}"
REMOTE_DIR="${EC2_DATA_DIR:-/var/www/indoor-heat-2026/data}"

# Resolve output/ relative to the repo, so this runs from anywhere.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/output"

# Trust boundary: refuse to push a missing/empty export instead of silently
# wiping the live data dir with nothing. Require at least one phase manifest.
if ! ls "$SRC"/*/manifest.json >/dev/null 2>&1; then
  echo "error: no phase manifests under $SRC/*/manifest.json — run the export first" >&2
  exit 1
fi

SSH="ssh -o StrictHostKeyChecking=accept-new"
[ -n "${EC2_SSH_KEY:-}" ] && SSH="$SSH -i $EC2_SSH_KEY"

# ponytail: no --delete — safer to leave phases you didn't re-export in place.
# Add --delete yourself only when you intend data/ to mirror output/ exactly.
# --chmod guarantees nginx (www-data) can read files as "other".
rsync -avz --chmod=D755,F644 "$@" \
  -e "$SSH" \
  "$SRC/" \
  "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"

echo "done: $SRC/ -> ${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"
