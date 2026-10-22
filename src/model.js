import { getProduct, products, shippingOptions } from "./catalog.js";
export const money = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterProducts({
  query = "",
  category = "Todos",
  price = 100000,
  favorites = null,
  sort = "featured",
} = {}) {
  const term = normalize(query.trim());
  const list = products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      p.price <= price &&
      (!term ||
        normalize(`${p.name} ${p.category} ${p.description}`).includes(term)) &&
      (!favorites || favorites.includes(p.id)),
  );
  if (sort === "price-up") list.sort((a, b) => a.price - b.price);
  if (sort === "price-down") list.sort((a, b) => b.price - a.price);
  if (sort === "name")
    list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return list;
}
export const lineKey = (line) => `${line.id}|${line.color}|${line.size}`;
export function sanitizeState(raw) {
  const initial = { cart: [], favorites: [], shipping: "sp", coupon: "" };
  if (!raw || typeof raw !== "object" || raw.version !== 1) return initial;
  const seen = new Set();
  const cart = [];
  if (Array.isArray(raw.cart))
    for (const l of raw.cart.slice(0, 100)) {
      const p = l && getProduct(l.id);
      if (
        !p ||
        !p.colors.some((c) => c.name === l.color) ||
        !p.sizes.includes(l.size) ||
        !Number.isInteger(l.qty) ||
        l.qty < 1
      )
        continue;
      const key = lineKey(l);
      if (seen.has(key)) continue;
      seen.add(key);
      cart.push({
        id: p.id,
        color: l.color,
        size: l.size,
        qty: Math.min(l.qty, p.stock, 5),
      });
    }
  return {
    ...initial,
    cart,
    favorites: Array.isArray(raw.favorites)
      ? [...new Set(raw.favorites.filter((id) => getProduct(id)))]
      : [],
    shipping: shippingOptions.some((s) => s.id === raw.shipping)
      ? raw.shipping
      : "sp",
    coupon: raw.coupon === "BRAVA10" ? "BRAVA10" : "",
  };
}
export function addLine(cart, line) {
  const p = getProduct(line.id);
  if (
    !p ||
    !p.colors.some((c) => c.name === line.color) ||
    !p.sizes.includes(line.size) ||
    !Number.isInteger(line.qty) ||
    line.qty < 1
  )
    return cart;
  const next = cart.map((l) => ({ ...l }));
  const existing = next.find((l) => lineKey(l) === lineKey(line));
  const qty = Math.min(5, p.stock, (existing?.qty || 0) + line.qty);
  if (existing) existing.qty = qty;
  else next.push({ ...line, qty });
  return next;
}
export function totals(cart, coupon = "", shipping = "sp") {
  const subtotal = cart.reduce(
    (sum, l) => sum + (getProduct(l.id)?.price || 0) * l.qty,
    0,
  );
  const discount = coupon === "BRAVA10" ? Math.round(subtotal * 0.1) : 0;
  const freight =
    !subtotal || subtotal >= 50000
      ? 0
      : (shippingOptions.find((s) => s.id === shipping) || shippingOptions[0])
          .price;
  return {
    subtotal,
    discount,
    freight,
    total: subtotal - discount + freight,
    freeRemaining: Math.max(0, 50000 - subtotal),
    quantity: cart.reduce((sum, l) => sum + l.qty, 0),
  };
}
export function cartMarkupSummary(cart) {
  return cart
    .map(
      (l) => `${getProduct(l.id).name} · ${l.color} · ${l.size} · ${l.qty} un.`,
    )
    .join("\n");
}
