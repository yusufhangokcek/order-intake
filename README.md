# Order Intake

A tool that reads dirty order files, validates them against a rule catalogue, loads the clean rows into a database, and reports on the result. Built over 6 weeks as an engineering onboarding project.

## Setup

1. Clone this repository.
2. Create a virtual environment:
```
   python -m venv venv
```
3. Activate it:
   - Windows: `.\venv\Scripts\Activate.ps1`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies:
```
   pip install -r requirements.txt
```

## Usage

Run the profiling command from the project root, after activating the virtual environment:

```
python -m intake profile
```

This reads the three source files in `data/` and prints, for each one: the total row count, and for every column, how many values are empty and how many distinct values it contains. For the orders file it also prints the number of distinct customers, distinct materials, total quantity, and the earliest/latest order date.

Run the validation command to check the orders file against the rule catalogue:

```
python -m intake validate
```

This checks every row against 7 rejection rules (E001–E007) and 2 warning rules (W001–W002), applied in order — the first rule a row fails determines its rejection reason. Rows that pass are written to `clean.csv` (with a `warnings` column), and rejected rows are written to `rejects.csv` (with `error_code` and `error_message` columns). A summary is also printed to the console.

Run the reporting command to generate business reports from the database (requires `init-db` and `load` to have been run first):

```
python -m intake report
```

This prints revenue by customer, revenue by week, top 10 materials by quantity and by value, rejection percentage by error code, price deviation from list price, and customers approaching or exceeding 80% of their credit limit.

## Data Files

The `data/` folder contains three read-only source files:

- `customers.csv` — customer_id, name, country, credit_limit, blocked
- `materials.csv` — material_code, description, unit_price, currency, uom
- `orders_2026_07.csv` — order_id, line_no, customer_id, material_code, quantity, unit_price, order_date, ship_to_city (784 rows)

**Note:** `orders_2026_07.csv` is encoded in `cp1254` (Windows Turkish), not UTF-8. `customers.csv` and `materials.csv` are UTF-8.

## Database

Running `python -m intake init-db` creates `order_intake.db` (SQLite) with six tables:

- `customers`, `materials` — direct loads from the source CSVs
- `orders` — one row per order (order_id, customer_id, order_date, ship_to_city)
- `order_lines` — one row per order line, linked to `orders` via `order_id` (composite primary key: order_id + line_no)
- `load_errors` — rejected rows from `rejects.csv`, refreshed on every load
- `load_batch` — a record of each load run (timestamp and row counts)

Foreign keys are enforced (`PRAGMA foreign_keys = ON`). Loading is idempotent: running `python -m intake load` multiple times does not create duplicate rows or change the counts, because inserts use `INSERT OR IGNORE` on primary keys. The entire load runs inside a single transaction — if any insert fails, nothing from that run is persisted (verified manually by forcing a foreign key violation mid-load and confirming row counts were unchanged before and after).

**Known limitation:** because `order_lines` inserts use `INSERT OR IGNORE`, a foreign key violation there is silently skipped rather than raised, unlike the deliberate test which used a plain `INSERT` to force a visible error. In normal operation this isn't an issue, since `order_lines` is only ever loaded from already-validated `clean.csv` rows.

Run `python -m intake load` after `init-db` to populate the database from `clean.csv` and `rejects.csv`.

## Validation Rule Catalogue

Applied in order; the first rule a row fails determines its rejection reason.

| Code | Rule |
|---|---|
| E007 | Row must be structurally valid (no missing/extra fields, not a duplicated header row) |
| E001 | `customer_id` must exist in `customers.csv` |
| E002 | Customer must not be blocked |
| E003 | `material_code` must exist in `materials.csv` (compared after trimming whitespace and uppercasing) |
| E004 | `quantity` must be present, numeric, and greater than zero |
| E005 | `order_date` must be present, a valid calendar date, and not in the future |
| E006 | `order_id` + `line_no` combination must be unique |

Warnings (row is kept, only flagged), evaluated only on rows that pass all rejection rules:

| Code | Rule |
|---|---|
| W001 | Actual `unit_price` deviates from the material's list price by more than 1% |
| W002 | Customer's total order value (across their clean rows) exceeds their `credit_limit` |

## Observations from Profiling

