import { icon } from "./icons.js";
import { money } from "./model.js";
export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function productCard(p, favorites = [], base = "./") {
  return `<article class="product-card"><div class="product-image" style="--card-bg:${p.bg}"><span class="product-tag">${p.tag}</span><button class="favorite-button ${favorites.includes(p.id) ? "is-favorite" : ""}" data-action="favorite" data-id="${p.id}" aria-label="${favorites.includes(p.id) ? "Remover" : "Salvar"} ${p.name} nos favoritos" aria-pressed="${favorites.includes(p.id)}">${icon("heart")}</button><a href="#produto/${p.id}" class="product-picture" aria-label="Ver ${p.name}"><img src="${base}images/${p.id}-0.svg" alt="Ilustração de ${p.name} em ${p.colors[0].name}" width="600" height="600" loading="lazy" decoding="async"/></a><button class="quick-add" data-action="product" data-id="${p.id}">${icon("plus")} Escolher opções</button></div><div class="product-info"><div class="product-category">${p.category}<span>${icon("star")} ${p.rating}</span></div><a class="product-name" href="#produto/${p.id}">${p.name}</a><div class="product-bottom"><p class="price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</p><span class="color-dots" aria-label="${p.colors.length} cores disponíveis">${p.colors.map((c) => `<i style="--swatch:${c.hex}"></i>`).join("")}</span></div><p class="installments">em até 3× sem juros na simulação</p></div></article>`;
}
