from intake.validate import (
    check_structure,
    check_customer_exists,
    check_customer_blocked,
    check_material_exists,
    check_quantity_valid,
    check_order_date,
    check_price_deviation,
    check_credit_limit_exceeded,
    validate_row,
)

FIELDNAMES = ["order_id", "line_no", "customer_id", "material_code", "quantity", "unit_price", "order_date", "ship_to_city"]

VALID_ROW = {
    "order_id": "SO-100001",
    "line_no": "1",
    "customer_id": "C1001",
    "material_code": "MAT-1001",
    "quantity": "10",
    "unit_price": "5.00",
    "order_date": "2026-07-01",
    "ship_to_city": "Ankara",
}


def test_normal_row_passes():
    assert check_structure(VALID_ROW, FIELDNAMES) is None


def test_duplicated_header_row_fails():
    row = {name: name for name in FIELDNAMES}
    assert check_structure(row, FIELDNAMES) == "E007"


def test_missing_field_fails():
    row = dict(VALID_ROW)
    row["order_date"] = None
    row["ship_to_city"] = None
    assert check_structure(row, FIELDNAMES) == "E007"


def test_known_customer_passes():
    assert check_customer_exists(VALID_ROW, {"C1001", "C1002"}) is None


def test_unknown_customer_fails():
    assert check_customer_exists(VALID_ROW, {"C1002", "C1003"}) == "E001"


def test_non_blocked_customer_passes():
    assert check_customer_blocked(VALID_ROW, {"C1002"}) is None


def test_blocked_customer_fails():
    assert check_customer_blocked(VALID_ROW, {"C1001"}) == "E002"


def test_known_material_passes():
    assert check_material_exists(VALID_ROW, {"MAT-1001"}) is None


def test_material_with_extra_spacing_and_case_passes():
    row = dict(VALID_ROW)
    row["material_code"] = " mat-1001 "
    assert check_material_exists(row, {"MAT-1001"}) is None


def test_unknown_material_fails():
    assert check_material_exists(VALID_ROW, {"MAT-9999"}) == "E003"


def test_validate_row_stops_at_first_error():
    row = {name: name for name in FIELDNAMES}
    assert validate_row(row, FIELDNAMES, {"C1001"}, set(), set()) == "E007"

def test_valid_quantity_passes():
    assert check_quantity_valid(VALID_ROW) is None


def test_empty_quantity_fails():
    row = dict(VALID_ROW)
    row["quantity"] = ""
    assert check_quantity_valid(row) == "E004"


def test_non_numeric_quantity_fails():
    row = dict(VALID_ROW)
    row["quantity"] = "abc"
    assert check_quantity_valid(row) == "E004"


def test_zero_quantity_fails():
    row = dict(VALID_ROW)
    row["quantity"] = "0"
    assert check_quantity_valid(row) == "E004"


def test_negative_quantity_fails():
    row = dict(VALID_ROW)
    row["quantity"] = "-5"
    assert check_quantity_valid(row) == "E004"

def test_valid_date_passes():
    assert check_order_date(VALID_ROW) is None


def test_empty_date_fails():
    row = dict(VALID_ROW)
    row["order_date"] = ""
    assert check_order_date(row) == "E005"


def test_unparseable_date_fails():
    row = dict(VALID_ROW)
    row["order_date"] = "not-a-date"
    assert check_order_date(row) == "E005"


def test_future_date_fails():
    row = dict(VALID_ROW)
    row["order_date"] = "2099-01-01"
    assert check_order_date(row) == "E005"


def test_price_within_tolerance_passes():
    row = dict(VALID_ROW)
    row["unit_price"] = "5.03"
    assert check_price_deviation(row, {"MAT-1001": 5.00}) is None


def test_price_deviation_fails():
    row = dict(VALID_ROW)
    row["unit_price"] = "6.00"
    assert check_price_deviation(row, {"MAT-1001": 5.00}) == "W001"


def test_within_credit_limit_passes():
    totals = {"C1001": 500}
    limits = {"C1001": 1000}
    assert check_credit_limit_exceeded("C1001", totals, limits) is None


def test_over_credit_limit_fails():
    totals = {"C1001": 1500}
    limits = {"C1001": 1000}
    assert check_credit_limit_exceeded("C1001", totals, limits) == "W002"

def test_duplicate_order_line_detected():
    seen_keys = set()
    rows = [
        {"order_id": "SO-1", "line_no": "1"},
        {"order_id": "SO-1", "line_no": "2"},
        {"order_id": "SO-1", "line_no": "1"},
    ]

    results = []
    for row in rows:
        key = (row["order_id"], row["line_no"])
        if key in seen_keys:
            results.append("E006")
        else:
            seen_keys.add(key)
            results.append(None)

    assert results == [None, None, "E006"]