from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import csv
import io

from intake.validate import validate_row, ERROR_MESSAGES
from intake.db import get_connection


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello, Order Intake API!"}


@app.post("/validate")
def validate_orders(file: UploadFile):
    from intake.db import load_orders_and_lines
    from intake.german import COLUMN_MAP, parse_german_number, load_fx_rates, VAT_RATE

    with open("data/customers.csv", "r", encoding="utf-8") as f:
        customers = list(csv.DictReader(f))
    customer_ids = set(row["customer_id"] for row in customers)
    blocked_customer_ids = set(row["customer_id"] for row in customers if row["blocked"] == "Y")

    with open("data/materials.csv", "r", encoding="utf-8") as f:
        material_rows = list(csv.DictReader(f))
    material_codes = set(row["material_code"].strip().upper() for row in material_rows)

    is_german = False

    try:
        dosya_bytes = file.file.read()

        try:
            metin = dosya_bytes.decode("utf-8")
        except UnicodeDecodeError:
            metin = dosya_bytes.decode("cp1254")

        reader = csv.DictReader(io.StringIO(metin))
        fieldnames = reader.fieldnames
        rows = list(reader)

        if fieldnames is None or "order_id" not in fieldnames:
            reader_de = csv.DictReader(io.StringIO(metin), delimiter=";")
            fieldnames_de = reader_de.fieldnames

            if fieldnames_de is None or "Auftragsnummer" not in fieldnames_de:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Yüklenen dosya beklenen sipariş kolonlarını içermiyor."},
                )

            fx_rates = load_fx_rates("data/fx_rates.csv")
            eur_to_try = fx_rates[("EUR", "TRY")]

            normalized_rows = []
            for raw_row in reader_de:
                row = {}
                for german_name, english_name in COLUMN_MAP.items():
                    row[english_name] = raw_row[german_name]

                row["quantity"] = str(parse_german_number(row["quantity"]))

                price_eur = parse_german_number(row["unit_price"])
                price_try_with_vat = price_eur * (1 + VAT_RATE) * eur_to_try
                row["unit_price"] = str(round(price_try_with_vat, 2))

                row["ship_to_city"] = "Germany"
                normalized_rows.append(row)

            rows = normalized_rows
            fieldnames = None
            is_german = True

    except UnicodeDecodeError:
        return JSONResponse(
            status_code=400,
            content={"error": "Dosya okunamadı, beklenmeyen bir karakter kodlaması kullanılmış olabilir."},
        )

    clean_count = 0
    rejected_count = 0
    error_counts = {}
    rejected_rows = []
    clean_rows_for_db = []
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
            clean_count += 1
            row_copy = dict(row)
            row_copy["source"] = "germany" if is_german else "domestic"
            clean_rows_for_db.append(row_copy)
        else:
            rejected_count += 1
            error_counts[error] = error_counts.get(error, 0) + 1
            rejected_rows.append({
                "order_id": row.get("order_id"),
                "line_no": row.get("line_no"),
                "error_code": error,
                "error_message": ERROR_MESSAGES[error],
            })

    conn = get_connection()
    with conn:
        load_orders_and_lines(conn, rows=clean_rows_for_db)
    conn.close()

    return {
        "clean_count": clean_count,
        "rejected_count": rejected_count,
        "error_counts": error_counts,
        "rejected_rows": rejected_rows,
    }


@app.get("/reports/revenue-by-customer")
def revenue_by_customer():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            orders.customer_id,
            SUM(
                order_lines.quantity
                * order_lines.unit_price
            )
        FROM orders
        JOIN order_lines
            ON orders.order_id = order_lines.order_id
        GROUP BY orders.customer_id
        """
    ).fetchall()

    conn.close()

    # Müşteri ID → müşteri adı
    with open("data/customers.csv", "r", encoding="utf-8") as f:
        customers = list(csv.DictReader(f))

    customer_names = {
        row["customer_id"]: row["name"]
        for row in customers
    }

    return [
        {
            "customer_name": customer_names.get(
                r[0],
                r[0]
            ),
            "revenue": r[1],
        }
        for r in rows
    ]


@app.get("/reports/top-materials-by-value")
def top_materials_by_value():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            material_code,
            SUM(quantity * unit_price)
        FROM order_lines
        GROUP BY material_code
        ORDER BY SUM(quantity * unit_price) DESC
        LIMIT 10
        """
    ).fetchall()

    conn.close()

    # Malzeme kodu → malzeme adı
    with open("data/materials.csv", "r", encoding="utf-8") as f:
        materials = list(csv.DictReader(f))

    material_names = {
        row["material_code"].strip().upper(): row["description"]
        for row in materials
    }

    return [
        {
            "material_name": material_names.get(
                r[0].strip().upper(),
                r[0]
            ),
            "value": r[1],
        }
        for r in rows
    ]
@app.get("/reports/orders-by-customer")
def orders_by_customer():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            customer_id,
            COUNT(DISTINCT order_id)
        FROM orders
        GROUP BY customer_id
        ORDER BY COUNT(DISTINCT order_id) DESC
        """
    ).fetchall()

    conn.close()

    with open("data/customers.csv", "r", encoding="utf-8") as f:
        customers = list(csv.DictReader(f))

    customer_names = {
        row["customer_id"]: row["name"]
        for row in customers
    }

    return [
        {
            "customer_name": customer_names.get(
                r[0],
                r[0]
            ),
            "order_count": r[1],
        }
        for r in rows
    ]


@app.get("/reports/orders-by-city")
def orders_by_city():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            ship_to_city,
            COUNT(DISTINCT order_id)
        FROM orders
        GROUP BY ship_to_city
        ORDER BY COUNT(DISTINCT order_id) DESC
        """
    ).fetchall()

    conn.close()

    return [
        {
            "city": r[0],
            "order_count": r[1],
        }
        for r in rows
    ]