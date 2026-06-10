## Purpose

Build a simple, maintainable, static JavaScript dashboard.

The frontend is a presentation layer only.

Data processing, cleaning, validation, and joins belong upstream in Dagster and Postgres.

Do not move business logic into the frontend.

---

## Architecture

```text
Source Files
    ↓
Dagster
    ↓
Postgres
    ↓
Public Views
    ↓
Dagster JSON Export
    ↓
/data/*.json
    ↓
Frontend
```

The browser must never connect directly to Postgres.

The browser must never execute SQL.

No backend API unless explicitly requested.

---

## Data Access

Frontend loads data exclusively through:

```text
/data/manifest.json
```

The manifest points to versioned data files.

Example:

```json
{
  "generated_at": "...",
  "files": {
    "buildings": "/data/buildings_20260609T120000Z.json"
  }
}
```

Frontend must not hardcode filenames.

---

## Frontend Principles

Prefer:

* Vanilla JavaScript
* TypeScript
* Lightweight libraries

Avoid:

* Complex state management
* Unnecessary frameworks
* Excessive abstractions

Favor readability over cleverness.

---

## Project Structure

```text
src/
├── components/
├── charts/
├── maps/
├── services/
│   └── data.ts
├── types/
└── main.ts
```

Keep visualization code separate from data loading code.

---

## Data Loading

All data access should flow through a single service layer.

Example:

```text
services/data.ts
```

Responsibilities:

* Load manifest
* Load referenced datasets
* Handle fetch errors
* Return typed objects

No direct fetch calls scattered throughout the application.

---

## Mapping

If using Mapbox:

* Sources defined once
* Layers generated from configuration
* Avoid duplicated layer definitions
* Use feature properties for styling

Keep map state separate from data state.

---

## Charts

Charts consume already-prepared datasets.

Do not perform significant aggregation in the browser.

Complex calculations belong in Postgres or Dagster.

---

## Styling

Use:

* CSS variables
* Simple layout system
* Consistent spacing scale

Avoid:

* Inline styles
* Deep selector nesting
* UI frameworks unless justified

---

## Performance

Assume datasets are pre-aggregated.

Avoid:

* Large client-side joins
* Repeated parsing
* Repeated fetches

Load once and reuse.

---

## Deployment

Frontend deployment:

```bash
npm run build
rsync dist/ -> /var/www/student-app/app/
```

Data deployment:

```text
Dagster writes JSON files
Dagster updates manifest.json
```

Frontend deployment must never overwrite:

```text
/var/www/student-app/data
```

---

## Code Quality

Prefer:

* Small modules
* Pure functions
* Explicit typing
* Clear naming

Avoid:

* Premature optimization
* Generic utility files
* Over-engineering

Every file should have a clear responsibility.

---

## Testing

Test:

* Data loading
* Manifest parsing
* Critical calculations
* Map/chart configuration generation

Do not write tests for trivial getters, constants, or framework behavior.

Favor a small number of meaningful tests.

---

## Decision Rule

When choosing between simplicity and flexibility:

Choose simplicity unless a real requirement exists.