- `orders_2026_07.csv` has 6 rows where `quantity` cannot be converted to a number. One is explained: line 393 is a duplicated header row leaking into the data (every column contains its own column name as the value). The other 5 have not been identified yet.
- In `customers.csv`, `credit_limit` has only 18 distinct values across 20 rows — two values (`240000` and `20000`) each appear twice. This may be coincidence rather than a data issue.
- `orders_2026_07.csv` references 25 distinct `customer_id` values, but `customers.csv` only defines 20 customers. Investigating the difference found several distinct causes: a duplicated header row, an ID with an embedded space (`C 1005`), an ID missing its `C` prefix (`1002`), and two well-formed but out-of-range IDs (`C9999`, `C1021`) that don't match any real customer.
- Similarly, `orders_2026_07.csv` references 28 distinct `material_code` values, but `materials.csv` only defines 18. The cause of this gap has not been investigated in detail yet.
- The latest order date found is `2027-01-15`. This is well outside the month the file claims to cover (July 2026) and is in the future relative to today.
- While building the validation rules, a third date format (`%m/%d/%Y`) was found in the file by inspecting rejected rows, in addition to the two formats found during profiling (`%Y-%m-%d`, `%d.%m.%Y`). Adding it to the parser reduced date-related rejections from 45 rows to 5.

## Validation Results

Running `python -m intake validate` on the current data produces:

- 754 rows pass, 30 rows are rejected.
- Rejection breakdown: E001: 4, E002: 3, E003: 4, E004: 8, E005: 5, E006: 4, E007: 2.
- Warning breakdown (on passing rows): W001: 4, W002: 107.

## Reports

Running `python -m intake report` on the current data produces:

- **Revenue by customer:** ranges from 157,653.50 (C1013) to 701,692.75 (C1011).
- **Revenue by week:** week 27 was highest (1,359,434.50), week 30 lowest (664,601.05).
- **Top 10 materials by quantity vs. by value are different lists.** For example, MAT-1011 is the top material by value (1,838,500.00) but doesn't appear in the top 10 by quantity — it's a low-volume, high-price item. MAT-1015 is the opposite: highest by quantity (3,339 units) but only 10th by value — a high-volume, low-price item.
- **Rejection percentage:** E004 accounts for the largest share of rejections (26.67%), E007 the smallest (6.67%).
- **Price deviation:** MAT-1017 shows an unusually large deviation (222.26%) from its list price — worth investigating further. Three other materials exceed the 1% threshold used for W001 (MAT-1011: 12.00%, MAT-1001: 9.97%, MAT-1005: 1.17%), consistent with the 4 W001 warnings found during validation.
- **Credit limit risk:** four customers (C1003, C1004, C1009, C1010) have reached or exceeded 80% of their credit limit; all four have relatively low limits (205,000–255,000).

## User Interface

The interface is built with **FastAPI** (backend, `backend/main.py`) and **React** (frontend, `frontend/`), per a direct request from the mentor partway through Milestone 5 — the original plan was Streamlit, which was fully functional (file upload, validation, and results display) before the switch.

### Setup

In addition to the Python setup above, the frontend requires [Node.js](https://nodejs.org/) (LTS version) and npm.

```
cd frontend
npm install
```

### Running

Two processes need to run at the same time, in separate terminals:

**Backend** (from the project root, with the virtual environment activated):
```
python -m uvicorn backend.main:app --reload
```
This serves the API at `http://127.0.0.1:8000`. Interactive API docs are available at `http://127.0.0.1:8000/docs`.

**Frontend** (from the `frontend/` directory):
```
npm run dev
```
This serves the UI at the address printed in the terminal (typically `http://localhost:5173`).

### Features

- Upload an orders CSV file and run it through the validation rule catalogue (Milestone 2 logic, reused directly).
- View a summary of clean vs. rejected rows, a breakdown by error code, and a filterable table of rejected rows.
- View two of the Milestone 4 reports (revenue by customer, top materials by value) as tables and a bar chart, loaded automatically from the database.
- Uploading a file with the wrong columns, or an unreadable encoding, returns a readable error message instead of a server crash or raw traceback.

## Known Limitations

- The two out-of-range customer IDs (`C9999`, `C1021`) have not been explained.
- The 5 unidentified invalid `quantity` values have not been inspected individually — only their count is known.
- The specific `material_code` values causing the customer/material mismatch have not been individually inspected.
- The high W002 count (107) has not been broken down by distinct customer — it's likely a small number of over-limit customers with many order lines each, but this hasn't been confirmed.
- The automated test for E006 (duplicate detection) tests the underlying logic in isolation rather than calling `run_validate()` directly, so it won't automatically catch a future change to that function's duplicate-detection code.
- The UI only surfaces 2 of the 7 Milestone 4 reports (revenue by customer, top materials by value); the rest are only available via `python -m intake report`.
- There are no automated tests for the FastAPI endpoints or the React components.