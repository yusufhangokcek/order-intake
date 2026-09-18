
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import csv
import io

from intake.validate import (
    validate_row,
    ERROR_MESSAGES,
    check_price_deviation,
    check_credit_limit_exceeded,
)

from intake.db import get_connection


app = FastAPI()

current_source = "domestic"


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
    return {
        "message": "Hello, Order Intake API!"
    }


@app.post("/validate")
def validate_orders(file: UploadFile):

    from intake.db import load_orders_and_lines

    from intake.german import (
        COLUMN_MAP,
        parse_german_number,
        load_fx_rates,
        VAT_RATE,
    )

    # --------------------------------
    # MÜŞTERİLER
    # --------------------------------

    with open(
        "data/customers.csv",
        "r",
        encoding="utf-8"
    ) as f:

        customers = list(
            csv.DictReader(f)
        )

    customer_ids = set(
        row["customer_id"]
        for row in customers
    )

    blocked_customer_ids = set(
        row["customer_id"]
        for row in customers
        if row["blocked"] == "Y"
    )

    credit_limits = {
        row["customer_id"]: float(
            row["credit_limit"]
        )
        for row in customers
    }

    # --------------------------------
    # MALZEMELER
    # --------------------------------

    with open(
        "data/materials.csv",
        "r",
        encoding="utf-8"
    ) as f:

        material_rows = list(
            csv.DictReader(f)
        )

    material_codes = set(
        row["material_code"]
        .strip()
        .upper()
        for row in material_rows
    )

    material_prices = {
        row["material_code"]
        .strip()
        .upper(): float(
            row["unit_price"]
        )
        for row in material_rows
    }

    # --------------------------------
    # DOSYA TÜRÜ
    # --------------------------------

    is_german = False

    global current_source

    try:

        dosya_bytes = file.file.read()

        try:
            metin = dosya_bytes.decode("utf-8")

        except UnicodeDecodeError:
            metin = dosya_bytes.decode("cp1254")

        # Önce normal CSV olarak oku
        reader = csv.DictReader(
            io.StringIO(metin)
        )

        fieldnames = reader.fieldnames

        rows = list(reader)

        # --------------------------------
        # ALMAN DOSYASI KONTROLÜ
        # --------------------------------

        if (
            fieldnames is None
            or "order_id" not in fieldnames
        ):

            reader_de = csv.DictReader(
                io.StringIO(metin),
                delimiter=";"
            )

            fieldnames_de = reader_de.fieldnames

            if (
                fieldnames_de is None
                or "Auftragsnummer" not in fieldnames_de
            ):

                return JSONResponse(
                    status_code=400,
                    content={
                        "error":
                        "Yüklenen dosya beklenen sipariş kolonlarını içermiyor."
                    },
                )

            # FX oranlarını oku
            fx_rates = load_fx_rates(
                "data/fx_rates.csv"
            )

            eur_to_try = fx_rates[
                ("EUR", "TRY")
            ]

            normalized_rows = []

            for raw_row in reader_de:

                row = {}

                for (
                    german_name,
                    english_name
                ) in COLUMN_MAP.items():

                    row[english_name] = (
                        raw_row[german_name]
                    )

                # Alman miktar formatını dönüştür
                row["quantity"] = str(
                    parse_german_number(
                        row["quantity"]
                    )
                )

                # EUR fiyat
                price_eur = parse_german_number(
                    row["unit_price"]
                )

                # EUR → TRY + VAT
                price_try_with_vat = (
                    price_eur
                    * (1 + VAT_RATE)
                    * eur_to_try
                )

                row["unit_price"] = str(
                    round(
                        price_try_with_vat,
                        2
                    )
                )

                row["ship_to_city"] = "Germany"

                normalized_rows.append(row)

            rows = normalized_rows

            fieldnames = None

            is_german = True

            current_source = "germany"

    except UnicodeDecodeError:

        return JSONResponse(
            status_code=400,
            content={
                "error":
                "Dosya okunamadı, beklenmeyen bir karakter kodlaması kullanılmış olabilir."
            },
        )

    # --------------------------------
    # DOMESTIC SOURCE
    # --------------------------------

    if not is_german:
        current_source = "domestic"

    # --------------------------------
    # VALIDATION
    # --------------------------------

    clean_count = 0
    rejected_count = 0

    error_counts = {}

    rejected_rows = []

    clean_rows_for_db = []

    seen_keys = set()

    for row in rows:

        error = validate_row(
            row,
            fieldnames,
            customer_ids,
            blocked_customer_ids,
            material_codes,
        )

        # Duplicate kontrolü
        if error is None:

            key = (
                row["order_id"],
                row["line_no"]
            )

            if key in seen_keys:

                error = "E006"

            else:

                seen_keys.add(key)

        # --------------------------------
        # CLEAN
        # --------------------------------

        if error is None:

            clean_count += 1

            row_copy = dict(row)

            row_copy["source"] = (
                "germany"
                if is_german
                else "domestic"
            )

            clean_rows_for_db.append(
                row_copy
            )

        # --------------------------------
        # REJECT
        # --------------------------------

        else:

            rejected_count += 1

            error_counts[error] = (
                error_counts.get(error, 0)
                + 1
            )

            rejected_rows.append(
                {
                    "order_id":
                        row.get("order_id"),

                    "line_no":
                        row.get("line_no"),

                    "error_code":
                        error,

                    "error_message":
                        ERROR_MESSAGES[error],
                }
            )

    # --------------------------------
    # UYARILAR
    # --------------------------------

    customer_totals = {}

    for row in clean_rows_for_db:

        customer_id = row["customer_id"]

        quantity = str(
            row["quantity"]
        ).strip()

        quantity = quantity.replace(
            " ",
            ""
        )

        quantity = quantity.replace(
            ",",
            "."
        )

        line_value = (
            float(quantity)
            * float(row["unit_price"])
        )

        customer_totals[customer_id] = (
            customer_totals.get(
                customer_id,
                0
            )
            + line_value
        )

    warning_counts = {
        "W001": 0,
        "W002": 0,
    }

    warning_customers = []

    warning_details = []

    # --------------------------------
    # W002 - KREDİ LİMİTİ
    # --------------------------------

    for customer_id, total in customer_totals.items():

        if check_credit_limit_exceeded(
            customer_id,
            customer_totals,
            credit_limits,
        ):

            warning_counts["W002"] += 1

            warning_customers.append(
                {
                    "customer_id":
                        customer_id,

                    "warning_code":
                        "W002",

                    "warning_message":
                        "Müşteri kredi limitini aştı",

                    "total":
                        round(total, 2),

                    "credit_limit":
                        credit_limits[
                            customer_id
                        ],
                }
            )

    # --------------------------------
    # W001 - FİYAT SAPMASI
    # --------------------------------
    #
    # W001 sadece domestic dosyada çalışır.
    # Alman dosyasında EUR fiyatını Türkiye'deki
    # materials.csv liste fiyatıyla karşılaştırmıyoruz.
    # --------------------------------

    if not is_german:

        for row in clean_rows_for_db:

            warning = check_price_deviation(
                row,
                material_prices,
            )

            if warning == "W001":

                warning_counts["W001"] += 1

                normalized_code = (
                    row["material_code"]
                    .strip()
                    .upper()
                )

                list_price = (
                    material_prices[
                        normalized_code
                    ]
                )

                actual_price = float(
                    row["unit_price"]
                )

                warning_details.append(
                    {
                        "customer_id":
                            row["customer_id"],

                        "order_id":
                            row["order_id"],

                        "line_no":
                            row["line_no"],

                        "material_code":
                            normalized_code,

                        "warning_code":
                            "W001",

                        "warning_message":
                            "Birim fiyat liste fiyatından %1'den fazla sapıyor",

                        "actual_price":
                            actual_price,

                        "list_price":
                            list_price,
                    }
                )

    # --------------------------------
    # DATABASE
    # --------------------------------

    conn = get_connection()

    with conn:

        load_orders_and_lines(
            conn,
            rows=clean_rows_for_db
        )

    conn.close()

    # --------------------------------
    # RESPONSE
    # --------------------------------

    return {
        "clean_count":
            clean_count,

        "rejected_count":
            rejected_count,

        "error_counts":
            error_counts,

        "rejected_rows":
            rejected_rows,

        "warning_counts":
            warning_counts,

        "warning_customers":
            warning_customers,

        "warning_details":
            warning_details,
    }


