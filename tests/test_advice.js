const fs = require("fs"), vm = require("vm");
const ctx = { console, module: {} }; vm.createContext(ctx);
const S = __dirname + "/../src/";
vm.runInContext(`const COUNTRIES = ${fs.readFileSync(S + "countries.json", "utf8")}; const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c])); const PALU = ${fs.readFileSync(S + "palu.json", "utf8")};`, ctx);
vm.runInContext(fs.readFileSync(S + "static_data.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync(S + "advice.js", "utf8"), ctx);
const advise = ctx.module.exports.advise;
let fails = 0; const expect = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ÉCHEC : ") + m); if (!c) fails++; };
const base = (o) => Object.assign({ today: "2026-11-19", birth: { y: 1985, m: 3 }, immuno: {}, comorb: {}, trip: { departure: "2026-12-24", stops: [], type: {}, exp: {} } }, o);
const sec = (r, id) => r.sections.find(s => s.id === id);
let r = advise(base({ trip: { departure: "2026-12-24", stops: [{ c: "SN", days: 14 }], type: {}, exp: {} } }));
expect(r.malaria && r.malaria.cpap === "oui" && r.malaria.max === "eleve", "Sénégal : risque élevé, CPAP indiquée");
r = advise(base({ trip: { departure: "2026-12-24", stops: [{ c: "TH", days: 14 }], type: {}, exp: {} } }));
expect(r.malaria && r.malaria.cpap === "non", "Thaïlande séjour conventionnel : pas de CPAP");
r = advise(base({ trip: { departure: "2026-12-24", stops: [{ c: "TH", days: 60 }], type: {}, exp: { rural: true } } }));
expect(r.malaria && r.malaria.cpap === "discuter", "Thaïlande 60 j rural : avis spécialisé");
r = advise(base({ trip: { departure: "2026-12-24", stops: [{ c: "IT", days: 10 }], type: {}, exp: {} } }));
expect(!r.malaria && !sec(r, "ppav"), "Italie : ni paludisme ni PPAV");
expect(sec(r, "administratif").items[0].t.includes("carte européenne"), "Italie : carte européenne d'assurance maladie");
r = advise(base({ birth: { y: 2026, m: 8 }, trip: { departure: "2026-12-24", stops: [{ c: "CI", days: 21 }], type: {}, exp: {} } }));
const rep = sec(r, "ppav").items.find(i => i.sub);
expect(rep && /Moins de 6 mois/.test(rep.sub[0]), "Nourrisson 4 mois : pas de répulsif, moustiquaire");
r = advise(base({ pregnant: true, weight: 60, trip: { departure: "2026-12-24", stops: [{ c: "CM", days: 14 }], type: {}, exp: {} } }));
const ch = sec(r, "paludisme").items.find(i => /Choix/.test(i.t));
expect(ch && /contre-indiquée à partir du 2e/.test(ch.sub[1]), "Grossesse : doxycycline CI à partir du 2e trimestre");
r = advise(base({ trip: { departure: "2026-12-24", stops: [{ c: "CD", days: 10 }], type: {}, exp: {} } }));
expect(sec(r, "alertes") && /Ébola/.test(sec(r, "alertes").items[0].t), "RDC : alerte Ébola");
let errs = 0;
for (const c of JSON.parse(fs.readFileSync(S + "countries.json", "utf8"))) for (const b of [{ y: 1985, m: 1 }, { y: 2026, m: 6 }, { y: 1950, m: 1 }]) {
  try { advise(base({ birth: b, pregnant: b.y === 1985, breastfeeding: true, weight: 12, avk: true, neuroPsy: true, vte: true, narcotics: true, comorb: { diabete: true, resp: true, drepano: true, irc: true }, immuno: { hiv: true }, trip: { departure: "2026-12-24", stops: [{ c: c.id, days: 200 }], type: { expat: true, vfr: true, repeated: true, group: true }, exp: { rural: true, animals: true, isolated: true, diving: true, altitude: true, cold: true, freshwater: true, sti: true, rawMilk: true, tbeOutdoor: true } } })); }
  catch (e) { errs++; console.log("ERR", c.id, e.message); }
}
expect(errs === 0, "Aucune erreur sur tous les pays × 3 profils");
process.exitCode = fails ? 1 : 0;
