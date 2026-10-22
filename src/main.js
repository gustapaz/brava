import "@fontsource-variable/manrope";
import "./style.css";
import {
  products,
  getProduct,
  shippingOptions,
  categories,
} from "./catalog.js";
import {
  money,
  filterProducts,
  sanitizeState,
  addLine,
  lineKey,
  totals,
  cartMarkupSummary,
} from "./model.js";
import { icon } from "./icons.js";
import { productCard } from "./render.js";
const $ = (selector, root = document) => root.querySelector(selector);
const base = import.meta.env.BASE_URL;
const modal = $("#modal"),
  content = $("#modal-content");
const filters = {
  query: "",
  category: "Todos",
  price: 100000,
  sort: "featured",
  favorites: false,
};
let saved,
  storageError = "",
  mode = "",
  previousTrigger = null,
  selection = null,
  toastTimer,
  receipt = null;
try {
  const raw = localStorage.getItem("brava-store");
  saved = sanitizeState(raw ? JSON.parse(raw) : null);
  if (raw && JSON.parse(raw)?.version !== 1)
    storageError =
      "O exemplo foi restaurado porque os dados locais eram incompatíveis.";
} catch {
  saved = sanitizeState(null);
  storageError =
    "Os dados locais não puderam ser recuperados. O exemplo está disponível nesta sessão.";
}
document
  .querySelectorAll("[data-icon]")
  .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
