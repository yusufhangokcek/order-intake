import sqlite3
import csv
from datetime import datetime 
from intake.validate import parse_date 

DB_PATH = "order_intake.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    country TEXT,
    credit_limit REAL,
    blocked TEXT
);

CREATE TABLE IF NOT EXISTS materials (
    material_code TEXT PRIMARY KEY,
    description TEXT,
    unit_price REAL,
    currency TEXT,
    uom TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_date TEXT,
    ship_to_city TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS order_lines (
    order_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    material_code TEXT NOT NULL,
    quantity INTEGER,
    unit_price REAL,
    PRIMARY KEY (order_id, line_no),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (material_code) REFERENCES materials(material_code)
);

CREATE TABLE IF NOT EXISTS load_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    line_no TEXT,
    customer_id TEXT,
    material_code TEXT,
    quantity TEXT,
    unit_price TEXT,
    order_date TEXT,
    ship_to_city TEXT,
    error_code TEXT,
    error_message TEXT
);
CREATE TABLE IF NOT EXISTS load_batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT,
    customers_loaded INTEGER,
    materials_loaded INTEGER,
    orders_loaded INTEGER,
    order_lines_loaded INTEGER,
    errors_loaded INTEGER
);
"""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_schema():
    conn = get_connection()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f"Schema created in {DB_PATH}")


def load_customers(conn):
    with open("data/customers.csv", "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO customers (customer_id, name, country, credit_limit, blocked) VALUES (?, ?, ?, ?, ?)",
            (row["customer_id"], row["name"], row["country"], float(row["credit_limit"]), row["blocked"]),
        )
    print(f"Loaded {len(rows)} customers")
    return len(rows)


def load_materials(conn):
    with open("data/materials.csv", "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        conn.execute(
            "INSERT OR IGNORE INTO materials (material_code, description, unit_price, currency, uom) VALUES (?, ?, ?, ?, ?)",
            (row["material_code"], row["description"], float(row["unit_price"]), row["currency"], row["uom"]),
        )
    print(f"Loaded {len(rows)} materials")
    return len(rows)



def load_orders_and_lines(conn, rows=None):

    if rows is None:
        with open("clean.csv", "r", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))

    seen_orders = set()

    for row in rows:

        order_id = row["order_id"]

        if order_id not in seen_orders:

            normalized_date = parse_date(row["order_date"]).strftime("%Y-%m-%d")

            conn.execute(
                "INSERT OR IGNORE INTO orders (order_id, customer_id, order_date, ship_to_city, source) VALUES (?, ?, ?, ?, ?)",
                (
                    order_id,
                    row["customer_id"],
                    normalized_date,
                    row["ship_to_city"],
                    row.get("source", "domestic"),
                ),
            )

            seen_orders.add(order_id)

        quantity = (
            str(row["quantity"])
            .strip()
            .replace(" ", "")
            .replace(",", ".")
        )

        conn.execute(
            "INSERT OR IGNORE INTO order_lines (order_id, line_no, material_code, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
            (
                order_id,
                int(row["line_no"]),
                row["material_code"].strip().upper(),
                float(quantity),
                float(row["unit_price"]),
            ),
        )

    print(f"Loaded {len(seen_orders)} orders and {len(rows)} order lines")

    return len(seen_orders), len(rows)




def load_errors(conn):
    conn.execute("DELETE FROM load_errors")

    with open("rejects.csv", "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        conn.execute(
            "INSERT INTO load_errors (order_id, line_no, customer_id, material_code, quantity, unit_price, order_date, ship_to_city, error_code, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                row["order_id"], row["line_no"], row["customer_id"], row["material_code"],
                row["quantity"], row["unit_price"], row["order_date"], row["ship_to_city"],
                row["error_code"], row["error_message"],
            ),
        )
    print(f"Loaded {len(rows)} load errors")
    return len(rows)


def run_load():
    conn = get_connection()
    try:
        with conn:
            customers_count = load_customers(conn)
            materials_count = load_materials(conn)
            orders_count, lines_count = load_orders_and_lines(conn)
            errors_count = load_errors(conn)

            conn.execute(
                "INSERT INTO load_batch (run_at, customers_loaded, materials_loaded, orders_loaded, order_lines_loaded, errors_loaded) VALUES (?, ?, ?, ?, ?, ?)",
                (datetime.now().isoformat(), customers_count, materials_count, orders_count, lines_count, errors_count),
            )
        print("Load complete.")
    finally:
        conn.close()