"""Load STITCH_API_KEY from repo root `.env` or the environment."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLACEHOLDER = "REPLACE_WITH_YOUR_STITCH_API_KEY"


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def load_stitch_api_key() -> str:
    env_values = _parse_env_file(ROOT / ".env")
    key = env_values.get("STITCH_API_KEY") or os.environ.get("STITCH_API_KEY", "")
    key = key.strip()

    if not key or key == PLACEHOLDER:
        sys.exit(
            "\nMissing STITCH_API_KEY.\n"
            "1. Copy `.env.example` to `.env`\n"
            "2. Paste your Stitch API key into `.env`\n"
            "3. Restart Cursor\n"
        )

    return key