function persist() {
  try {
    localStorage.setItem(
      "brava-store",
      JSON.stringify({ version: 1, ...saved }),
    );
  } catch {
    storageError =
      "Não foi possível salvar neste navegador. As alterações ficam apenas nesta sessão.";
  }
  const warning = $("#storage-warning");
  warning.hidden = !storageError;
  warning.textContent = storageError;
}
function notify(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
}
function updateHeader() {
  const total = totals(saved.cart);
  $("#cart-count").textContent = total.quantity;
  $("#cart-count").parentElement.setAttribute(
    "aria-label",
    `Abrir sacola, ${total.quantity} ${total.quantity === 1 ? "item" : "itens"}`,
  );
  $("#favorites-count").textContent = saved.favorites.length;
  $("#favorites-count").hidden = !saved.favorites.length;
  document
    .querySelector('[data-action="favorites"]')
    .setAttribute("aria-pressed", String(filters.favorites));
}
function renderCatalog() {
  const result = filterProducts({
    ...filters,
    favorites: filters.favorites ? saved.favorites : null,
  });
  $("#product-grid").innerHTML = result.length
    ? result.map((p) => productCard(p, saved.favorites, base)).join("")
    : `<div class="empty-state"><span>${icon(filters.favorites ? "heart" : "search")}</span><h3>${filters.favorites ? "Nenhum favorito nesta seleção." : "Nenhum equipamento por aqui."}</h3><p>${filters.favorites ? "Toque no coração de um produto para guardar uma ideia." : "Experimente outro termo ou limpe os filtros para encontrar seu caminho."}</p><button class="button dark" data-action="clear">Explorar todos os equipamentos ${icon("arrow")}</button></div>`;
  $("#result-count").textContent =
    `${result.length} ${result.length === 1 ? "equipamento" : "equipamentos"}`;
  document
    .querySelectorAll(".category-tabs [data-category]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.category === filters.category),
      ),
    );
  $("#favorites-banner").hidden = !filters.favorites;
  const count =
    Number(filters.price < 100000) +
    Number(filters.category !== "Todos") +
    Number(Boolean(filters.query));
  $("#filter-count").textContent = count ? `(${count})` : "";
  updateHeader();
}
function openDialog(next, html, drawer = false) {
  if (!modal.open) previousTrigger = document.activeElement;
  mode = next;
  modal.className = drawer
    ? "drawer"
    : next === "product"
      ? "product-dialog"
      : "";
  content.innerHTML = html;
  if (!modal.open) modal.showModal();
  else modal.scrollTop = 0;
  queueMicrotask(() => $(".close-dialog", content)?.focus());
  document.body.classList.add("dialog-open");
}
function closeDialog() {
  modal.close();
}
modal.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const items = [
    ...modal.querySelectorAll(
      'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
    ),
  ].filter((el) => el.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
modal.addEventListener("close", () => {
  mode = "";
  document.body.classList.remove("dialog-open");
  if (location.hash.startsWith("#produto/"))
    history.replaceState(null, "", "#catalogo");
  if (previousTrigger?.isConnected) previousTrigger.focus();
  else $("#catalog-title").focus();
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
const closeButton = () =>
  `<button class="icon-button close-dialog" data-action="close" aria-label="Fechar janela">${icon("close")}</button>`;
const dialogHeading = (kicker, title) =>
  `<header class="dialog-heading"><div><p class="eyebrow">${kicker}</p><h2 id="modal-title">${title}</h2></div>${closeButton()}</header>`;
function image(p, color = 0, detail = false) {
  return `<img src="${base}images/${p.id}-${color}.svg" alt="Ilustração de ${p.name}, cor ${p.colors[color].name}" width="600" height="600" class="${detail ? "detail-image" : ""}"/>`;
}
function openProduct(id, keep = false) {
  const p = getProduct(id);
  if (!p) {
    notify("Este equipamento não está no catálogo.");
    history.replaceState(null, "", "#catalogo");
    return;
  }
  if (!keep)
    selection = { id, color: 0, size: p.sizes[0], qty: 1, view: "front" };
  openDialog(
    "product",
    `${closeButton()}<div class="product-detail"><div class="detail-gallery" style="--card-bg:${p.bg}"><span class="product-tag">${p.tag}</span><div class="detail-illustration ${selection.view === "detail" ? "zoomed" : ""}">${image(p, selection.color, true)}</div><div class="gallery-controls"><button data-action="gallery" data-view="front" aria-pressed="${selection.view === "front"}">Visão geral</button><button data-action="gallery" data-view="detail" aria-pressed="${selection.view === "detail"}">Ver de perto ${icon("plus")}</button></div><span class="illustration-note">Ilustração demonstrativa do produto</span></div><div class="detail-copy"><p class="eyebrow">${p.category} / SELEÇÃO BRAVA</p><h2 id="modal-title">${p.name}</h2><div class="rating">${icon("star")} ${p.rating} <span>· ${p.reviews} avaliações fictícias</span></div><p class="detail-price">${money(p.price)} ${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</p><p class="installments">em até 3× sem juros · valores demonstrativos</p><p class="detail-description">${p.description}</p><fieldset class="color-options"><legend>Cor: <strong>${p.colors[selection.color].name}</strong></legend>${p.colors.map((c, i) => `<button type="button" data-action="color" data-color="${i}" class="swatch ${i === selection.color ? "selected" : ""}" style="--swatch:${c.hex}" aria-label="Cor ${c.name}" aria-pressed="${i === selection.color}">${i === selection.color ? icon("check") : ""}</button>`).join("")}</fieldset><fieldset class="size-options"><legend>${p.category === "Vestuário" ? "Tamanho" : "Capacidade"}${p.category === "Vestuário" ? '<button class="text-button" data-action="size-guide">Guia de medidas</button>' : ""}</legend>${p.sizes.map((s) => `<button type="button" data-action="size" data-size="${s}" aria-pressed="${s === selection.size}">${s}</button>`).join("")}</fieldset><div class="add-row"><div class="quantity-control"><button data-action="detail-minus" aria-label="Diminuir quantidade" ${selection.qty === 1 ? "disabled" : ""}>${icon("minus")}</button><output aria-label="Quantidade">${selection.qty}</output><button data-action="detail-plus" aria-label="Aumentar quantidade" ${selection.qty >= Math.min(p.stock, 5) ? "disabled" : ""}>${icon("plus")}</button></div><button class="button dark add-cart" data-action="add">Adicionar à sacola ${icon("bag")}</button><button class="icon-button detail-fav ${saved.favorites.includes(p.id) ? "is-favorite" : ""}" data-action="favorite" data-id="${p.id}" aria-label="${saved.favorites.includes(p.id) ? "Remover dos" : "Salvar nos"} favoritos" aria-pressed="${saved.favorites.includes(p.id)}">${icon("heart")}</button></div><p class="local-note">${icon("shield")} Compra simulada. Nenhuma cobrança ou envio real.</p><details open><summary>Feito para acompanhar você</summary><ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul><dl><div><dt>Material</dt><dd>${p.material}</dd></div><div><dt>Peso aproximado</dt><dd>${p.weight}</dd></div></dl></details><details><summary>Entrega, troca e cuidado</summary><p>Use os destinos fictícios na sacola para simular o frete. Produtos, prazos, avaliações e especificações são ilustrativos. Nenhum pedido é enviado.</p></details></div></div>`,
  );
}
function refreshProduct(focusAction) {
  openProduct(selection.id, true);
  queueMicrotask(() => {
    const el = content.querySelector(focusAction);
    if (el && !el.disabled) el.focus();
  });
}
function favorite(id, button) {
  const active = saved.favorites.includes(id);
  saved.favorites = active
    ? saved.favorites.filter((x) => x !== id)
    : [...saved.favorites, id];
  persist();
  button.setAttribute("aria-pressed", String(!active));
  button.classList.toggle("is-favorite", !active);
  button.setAttribute(
    "aria-label",
    `${active ? "Salvar nos" : "Remover dos"} favoritos`,
  );
  updateHeader();
  if (!modal.open && filters.favorites) {
    renderCatalog();
    $("#catalog-search").focus();
  } else if (!modal.open) {
    const card = button.closest(".product-card");
    if (card)
      button.setAttribute(
        "aria-label",
        `${active ? "Salvar" : "Remover"} ${getProduct(id).name} nos favoritos`,
      );
  }
  notify(
    active
      ? "Equipamento removido dos favoritos."
      : "Uma ideia guardada nos seus favoritos.",
  );
}
function summaryHtml() {
  const t = totals(saved.cart, saved.coupon, saved.shipping);
  return `<dl class="order-totals"><div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>${t.discount ? `<div class="discount"><dt>Desconto BRAVA10</dt><dd>− ${money(t.discount)}</dd></div>` : ""}<div><dt>Entrega simulada</dt><dd>${t.freight ? money(t.freight) : "Grátis"}</dd></div><div class="grand-total"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl>`;
}
function openCart(focusKey) {
  const t = totals(saved.cart, saved.coupon, saved.shipping);
  openDialog(
    "cart",
    `${dialogHeading("BONS CAMINHOS COMEÇAM AQUI", `Sua sacola <span class="title-count">(${t.quantity})</span>`)}${
      !saved.cart.length
        ? `<div class="empty-cart">${icon("bag")}<h3>Um espaço para novos planos.</h3><p>Escolha um equipamento para começar sua aventura imaginária.</p><button class="button dark" data-action="shop">Explorar equipamentos ${icon("arrow")}</button></div>`
        : `<div class="free-shipping"><p>${t.freeRemaining ? `Faltam <strong>${money(t.freeRemaining)}</strong> para o frete simulado grátis.` : "Seu caminho está livre: frete simulado grátis."}</p><progress value="${Math.min(50000, t.subtotal)}" max="50000" aria-label="Progresso para frete grátis"></progress></div><ul class="cart-items">${saved.cart
            .map((l, i) => {
              const p = getProduct(l.id);
              return `<li><div class="cart-thumb" style="--card-bg:${p.bg}">${image(
                p,
                p.colors.findIndex((c) => c.name === l.color),
              )}</div><div class="cart-line"><h3>${p.name}</h3><p>${l.color} / ${l.size}</p><strong>${money(p.price * l.qty)}</strong><div class="cart-line-bottom"><div class="quantity-control small"><button data-action="cart-minus" data-index="${i}" aria-label="Diminuir ${p.name}" ${l.qty === 1 ? "disabled" : ""}>${icon("minus")}</button><output>${l.qty}</output><button data-action="cart-plus" data-index="${i}" aria-label="Aumentar ${p.name}" ${l.qty >= Math.min(5, p.stock) ? "disabled" : ""}>${icon("plus")}</button></div><button class="text-button" data-action="remove" data-index="${i}" aria-label="Remover ${p.name}">Remover</button></div></div></li>`;
            })
            .join(
              "",
            )}</ul><div class="cart-options"><label>Destino de exemplo<select id="shipping">${shippingOptions.map((s) => `<option value="${s.id}" ${s.id === saved.shipping ? "selected" : ""}>${s.name}</option>`).join("")}</select></label><p class="delivery-time">Previsão fictícia: ${shippingOptions.find((s) => s.id === saved.shipping).days}</p><form id="coupon-form" class="coupon-form"><label class="sr-only" for="coupon">Cupom de demonstração</label><input id="coupon" type="text" placeholder="Use BRAVA10 para 10% off" value="${saved.coupon}" maxlength="20" autocomplete="off"/><button type="submit">Aplicar</button></form><p id="coupon-feedback" class="field-feedback" role="status">${saved.coupon ? "Cupom BRAVA10 aplicado." : ""}</p>${saved.coupon ? '<button class="text-button remove-coupon" data-action="remove-coupon">Remover cupom</button>' : ""}</div><div class="cart-summary">${summaryHtml()}<button class="button dark full" data-action="checkout">Continuar para simulação ${icon("arrow")}</button><button class="text-button continue-shopping" data-action="close">Continuar explorando</button><p class="local-note">${icon("shield")} Tudo fictício. Sem cobranças ou dados pessoais.</p></div>`
    }`,
    true,
  );
  if (focusKey) queueMicrotask(() => content.querySelector(focusKey)?.focus());
}
function openCheckout() {
  if (!saved.cart.length) return openCart();
  openDialog(
    "checkout",
    `${dialogHeading("SÓ FALTA CONFERIR O CAMINHO", "Vamos imaginar a próxima saída.")}<div class="checkout-layout"><section><p class="simulation-banner">${icon("info")} Simulação sem cobrança, pagamento ou envio real.</p><h3><span class="step-number">01</span> Destino fictício</h3><label class="field-label">Escolha um endereço de exemplo<select id="checkout-shipping">${shippingOptions.map((s) => `<option value="${s.id}" ${s.id === saved.shipping ? "selected" : ""}>${s.name}</option>`).join("")}</select></label><p class="sample-address">Cliente de demonstração<br/>Rua Exemplo, 100 · Centro<br/>Endereço fictício · ${shippingOptions.find((s) => s.id === saved.shipping).name.split(" · ")[0]}</p><h3><span class="step-number">02</span> Forma de simulação</h3><div class="payment-placeholder">${icon("shield")}<div><strong>Pagamento de demonstração</strong><p>Nenhum cartão, Pix ou dado pessoal é solicitado.</p></div></div><form id="checkout-form"><label class="accept-demo"><input type="checkbox" name="accept" required/>Entendo que este pedido é fictício e não gera compra, cobrança ou entrega.</label><button class="button dark full" type="submit">Confirmar pedido fictício ${icon("arrow")}</button></form><button class="text-button back-to-cart" data-action="cart">Voltar para a sacola</button></section><aside class="checkout-summary"><h3>O que vai na sua aventura</h3>${saved.cart.map((l) => `<div class="checkout-line"><span>${getProduct(l.id).name}<small>${l.color} · ${l.size} · ${l.qty} un.</small></span><strong>${money(getProduct(l.id).price * l.qty)}</strong></div>`).join("")}<div id="checkout-totals">${summaryHtml()}</div><p>Preços, fretes e descontos são apenas ilustrativos.</p></aside></div>`,
  );
}
function showReceipt() {
  if (!receipt) return;
  openDialog(
    "receipt",
    `${closeButton()}<div class="receipt"><span class="receipt-check">${icon("check")}</span><p class="eyebrow">UM PLANO A MAIS. ZERO COBRANÇAS.</p><h2 id="modal-title">O próximo caminho<br/>já dá para <em>imaginar.</em></h2><p>Seu pedido de demonstração foi concluído.</p><div class="receipt-id"><span>COMPROVANTE FICTÍCIO</span><strong>${receipt.id}</strong><p>${receipt.quantity} ${receipt.quantity === 1 ? "item" : "itens"} · Total simulado: ${money(receipt.total)}</p></div><p class="receipt-note">Nenhuma compra, reserva de estoque ou entrega foi realizada. A sacola foi esvaziada apenas neste navegador.</p><button class="button dark full" data-action="download">Baixar comprovante fictício ${icon("download")}</button><button class="text-button" data-action="shop">Continuar explorando ${icon("arrow")}</button></div>`,
  );
}
function showInfo(kind) {
  const info = {
    about: [
      "UMA MARCA IMAGINÁRIA. UMA EXPERIÊNCIA COMPLETA.",
      "O lado de fora inspira.",
      "A Brava é uma loja fictícia criada por Gustavo Paz para explorar o desenvolvimento de interfaces de comércio eletrônico. Produtos, avaliações, preços e especificações são demonstrativos.",
      "Explore filtros, cores, tamanhos, favoritos, sacola e checkout. Todas as ações acontecem neste navegador, sem login ou conexão a serviços de aplicação.",
    ],
    privacy: [
      "SEU NAVEGADOR. SUAS ESCOLHAS.",
      "Tudo fica por aqui.",
      "Sacola, favoritos, destino de exemplo e cupom são salvos na chave brava-store do localStorage. Não há cadastro, analytics, pagamento nem envio de mensagens. Use apenas dados fictícios.",
      "Limpar os dados do site remove essas escolhas. Não existe sincronização entre dispositivos. A hospedagem estática segue a política de privacidade do GitHub.",
    ],
    shipping: [
      "SEM CAMINHÃO A CAMINHO",
      "Entrega e trocas, na demo.",
      "As opções de entrega e seus prazos são fictícios. O frete simulado é grátis a partir de R$ 500 em produtos, antes do desconto BRAVA10. Abaixo disso, varia conforme o destino de exemplo.",
      "Nenhum produto é vendido ou enviado. Não há uma operação comercial real, prazo contratual, cobrança ou processo real de troca. Você pode remover itens ou esvaziar a sacola livremente.",
    ],
  }[kind];
  openDialog(
    kind,
    `${dialogHeading(info[0], info[1])}<div class="info-body"><p>${info[2]}</p><p>${info[3]}</p>${kind === "privacy" ? '<a class="text-button" href="https://docs.github.com/pt/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">Política de privacidade do GitHub ↗</a><button class="button outline full" data-action="reset">Restaurar sacola e favoritos</button>' : ""}<a class="text-button" href="https://github.com/gustapaz/brava" target="_blank" rel="noopener noreferrer">Conhecer o projeto no GitHub ${icon("arrow")}</a></div>`,
  );
}
function showGuide() {
  openDialog(
    "guide",
    `${dialogHeading("UM GUIA PARA ESCOLHER COM CALMA", "Cada caminho pede uma companhia.")}<div class="guide-grid">${[
      [
        "18L",
        "Leve e sem pressa",
        "Para o básico do dia e passeios curtos.",
        "mochila-vereda",
      ],
      [
        "32L",
        "Um dia inteiro lá fora",
        "Espaço para levar mais camadas e pequenos planos.",
        "serra-32",
      ],
      [
        "55L",
        "O horizonte pode esperar",
        "Organização para aventuras de mais de um dia.",
        "mochila-travessia",
      ],
    ]
      .map(
        ([size, title, text, id]) =>
          `<article><span>${size}</span><h3>${title}</h3><p>${text}</p><button class="text-button" data-action="product" data-id="${id}">Conhecer mochila ${icon("arrow")}</button></article>`,
      )
      .join(
        "",
      )}</div><p class="guide-note">Guia ilustrativo de capacidade. Especificações e produtos fictícios.</p>`,
  );
}
function showSizeGuide() {
  const p = getProduct(selection.id);
  openDialog(
    "size-guide",
    `${dialogHeading("GUIA DEMONSTRATIVO", "Um bom caimento faz diferença.")}<div class="info-body"><p>Medidas fictícias da peça em centímetros, com a roupa estendida. Compare com uma peça sua. Não há venda real.</p><div class="size-table"><table><caption>${p.name}</caption><thead><tr><th>Tamanho</th><th>Largura</th><th>Comprimento</th></tr></thead><tbody>${p.sizes.map((s, i) => `<tr><th scope="row">${s}</th><td>${50 + i * 4} cm</td><td>${66 + i * 3} cm</td></tr>`).join("")}</tbody></table></div><button class="button dark" data-action="back-product">Voltar ao produto ${icon("arrow")}</button></div>`,
  );
}
function openMenu() {
  openDialog(
    "menu",
    `${dialogHeading("MENOS ROTINA. MAIS CAMINHO.", "Explore a Brava")}<nav class="mobile-menu-links" aria-label="Navegação móvel">${categories.map((c) => `<a href="#catalogo" data-category="${c}">${c === "Todos" ? "Todos os equipamentos" : c}${icon("arrow")}</a>`).join("")}<a href="#essencia" data-action="close">Nossa essência ${icon("arrow")}</a></nav>`,
    true,
  );
}
document.addEventListener("click", (e) => {
  const category = e.target.closest("[data-category]");
  if (category) {
    filters.category = category.dataset.category;
    filters.favorites = false;
    renderCatalog();
    if (mode === "menu") closeDialog();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "close") closeDialog();
  if (action === "product") {
    const id = button.dataset.id;
    if (location.hash === `#produto/${id}`) openProduct(id);
    else location.hash = `produto/${id}`;
  }
  if (action === "favorite") favorite(button.dataset.id, button);
  if (action === "favorites") {
    filters.favorites = !filters.favorites;
    renderCatalog();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }
  if (action === "search") {
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
    $("#catalog-search").focus({ preventScroll: true });
  }
  if (action === "filters") {
    const hidden = $("#filter-panel").hidden;
    $("#filter-panel").hidden = !hidden;
    button.setAttribute("aria-expanded", String(hidden));
  }
  if (action === "clear") {
    Object.assign(filters, {
      query: "",
      category: "Todos",
      price: 100000,
      sort: "featured",
      favorites: false,
    });
    $("#catalog-search").value = "";
    $("#price-filter").value = 100000;
    $("#price-value").textContent = money(100000);
    $("#sort").value = "featured";
    renderCatalog();
    $("#catalog-search").focus();
  }
  if (action === "color") {
    selection.color = Number(button.dataset.color);
    refreshProduct(`[data-action="color"][data-color="${selection.color}"]`);
  }
  if (action === "size") {
    selection.size = button.dataset.size;
    refreshProduct(`[data-action="size"][data-size="${selection.size}"]`);
  }
  if (action === "gallery") {
    selection.view = button.dataset.view;
    refreshProduct(`[data-action="gallery"][data-view="${selection.view}"]`);
  }
  if (action === "detail-plus" || action === "detail-minus") {
    const p = getProduct(selection.id);
    selection.qty = Math.min(
      p.stock,
      5,
      Math.max(1, selection.qty + (action === "detail-plus" ? 1 : -1)),
    );
    refreshProduct(`[data-action="${action}"]`);
  }
  if (action === "add") {
    const p = getProduct(selection.id);
    const line = {
      id: p.id,
      color: p.colors[selection.color].name,
      size: selection.size,
      qty: selection.qty,
    };
    const before = totals(saved.cart).quantity;
    saved.cart = addLine(saved.cart, line);
    persist();
    updateHeader();
    if (totals(saved.cart).quantity === before)
      notify("Essa combinação já atingiu o limite de 5 unidades na demo.");
    else {
      openCart();
      notify(`${p.name} entrou na sua próxima aventura.`);
    }
  }
  if (action === "cart") openCart();
  if (action === "cart-minus" || action === "cart-plus") {
    const i = Number(button.dataset.index);
    const line = saved.cart[i];
    if (line) {
      line.qty = Math.min(
        5,
        getProduct(line.id).stock,
        Math.max(1, line.qty + (action === "cart-plus" ? 1 : -1)),
      );
      persist();
      updateHeader();
      openCart(`[data-action="${action}"][data-index="${i}"]:not(:disabled)`);
    }
  }
  if (action === "remove") {
    const i = Number(button.dataset.index);
    saved.cart.splice(i, 1);
    persist();
    updateHeader();
    openCart();
    notify("Equipamento removido da sacola.");
  }
  if (action === "remove-coupon") {
    saved.coupon = "";
    persist();
    openCart();
  }
  if (action === "checkout") openCheckout();
  if (action === "shop") {
    closeDialog();
    renderCatalog();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }
  if (["about", "privacy", "shipping"].includes(action)) showInfo(action);
  if (action === "guide") showGuide();
  if (action === "size-guide") showSizeGuide();
  if (action === "back-product") openProduct(selection.id, true);
  if (action === "menu") openMenu();
  if (action === "reset") {
    openDialog(
      "reset",
      `${dialogHeading("VAMOS CONFERIR ANTES?", "Recomeçar por aqui?")}<div class="info-body"><p>A sacola e os favoritos deste navegador serão esvaziados. Nenhum dado de outras pessoas será alterado.</p><div class="confirm-actions"><button class="button outline" data-action="privacy">Manter minhas escolhas</button><button class="button dark" data-action="confirm-reset">Restaurar exemplo</button></div></div>`,
    );
  }
  if (action === "confirm-reset") {
    saved = sanitizeState(null);
    persist();
    renderCatalog();
    closeDialog();
    notify("Um novo começo. Seus dados locais foram restaurados.");
  }
  if (action === "download" && receipt) {
    const blob = new Blob(
      [
        `BRAVA — COMPROVANTE DE DEMONSTRAÇÃO\nNÃO É NOTA FISCAL. NÃO HOUVE COMPRA OU PAGAMENTO.\n\n${receipt.id}\n${receipt.date}\n\n${cartMarkupSummary(receipt.cart)}\n\nSubtotal: ${money(receipt.subtotal)}\nDesconto: ${money(receipt.discount)}\nFrete fictício: ${money(receipt.freight)}\nTOTAL SIMULADO: ${money(receipt.total)}\n\nNenhum envio será realizado.`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brava-pedido-ficticio.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Comprovante fictício preparado para download.");
  }
});
$("#catalog-search").addEventListener("input", (e) => {
  filters.query = e.target.value;
  renderCatalog();
});
$("#sort").addEventListener("change", (e) => {
  filters.sort = e.target.value;
  renderCatalog();
});
$("#price-filter").addEventListener("input", (e) => {
  filters.price = Number(e.target.value);
  $("#price-value").textContent = money(filters.price);
  renderCatalog();
});
content.addEventListener("change", (e) => {
  if (e.target.id === "shipping" || e.target.id === "checkout-shipping") {
    saved.shipping = e.target.value;
    persist();
    if (mode === "checkout") openCheckout();
    else openCart("#shipping");
  }
});
content.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "coupon-form") {
    const code = $("#coupon").value.trim().toUpperCase();
    if (code === "BRAVA10") {
      saved.coupon = code;
      persist();
      openCart("#coupon");
      notify("Cupom aplicado: 10% de desconto fictício.");
    } else {
      const feedback = $("#coupon-feedback");
      feedback.textContent = "Cupom não encontrado. Experimente BRAVA10.";
      feedback.classList.add("error");
    }
  }
  if (e.target.id === "checkout-form" && e.target.reportValidity()) {
    receipt = {
      ...totals(saved.cart, saved.coupon, saved.shipping),
      id: `BRV-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      date: new Date().toLocaleString("pt-BR"),
      cart: structuredClone(saved.cart),
    };
    saved.cart = [];
    saved.coupon = "";
    persist();
    updateHeader();
    showReceipt();
  }
});
window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#produto/"))
    openProduct(location.hash.slice(9));
  else if (mode === "product") closeDialog();
});
window.addEventListener("storage", (e) => {
  if (e.key === "brava-store") {
    try {
      saved = sanitizeState(e.newValue ? JSON.parse(e.newValue) : null);
      renderCatalog();
      if (mode === "cart") openCart();
      if (mode === "checkout") {
        openCart();
        notify(
          "A sacola mudou em outra aba. Confira os itens antes de continuar.",
        );
      }
    } catch {
      notify("Não foi possível atualizar os dados de outra aba.");
    }
  }
});
renderCatalog();
persist();
if (location.hash.startsWith("#produto/")) openProduct(location.hash.slice(9));
