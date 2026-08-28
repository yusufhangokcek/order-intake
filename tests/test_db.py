import sqlite3
import pytest
from intake.db import SCHEMA


@pytest.fixture
def conn():
    connection = sqlite3.connect(":memory:")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    yield connection
    connection.close()


def test_schema_creates_all_tables(conn):
    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    table_names = {row[0] for row in tables}
    assert "customers" in table_names
    assert "materials" in table_names
    assert "orders" in table_names
    assert "order_lines" in table_names
    assert "load_errors" in table_names
    assert "load_batch" in table_names


def test_customer_insert_and_ignore_duplicate(conn):
    conn.execute(
        "INSERT OR IGNORE INTO customers (customer_id, name, country, credit_limit, blocked) VALUES (?, ?, ?, ?, ?)",
        ("C1001", "Test Customer", "TR", 1000.0, "N"),
    )
    conn.execute(
        "INSERT OR IGNORE INTO customers (customer_id, name, country, credit_limit, blocked) VALUES (?, ?, ?, ?, ?)",
        ("C1001", "Test Customer", "TR", 1000.0, "N"),
    )
    count = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    assert count == 1


def test_order_line_rejects_unknown_material(conn):
    conn.execute(
        "INSERT INTO customers (customer_id, name, country, credit_limit, blocked) VALUES (?, ?, ?, ?, ?)",
        ("C1001", "Test Customer", "TR", 1000.0, "N"),
    )
    conn.execute(
        "INSERT INTO orders (order_id, customer_id, order_date, ship_to_city) VALUES (?, ?, ?, ?)",
        ("SO-1", "C1001", "2026-07-01", "Ankara"),
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO order_lines (order_id, line_no, material_code, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
            ("SO-1", 1, "MAT-DOES-NOT-EXIST", 5, 10.0),
        )