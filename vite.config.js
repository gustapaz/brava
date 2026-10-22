import { defineConfig } from "vite";
import { products } from "./src/catalog.js";
import { productCard } from "./src/render.js";
export default defineConfig({
  base: "/brava/",
  plugins: [
    {
      name: "static-catalog",
      transformIndexHtml: (html) =>
        html.replace(
          "<!-- CATALOG -->",
          products.map((p) => productCard(p, [], "/brava/")).join(""),
        ),
    },
  ],
  build: { target: "es2022" },
});