# ========================================
# REPORT: SUMMARY
# ========================================

@app.get("/reports/summary")
def report_summary():

    conn = get_connection()

    # --------------------------------
    # DISTINCT CUSTOMER
    # --------------------------------

    customer_row = conn.execute(
        """
        SELECT COUNT(DISTINCT customer_id)
        FROM orders
        WHERE source = ?
        """,
        (current_source,)
    ).fetchone()

    # --------------------------------
    # DISTINCT MATERIAL
    # --------------------------------

    material_row = conn.execute(
        """
        SELECT COUNT(DISTINCT order_lines.material_code)
        FROM order_lines
        JOIN orders
            ON orders.order_id = order_lines.order_id
        WHERE orders.source = ?
        """,
        (current_source,)
    ).fetchone()

    # --------------------------------
    # TOTAL CLEAN REVENUE
    # --------------------------------

    revenue_row = conn.execute(
        """
        SELECT
            SUM(
                order_lines.quantity
                * order_lines.unit_price
            )
        FROM order_lines
        JOIN orders
            ON orders.order_id = order_lines.order_id
        WHERE orders.source = ?
        """,
        (current_source,)
    ).fetchone()

    conn.close()

    return {
        "distinct_customers":
            customer_row[0] or 0,

        "total_customers":
            20,

        "distinct_materials":
            material_row[0] or 0,

        "total_materials":
            18,

        "total_clean_revenue":
            revenue_row[0] or 0,
    }


