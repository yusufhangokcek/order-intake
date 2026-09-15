from intake.db import get_connection
from intake.german import load_fx_rates


def report_revenue_by_customer(conn):
    print("--- Müşteriye göre gelir ---")
    rows = conn.execute("""
        SELECT orders.customer_id, SUM(order_lines.quantity * order_lines.unit_price)
        FROM orders
        JOIN order_lines ON orders.order_id = order_lines.order_id
        GROUP BY orders.customer_id
    """).fetchall()
    for customer_id, revenue in rows:
        print(f"{customer_id}: {revenue:.2f}")
    print()


def report_revenue_by_week(conn):
    print("--- Haftaya göre gelir ---")
    rows = conn.execute("""
        SELECT strftime('%W', orders.order_date), SUM(order_lines.quantity * order_lines.unit_price)
        FROM orders
        JOIN order_lines ON orders.order_id = order_lines.order_id
        GROUP BY strftime('%W', orders.order_date)
    """).fetchall()
    for week, revenue in rows:
        print(f"Hafta {week}: {revenue:.2f}")
    print()


def report_top_materials_by_quantity(conn):
    print("--- Top 10 malzeme (miktara göre) ---")
    rows = conn.execute("""
        SELECT material_code, SUM(quantity)
        FROM order_lines
        GROUP BY material_code
        ORDER BY SUM(quantity) DESC
        LIMIT 10
    """).fetchall()
    for material_code, total_qty in rows:
        print(f"{material_code}: {total_qty}")
    print()


def report_top_materials_by_value(conn):
    print("--- Top 10 malzeme (değere göre) ---")
    rows = conn.execute("""
        SELECT material_code, SUM(quantity * unit_price)
        FROM order_lines
        GROUP BY material_code
        ORDER BY SUM(quantity * unit_price) DESC
        LIMIT 10
    """).fetchall()
    for material_code, total_value in rows:
        print(f"{material_code}: {total_value:.2f}")
    print()


def report_rejection_percentage(conn):
    print("--- Hata koduna göre red yüzdesi ---")
    rows = conn.execute("""
        SELECT error_code, COUNT(*) * 100.0 / (SELECT COUNT(*) FROM load_errors)
        FROM load_errors
        GROUP BY error_code
    """).fetchall()
    for error_code, percentage in rows:
        print(f"{error_code}: %{percentage:.2f}")
    print()


def report_price_deviation(conn):

    print("--- Fiyat sapması (en yüksekten) ---")

    rows = conn.execute("""
        SELECT materials.material_code,
               ABS(order_lines.unit_price - materials.unit_price),
               ABS(order_lines.unit_price - materials.unit_price) * 100.0 / materials.unit_price
        FROM materials
        JOIN order_lines
            ON materials.material_code = order_lines.material_code
        JOIN orders
            ON order_lines.order_id = orders.order_id
        WHERE orders.source = 'domestic'
        ORDER BY ABS(order_lines.unit_price - materials.unit_price) * 100.0 / materials.unit_price DESC
    """).fetchall()

    for material_code, amount, percentage in rows[:10]:
        print(f"{material_code}: fark {amount:.2f} (%{percentage:.2f})")

    print()


def report_credit_limit_risk(conn):
    print("--- Kredi limitinin %80'ine ulaşan müşteriler ---")
    rows = conn.execute("""
        SELECT orders.customer_id, customers.credit_limit, SUM(order_lines.quantity * order_lines.unit_price)
        FROM order_lines
        JOIN orders ON order_lines.order_id = orders.order_id
        JOIN customers ON orders.customer_id = customers.customer_id
        GROUP BY orders.customer_id
        HAVING SUM(order_lines.quantity * order_lines.unit_price) >= customers.credit_limit * 0.8
    """).fetchall()
    for customer_id, limit, total in rows:
        print(f"{customer_id}: limit {limit:.2f}, toplam {total:.2f}")
    print()


def run_report():
    conn = get_connection()
    report_revenue_by_customer(conn)
    report_revenue_by_customer_usd(conn)
    report_revenue_by_week(conn)
    report_top_materials_by_quantity(conn)
    report_top_materials_by_value(conn)
    report_rejection_percentage(conn)
    report_price_deviation(conn)
    report_credit_limit_risk(conn)
    conn.close()

def report_revenue_by_customer_usd(conn):
    fx_rates = load_fx_rates("data/fx_rates.csv")
    usd_to_try = fx_rates[("USD", "TRY")]

    print("--- Müşteriye göre gelir (USD) ---")
    rows = conn.execute("""
        SELECT orders.customer_id, SUM(order_lines.quantity * order_lines.unit_price)
        FROM orders
        JOIN order_lines ON orders.order_id = order_lines.order_id
        GROUP BY orders.customer_id
    """).fetchall()
    for customer_id, revenue_try in rows:
        revenue_usd = revenue_try / usd_to_try
        print(f"{customer_id}: ${revenue_usd:.2f}")
    print()