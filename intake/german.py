import csv

VAT_RATE = 0.19

COLUMN_MAP = {
    "Auftragsnummer": "order_id",
    "Position": "line_no",
    "Kundennummer": "customer_id",
    "Materialnummer": "material_code",
    "Menge": "quantity",
    "Preis": "unit_price",
    "Bestelldatum": "order_date",
    "Waehrung": "currency",
}


def parse_german_number(value):
    cleaned = value.replace(".", "").replace(",", ".")
    return float(cleaned)


def load_fx_rates(path):
    with open(path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    rates = {}
    for row in rows:
        key = (row["from_currency"], row["to_currency"])
        rates[key] = float(row["rate"])
    return rates


def read_german_orders(path, fx_rates):
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        raw_rows = list(reader)

    eur_to_try = fx_rates[("EUR", "TRY")]

    orders = []
    for raw_row in raw_rows:
        order = {}
        for german_name, english_name in COLUMN_MAP.items():
            order[english_name] = raw_row[german_name]

        order["quantity"] = str(parse_german_number(order["quantity"]))

        price_eur = parse_german_number(order["unit_price"])
        price_try_with_vat = price_eur * (1 + VAT_RATE) * eur_to_try
        order["unit_price"] = str(round(price_try_with_vat, 2))

        order["ship_to_city"] = "Germany"
        order["source"] = "germany"

        orders.append(order)

    return orders