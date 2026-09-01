import sqlite3

conn = sqlite3.connect("order_intake.db")

result = conn.execute("""
    SELECT SUM(quantity *unit_price), strftime('%W', orders.order_date)
    FROM orders
    JOIN order_lines ON orders.order_id = order_lines.order_id
    GROUP BY strftime('%W', orders.order_date)
""").fetchall()

for row in result:
    print(row)