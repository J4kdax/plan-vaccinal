const fs = require("fs");
const vm = require("vm");
const ctx = { console, module: {} };
vm.createContext(ctx);
const countries = fs.readFileSync(__dirname + "/../src/countries.json", "utf8");
vm.runInContext(`const COUNTRIES = ${countries}; const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));`, ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../src/static_data.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../src/engine.js", "utf8"), ctx);
const evaluate = ctx.module.exports.evaluate;

function base(over) {
  const o = { today: "2026-11-19", birth: { y: 1985, m: 3 }, immuno: {}, comorb: {}, hist: {}, vacc: { dtp: "ajour", ror: "2", hepb: "3" }, meds: {}, trip: { departure: "2026-12-24", stops: [], type: {}, exp: {} } };
  return deepMerge(o, over || {});
}
function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]); else a[k] = b[k]; } return a; }
function show(title, r, only) {
  console.log("\n=== " + title + " ===");
  r.items.filter(i => i.status !== "NA").filter(i => !only || only.includes(i.id)).forEach(i => console.log(`  [${i.status}] ${i.name}${i.product ? " – " + i.product : ""}\n      ` + i.reasons.join("\n      ") + (i.ciReasons ? "\n      CI: " + i.ciReasons.join(" ; ") : "")));
  r.alerts.filter(a => a.lvl !== "info").forEach(a => console.log("  ALERT[" + a.lvl + "] " + a.t));
  r.warnings.forEach(w => console.log("  DELAI " + w.t));
}
const expect = (cond, msg) => { if (!cond) { console.log("  ✗ ÉCHEC : " + msg); process.exitCode = 1; } else console.log("  ✓ " + msg); };
const st = (r, id) => (r.items.find(i => i.id === id) || {}).status;

// 1. Kenya puis Tanzanie (provenance)
let r = evaluate(base({ trip: { stops: [{ c: "KE", days: 10, fjZone: "oui" }, { c: "TZ", days: 12 }], exp: { rural: true } } }));
show("Kenya (zone à risque) → Tanzanie, adulte 41 ans", r);
expect(st(r, "fj") === "OBL", "FJ obligatoire (Tanzanie exige en provenance d'un pays à risque, transit > 12 h inclus)");
expect(st(r, "hepa") === "REC", "Hépatite A recommandée");
expect(st(r, "dengue") === "DISC", "Dengue : situation à renseigner");

// 2. Thaïlande 2 semaines, touriste urbain
r = evaluate(base({ trip: { stops: [{ c: "TH", days: 14, dengue: "high", chik: "none" }] } }));
show("Thaïlande 14 j, urbain, dengue endémique", r);
expect(st(r, "fj") === "NA", "FJ : pas d'exigence en provenance de France");
expect(st(r, "dengue") === "NR", "Dengue NR (endémique, < 1 mois)");
expect(st(r, "je") === "NR", "EJ non recommandée sans exposition");

// 3. Thaïlande provenant du Brésil
r = evaluate(base({ trip: { stops: [{ c: "BR", days: 10, fjZone: "oui" }, { c: "TH", days: 10 }] } }));
show("Brésil (zone à risque) → Thaïlande", r, ["fj"]);
expect(st(r, "fj") === "OBL", "FJ : Thaïlande exige en provenance d'un pays à risque");

// 4. Guyane, femme enceinte
r = evaluate(base({ pregnant: true, trip: { stops: [{ c: "GF", days: 15, dengue: "epi", chik: "epi" }] } }));
show("Guyane, grossesse, épidémie dengue + chik", r);
expect(st(r, "fj") === "OBL", "FJ obligatoire en Guyane (statut OBL, précautions grossesse)");
expect(st(r, "dengue") === "CI", "Dengue contre-indiquée (grossesse)");
expect(st(r, "chik") === "NR", "Chik non recommandé (grossesse)");
expect(st(r, "ror") === "OK", "ROR à jour (2 doses)");

// 5. Immunodéprimé (biothérapie) Sénégal
r = evaluate(base({ immuno: { isDrug: true }, trip: { stops: [{ c: "SN", days: 20 }] } }));
show("Sénégal, biothérapie en cours", r, ["fj", "dengue", "ror"]);
expect(st(r, "fj") === "CI", "FJ contre-indiquée (vaccin vivant, immunosuppresseur)");
expect(r.alerts.some(a => /formellement déconseillé/.test(a.t)), "Alerte séjour déconseillé + certificat de contre-indication");

