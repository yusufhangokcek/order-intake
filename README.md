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

## Data Files

The `data/` folder contains three read-only source files:

- `customers.csv` — customer_id, name, country, credit_limit, blocked
- `materials.csv` — material_code, description, unit_price, currency, uom
- `orders_2026_07.csv` — order_id, line_no, customer_id, material_code, quantity, unit_price, order_date, ship_to_city (784 rows)

**Note:** `orders_2026_07.csv` is encoded in `cp1254` (Windows Turkish), not UTF-8. `customers.csv` and `materials.csv` are UTF-8.

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

## Known Limitations

- The two out-of-range customer IDs (`C9999`, `C1021`) have not been explained.
- The 5 unidentified invalid `quantity` values have not been inspected individually — only their count is known.
- The specific `material_code` values causing the customer/material mismatch have not been individually inspected.
- The high W002 count (107) has not been broken down by distinct customer — it's likely a small number of over-limit customers with many order lines each, but this hasn't been confirmed.
- The automated test for E006 (duplicate detection) tests the underlying logic in isolation rather than calling `run_validate()` directly, so it won't automatically catch a future change to that function's duplicate-detection code.