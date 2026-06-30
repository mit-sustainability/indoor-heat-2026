"""Launch stitch-mcp-stdio with STITCH_API_KEY loaded from `.env`."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from env_loader import load_stitch_api_key  # noqa: E402


def main() -> None:
    key = load_stitch_api_key()
    npx = shutil.which("npx")
    if not npx:
        sys.exit("npx not found — install Node.js to use the Stitch MCP server.")

    env = os.environ.copy()
    env["STITCH_API_KEY"] = key

    subprocess.run(
        [npx, "-y", "stitch-mcp-stdio"],
        env=env,
        cwd=ROOT,
        check=True,
    )


if __name__ == "__main__":
    main()