// 6. Enfant 3 ans, Inde 2 mois
r = evaluate(base({ birth: { y: 2023, m: 6 }, vacc: { dtp: "ajour", ror: "2", hepb: "3" }, trip: { stops: [{ c: "IN", days: 60 }], exp: { rural: true, animals: true } } }));
show("Enfant 3 ans, Inde 60 j, rural", r);
expect(st(r, "bcg") === "REC", "BCG recommandé (enfant < 15 ans, > 1 mois, Inde)");
expect(st(r, "rage") === "REC", "Rage recommandée (jeune enfant, zone haut risque)");
expect(st(r, "typh") === "REC", "Typhoïde recommandée (> 1 mois)");
expect(st(r, "je") === "DISC", "EJ à discuter (rural, enfant, séjour prolongé)");

// 7. Pakistan 6 semaines, dernière polio 2015
r = evaluate(base({ vacc: { dtp: "non", polioLast: "2015-05", ror: "2", hepb: "3" }, trip: { stops: [{ c: "PK", days: 42 }] } }));
show("Pakistan 42 j", r, ["polio", "fj"]);
expect(st(r, "polio") === "OBL", "Polio : dose + certificat (PVS1, ≥ 4 semaines)");
expect(st(r, "fj") === "NA", "FJ : Pakistan n'exige qu'en provenance d'un pays à risque");

// 8. Hadj
r = evaluate(base({ birth: { y: 1955, m: 1 }, vacc: { ror: "0" }, comorb: { cardio: true }, trip: { stops: [{ c: "SA", days: 21 }], type: { hadj: true, mass: true } } }));
show("Hadj, 71 ans, cardiopathie", r, ["menacwy", "covid", "grippe", "pneumo", "hepa", "typh", "ror"]);
expect(st(r, "menacwy") === "OBL", "ACWY obligatoire");
expect(st(r, "covid") === "OBL", "Covid exigé (facteur de risque)");
expect(st(r, "pneumo") === "REC", "Pneumocoque > 65 ans");
expect(st(r, "ror") === "REC", "ROR : né avant 1980 non protégé → 1 dose");

// 9. Autriche randonnée
r = evaluate(base({ trip: { stops: [{ c: "AT", days: 7 }], exp: { tbeOutdoor: true } } }));
show("Autriche, randonnée forêt", r, ["tbe", "hepa", "dengue"]);
expect(st(r, "tbe") === "REC", "TBE recommandée (pays en gras)");
expect(st(r, "hepa") === "NA", "Hépatite A non concernée");
expect(st(r, "dengue") === "NA", "Dengue non concernée (Europe)");

// 10. 70 ans, Réunion chik épidémie
r = evaluate(base({ birth: { y: 1956, m: 2 }, comorb: { diabete: true }, trip: { stops: [{ c: "RE", days: 21, chik: "epi" }] } }));
show("Réunion, 70 ans diabétique, chik épidémie", r, ["chik"]);
expect(st(r, "chik") === "REC" && /Vimkunya/.test(r.items.find(i => i.id === "chik").product), "Chik : Vimkunya®");

// 11. Colombie depuis Pérou (exception de provenance)
r = evaluate(base({ trip: { stops: [{ c: "PE", days: 7, fjZone: "non" }, { c: "CO", days: 7, fjZone: "non" }] } }));
show("Pérou (hors zone) → Colombie (hors zone)", r, ["fj"]);
expect(st(r, "fj") === "DISC", "FJ à discuter (zones) mais pas d'obligation Colombie depuis le Pérou");

// 12. Transit Addis (Éthiopie) 3 h → Inde
r = evaluate(base({ trip: { stops: [{ c: "ET", type: "transit", hours: 3 }, { c: "IN", days: 14 }] } }));
show("Transit Éthiopie 3 h → Inde", r, ["fj"]);
expect(st(r, "fj") === "OBL", "Inde : exigée même pour transit quelle que soit la durée");

// 13. Mpox clade I, humanitaire
r = evaluate(base({ trip: { stops: [{ c: "CD", days: 30, mpox: "oui" }], type: { humanitarian: true } } }));
show("RDC humanitaire, mpox clade I", r, ["mpox", "fj", "menacwy"]);
expect(st(r, "mpox") === "REC", "Mpox recommandé (humanitaire)");

// 14. VIH CD4 150
r = evaluate(base({ immuno: { hiv: true, cd4: 150 }, trip: { stops: [{ c: "CI", days: 14 }] } }));
show("VIH CD4 150, Côte d'Ivoire", r, ["fj"]);
expect(st(r, "fj") === "CI", "FJ CI (CD4 < 200)");
r = evaluate(base({ immuno: { hiv: true, cd4: 450 }, trip: { stops: [{ c: "CI", days: 14 }] } }));
expect(st(r, "fj") === "OBL", "FJ obligatoire et possible (CD4 450)");

