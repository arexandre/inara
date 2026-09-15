with open("web/app/(app)/compras/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace("purchaseShoppingItem(item.seq_id)", "purchaseShoppingItem(item.id)")
with open("web/app/(app)/compras/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)