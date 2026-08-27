import sqlite3

conn = sqlite3.connect("order_intake.db")
rows = conn.execute("SELECT * FROM load_batch").fetchall()
for row in rows:
    print(row)