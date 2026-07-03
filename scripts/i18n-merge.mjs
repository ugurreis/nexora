// {id: turkish} eşlemesini tr/messages.json içindeki translation alanlarına yazar.
// Kullanım: node scripts/i18n-merge.mjs <ceviri.json>
import { readFileSync, writeFileSync } from "node:fs";

const CAT = "apps/web/src/locales/tr/messages.json";
const src = process.argv[2] || "scripts/tr-done.json";

const cat = JSON.parse(readFileSync(CAT, "utf8"));
const done = JSON.parse(readFileSync(src, "utf8"));

let applied = 0;
let missingKeys = 0;
for (const [id, tr] of Object.entries(done)) {
  if (!cat[id]) { missingKeys++; continue; }
  if (typeof tr === "string" && tr.trim() !== "") {
    cat[id].translation = tr;
    applied++;
  }
}
writeFileSync(CAT, JSON.stringify(cat, null, 2) + "\n", "utf8");
console.log(`Uygulanan çeviri: ${applied}. Katalogda olmayan anahtar: ${missingKeys}.`);
