import sys
import csv
from datetime import datetime

DATE_FORMATS = ["%Y-%m-%d", "%d.%m.%Y"]


def parse_date(value):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def profile_file(path, encoding="utf-8"):
    with open(path, "r", encoding=encoding) as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    empty_counts = {}
    distinct_counts = {}

    for column in reader.fieldnames:
        count = 0
        values = []
        for row in rows:
            value = row[column]
            if value == "":
                count += 1
            values.append(value)
        empty_counts[column] = count
        distinct_counts[column] = len(set(values))

    print(f"--- {path} ---")
    print("Toplam satır sayısı:", len(rows))
    print("Kolon başına boş değer sayısı:", empty_counts)
    print("Kolon başına farklı değer sayısı:", distinct_counts)
    print()


def profile_orders_extra():
    with open("data/orders_2026_07.csv", "r", encoding="cp1254") as f:
        rows = list(csv.DictReader(f))

    distinct_customers = len(set(row["customer_id"] for row in rows))
    distinct_materials = len(set(row["material_code"] for row in rows))

    total_quantity = 0
    invalid_quantity_count = 0
    for row in rows:
        value = row["quantity"]
        if not value:
            continue
        try:
            total_quantity += int(value)
        except ValueError:
            invalid_quantity_count += 1

    dates = []
    invalid_date_count = 0
    for row in rows:
        value = row["order_date"]
        if not value:
            continue
        parsed = parse_date(value)
        if parsed is None:
            invalid_date_count += 1
        else:
            dates.append(parsed)

    print("Sipariş dosyası - ek istatistikler:")
    print("Farklı müşteri sayısı:", distinct_customers)
    print("Farklı malzeme sayısı:", distinct_materials)
    print("Toplam miktar:", total_quantity)
    print("Sayıya çevrilemeyen quantity satırı:", invalid_quantity_count)
    if dates:
        print("En erken sipariş tarihi:", min(dates))
        print("En geç sipariş tarihi:", max(dates))
    print("Ayrıştırılamayan (parse edilemeyen) tarih sayısı:", invalid_date_count)
    print()


def run_profile():
    profile_file("data/customers.csv")
    profile_file("data/materials.csv")
    profile_file("data/orders_2026_07.csv", encoding="cp1254")
    profile_orders_extra()


def main():
    if len(sys.argv) < 2:
        print("Kullanım: python -m intake profile")
        return

    command = sys.argv[1]
    if command == "profile":
        run_profile()
    else:
        print(f"Bilinmeyen komut: {command}")


if __name__ == "__main__":
    main()