// 15. Déjà vacciné FJ
r = evaluate(base({ vacc: { dtp: "ajour", ror: "2", hepb: "3", fj: { done: true, date: "2010-04-01" } }, trip: { stops: [{ c: "GA", days: 14 }] } }));
expect(st(r, "fj") === "OK", "FJ à jour (validité à vie)");
r = evaluate(base({ vacc: { dtp: "ajour", ror: "2", hepb: "3", fj: { done: true, date: "2010-04-01" } }, trip: { stops: [{ c: "GA", days: 14, fjEpi: true }] } }));
expect(st(r, "fj") === "OBL", "FJ 2e dose : > 10 ans et épidémie");

// 16. Nourrisson 8 mois Mali
r = evaluate(base({ birth: { y: 2026, m: 4 }, vacc: {}, trip: { stops: [{ c: "ML", days: 21 }] } }));
show("Nourrisson 8 mois, Mali", r, ["fj", "ror", "hepa", "menacwy"]);
expect(st(r, "fj") === "DISC", "FJ : obligation Mali (≥ 9 mois) non applicable à 8 mois → à discuter");
console.log("  âge au départ (mois) :", r.profile.ageM);

// 17. Transit Nairobi 14 h → Afrique du Sud ; puis 5 h
r = evaluate(base({ trip: { stops: [{ c: "KE", type: "transit", hours: 14 }, { c: "ZA", days: 10 }] } }));
expect(st(r, "fj") === "OBL", "Afrique du Sud : transit 14 h au Kenya → exigée");
r = evaluate(base({ trip: { stops: [{ c: "KE", type: "transit", hours: 5 }, { c: "ZA", days: 10 }] } }));
expect(st(r, "fj") === "DISC", "Afrique du Sud : transit 5 h → pas d'obligation mais à vérifier");
// 18. ROR né 1990 1 dose
r = evaluate(base({ birth: { y: 1990, m: 1 }, vacc: { ror: "1" }, trip: { stops: [{ c: "US", days: 10 }] } }));
show("USA, né 1990, 1 dose ROR", r, ["ror", "hepa", "fj", "dengue"]);
expect(st(r, "ror") === "REC", "ROR 2e dose recommandée");
// 19. Expat Vietnam 2 ans, JE + HepB
r = evaluate(base({ vacc: { dtp: "ajour", ror: "2", hepb: "0" }, trip: { stops: [{ c: "VN", days: 730 }], type: { expat: true } } }));
show("Expatriation Vietnam", r, ["je", "hepb", "rage", "typh"]);
expect(st(r, "je") === "REC", "EJ recommandée (expatriation)");
expect(st(r, "hepb") === "REC", "HepB recommandée (séjour prolongé zone forte)");
// 20. Enfant VIH 3 ans BCG
r = evaluate(base({ birth: { y: 2023, m: 1 }, immuno: { hiv: true, cd4pct: 30 }, trip: { stops: [{ c: "CM", days: 60 }] } }));
expect(st(r, "bcg") === "CI", "BCG CI enfant VIH quel que soit CD4");
expect(st(r, "fj") === "OBL", "FJ possible (CD4 30 % à 3 ans ≥ 15 %)");
// 21. Honduras > 60 ans en provenance de Colombie
r = evaluate(base({ birth: { y: 1960, m: 1 }, trip: { stops: [{ c: "CO", days: 10, fjZone: "oui" }, { c: "HN", days: 7 }] } }));
show("66 ans, Colombie → Honduras", r, ["fj"]);
// 22. Smoke test: every country, adult & infant
let errors = 0;
const fs2 = require("fs");
const all = JSON.parse(fs2.readFileSync(__dirname + "/../src/countries.json", "utf8"));
for (const c of all) for (const b of [{ y: 1985, m: 1 }, { y: 2026, m: 2 }, { y: 1940, m: 6 }]) {
  try { evaluate(base({ birth: b, pregnant: b.y === 1985, trip: { stops: [{ c: c.id, days: 40, dengue: "epi", chik: "epi", mpox: "oui", fjZone: "oui", polio: "wpv" }], type: { expat: true, hadj: true, mass: true, health: true }, exp: { rural: true, ricePigs: true, tbeOutdoor: true, freshwater: true, animals: true, sti: true, orAnal: true, mpoxSex: false, meningBelt: true } } })); }
  catch (e) { errors++; console.log("ERR", c.id, e.message); }
}
expect(errors === 0, `Aucune erreur d'exécution sur ${all.length} pays × 3 profils`);
