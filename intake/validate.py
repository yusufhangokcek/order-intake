import csv
from datetime import datetime

DATE_FORMATS = ["%Y-%m-%d", "%d.%m.%Y", "%m/%d/%Y"]

ERROR_MESSAGES = {
    "E001": "Customer ID not found in customers.csv",
    "E002": "Customer is blocked",
    "E003": "Material code not found in materials.csv",
    "E004": "Quantity is missing, not numeric, or not positive",
    "E005": "Order date is missing, invalid, or in the future",
    "E006": "Duplicate order_id + line_no combination",
    "E007": "Row is structurally invalid (missing fields or duplicated header)",
}


def parse_date(value):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def check_structure(row, fieldnames):
    if None in row:
        return "E007"
    if None in row.values():
        return "E007"
    if list(row.values()) == fieldnames:
        return "E007"
    return None


def check_customer_exists(row, customer_ids):
    if row["customer_id"] not in customer_ids:
        return "E001"
    return None


def check_customer_blocked(row, blocked_customer_ids):
    if row["customer_id"] in blocked_customer_ids:
        return "E002"
    return None


def check_material_exists(row, material_codes):
    normalized_code = row["material_code"].strip().upper()
    if normalized_code not in material_codes:
        return "E003"
    return None


def check_quantity_valid(row):
    value = row["quantity"]
    if not value:
        return "E004"
    try:
        quantity = int(value)
    except ValueError:
        return "E004"
    if quantity <= 0:
        return "E004"
    return None


def check_order_date(row):
    value = row["order_date"]
    if not value:
        return "E005"
    parsed = parse_date(value)
    if parsed is None:
        return "E005"
    if parsed > datetime.now():
        return "E005"
    return None


def validate_row(row, fieldnames, customer_ids, blocked_customer_ids, material_codes):
    error = check_structure(row, fieldnames)
    if error:
        return error

    error = check_customer_exists(row, customer_ids)
    if error:
        return error

    error = check_customer_blocked(row, blocked_customer_ids)
    if error:
        return error

    error = check_material_exists(row, material_codes)
    if error:
        return error

    error = check_quantity_valid(row)
    if error:
        return error

    error = check_order_date(row)
    if error:
        return error

    return None


def check_price_deviation(row, material_prices):
    normalized_code = row["material_code"].strip().upper()
    list_price = material_prices[normalized_code]
    actual_price = float(row["unit_price"])
    deviation = abs(actual_price - list_price) / list_price
    if deviation > 0.01:
        return "W001"
    return None


def check_credit_limit_exceeded(customer_id, customer_totals, credit_limits):
    if customer_totals[customer_id] > credit_limits[customer_id]:
        return "W002"
    return None


def write_clean_csv(rows, fieldnames):
    output_fieldnames = fieldnames + ["warnings"]
    with open("clean.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_rejects_csv(rows, fieldnames):
    output_fieldnames = fieldnames + ["error_code", "error_message"]
    with open("rejects.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_validate():
    with open("data/customers.csv", "r", encoding="utf-8") as f:
        customer_rows = list(csv.DictReader(f))
    customer_ids = set(row["customer_id"] for row in customer_rows)
    blocked_customer_ids = set(row["customer_id"] for row in customer_rows if row["blocked"] == "Y")
    credit_limits = {row["customer_id"]: float(row["credit_limit"]) for row in customer_rows}

    with open("data/materials.csv", "r", encoding="utf-8") as f:
        material_rows = list(csv.DictReader(f))
    material_codes = set(row["material_code"].strip().upper() for row in material_rows)
    material_prices = {row["material_code"].strip().upper(): float(row["unit_price"]) for row in material_rows}

    with open("data/orders_2026_07.csv", "r", encoding="cp1254") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    error_counts = {}
    clean_rows = []
    rejected_rows = []
    seen_keys = set()

    for row in rows:
        error = validate_row(row, fieldnames, customer_ids, blocked_customer_ids, material_codes)

        if error is None:
            key = (row["order_id"], row["line_no"])
            if key in seen_keys:
                error = "E006"
            else:
                seen_keys.add(key)

        if error is None:
            clean_rows.append(row)
        else:
            error_counts[error] = error_counts.get(error, 0) + 1
            reject_row = {name: row.get(name) for name in fieldnames}
            reject_row["error_code"] = error
            reject_row["error_message"] = ERROR_MESSAGES[error]
            rejected_rows.append(reject_row)

    customer_totals = {}
    for row in clean_rows:
        customer_id = row["customer_id"]
        line_value = int(row["quantity"]) * float(row["unit_price"])
        customer_totals[customer_id] = customer_totals.get(customer_id, 0) + line_value

    warning_counts = {}
    clean_with_warnings = []
    for row in clean_rows:
        warnings = []

        warning = check_price_deviation(row, material_prices)
        if warning:
            warnings.append(warning)
            warning_counts[warning] = warning_counts.get(warning, 0) + 1

        warning = check_credit_limit_exceeded(row["customer_id"], customer_totals, credit_limits)
        if warning:
            warnings.append(warning)
            warning_counts[warning] = warning_counts.get(warning, 0) + 1

        row_with_warnings = dict(row)
        row_with_warnings["warnings"] = ",".join(warnings)
        clean_with_warnings.append(row_with_warnings)

    write_clean_csv(clean_with_warnings, fieldnames)
    write_rejects_csv(rejected_rows, fieldnames)

    print("Doğrulama sonucu:")
    print("Geçen satır:", len(clean_rows))
    print("Reddedilen satır:", len(rejected_rows))
    print("Hata koduna göre dağılım:", error_counts)
    print("Uyarı koduna göre dağılım (temiz satırlar üzerinde):", warning_counts)
    print("clean.csv ve rejects.csv yazıldı.")