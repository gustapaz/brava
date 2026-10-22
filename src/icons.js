const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  bag: "M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  search: "m21 21-5.2-5.2M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "m5 12 4 4L19 6",
  truck:
    "M1 4h13v13H1V4Zm13 5h5l4 5v3h-9M5 17v1a2 2 0 0 0 4 0v-1m7 0v1a2 2 0 0 0 4 0v-1",
  leaf: "M20 3C9 2 2 7 5 15c4 8 15 3 15-12ZM4 21 15 10",
  shield: "M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6l-9-4Zm-4 10 3 3 5-6",
  filter: "M4 7h16M7 12h10m-7 5h4",
  mountain: "m2 20 7-14 4 7 3-5 6 12H2Zm5-10 2 2 2-2",
  menu: "M4 6h16M4 12h16M4 18h16",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  return: "M4 4v6h6M4 10l5-5a7 7 0 1 1-1 12",
  info: "M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.mountain}"/></svg>`;
