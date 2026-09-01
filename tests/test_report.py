import sqlite3
import pytest
from intake.db import SCHEMA
from intake.report import report_revenue_by_customer


@pytest.fixture
def conn(capsys):
    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)

    connection.execute(
        "INSERT INTO customers (customer_id, name, country, credit_limit, blocked) VALUES (?, ?, ?, ?, ?)",
        ("C1001", "Test Customer", "TR", 1000.0, "N"),
    )
    connection.execute(
        "INSERT INTO materials (material_code, description, unit_price, currency, uom) VALUES (?, ?, ?, ?, ?)",
        ("MAT-1", "Test Material 1", 5.0, "TRY", "EA"),
    )
    connection.execute(
        "INSERT INTO materials (material_code, description, unit_price, currency, uom) VALUES (?, ?, ?, ?, ?)",
        ("MAT-2", "Test Material 2", 3.0, "TRY", "EA"),
    )
    connection.execute(
        "INSERT INTO orders (order_id, customer_id, order_date, ship_to_city) VALUES (?, ?, ?, ?)",
        ("SO-1", "C1001", "2026-07-01", "Ankara"),
    )
    connection.execute(
        "INSERT INTO order_lines (order_id, line_no, material_code, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        ("SO-1", 1, "MAT-1", 10, 5.0),
    )
    connection.execute(
        "INSERT INTO order_lines (order_id, line_no, material_code, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        ("SO-1", 2, "MAT-2", 2, 3.0),
    )
    connection.commit()

    yield connection
    connection.close()


def test_revenue_by_customer(conn, capsys):
    report_revenue_by_customer(conn)
    output = capsys.readouterr().out
    assert "C1001: 56.00" in output