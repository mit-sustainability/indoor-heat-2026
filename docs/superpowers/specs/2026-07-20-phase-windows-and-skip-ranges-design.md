# Phase Window Precision + Per-Room Skip Ranges

**Date:** 2026-07-20
**Branch:** integration
**Status:** Approved

---

## Goal

Two related fixes to `scripts/export_indoor_phase.py`'s date handling:

1. Replace the coarse, midnight-only phase `start`/`end` boundaries with the actual sensor deploy/retrieve timestamps, so we're not silently dropping (or wrongly including) hours of real data at phase transitions.
2. Give individual sensors a way to be flagged as "disrupted" for a specific window within a phase (e.g. a room got locked, a fan was left on) — without dropping any rows from the export. The frontend hides flagged points from charts and excludes them from stats; the underlying JSON/CSV always keeps every reading.

Both changes only touch the backend export script and the frontend's read side (`services/data.ts`, `services/transform.ts`). No change to how Dagster/Dropbox/HOBO/Kestrel files are read.

---

## 1. Phase window boundaries

`PHASES` in `scripts/export_indoor_phase.py` currently uses date-only strings (implicitly midnight):

```python
"phase3": {
    ...
    "start": "2026-06-18",
    "end": "2026-06-22",  # exclusive; Jun 17 skipped (no furniture removal/night flush)
    "exclude_dates": [],
},
```

`pd.Timestamp(cfg["start"])` / `pd.Timestamp(cfg["end"])` already handle full ISO datetimes, so no filtering logic changes — only the config values change, to the confirmed actual deploy/retrieve times:

| Phase | start | end |
|---|---|---|
| phase1 | `2026-06-03T17:00` | `2026-06-10T15:00` |
| phase2 | `2026-06-10T17:00` | `2026-06-15T15:00` |
| phase3 | `2026-06-15T17:00` | `2026-06-22T09:00` |
| phase4 | `2026-06-23T17:00` | `2026-06-25T09:00` |
| heat_event | `2026-06-30T17:00` | `2026-07-06T14:00` |

Phase 3's old `# Jun 17 skipped (no furniture removal/night flush)` comment and blanket day exclusion is removed — the disruption it was covering for is superseded by the per-room skip-range mechanism below, which is more precise (room-specific, not a phase-wide day drop, since not every room in Phase 3 had the same disruption).

The `exclude_dates` field/mechanism in `run_phase` is left in place (unused by any phase currently, but harmless to keep as a general phase-wide escape hatch).

---

## 2. Per-room skip ranges

### Config schema

One optional skip window per sensor, per phase:

- **JSON config** (phase1–4, read by `_load_sensor_metadata`): `"skip_start"` / `"skip_end"` keys alongside the existing `floor`/`orientation`/`node_x` fields on a sensor's entry. ISO datetime strings.
- **CSV config** (heat_event, read by `_load_heat_event_config`): `"Skip Start"` / `"Skip End"` columns, following the same `"Node X"`/`"Node Y"` precedent. Blank for rooms with no disruption.

Both are parsed with `pd.to_datetime(..., errors="coerce")`, so a missing/blank value becomes `NaT` and never matches.

### Row-level flagging

After `merged = aligned.merge(config_df, on="sensor_id", how="left")`, compute:

```python
merged["skipped"] = (
    merged["skip_start"].notna() & merged["skip_end"].notna()
    & (merged["datetime_edt"] >= merged["skip_start"])
    & (merged["datetime_edt"] < merged["skip_end"])
)
```

`datetime_edt` at this point is already the 20-minute-binned timestamp from `_normalize`, so the comparison happens at the same granularity as the exported readings.

### Output

- `_write_phase_export`: `if row.get("skipped"): rec["skipped"] = True` — conditionally included per record, matching the existing sparse-field convention (`wbgt_f`, `node_x`, `node_y`). Most rows never carry this key.
- CSV (`merged.to_csv`): `skipped` is a plain boolean column on every row, since CSV output isn't size-constrained the way the browser payload is — full transparency for offline analysis.
- **No rows are ever dropped.** This is the core requirement — skip ranges differ room to room, and dropping rows at the backend would make it impossible to reconsider a boundary later without re-running the export.

---

## 3. Frontend consumption

- `frontend/src/services/data.ts`: `SensorReading` gains `skipped?: boolean`.
- `frontend/src/services/transform.ts`: `transformReadings` filters once, at the top, before any other processing:
  ```ts
  const visible = readings.filter(r => !r.skipped);
  ```
  Every downstream computation (per-room `readings` arrays feeding the trajectory chart, `avgDaytimeC`/`avgNighttimeC`/`avgHumidity`, outdoor reference averages, control-room comparisons) uses `visible` instead of the raw `readings` array. Single choke point — no repeated filtering logic, and it applies uniformly regardless of device type (hobo/kestrel) or sensor role (room/outdoor/control), since `skipped` is computed per-row on the backend regardless of what kind of sensor produced it.
- Effect: the chart line has a gap over the skip window (the points simply aren't in the array Recharts receives), and stats are computed only from non-skipped readings.

---

## Testing

- **Backend** (`scripts/test_export_indoor_phase.py`): extend the JSON config fixture with a sensor carrying `skip_start`/`skip_end` that brackets one of the fixture's reading timestamps. Assert:
  - the bracketed reading's JSON record has `"skipped": true`
  - a reading outside the window has no `skipped` key in JSON, and `False` in the CSV column
- **Frontend** (`frontend/src/services/transform.test.ts`): add a reading with `skipped: true` for a room that also has a normal reading. Assert:
  - the skipped reading is absent from `roomData[room].readings`
  - `avgDaytimeC`/`avgNighttimeC` reflect only the non-skipped reading

---

## Out of scope

- Multiple skip windows per sensor per phase (confirmed: one is sufficient for current data).
- Visual "shaded band" treatment in the chart for skip windows (confirmed: a clean gap is sufficient; no shading/annotation needed).
- Any change to how `exclude_dates` (phase-wide day exclusion) works — it remains available but unused.
- Backfilling skip ranges for phases 1, 2, 4, or heat_event — this spec only requires the mechanism to exist; populating actual skip windows for rooms in those phases is a data-entry task for the user, not part of this implementation.
