"""
Convert a Postgres-exported sensor CSV to the versioned JSON + manifest format
expected by the indoor-heat dashboard.

Usage:
    python csv_to_json.py <input.csv> [--out-dir ./output]

Output:
    <out-dir>/readings_<YYYYMMDDTHHMMSSZ>.json
    <out-dir>/manifest.json

Column mapping (CSV → JSON):
    sensor_id              → room          (string)
    datetime_edt           → timestamp     (EDT → UTC ISO 8601)
    temperature_f          → temperature_f (float, 3 dp)
    relative_humidity_pct  → humidity_pct  (float, 3 dp)
    dew_point_f            → dew_point_f   (float, 3 dp)
    heat_index_f           → heat_index_f  (float, 3 dp)
    floor                  → floor         (int)
    orientation            → orientation   (string)
    window_state           → window_state  (string)
    blinds_state           → blinds_state  (string)
"""

import argparse
import csv
import json
import os
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

EDT = timezone(timedelta(hours=-4))


def parse_edt(raw: str) -> str:
    """Parse 'YYYY-MM-DD HH:MM:SS.mmm' (EDT) and return UTC ISO 8601 string."""
    dt_edt = datetime.strptime(raw.strip(), "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=EDT)
    return dt_edt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def round3(value: str) -> float:
    return round(float(value), 3)


def convert_row(row: dict) -> dict:
    return {
        "room":          row["sensor_id"],
        "floor":         int(float(row["floor"])) if row["floor"] else None,
        "timestamp":     parse_edt(row["datetime_edt"]),
        "temperature_f": round3(row["temperature_f"]),
        "humidity_pct":  round3(row["relative_humidity_pct"]),
        "dew_point_f":   round3(row["dew_point_f"]),
        "heat_index_f":  round3(row["heat_index_f"]),
        "orientation":   row["orientation"],
        "window_state":  row["window_state"],
        "blinds_state":  row["blinds_state"],
    }


def write_atomic(path: Path, content: str) -> None:
    """Write content to a temp file then rename (atomic on Linux/macOS)."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        os.chmod(tmp, 0o644)
        Path(tmp).rename(path)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def main(csv_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Read and convert
    with csv_path.open(newline="") as f:
        rows = [
            convert_row(r)
            for r in csv.DictReader(f)
            if r.get("sensor_id")  # skip blank/metadata rows
        ]

    print(f"Converted {len(rows)} rows from {len({r['room'] for r in rows})} sensors")

    # Versioned filename — use now() UTC for the export timestamp
    export_ts = datetime.now(timezone.utc)
    filename = f"readings_{export_ts.strftime('%Y%m%dT%H%M%SZ')}.json"
    data_path = out_dir / filename

    # Step 1: write data file
    write_atomic(data_path, json.dumps(rows, indent=2))
    print(f"Wrote {data_path}")

    # Step 2: delete previous versioned files (keep this one only)
    for old in out_dir.glob("readings_*.json"):
        if old != data_path:
            old.unlink()
            print(f"Removed old {old.name}")

    # Step 3: write manifest (atomic, always last)
    manifest = {
        "generated_at": export_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "files": {
            "readings": f"/data/{filename}",
        },
    }
    write_atomic(out_dir / "manifest.json", json.dumps(manifest, indent=2))
    print(f"Wrote manifest.json → /data/{filename}")

    # Spot-check
    print("\nSample records:")
    for r in rows[:3]:
        print(" ", json.dumps(r))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Exported CSV file")
    parser.add_argument("--out-dir", type=Path, default=Path("./output"),
                        help="Output directory (default: ./output)")
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"Error: {args.csv} not found", file=sys.stderr)
        sys.exit(1)

    main(args.csv, args.out_dir)
