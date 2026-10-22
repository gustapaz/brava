import test from "node:test";
import assert from "node:assert/strict";
import {
  filterProducts,
  sanitizeState,
  addLine,
  totals,
  lineKey,
} from "../src/model.js";
const line = { id: "serra-32", color: "Terra", size: "32L", qty: 1 };
test("busca sem acentos, filtros combinados e ordenação por preço", () => {
  assert.equal(filterProducts({ query: "garrafa" }).length, 1);
  assert.equal(filterProducts({ query: "VESTUARIO" }).length, 2);
  const list = filterProducts({
    category: "Mochilas",
    price: 50000,
    sort: "price-up",
  });
  assert.deepEqual(
    list.map((p) => p.id),
    ["mochila-vereda", "serra-32"],
  );
  assert.equal(filterProducts({ query: "inexistente" }).length, 0);
});
test("favoritos restringem resultados sem mudar o catálogo", () => {
  assert.equal(filterProducts({ favorites: [] }).length, 0);
  assert.deepEqual(
    filterProducts({ favorites: ["cantil-rio"] }).map((p) => p.id),
    ["cantil-rio"],
  );
  assert.equal(filterProducts().length, 9);
});
test("carrinho reúne a mesma variante e limita a quantidade", () => {
  const cart = addLine([], line);
  const next = addLine(cart, { ...line, qty: 9 });
  assert.equal(next.length, 1);
  assert.equal(next[0].qty, 5);
  assert.equal(cart[0].qty, 1);
  assert.notEqual(lineKey(line), lineKey({ ...line, color: "Floresta" }));
  assert.equal(addLine(cart, { ...line, color: "inválida" }), cart);
});
test("variantes diferentes são preservadas", () => {
  const cart = addLine(addLine([], line), { ...line, color: "Floresta" });
  assert.equal(cart.length, 2);
  assert.equal(totals(cart).subtotal, 85800);
});
test("desconto e frete usam centavos inteiros", () => {
  assert.deepEqual(totals([line], "BRAVA10", "rj"), {
    subtotal: 42900,
    discount: 4290,
    freight: 2400,
    total: 41010,
    freeRemaining: 7100,
    quantity: 1,
  });
  assert.equal(totals([line], "INVALID").discount, 0);
  assert.equal(totals([], "BRAVA10").total, 0);
});
test("frete grátis considera subtotal antes do cupom", () => {
  const cart = [
    line,
    { id: "camiseta-caminho", color: "Creme", size: "M", qty: 1 },
  ];
  assert.equal(totals(cart, "BRAVA10").subtotal, 52800);
  assert.equal(totals(cart, "BRAVA10").freight, 0);
  assert.equal(totals(cart, "BRAVA10").total, 47520);
});
test("restaura estado válido e elimina entradas corrompidas", () => {
  const state = sanitizeState({
    version: 1,
    cart: [
      line,
      { ...line },
      null,
      { ...line, id: "não-existe" },
      { ...line, color: "Floresta", qty: -2 },
      { ...line, color: "Areia", qty: 999 },
    ],
    favorites: ["serra-32", "serra-32", "inexistente"],
    shipping: "rj",
    coupon: "BRAVA10",
  });
  assert.equal(state.cart.length, 2);
  assert.equal(state.cart[1].qty, 5);
  assert.deepEqual(state.favorites, ["serra-32"]);
  assert.equal(state.shipping, "rj");
  assert.equal(state.coupon, "BRAVA10");
});
test("dados incompatíveis, destinos e cupons inválidos retornam padrões", () => {
  assert.deepEqual(sanitizeState(null), {
    cart: [],
    favorites: [],
    shipping: "sp",
    coupon: "",
  });
  assert.deepEqual(sanitizeState({ version: 3, cart: [line] }).cart, []);
  assert.equal(
    sanitizeState({ version: 1, shipping: "desconhecido", coupon: "livre" })
      .shipping,
    "sp",
  );
  assert.equal(sanitizeState({ version: 1, coupon: "livre" }).coupon, "");
});
