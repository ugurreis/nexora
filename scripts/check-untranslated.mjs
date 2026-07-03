// tr kataloğunda boş translation (çevrilmemiş) sayar; 0 değilse hata verir.
import { readFileSync } from "node:fs";

const CAT = "apps/web/src/locales/tr/messages.json";
const cat = JSON.parse(readFileSync(CAT, "utf8"));

let missing = 0;
const sample = [];
for (const [id, entry] of Object.entries(cat)) {
  const t = (entry.translation ?? "").trim();
  if (t === "") { missing++; if (sample.length < 10) sample.push(`${id}: ${JSON.stringify(entry.message)}`); }
}
if (missing > 0) {
  console.error(`Çevrilmemiş string: ${missing}`);
  console.error("Örnekler:\n" + sample.join("\n"));
  process.exit(1);
}
console.log("Tüm string'ler çevrili.");
