from intake.german import read_german_orders, load_fx_rates

fx_rates = load_fx_rates("data/fx_rates.csv")
orders = read_german_orders("data/orders_de_2026_07.csv", fx_rates)

print(len(orders))
print(orders[0])