# ========================================
# REPORT: REVENUE BY CUSTOMER
# ========================================

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
        WHERE orders.source = ?
        GROUP BY orders.customer_id
        """,
        (current_source,)
    ).fetchall()

    conn.close()

    # Müşteri ID → müşteri adı

    with open(
        "data/customers.csv",
        "r",
        encoding="utf-8"
    ) as f:

        customers = list(
            csv.DictReader(f)
        )

    customer_names = {
        row["customer_id"]:
            row["name"]
        for row in customers
    }

    return [
        {
            "customer_name":
                customer_names.get(
                    r[0],
                    r[0]
                ),

            "revenue":
                r[1],
        }
        for r in rows
    ]


# ========================================
# REPORT: TOP MATERIALS BY VALUE
# ========================================

@app.get("/reports/top-materials-by-value")
def top_materials_by_value():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            order_lines.material_code,
            SUM(
                order_lines.quantity
                * order_lines.unit_price
            )
        FROM order_lines
        JOIN orders
            ON orders.order_id = order_lines.order_id
        WHERE orders.source = ?
        GROUP BY order_lines.material_code
        ORDER BY
            SUM(
                order_lines.quantity
                * order_lines.unit_price
            ) DESC
        LIMIT 10
        """,
        (current_source,)
    ).fetchall()

    conn.close()

    # Malzeme kodu → malzeme adı

    with open(
        "data/materials.csv",
        "r",
        encoding="utf-8"
    ) as f:

        materials = list(
            csv.DictReader(f)
        )

    material_names = {
        row["material_code"]
        .strip()
        .upper():
            row["description"]
        for row in materials
    }

    return [
        {
            "material_name":
                material_names.get(
                    r[0]
                    .strip()
                    .upper(),
                    r[0]
                ),

            "value":
                r[1],
        }
        for r in rows
    ]


# ========================================
# REPORT: TOP MATERIALS BY QUANTITY
# ========================================

@app.get("/reports/top-materials-by-quantity")
def top_materials_by_quantity():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            order_lines.material_code,
            SUM(order_lines.quantity)
        FROM order_lines
        JOIN orders
            ON orders.order_id = order_lines.order_id
        WHERE orders.source = ?
        GROUP BY order_lines.material_code
        ORDER BY
            SUM(order_lines.quantity) DESC
        LIMIT 10
        """,
        (current_source,)
    ).fetchall()

    conn.close()

    # Malzeme kodu → malzeme adı

    with open(
        "data/materials.csv",
        "r",
        encoding="utf-8"
    ) as f:

        materials = list(
            csv.DictReader(f)
        )

    material_names = {
        row["material_code"]
        .strip()
        .upper():
            row["description"]
        for row in materials
    }

    return [
        {
            "material_name":
                material_names.get(
                    r[0]
                    .strip()
                    .upper(),
                    r[0]
                ),

            "quantity":
                r[1],
        }
        for r in rows
    ]


# ========================================
# REPORT: ORDERS BY CUSTOMER
# ========================================

@app.get("/reports/orders-by-customer")
def orders_by_customer():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            customer_id,
            COUNT(DISTINCT order_id)
        FROM orders
        WHERE source = ?
        GROUP BY customer_id
        ORDER BY
            COUNT(DISTINCT order_id) DESC
        """,
        (current_source,)
    ).fetchall()

    conn.close()

    with open(
        "data/customers.csv",
        "r",
        encoding="utf-8"
    ) as f:

        customers = list(
            csv.DictReader(f)
        )

    customer_names = {
        row["customer_id"]:
            row["name"]
        for row in customers
    }

    return [
        {
            "customer_name":
                customer_names.get(
                    r[0],
                    r[0]
                ),

            "order_count":
                r[1],
        }
        for r in rows
    ]


# ========================================
# REPORT: ORDERS BY CITY
# ========================================

@app.get("/reports/orders-by-city")
def orders_by_city():

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            ship_to_city,
            COUNT(DISTINCT order_id)
        FROM orders
        WHERE source = ?
        GROUP BY ship_to_city
        ORDER BY
            COUNT(DISTINCT order_id) DESC
        """,
        (current_source,)
    ).fetchall()

    conn.close()

    return [
        {
            "city":
                r[0],

            "order_count":
                r[1],
        }
        for r in rows
    ]
