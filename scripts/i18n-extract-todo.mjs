// Çevrilmemiş tr girişlerini {id: englishMessage} olarak çıkarır.
// Kullanım: node scripts/i18n-extract-todo.mjs <cikti.json>
import { readFileSync, writeFileSync } from "node:fs";

const CAT = "apps/web/src/locales/tr/messages.json";
const out = process.argv[2] || "scripts/tr-todo.json";

const cat = JSON.parse(readFileSync(CAT, "utf8"));
const todo = {};
for (const [id, entry] of Object.entries(cat)) {
  const t = (entry.translation ?? "").trim();
  if (t === "") todo[id] = entry.message ?? "";
}
writeFileSync(out, JSON.stringify(todo, null, 2), "utf8");
console.log(`Çevrilecek: ${Object.keys(todo).length} → ${out}`);
