# Order Intake

A tool that reads dirty order files, validates them against a rule catalogue, loads the clean rows into a database, and reports on the result. Built over 6 weeks as an engineering onboarding project.

## Setup

1. Clone this repository.
2. Create a virtual environment:


## Usage

Run the profiling command from the project root, after activating the virtual environment:


This reads the three source files in `data/` and prints, for each one: the total row count, and for every column, how many values are empty and how many distinct values it contains. For the orders file it also prints the number of distinct customers, distinct materials, total quantity, and the earliest/latest order date.

## Data Files

The `data/` folder contains three read-only source files:

- `customers.csv` — customer_id, name, country, credit_limit, blocked
- `materials.csv` — material_code, description, unit_price, currency, uom
- `orders_2026_07.csv` — order_id, line_no, customer_id, material_code, quantity, unit_price, order_date, ship_to_city (784 rows)

**Note:** `orders_2026_07.csv` is encoded in `cp1254` (Windows Turkish), not UTF-8. `customers.csv` and `materials.csv` are UTF-8.

## Observations from Profiling

- `orders_2026_07.csv` has 6 rows where `quantity` cannot be converted to a number. One is explained: line 393 is a duplicated header row leaking into the data (every column contains its own column name as the value). The other 5 have not been identified yet.
- In `customers.csv`, `credit_limit` has only 18 distinct values across 20 rows — two values (`240000` and `20000`) each appear twice. This may be coincidence rather than a data issue.
- `orders_2026_07.csv` references 25 distinct `customer_id` values, but `customers.csv` only defines 20 customers. Investigating the difference found several distinct causes: a duplicated header row, an ID with an embedded space (`C 1005`), an ID missing its `C` prefix (`1002`), and two well-formed but out-of-range IDs (`C9999`, `C1021`) that don't match any real customer.
- Similarly, `orders_2026_07.csv` references 28 distinct `material_code` values, but `materials.csv` only defines 18. The cause of this gap has not been investigated in detail yet.
- The latest order date found is `2027-01-15`. This is well outside the month the file claims to cover (July 2026) and is in the future relative to today.
- 44 rows have an `order_date` that does not match either of the two known formats (`%Y-%m-%d`, `%d.%m.%Y`) — at least one more format exists in the file.

## Known Limitations

- The format(s) used by the 44 unparsed dates have not been identified yet.
- The two out-of-range customer IDs (`C9999`, `C1021`) have not been explained.
- The 5 unidentified invalid `quantity` values have not been inspected individually — only their count is known.
- No rows are accepted or rejected at this stage — that separation is the goal of Milestone 2.
