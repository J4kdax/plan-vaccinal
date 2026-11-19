// ---- Moteur de règles : fonction pure evaluate(input) -> résultat ----
// Statuts : OBL (obligatoire/exigé), REC (recommandé), DISC (à discuter / au cas par cas),
//           MAJ (mise à jour du calendrier), OK (à jour), NR (non recommandé), CI (contre-indiqué), INFO

const ST_ORDER = { CI: 0, OBL: 1, REC: 2, MAJ: 3, DISC: 4, OK: 5, NR: 6, INFO: 7 };
const ST_LABEL = { OBL: "Obligatoire", REC: "Recommandé", DISC: "À discuter", MAJ: "Mise à jour", OK: "À jour", NR: "Non recommandé", CI: "Contre-indiqué", INFO: "Information" };

function C(id) { return COUNTRY_BY_ID[id]; }
function dParse(s) { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, (m || 1) - 1, d || 1)); }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function monthsBetween(a, b) { return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0); }
function fjAge(txt) { // âge minimal en mois pour une cellule du tableau 15
  if (!txt) return null;
  if (/9 mois/.test(txt)) return 9; if (/6 mois/.test(txt)) return 6; if (/1 an/.test(txt)) return 12; return 0;
}
function fjApplies(txt, ageM) { // l'exigence s'applique-t-elle à cet âge ?
  if (ageM == null || !txt) return true;
  const min = fjAge(txt); if (min && ageM < min) return false;
  if (/de 1 an à 60 ans/.test(txt) && ageM >= 61 * 12) return false;
  return true;
}
function cellTxt(t) { return t.replace(/^Oui\s*/, ""); }
function isRecoYes(c) { return c && c.fj && c.fj !== "none" && /^Oui/.test(c.fj.reco); }
function recoNeedsZone(c) { const t = c.fj.reco; return t.length > 16; }
function recoOnlyIfHighExposure(c) { return /seulement en cas d.exposition importante/.test(c.fj.reco.slice(0, 80)); }

const SET = (a) => new Set(a);
const HEPA_TEXT = SET(["AF_AUS","AF_CEN","AF_EST","AF_OUE","AF_NOR","ASIE_SE","ASIE_SUD","ASIE_EST","ASIE_CEN","CAUC","MO","AM_CEN","AM_SUD","EU_E"]);
const HEPA_FICHE = SET(["CARA","OI","OCE"]);
const SUBSAH = SET(["AF_AUS","AF_CEN","AF_EST","AF_OUE"]);
const HEPB_HIGH_REG = SET(["AF_AUS","AF_CEN","AF_EST","AF_OUE","ASIE_SE","ASIE_EST","ASIE_CEN"]);
const HEPB_MID_REG = SET(["EU_E","EU_S","AF_NOR","MO","ASIE_SUD","AM_SUD","CAUC"]);
const RAGE_HIGH_REG = SET(["AF_AUS","AF_CEN","AF_EST","AF_OUE","AF_NOR","ASIE_SE","ASIE_SUD","ASIE_EST","ASIE_CEN","CAUC","MO","AM_SUD"]);
const TYPH_FICHE = SET(["AF_AUS","AF_CEN","AF_EST","AF_OUE","AF_NOR","ASIE_SE","ASIE_SUD","OI","OCE"]);
const TYPH_OTHER = SET(["AM_CEN","AM_SUD","CARA","ASIE_EST","ASIE_CEN","CAUC","MO"]);
const LEPTO_REG = SET(["OCE","CARA","AM_CEN","AM_SUD"]);
const SOUTH_HEMI = SET(["ZA","LS","SZ","BW","NA","ZW","MZ","MG","MU","RE","AR","CL","UY","PY","AU","NZ","NC","PF","FJ","WS","TO","CK","NU"]);

const EPI_NONE_REG = SET(["EU_NO","EU_S","EU_E","AM_NOR","ASIE_CEN","CAUC","ATL"]);
function epiDefault(s, key) { const v = s[key]; if (v != null && v !== "") return v; return EPI_NONE_REG.has(C(s.c).r) ? "none" : "?"; }

function evaluate(inp) {
  const out = { items: [], alerts: [], warnings: [], profile: {}, timeline: [] };
  const today = dParse(inp.today);
  const dep = dParse(inp.trip.departure) || today;
  const daysToDep = daysBetween(today, dep);
  const birth = inp.birth && inp.birth.y ? new Date(Date.UTC(inp.birth.y, (inp.birth.m || 1) - 1, 15)) : null;
  const ageM = birth ? monthsBetween(birth, dep) : null; // âge au départ, en mois
  const ageY = ageM == null ? null : Math.floor(ageM / 12);
  const bornBefore1980 = birth ? inp.birth.y < 1980 : null;
  const t = inp.trip, ty = t.type || {}, ex = t.exp || {}, im = inp.immuno || {}, cm = inp.comorb || {}, h = inp.hist || {}, v = inp.vacc || {}, md = inp.meds || {};
  const stops = (t.stops || []).filter(s => s.c && C(s.c));
  const sejours = stops.filter(s => s.type !== "transit");
  const totalDays = sejours.reduce((a, s) => a + (Number(s.days) || 0), 0);
  const P = out.profile;
  P.ageM = ageM; P.ageY = ageY; P.daysToDep = daysToDep; P.totalDays = totalDays;

  // ---------- Profil immunitaire (tableau 4, p. 43) ----------
  const liveCI = []; // raisons de contre-indication aux vaccins vivants
  const liveWarn = [];
  if (im.hiv) {
    const cd4 = im.cd4 === "" || im.cd4 == null ? null : Number(im.cd4);
    const pct = im.cd4pct === "" || im.cd4pct == null ? null : Number(im.cd4pct);
    let ci = null;
    if (ageM != null && ageM < 12) ci = pct == null ? null : pct < 25;
    else if (ageM != null && ageM < 36) ci = pct == null ? null : pct < 20;
    else if (ageM != null && ageM < 60) ci = pct == null ? null : pct < 15;
    else ci = cd4 == null ? null : cd4 < 200;
    if (ci === true) liveCI.push("VIH avec CD4 sous le seuil du tableau 4 (p. 43)");
    else if (ci === null) liveWarn.push("VIH : renseigner les CD4 (adulte et enfant > 5 ans : < 200/mm³ ; enfant < 12 mois : < 25 % ; 12–35 mois : < 20 % ; 36–59 mois : < 15 %) pour statuer sur les vaccins vivants (tableau 4, p. 43)");
  }
  if (im.sotDone) liveCI.push("Transplantation d'organe solide réalisée (tableau 4)");
  if (im.hsct) liveCI.push("Greffe de CSH (< 2 ans, traitement immunosuppresseur en cours ou GVH chronique) (tableau 4)");
  if (im.chemo) liveCI.push("Chimiothérapie en cours ou terminée depuis moins de 6 mois (tableau 4)");
  if (im.isDrug) liveCI.push("Immunosuppresseur, biothérapie ou corticothérapie à dose immunosuppressive en cours (tableau 4)");
  if (im.isStop) liveCI.push("Arrêt récent d'un traitement immunosuppresseur : délai minimal de 3 mois (6 mois après rituximab, 3 mois après bolus de corticoïdes) (tableau 4)");
  if (im.dip) liveCI.push("Déficit immunitaire primitif (hors déficit isolé en IgA) (tableau 4)");
  if (im.sotWait) liveWarn.push("En attente de transplantation sans immunosuppresseur : vaccins vivants possibles, 2 à 4 semaines avant la greffe (tableau 4)");
  const immunodep = !!(im.hiv || im.sotDone || im.hsct || im.chemo || im.isDrug || im.isStop || im.dip);
  P.immunodep = immunodep; P.liveCI = liveCI;
  const comorbChik = !!(cm.hta || cm.diabete || cm.cardio || cm.resp || cm.neurovasc || cm.alcool);
  const anyComorb = comorbChik || !!(cm.hepato || cm.muco || cm.drepano || cm.irc || cm.cancer || cm.neuro || cm.thymus);
  const preg = !!inp.pregnant, bf = !!inp.breastfeeding, bfUnder6 = bf && !!inp.infantUnder6m;

  if (immunodep || preg || anyComorb || (ageY != null && (ageY < 2 || ageY >= 65)))
    out.alerts.push({ lvl: "info", t: "Profil justifiant une consultation spécialisée (centre de vaccinations internationales ou médecin formé à la médecine des voyages) : les fiches régionales de l'annexe 1 ne s'appliquent qu'aux voyageurs sans facteur de risque (âges extrêmes, immunodépression, comorbidités, grossesse).", ref: "Annexe 1, p. 193" });
  if (immunodep) out.alerts.push({ lvl: "info", t: "Immunodépression : vaccins inactivés utilisables, réponse parfois altérée ou brève (contrôle sérologique, rappels supplémentaires possibles). Vaccination de l'entourage voyageant avec la personne utile.", ref: "§ 10.1.7, p. 148 ; § 10.2.3, p. 154" });
  liveWarn.forEach(w => out.alerts.push({ lvl: "warn", t: w, ref: "Tableau 4, p. 43" }));
  if (ageM != null && ageM < 3) out.alerts.push({ lvl: "warn", t: "Nouveau-né / petit nourrisson : voyage déconseillé (pays tropicaux, conditions précaires). Débuter ou avancer les vaccins du calendrier avant le départ dans le respect des AMM.", ref: "§ 10.2, p. 150-152" });

  // ---------- Helpers ----------
  const items = out.items;
  function add(it) { it.reasons = it.reasons || []; it.schema = it.schema || []; it.cautions = it.cautions || []; it.refs = it.refs || []; items.push(it); return it; }
  function lead(it, days, label) { it.lead = days; it.leadLabel = label; }
  const regs = new Set(sejours.map(s => C(s.c).r));
  const inReg = (set) => sejours.filter(s => set.has(C(s.c).r));
  const names = (arr) => [...new Set(arr.map(s => C(s.c).n))].join(", ");
  const longStay = (s) => (Number(s.days) || 0) > 30;
  const prolonged = totalDays > 30 || ty.expat || ty.repeated;
  const ageKnown = ageM != null;

  // ============ FIÈVRE JAUNE (§ 1.7, p. 39-43 ; tableau 15, p. 236-246) ============
  (function () {
    const it = add({ id: "fj", name: "Fièvre jaune", live: true, refs: ["§ 1.7, p. 39-43", "Tableau 15, annexe 2, p. 236-246"] });
    let obl = [], rec = [], disc = [], notListed = [];
    stops.forEach((s, i) => {
      const c = C(s.c); const f = c.fj;
      if (!f) { notListed.push(c.n); return; }
      if (f === "none") return;
      const prev = stops.slice(0, i);
      const immPrev = prev.length ? [prev[prev.length - 1]] : [];
      // remonter la chaîne de transits immédiatement précédents jusqu'à la dernière étape de séjour
      const chain = []; for (let k = i - 1; k >= 0; k--) { chain.push(stops[k]); if (stops[k].type !== "transit") break; }
      const ov = FJ_PROV_OVERRIDE[c.id];
      const isRiskOrigin = (p) => {
        if (ov && ov.list) return ov.list.includes(p.c);
        let r = isRecoYes(C(p.c));
        if (ov && ov.exclude && ov.exclude.includes(p.c)) r = false;
        if (ov && ov.add && ov.add.includes(p.c)) r = true;
        return r;
      };
      const label = `${c.n} (p. ${f.p})`;
      if (f.tous) {
        if (!fjApplies(f.tous, ageM)) disc.push(`${label} : exigée pour tous les voyageurs ${cellTxt(f.tous)} – non applicable à l'âge du voyageur au départ`);
        else if (s.type === "transit") disc.push(`${label} : exigée pour tous les voyageurs ${cellTxt(f.tous)} – simple transit : vérifier si l'exigence s'applique`);
        else obl.push(`${label} : exigée pour tous les voyageurs ${cellTxt(f.tous)}`);
      }
      const cols = [["prov", "en provenance d'un pays à risque de transmission"], ["prov12", "en provenance d'un pays à risque, y compris transit > 12 h dans un aéroport de ce pays"], ["provAny", "en provenance d'un pays à risque, y compris transit quelle que soit la durée"]];
      cols.forEach(([k, lab]) => {
        if (!f[k]) return;
        const hits = chain.filter(p => {
          if (!isRiskOrigin(p)) return false;
          if (p.type !== "transit") return true;
          const hrs = Number(p.hours) || 0;
          if (k === "provAny") return true;
          if (k === "prov12") return hrs > 12 || (c.id === "GY" && hrs > 4);
          return null; // colonne « provenance » sans précision sur les transits
        });
        const earlier = prev.filter(p => !chain.includes(p) && isRiskOrigin(p) && p.type !== "transit");
        if (hits.some(x => x) && !fjApplies(f[k], ageM)) disc.push(`${label} : exigée ${lab} – ${cellTxt(f[k])} – non applicable à l'âge du voyageur au départ`);
        else if (hits.some(x => x)) obl.push(`${label} : exigée ${lab} – ${cellTxt(f[k])} – arrivée depuis ${names(chain.filter(p => isRiskOrigin(p)))}`);
        else if (chain.some(p => isRiskOrigin(p) && p.type === "transit")) disc.push(`${label} : transit par un pays à risque avant l'arrivée ; vérifier si la durée du transit déclenche l'exigence (${f[k]})`);
        else if (earlier.length) disc.push(`${label} : séjour antérieur dans un pays à risque au cours du voyage (${names(earlier)}) ; vérifier les conditions d'entrée (${f[k]})`);
        if (ov && ov.note) it.cautions.push(ov.note);
      });
      if (isRecoYes(c) && s.type !== "transit") {
        if (recoOnlyIfHighExposure(c)) disc.push(`${label} : recommandée seulement en cas d'exposition importante aux piqûres de moustiques dans certaines zones – ${f.reco}`);
        else if (recoNeedsZone(c)) {
          if (s.fjZone === "oui") rec.push(`${label} : séjour dans une zone où la vaccination est recommandée – ${f.reco}`);
          else if (s.fjZone === "non") disc.push(`${label} : séjour déclaré hors des zones à risque ; vérifier le détail – ${f.reco}`);
          else disc.push(`${label} : recommandée selon la zone visitée – préciser la zone de séjour. ${f.reco}`);
        } else rec.push(`${label} : recommandée (risque de transmission) ${cellTxt(f.reco)}`);
      } else if (f.reco && !/^Oui/.test(f.reco) && s.type !== "transit") disc.push(`${label} : ${f.reco}`);
    });
    if (notListed.length) it.cautions.push(`Non listé(s) au tableau 15 : ${notListed.join(", ")} – vérifier sur le site de l'OMS.`);
    it.cautions.push("Tableau 15 = recommandations OMS de janvier 2023 ; actualisation OMS en cours (mai 2026) : vérifier les exigences d'entrée sur le site du ministère des Affaires étrangères et de l'OMS.");
    const anyNeed = obl.length || rec.length || disc.length;
    if (!anyNeed) { it.status = "NA"; return; }
    it.reasons.push(...obl, ...rec, ...disc);
    it.status = obl.length ? "OBL" : rec.length ? "REC" : "DISC";
    if (ageKnown && ageM < 9 && it.status === "REC") { it.status = "DISC"; it.reasons.unshift("Moins de 9 mois : vaccination recommandée à partir de 9 mois ; possible exceptionnellement dès 6 mois (séjour rural/forestier ou épidémie)."); }
    // Déjà vacciné ?
    if (v.fj && v.fj.done) {
      const fjDate = dParse(v.fj.date);
      const years = fjDate ? (dep - fjDate) / (365.25 * 86400000) : null;
      const need2 = [];
      if (v.fj.under2 && ageY != null && ageY >= 6) need2.push("vacciné(e) avant l'âge de 2 ans, aujourd'hui âgé(e) de 6 ans ou plus");
      if (years != null && years > 10) {
        if (v.fj.pregnant) need2.push("primovaccination pendant une grossesse il y a plus de 10 ans");
        if (immunodep) need2.push("personne immunodéprimée / vivant avec le VIH vaccinée il y a plus de 10 ans (conditions du rapport HCSP 2014)");
        if (stops.some(s => s.fjEpi)) need2.push("primovaccination > 10 ans et épidémie signalée dans le pays de destination");
      }
      if (v.fj.under2 && ageY != null && ageY < 6) it.cautions.push("Vacciné(e) avant 2 ans : 2e dose recommandée à partir de 6 ans avant un nouveau départ.");
      if (need2.length) { it.reasons.push("Deuxième dose recommandée : " + need2.join(" ; ")); it.schema.push("1 dose de rappel (2e dose) au moins 10 jours avant le départ."); }
      else { it.status = "OK"; it.reasons.unshift("Déjà vacciné(e) : certificat international valable à vie à partir du 10e jour suivant la vaccination."); }
      if (years == null) it.cautions.push("Date de la vaccination antérieure non renseignée : nécessaire pour les critères de 2e dose (> 10 ans).");
    }
    it.schema.push("Stamaril® (vivant atténué), 1 dose au moins 10 jours avant le départ, à partir de 9 mois (exceptionnellement dès 6 mois si séjour rural/forestier ou épidémie). Centres de vaccination antiamarile agréés.");
    it.schema.push("Certificat international de vaccination (modèle annexe 6 du RSI), valable à vie à compter du 10e jour.");
    lead(it, 10, "≥ 10 jours avant le départ");
    // Contre-indications / précautions
    const ci = [];
    if (liveCI.length) ci.push(...liveCI);
    if (cm.thymus) ci.push("Antécédent de dysfonctionnement du thymus (myasthénie, thymome, thymectomie) : contre-indication définitive (sauf irradiation indirecte du thymus)");
    if (ageKnown && ageM < 6) ci.push("Âge < 6 mois");
    if (ci.length && it.status !== "OK") {
      it.status = "CI"; it.ciReasons = ci;
      out.alerts.push({ lvl: "crit", t: "Fièvre jaune : vaccination impossible. Séjour en zone d'endémie amarile formellement déconseillé. Si le pays exige la vaccination et que le voyage est maintenu : certificat de contre-indication (médecin d'un CVI ou médecin traitant), en anglais ou français, et PPAV diurne renforcée.", ref: "§ 1.7, p. 39" });
    }
    if (ageKnown && ageM >= 6 && ageM < 9) it.cautions.push("Entre 6 et 9 mois : vaccination seulement à titre exceptionnel (séjour rural/forestier ou épidémie). En cas d'épidémie, reporter le voyage de l'enfant est souhaitable.");
    if (preg) it.cautions.push("Grossesse : non recommandé. Si risque élevé (épidémie, séjour rural ou en forêt), envisager un report. Si le séjour ne peut être évité, vaccination possible quel que soit le terme (données CRAT rassurantes).");
    if (bfUnder6) it.cautions.push("Allaitement d'un nourrisson < 6 mois : ne pas vacciner sauf réelle nécessité ; si vaccination, suspendre l'allaitement 2 semaines (tirer le lait sans le donner).");
    else if (bf) it.cautions.push("Allaitement d'un enfant ≥ 6 mois : vaccination possible sans suspension.");
    if (ageY != null && ageY >= 60) it.cautions.push(`Âge ${ageY} ans : pas une contre-indication, mais risque d'effet indésirable grave × 2,3 entre 60 et 69 ans et × 4,8 après 70 ans. Évaluer bénéfice/risque (comorbidités, polymédication, état nutritionnel et fonctionnel, exposition). Après 70 ans, la recherche d'anticorps anti-interféron peut guider la décision.`);
    if (inp.antiIFN) it.cautions.push("Auto-anticorps anti-interféron ou déficit du récepteur de l'interféron connus : risque de maladie neurotrope ou viscérotrope post-vaccinale.");
    if (cm.drepano) it.cautions.push(cm.hydroxyurea ? "Drépanocytose sous hydroxycarbamide : le § 1.7 (p. 41) indique une association « théoriquement contre-indiquée » selon le RCP (étude rassurante), alors que le § 10.1.8 (p. 149) indique qu'elle « ne constitue pas une contre-indication ». Décision à prendre avec l'hématologue ; sérologie FJ recommandée avant une nouvelle dose." : "Drépanocytose non traitée : pas de contre-indication.");
    if (im.hiv && !liveCI.length) it.cautions.push("VIH sans contre-indication : délai d'acquisition de l'immunité possiblement allongé et durée de protection possiblement < 10 ans.");
    if (im.asplenia) it.cautions.push("Asplénie/hyposplénie : pas de contre-indication (tableau 4).");
    it.cautions.push("Don du sang suspendu 4 semaines après la vaccination.");
  })();

  // ============ POLIOMYÉLITE (§ 1.14, p. 62-64 ; figure 11) ============
  (function () {
    const it = add({ id: "polio", name: "Poliomyélite (et dTP/dTCaP)", refs: ["§ 1.14, p. 62-64", "Figure 11, p. 63"] });
    const lastPolio = v.polioLast ? dParse(v.polioLast + "-15") : null;
    const monthsSince = lastPolio ? monthsBetween(lastPolio, dep) : null;
    const exposed = []; const unk = [];
    const byCountry = {};
    sejours.forEach(s => { byCountry[s.c] = (byCountry[s.c] || 0) + (Number(s.days) || 0); });
    Object.keys(byCountry).forEach(cid => {
      const s = sejours.find(x => x.c === cid); const st = s.polio || POLIO_DEFAULT[cid] || "none";
      if (st === "wpv" || st === "cvdpv2") exposed.push({ c: C(cid), st, days: byCountry[cid] });
      else if (st === "?") unk.push(C(cid).n);
    });
    const dtpOk = v.dtp === "ajour";
    const long = exposed.filter(e => e.days >= 28);
    if (long.length) {
      const recent = monthsSince != null && monthsSince <= 12 && daysBetween(lastPolio, dep) >= 28;
      long.forEach(e => it.reasons.push(`${e.c.n} : séjour de ${e.days} j (≥ 4 semaines) dans un pays de circulation ${e.st === "wpv" ? "de poliovirus sauvage PVS1 / PVDVc1 / PVDVc3 (certificat international exigible)" : "de PVDVc2"}.`));
      if (recent) { it.status = "OK"; it.reasons.unshift("Dernière dose de vaccin poliomyélitique inactivé dans la fenêtre 4 semaines – 12 mois avant le départ."); }
      else { it.status = long.some(e => e.st === "wpv") ? "OBL" : "REC"; it.reasons.unshift(lastPolio ? `Dernière dose il y a ${monthsSince} mois : nouvelle dose nécessaire.` : "Date de la dernière dose de vaccin polio inconnue : dose recommandée."); }
      it.schema.push("1 dose de vaccin poliomyélitique inactivé (combiné dTP, dTCaP…) entre 4 semaines et 12 mois avant le départ (à partir de 2 mois). En cas de départ en urgence sans dose dans les 12 mois : 1 dose, si possible 4 semaines avant le départ.");
      if (long.some(e => e.st === "wpv")) it.schema.push("Inscrire la dose sur le certificat international de vaccination (pays PVS1 / PVDVc1 / PVDVc3).");
      if (long.some(e => e.days > 365)) it.schema.push("Séjour > 12 mois : une 2e dose peut être exigée (RSI) au moins 1 mois avant de quitter le pays.");
      lead(it, 28, "4 semaines à 12 mois avant le départ");
    } else {
      if (exposed.length) it.reasons.push(`Séjour < 4 semaines dans un pays de circulation (${exposed.map(e => e.c.n).join(", ")}) : mise à jour selon le calendrier vaccinal.`);
      it.status = dtpOk ? "OK" : "MAJ";
      it.reasons.push(dtpOk ? "Calendrier diphtérie-tétanos-poliomyélite(-coqueluche) déclaré à jour." : "Mise à jour du calendrier (diphtérie, tétanos, poliomyélite, coqueluche) : indispensable pour tout voyage (fiches régionales, § 1).");
    }
    if (unk.length) it.cautions.push(`Statut polio à confirmer sur la liste OMS/GPEI en vigueur pour : ${unk.join(", ")} (cas de PVDVc2 signalés en 2025 en Angola, au Tchad, au Nigéria et en Somalie).`);
    it.cautions.push("La liste des pays de circulation est révisée tous les 3 mois par l'OMS (Polio this week – GPEI). Certains pays sans circulation exigent aussi une dose à l'entrée : vérifier sur le site du ministère des Affaires étrangères.");
    if (preg) it.cautions.push("Grossesse : vaccin poliomyélitique injectable possible ; coqueluche (en association) recommandée (tableau 14).");
    if (!dtpOk && long.length === 0 && v.dtp !== "ajour") it.schema.push("Vérifier et compléter le schéma dTP(ca) selon le calendrier des vaccinations 2026.");
  })();

  // ============ ROUGEOLE – ROR (§ 1.16, p. 68-69 ; alerte p. 10) ============
  (function () {
    const it = add({ id: "ror", name: "Rougeole-oreillons-rubéole (ROR)", live: true, refs: ["§ 1.16, p. 68-69", "Alerte rougeole, p. 10"] });
    if (!ageKnown) { it.status = "INFO"; it.reasons.push("Renseigner la date de naissance."); return; }
    const doses = v.ror === "inconnu" || v.ror == null || v.ror === "" ? null : Number(v.ror);
    const naUS = sejours.some(s => ["US", "CA", "MX"].includes(s.c));
    if (ageM < 6) { it.status = "NA"; it.reasons.push("Avant 6 mois : pas de vaccination ROR."); return; }
    if (ageM < 12) {
      it.status = naUS ? "REC" : "DISC";
      it.reasons.push(naUS ? "Nourrisson de 6 à 11 mois se rendant dans une zone à forte circulation (épidémie en Amérique du Nord)." : "Nourrisson de 6 à 11 mois : 1 dose si voyage dans une zone de forte endémicité (cf. figures 15-16, données OMS/ECDC).");
      it.schema.push("1 dose de ROR (cadre de prescription compassionnelle entre 6 et 8 mois révolus), puis 2 doses selon le calendrier (12 mois, puis 16-18 mois).");
    } else if (bornBefore1980) {
      if (h.measles || (doses != null && doses >= 1)) { it.status = "OK"; it.reasons.push("Né(e) avant 1980, protégé(e) (antécédent de rougeole ou vaccination antérieure)."); }
      else { it.status = "REC"; it.reasons.push("Né(e) avant 1980 sans antécédent connu de rougeole ni vaccination : 1 dose de ROR avant un voyage en pays d'endémie."); it.schema.push("1 dose de ROR avant le départ."); }
    } else {
      let needed = 2 - (doses || 0);
      if (doses === 2 && v.rorEarly) needed = 1;
      if (doses == null) {
        it.status = "REC"; it.reasons.push("Statut vaccinal inconnu (né(e) à partir de 1980) : 2 doses à au moins 1 mois d'intervalle, sans sérologie préalable.");
        it.schema.push("2 doses de ROR à ≥ 1 mois d'intervalle.");
      } else if (needed > 0) {
        it.status = "REC";
        it.reasons.push(doses === 2 && v.rorEarly ? "2 doses reçues dont la 1re avant 12 mois : une 3e dose est nécessaire." : `Né(e) à partir de 1980 avec ${doses} dose(s) : rattrapage pour atteindre 2 doses au total, quels que soient les antécédents vis-à-vis des 3 maladies (essentiel du fait de la recrudescence).`);
        if (ageM < 18 && doses === 1) it.schema.push("2e dose prévue à 16-18 mois, avançable en cas de voyage (≥ 1 mois après la 1re).");
        else it.schema.push(`${needed} dose(s) de ROR, à ≥ 1 mois d'intervalle entre 2 doses.`);
        if (h.measles) it.cautions.push("Antécédent de rougeole déclaré : le schéma du § 1.16 (p. 69) prévoit le rattrapage « quels que soient les antécédents », alors que l'alerte p. 10 cible les personnes « sans antécédent de rougeole ». À apprécier selon la fiabilité de l'antécédent.");
      } else { it.status = "OK"; it.reasons.push("2 doses de ROR documentées."); }
    }
    if (naUS && it.status !== "OK") it.reasons.push("Épidémie de rougeole en Amérique du Nord (coupe du monde de football 2026) : protection rapide après une dose pré-voyage.");
    it.cautions.push("Vaccination possible chez le médecin, l'infirmier ou en pharmacie (à partir de 11 ans).");
    if (liveCI.length && ["REC", "DISC", "MAJ"].includes(it.status)) { it.status = "CI"; it.ciReasons = liveCI.slice(); }
    if (preg && ["REC", "DISC", "MAJ"].includes(it.status)) { it.status = "CI"; it.ciReasons = ["Grossesse (vaccin vivant atténué). Vacciner après l'accouchement ; une vaccination par mégarde ne justifie pas d'interruption."]; }
    if (it.status === "REC" || it.status === "DISC") it.cautions.push("Éviter une grossesse dans le mois suivant la vaccination (contraception). Allaitement : pas de contre-indication.");
  })();

  // ============ HÉPATITE A (§ 1.9, p. 48-49) ============
  (function () {
    const it = add({ id: "hepa", name: "Hépatite A", refs: ["§ 1.9, p. 48-49"] });
    const txt = inReg(HEPA_TEXT), fic = inReg(HEPA_FICHE);
    const sexOA = !!ex.orAnal, mass = !!ty.mass;
    if (!txt.length && !fic.length && !sexOA && !mass) { it.status = "NA"; return; }
    if (ageKnown && ageM < 12) { it.status = "NA"; it.reasons.push("Vaccination à partir de 1 an."); return; }
    if (txt.length) it.reasons.push(`Pays où le niveau d'hygiène peut être insuffisant (Asie y compris Turquie, Afrique, Amérique centrale et du Sud, Europe de l'Est) : ${names(txt)} – recommandée quelles que soient les conditions du séjour.`);
    if (fic.length) it.reasons.push(`Fiche régionale « recommandée » : ${names(fic)}${fic.some(s => ["AU", "NZ"].includes(s.c)) ? " (la fiche Océanie inclut l'Australie et la Nouvelle-Zélande ; le § 1.9 vise les pays à hygiène insuffisante : à apprécier)" : ""}.`);
    if (sexOA) it.reasons.push("Rapports oro-anaux (§ 9.1).");
    if (mass) it.reasons.push("Grand rassemblement (§ 8.2).");
    const d = Number(v.hepa || 0);
    if (d >= 2) { it.status = "OK"; it.reasons.unshift("2 doses reçues."); }
    else if (d === 1) { it.status = "OK"; it.reasons.unshift("1 dose reçue : protection assurée ; 2e dose à faire pour compléter, quel que soit le délai (sans reprendre le schéma)."); }
    else it.status = "REC";
    if (cm.hepato || cm.muco) it.reasons.push("Particulièrement recommandée : maladie chronique du foie ou mucoviscidose.");
    if ((h.jaundice || (birth && inp.birth.y < 1945)) && d === 0) it.cautions.push("Sérologie préalable pertinente (IgG anti-VHA) : antécédent d'ictère, enfance en zone d'endémie ou naissance avant 1945. Si IgG positives : ne pas vacciner.");
    it.schema.push("1re dose 15 jours avant le départ ; 2e dose à partir de 6 mois après (délai selon AMM). 1–15 ans : Avaxim 80®, Havrix 720® ; ≥ 16 ans : Avaxim 160®, Havrix 1440® ; ≥ 18 ans : Vaqta 50® ; Twinrix adulte® (A+B) ≥ 16 ans : J0, M1, M6.");
    it.schema.push("Schéma à 1 dose possible hors AMM chez l'enfant et l'adulte de 40 ans ou moins.");
    lead(it, 15, "1re dose idéalement 15 jours avant le départ");
    if (preg) it.cautions.push("Grossesse / allaitement : possible.");
  })();

  // ============ HÉPATITE B (§ 1.10, p. 49-50) ============
  (function () {
    const it = add({ id: "hepb", name: "Hépatite B", refs: ["§ 1.10, p. 49-50", "§ 9.1, p. 142"] });
    const st = v.hepb;
    if (st === "3" || st === "immun") { it.status = "OK"; it.reasons.push(st === "immun" ? "Immunité connue." : "Schéma complet."); return; }
    const high = sejours.filter(s => HEPB_HIGH_REG.has(C(s.c).r) || ["KM", "MG", "MU", "SC"].includes(s.c));
    const mid = sejours.filter(s => !high.includes(s) && (HEPB_MID_REG.has(C(s.c).r) || C(s.c).dom));
    const travelInd = (high.length || mid.length) && prolonged;
    const child = ageY != null && ageY <= 15;
    if (travelInd) { it.status = "REC"; it.reasons.push(`Séjour prolongé ou fréquent dans une zone de prévalence ${high.length ? "forte" : "moyenne"} du portage chronique : ${names([...high, ...mid])}.`); }
    if (ex.sti) { it.status = "REC"; it.reasons.push("Sexualité exposant à un risque d'IST (§ 9.1)."); }
    if (child && !it.status) { it.status = "MAJ"; it.reasons.push("Enfant/adolescent jusqu'à 15 ans : rattrapage selon le calendrier des vaccinations."); }
    if (!it.status) {
      if (high.length || mid.length) { it.status = "DISC"; it.reasons.push(`Zone de prévalence ${high.length ? "forte" : "moyenne"} (${names([...high, ...mid])}) ; séjour court : vaccination surtout si séjours fréquents ou prolongés, ou facteurs de risque.`); }
      else { it.status = "NA"; return; }
    }
    if (st === "1" || st === "2") it.reasons.unshift(`${st} dose(s) déjà reçue(s) : compléter le schéma.`);
    it.schema.push("Sérologie proposée avant vaccination (Ag HBs, Ac anti-HBs, Ac anti-HBc).");
    it.schema.push("Standard : 2 doses à ≥ 1 mois d'intervalle, 3e dose 6 mois après la 1re (≥ 5 mois entre 2e et 3e). 11–15 ans : possible en 2 doses d'Engerix B 20 µg à 6 mois d'intervalle, les 2 avant le départ.");
    it.schema.push("Accéléré si départ imminent : adulte Engerix B 20 µg J0, J7, J21 + rappel à M12 ; enfant ≤ 15 ans Engerix B 10 µg M0, M1, M2 + rappel à M12.");
    lead(it, 21, "schéma accéléré adulte : J0-J7-J21");
  })();

  // ============ TYPHOÏDE (§ 1.1 [typhoïde], p. 44-46) ============
  (function () {
    const it = add({ id: "typh", name: "Fièvre typhoïde", refs: ["§ « 1.1 » Fièvre typhoïde, p. 44-46", "Tableau 5, p. 46"] });
    const fic = inReg(TYPH_FICHE), oth = inReg(TYPH_OTHER);
    const cond = totalDays > 30 || ex.poorHygiene || ty.expat;
    if (ex.orAnal) { it.status = "REC"; it.reasons.push("Rapports oro-anaux (§ 9.1)."); }
    if (ty.mass) { it.status = "REC"; it.reasons.push("Grand rassemblement (§ 8.2)."); }
    if (fic.length) {
      if (cond) { it.status = "REC"; it.reasons.push(`Séjour prolongé (> 1 mois) ou dans de mauvaises conditions d'hygiène : ${names(fic)}.`); }
      else if (!it.status) { it.status = "DISC"; it.reasons.push(`Fiche régionale : au cas par cas si conditions d'hygiène précaires (${names(fic)}).`); }
    }
    if (oth.length) {
      if (cond && !it.status) { it.status = "DISC"; it.reasons.push(`Séjour prolongé ou conditions précaires (${names(oth)}) : recommandée si le pays a un niveau d'hygiène faible et une maladie endémique (figure 7) ; non citée dans la fiche régionale.`); }
    }
    if (!it.status) { it.status = "NA"; return; }
    if (v.typh) { const d = dParse(v.typh + "-15"); const yrs = (dep - d) / (365.25 * 86400000); if (yrs < 3) { it.status = "OK"; it.reasons.unshift(`Dernière vaccination il y a ${yrs.toFixed(1)} an(s) (protection environ 3 ans ; Typhim Vi® : revaccination tous les 2-3 ans si exposition maintenue).`); } }
    it.schema.push("Typhim Vi® (polyosidique, injectable) : 1 injection 15 jours avant le départ, dès 2 ans.");
    it.schema.push("Vivotif® (oral vivant) : dès 5 ans, 3 gélules à J1, J3, J5, à jeun, eau < 37 °C ; 1re gélule 15 jours avant le départ.");
    it.schema.push("Ne protège pas contre S. Paratyphi A ou B ; hygiène de l'eau, des aliments et des mains essentielle.");
    lead(it, 15, "15 jours avant le départ");
    if (ageKnown && ageM < 24) { it.status = "NA"; it.reasons = ["Vaccins disponibles à partir de 2 ans (Typhim Vi®)."]; return; }
    if (ageKnown && ageM < 60) it.cautions.push("Avant 5 ans : Typhim Vi® uniquement.");
    if (preg || bf) it.cautions.push("Grossesse/allaitement : Typhim Vi® possible ; Vivotif® contre-indiqué.");
    if (immunodep) it.cautions.push("Immunodépression : Vivotif® contre-indiqué, utiliser Typhim Vi®.");
    if (md.antibio) it.cautions.push("Antibiotique / sulfamide : différer Vivotif® pendant le traitement et 3 jours avant/après (plus long pour l'azithromycine).");
    if (md.antimal) it.cautions.push("Chimioprophylaxie antipaludique prévue : respecter ≥ 3 jours entre la dernière gélule de Vivotif® et le début de l'antipaludique.");
  })();

  // ============ MÉNINGOCOQUES (§ 1.11, p. 51-54 ; § 8.2) ============
  (function () {
    const it = add({ id: "menacwy", name: "Méningocoques A, C, W, Y (conjugué)", refs: ["§ 1.11, p. 51-54", "§ 8.2, p. 139-141"] });
    const hajj = sejours.some(s => s.c === "SA") && (ty.hadj);
    const sa = sejours.some(s => s.c === "SA");
    const last = v.men ? dParse(v.men + "-15") : null;
    const yrs = last ? (dep - last) / (365.25 * 86400000) : null;
    const ageAtLast = last && birth ? monthsBetween(birth, last) / 12 : null;
    if (hajj) {
      const valid = last && v.menConj && yrs <= 5 && daysBetween(last, dep) >= 10;
      it.status = valid ? "OK" : "OBL";
      it.reasons.push(valid ? "Pèlerinage : vaccin conjugué ACWY daté de plus de 10 jours et de moins de 5 ans." : "Pèlerinage à La Mecque (Hadj/Omra) : vaccination ACWY obligatoire pour le visa à partir de 1 an, ≥ 10 jours avant le départ, inscrite sur le certificat international.");
      it.schema.push("Validité administrative : 5 ans pour un vaccin conjugué (préciser « Meningococcal conjugate tetravalent ACWY vaccine » sur le certificat), 3 ans pour un polysaccharidique ou si le type n'est pas mentionné.");
      lead(it, 10, "≥ 10 jours avant le départ");
    } else if (sa) {
      it.status = "DISC"; it.reasons.push("Arabie saoudite hors pèlerinage : le § 1.11 mentionne l'obligation pour l'obtention des visas « pour tout séjour » dans le paragraphe consacré aux pèlerinages ; vérifier les exigences de visa en vigueur.");
    }
    if (ex.meningBelt) { if (it.status !== "OBL") it.status = "REC"; it.reasons.push("Séjour dans la ceinture de la méningite (savane et Sahel, du Sénégal à l'Éthiopie) en saison sèche, ou en zone d'épidémie, avec contact étroit et prolongé avec la population locale."); }
    if ((ty.health || ty.refugees) && sejours.some(s => SUBSAH.has(C(s.c).r))) { if (it.status !== "OBL") it.status = "REC"; it.reasons.push("Activité dans le secteur de la santé ou auprès de réfugiés en zone d'endémie IIM, quelle que soit la saison."); }
    if (ex.sti) { if (!it.status) it.status = "DISC"; it.reasons.push("Sexualité à risque d'IST : surrisque d'IIM observé chez les HSH (§ 9.1)."); }
    // calendrier
    if (ageY != null && ageY >= 11 && ageY <= 24 && !(ageAtLast != null && ageAtLast >= 11)) {
      if (!it.status || it.status === "NA") it.status = "MAJ";
      it.reasons.push(ageY <= 14 ? "Calendrier : 1 dose recommandée entre 11 et 14 ans, indépendamment du statut vaccinal." : "Calendrier : rattrapage 1 dose de 15 à 24 ans révolus (fiches : « méningocoque ACWY ≤ 25 ans »).");
    }
    if (ageY != null && ageY < 2) { if (!it.status) it.status = "MAJ"; it.reasons.push("Nourrisson : vaccination ACWY obligatoire avant 2 ans (6 et 12 mois) ; possible dès 6 semaines (Nimenrix®) avant un voyage."); }
    if (ageY != null && ageY >= 2 && ageY <= 4 && !last) { if (!it.status) it.status = "MAJ"; it.reasons.push("Calendrier : rattrapage transitoire recommandé de 2 à 4 ans."); }
    if ((ty.expat) && !it.status) { it.status = "DISC"; it.reasons.push("Expatriation : considérer les recommandations du pays de destination (ex. États-Unis : 11-12 ans + rappel à 16 ans ; Royaume-Uni : 14 ans ; Australie : 14-16 ans ; Nouvelle-Zélande : 13-25 ans en promiscuité)."); }
    if (!it.status) { it.status = "NA"; return; }
    if (it.status === "REC" && last && yrs != null) {
      if (yrs < 5) { it.status = "OK"; it.reasons.unshift(`Dernière dose de vaccin ACWY il y a ${yrs.toFixed(1)} an(s).`); }
      else it.reasons.unshift(`Dernière dose il y a ${yrs.toFixed(1)} ans : un rappel peut être envisagé 5 ans après la primovaccination en cas de risque avéré.`);
    }
    if (inp.complement || im.asplenia || im.hsct) it.cautions.push("Déficit en complément ou properdine, traitement anti-complément, asplénie ou greffe de CSH : appliquer les « recommandations particulières vis-à-vis des IIM » du calendrier en vigueur (ACWY et B).");
    it.schema.push("Nimenrix® (dès 6 semaines), MenQuadfi® (dès 12 mois), Menveo® (dès 2 ans). Nimenrix® de 6 semaines à 6 mois : 2 doses à 2 mois d'intervalle ; de 6 à 12 mois : 1 dose ; rappel à 12 mois (≥ 2 mois après la dose précédente). À partir de 12 mois : 1 dose.");
    it.cautions.push("Méningocoque B (Bexsero®, Trumenba®) : obligatoire chez le nourrisson, rattrapage 2-5 ans, peut être proposé de 15 à 24 ans ; à considérer lors d'une expatriation selon la politique du pays (ex. États-Unis : 16-18 ans).");
    if (!it.lead) lead(it, 10, "10 à 15 jours avant le départ");
  })();

  // ============ ENCÉPHALITE JAPONAISE (§ 1.5, p. 30-33 ; tableau 2) ============
  (function () {
    const it = add({ id: "je", name: "Encéphalite japonaise", refs: ["§ 1.5, p. 30-33", "Tableau 2, p. 31-32"] });
    const st = sejours.filter(s => JE[s.c]);
    if (!st.length) { it.status = "NA"; return; }
    if (ageKnown && ageM <= 2) { it.status = "NA"; it.reasons.push("Ixiaro® indiqué au-delà de 2 mois."); return; }
    const strong = ex.ricePigs || ex.rainy || st.some(s => s.jeEpi);
    const rep = ty.expat || ty.repeated;
    const softs = []; if (ex.rural) softs.push("zone rurale"); if (st.some(longStay)) softs.push("séjour prolongé"); if (ageY != null && ageY < 18) softs.push("enfant (formes graves)");
    const low = st.every(s => JE[s.c].low);
    if (strong) { it.status = low ? "DISC" : "REC"; it.reasons.push("Risque accru d'exposition : rizières (irrigation par inondation), proximité d'élevages porcins, saison des pluies ou épidémie – séjour quelle qu'en soit la durée."); }
    else if (rep) { it.status = low ? "DISC" : "REC"; it.reasons.push("Expatriation ou séjours répétés dans un pays de circulation du virus."); }
    else if (softs.length) { it.status = "DISC"; it.reasons.push(`Situation à évaluer par le vaccinateur ; vaccination d'autant plus justifiée : ${softs.join(", ")}.`); }
    else { it.status = "NR"; it.reasons.push("Pas de facteur d'exposition déclaré (séjour urbain/touristique court)."); }
    st.forEach(s => { const j = JE[s.c]; it.reasons.push(`${C(s.c).n} – zones : ${j.z}. Saison : ${j.s}.${j.c ? " " + j.c : ""}`); });
    const d = Number(v.je || 0);
    if (d >= 2 && ["REC", "DISC"].includes(it.status)) { it.reasons.unshift("Primovaccination (2 doses) déjà faite : rappel (3e dose) au moins 12 mois après en cas de réexposition ; 2e rappel à envisager 10 ans plus tard (18-65 ans) ; après 65 ans, rappel avant toute nouvelle exposition."); }
    it.schema.push("Ixiaro® (inactivé). 2 mois à 17 ans : 2 doses J0, J28 (0,25 ml de 2 mois à < 3 ans). 18-65 ans : J0, J28 ou schéma accéléré J0, J7. > 65 ans : J0, J28. 2e dose ≥ 7 jours avant le départ.");
    it.schema.push("Terminer le schéma avec Ixiaro® (vérifier la disponibilité sur place si incomplet au départ).");
    const accel = ageY != null && ageY >= 18 && ageY <= 65;
    lead(it, accel ? 14 : 35, accel ? "schéma accéléré J0-J7 + 7 jours" : "J0-J28 + 7 jours");
    if (preg || bf) it.cautions.push("Grossesse : données de pharmacovigilance rassurantes ; allaitement : vaccination possible.");
  })();

  // ============ ENCÉPHALITE À TIQUES (§ 1.6, p. 34-38 ; tableau 3) ============
  (function () {
    const it = add({ id: "tbe", name: "Encéphalite à tiques", refs: ["§ 1.6, p. 34-38", "Tableau 3, p. 35-36"] });
    const st = sejours.filter(s => TBE[s.c]);
    if (!st.length) { it.status = "NA"; return; }
    if (ageKnown && ageM < 12) { it.status = "NA"; it.reasons.push("Vaccins disponibles à partir de 1 an."); return; }
    const expo = ex.tbeOutdoor || ex.rawMilk;
    const bold = st.filter(s => TBE[s.c].b);
    if (expo && bold.length) { it.status = "REC"; it.reasons.push(`Séjour en zone rurale ou boisée d'un pays où la vaccination est recommandée (en gras au tableau 3), jusqu'à 1 500 m, du printemps à l'automne, activités de plein air : ${names(bold)}.`); }
    else if (expo) { it.status = "DISC"; it.reasons.push(`Pays endémique non signalé en gras au tableau 3 (${names(st)}) : décision selon la zone et l'exposition.`); }
    else { it.status = "NR"; it.reasons.push("Risque négligeable en séjour urbain strict sans consommation de lait non pasteurisé."); }
    st.forEach(s => { const z = TBE[s.c]; it.reasons.push(`${C(s.c).n} – zones à risque : ${z.z}.${z.r ? " " + z.r + "." : ""}${z.l ? " Recommandation locale : " + z.l + "." : ""}`); });
    const d = Number(v.tbe || 0);
    if (d >= 3 && it.status !== "NR") it.reasons.unshift("Primovaccination complète : rappel 3 ans après (schéma standard) ou 12-18 mois après (schéma rapide), puis tous les 5-10 ans (12-49 ans) ou tous les 3 ans (≥ 50 ans).");
    it.schema.push("Ticovac® enfant 0,25 ml (1-15 ans) / adulte 0,5 ml (≥ 16 ans) : J0, M1-M3, M5-M12 ; rapide J0, J14, M5-M12.");
    it.schema.push("Encepur® 0,5 ml dès 12 ans (0,25 ml de 1 à 12 ans) : J0, J14-M3, M9-M12 ; express J0, J7, J21.");
    it.schema.push("Départ rapide : 2 doses avant le départ (séroconversion ≥ 14 jours après la 2e), 3e dose au retour.");
    lead(it, 21, "Encepur® J0-J7 + 14 jours (Ticovac® rapide : J0-J14 + 14 jours)");
    if (preg || bf) it.cautions.push("Grossesse / allaitement : possible.");
    it.cautions.push("Des cas autochtones existent aussi en France (Auvergne-Rhône-Alpes, Grand-Est).");
  })();

  // ============ DENGUE (§ 1.4, p. 27-29) ============
  (function () {
    const it = add({ id: "dengue", name: "Dengue (Qdenga®)", live: true, refs: ["§ 1.4, p. 27-29"] });
    const dg = (s) => epiDefault(s, "dengue");
    const epi = sejours.filter(s => dg(s) === "epi");
    const endLong = sejours.filter(s => dg(s) === "high" && (longStay(s) || ty.expat));
    const endShort = sejours.filter(s => dg(s) === "high" && !(longStay(s) || ty.expat));
    const unk = sejours.filter(s => dg(s) === "?");
    if (epi.length || endLong.length) {
      it.status = "REC";
      if (epi.length) it.reasons.push(`Séjour en zone d'épidémie avérée, quelle qu'en soit la durée : ${names(epi)}.`);
      if (endLong.length) it.reasons.push(`Séjour > 1 mois en zone endémique (incidence > 100/100 000 personnes-années) : ${names(endLong)}.`);
      it.reasons.push("Quels que soient les antécédents de dengue et les comorbidités (sérologie non nécessaire).");
    } else if (endShort.length) { it.status = "NR"; it.reasons.push(`Zone endémique (> 100/100 000) sans épidémie, séjour < 1 mois : ${names(endShort)}.`); }
    else if (unk.length) { it.status = "DISC"; it.reasons.push(`Situation épidémiologique à renseigner (ECDC « dengue monthly », annexe 5) pour : ${names(unk)}.`); }
    else if (sejours.some(s => dg(s) === "low")) { it.status = "NR"; it.reasons.push(`Circulation avec incidence < 100/100 000 personnes-années, sans épidémie active : ${names(sejours.filter(s => dg(s) === "low"))}.`); }
    else { it.status = "NA"; return; }
    if (ageKnown && ageM < 72 && ["REC", "DISC"].includes(it.status)) { it.status = "NR"; it.reasons.unshift("Recommandation HCSP à partir de 6 ans (AMM dès 4 ans)."); }
    const d = Number(v.dengue || 0);
    if (d >= 2 && it.status === "REC") { it.status = "OK"; it.reasons.unshift("2 doses reçues (pas de donnée sur un rappel)."); }
    else if (d === 1 && it.status === "REC") it.reasons.unshift("1 dose reçue : 2e dose à ≥ 3 mois de la 1re.");
    it.schema.push("2 doses SC à ≥ 3 mois d'intervalle ; si départ imminent (épidémie) : 1 dose ≥ 2 semaines avant le départ, la 2e à ≥ 3 mois. Surveillance 15 min.");
    it.schema.push("Informer : pas de données d'efficacité au-delà de 60 ans ; efficacité moindre sur le sérotype 3 ; PPAV indispensable même vacciné.");
    it.cautions.push("Co-administration possible le même jour avec l'hépatite A et le HPV nonavalent ; fièvre jaune : 1 mois d'intervalle si possible (même jour ou tout intervalle si départ imminent).");
    lead(it, 14, "1re dose ≥ 2 semaines avant le départ");
    const ci = [];
    if (immunodep || liveCI.length) ci.push("Immunodépression (vaccin vivant)");
    if (preg) ci.push("Grossesse"); if (bf) ci.push("Allaitement");
    if (ci.length && ["REC", "DISC"].includes(it.status)) { it.status = "CI"; it.ciReasons = ci; }
    if (h.dengueRecent && ["REC", "DISC"].includes(it.status)) it.cautions.push("Dengue récente : attendre 6 mois avant la 1re dose.");
  })();

  // ============ CHIKUNGUNYA (§ 1.1, p. 18-23 ; tableau 1) ============
  (function () {
    const it = add({ id: "chik", name: "Chikungunya", refs: ["§ 1.1, p. 18-23", "Tableau 1, p. 23"] });
    const ck = (s) => epiDefault(s, "chik");
    const epi = sejours.filter(s => ck(s) === "epi");
    const circLong = sejours.filter(s => ck(s) === "circ" && (longStay(s) || ty.expat || ty.repeated));
    const circShort = sejours.filter(s => ck(s) === "circ" && !(longStay(s) || ty.expat || ty.repeated));
    const unk = sejours.filter(s => ck(s) === "?");
    let indicated = false;
    if (epi.length || circLong.length) {
      indicated = true;
      if (epi.length) it.reasons.push(`Zone épidémique, quelle que soit la durée : ${names(epi)}.`);
      if (circLong.length) it.reasons.push(`Séjour > 1 mois, expatriation ou séjours répétés en zone de circulation active dans les 12 mois : ${names(circLong)}.`);
    } else if (circShort.length) { it.status = "NR"; it.reasons.push(`Séjour < 1 mois en zone de circulation active hors épidémie (${names(circShort)}) : vaccination non recommandée.`); return; }
    else if (unk.length) { it.status = "DISC"; it.reasons.push(`Situation épidémiologique à renseigner (Santé publique France, ECDC, annexe 5) pour : ${names(unk)}.`); }
    else { it.status = "NA"; return; }
    it.schema.push("Ixchiq® (vivant atténué) : 1 dose 0,5 ml IM ≥ 14 jours avant le départ. Vimkunya® (pseudo-particules virales) : 1 dose 0,8 ml IM ≥ 14 jours avant le départ. Sans dépistage préalable, quels que soient les antécédents.");
    it.schema.push("Éviter la co-administration avec d'autres vaccins ; 1 mois d'intervalle avec un autre vaccin vivant (Ixchiq®).");
    lead(it, 14, "≥ 14 jours avant le départ");
    if (ageKnown && ageY < 12) { it.status = "NA"; it.reasons.unshift("Vaccins indiqués à partir de 12 ans."); return; }
    if (!indicated) return;
    // Tableau 1
    if (preg || bf) { it.status = "NR"; it.reasons.unshift("Femme enceinte ou allaitante : Ixchiq® et Vimkunya® non recommandés ; envisager de différer le séjour, PPAV très renforcée (surtout en fin de grossesse)."); return; }
    const old = ageY != null && ageY > 65;
    it.status = "REC";
    if (old) { it.product = "Vimkunya®"; it.reasons.unshift(`Plus de 65 ans${comorbChik ? " avec comorbidités" : ""} : envisager de différer le séjour ; sinon Vimkunya® recommandé. Ixchiq® ${immunodep ? "contre-indiqué" : "non recommandé"}.`); }
    else if (immunodep) { it.product = "Vimkunya®"; it.reasons.unshift(`12-65 ans immunodéprimé${comorbChik ? " avec comorbidités (envisager de différer le séjour)" : ""} : Vimkunya® recommandé (données incomplètes en cas d'immunosuppression) ; Ixchiq® contre-indiqué.`); }
    else if (comorbChik) { it.product = "Vimkunya®"; it.reasons.unshift("12-65 ans avec comorbidités : envisager de différer le séjour ; sinon Vimkunya® recommandé, à défaut Ixchiq® peut être proposé (balance bénéfice/risque)."); }
    else { it.product = "Ixchiq® ou Vimkunya®"; it.reasons.unshift(`12-65 ans sans comorbidité ni immunodépression : Ixchiq® ou Vimkunya® recommandé${(ageY > 45 && inp.arthralgia) || inp.pregPlan ? " (particulièrement : " + [ageY > 45 && inp.arthralgia ? "plus de 45 ans avec arthralgies préexistantes" : null, inp.pregPlan ? "projet de grossesse" : null].filter(Boolean).join(", ") + ")" : ""}.`); }
    it.cautions.push("Comorbidités retenues (tableau 1) : HTA, diabète, maladies cardiovasculaires, respiratoires, neurovasculaires, éthylisme chronique.");
    if (v.chik) { it.status = "OK"; it.reasons.unshift("Déjà vacciné(e) : pas de donnée sur l'intérêt d'un rappel."); }
  })();

  // ============ RAGE (§ 1.15, p. 64-67) ============
  (function () {
    const it = add({ id: "rage", name: "Rage (pré-exposition)", refs: ["§ 1.15, p. 64-67", "Fiches régionales, annexe 1"] });
    const high = sejours.filter(s => RAGE_HIGH_REG.has(C(s.c).r) || ["KM", "MG"].includes(s.c));
    const fic = sejours.filter(s => !high.includes(s) && (C(s.c).r === "AM_CEN" || C(s.c).r === "OCE" || ["CU", "DM", "GD"].includes(s.c)));
    if (!high.length && !fic.length) {
      it.status = "NA";
      if (sejours.some(s => C(s.c).r === "EU_E")) { it.status = "INFO"; it.reasons.push("Europe de l'Est : foyers de rage canine et sauvage régulièrement détectés. Chauves-souris : risque partout dans le monde (y compris États-Unis). Pas de recommandation de pré-exposition hors exposition particulière."); }
      return;
    }
    const conds = [];
    if (prolonged) conds.push("séjour prolongé");
    if (ex.animals) conds.push("séjour aventureux / contacts fréquents avec des animaux, camping");
    if (ex.caving) conds.push("spéléologie");
    if (ex.isolated) conds.push("isolement géographique (prise en charge rapide impossible)");
    const youngChild = ageM != null && ageM >= 12 && ageY < 6;
    if (youngChild) conds.push("jeune enfant en âge de marcher");
    if (v.rage) { it.status = "OK"; it.reasons.push("Série primaire pré-exposition complète : pas de rappel prévu chez le voyageur. Toute exposition impose quand même une PPE."); return; }
    if (high.length && conds.length) { it.status = "REC"; it.reasons.push(`Zone à haut risque (Asie, Afrique y compris Afrique du Nord, Amérique du Sud) : ${names(high)} ; ${conds.join(", ")}.`); }
    else if (fic.length && conds.length) { it.status = "DISC"; it.reasons.push(`Fiche régionale « au cas par cas » (${names(fic)}), notamment enfants en âge de marcher et séjour rural ou éloigné : ${conds.join(", ")}.`); }
    else { it.status = "DISC"; it.reasons.push(`Zone à risque (${names([...high, ...fic])}) sans facteur d'exposition déclaré : au cas par cas (séjour rural ou éloigné des villes principales).`); }
    if (ageY != null && ageY >= 6 && ageY < 15 && high.length) it.cautions.push("Les moins de 15 ans représentent 40 % des personnes mordues par un animal suspect de rage.");
    it.schema.push(immunodep ? "Immunodéprimé : 3 doses IM J0, J7, J21 ou J28 (ou J0, J7 avec sérologie 2-4 semaines après la 1re dose) ; avis infectiologue/immunologue conseillé." : "Immunocompétent : 2 doses IM J0, J7 (Vaccin rabique Pasteur® ou Rabipur®) ; pas de rappel ultérieur en pré-exposition. OMS : alternative ID 2 × 0,1 ml à J0 et J7.");
    it.schema.push("Rappeler : toute morsure, griffure ou léchage sur peau lésée → lavage 15 min eau + savon, antiseptique, consultation pour PPE (la pré-exposition dispense des immunoglobulines).");
    lead(it, immunodep ? 21 : 7, immunodep ? "J0-J7-J21" : "J0-J7");
    if (preg || bf) it.cautions.push("Grossesse / allaitement : possible.");
  })();

  // ============ BCG (§ 1.17, p. 71-73 ; annexe 3) ============
  (function () {
    const it = add({ id: "bcg", name: "BCG (tuberculose)", live: true, refs: ["§ 1.17, p. 71-73", "Annexe 3, p. 247-250"] });
    if (!ageKnown || ageY >= 15) { it.status = "NA"; return; }
    const hi = sejours.filter(s => C(s.c).tb || TB_TEXT_ONLY[s.c]);
    if (!hi.length) { it.status = "NA"; return; }
    if (v.bcg) { it.status = "OK"; it.reasons.push("BCG déjà réalisé."); return; }
    const qual = hi.filter(s => longStay(s) || ty.repeated || ty.expat);
    hi.forEach(s => { const c = C(s.c); it.reasons.push(c.tb ? `${c.n} : incidence ${c.tb}/100 000 (annexe 3, OMS 2024).` : `${c.n} : ${TB_TEXT_ONLY[s.c]}.`); });
    if (qual.length) { it.status = "REC"; it.reasons.unshift(`Enfant de moins de 15 ans, séjours fréquents ou > 1 mois dans un pays à forte incidence${ageY < 5 ? " (priorité aux moins de 5 ans)" : ""}.`); }
    else { it.status = "DISC"; it.reasons.unshift("Séjour court et non répété dans un pays à forte incidence : BCG indiqué si séjours fréquents ou > 1 mois."); }
    if (ageM < 1) it.cautions.push("Dès la naissance si voyages fréquents ou prolongés avant l'âge de 2 mois.");
    it.schema.push(ageM < 12 ? "BCG AJ Vaccines® : 0,05 ml strictement intradermique (face externe du bras)." : "BCG AJ Vaccines® : 0,1 ml strictement intradermique (face externe du bras).");
    it.schema.push(ageY >= 6 || h.tbStay ? "IDR à la tuberculine préalable (≥ 6 ans ou séjour antérieur > 1 mois en pays à forte incidence)." : "Sans IDR préalable (< 6 ans, sans séjour antérieur > 1 mois en pays à forte incidence).");
    it.schema.push("6 à 8 semaines avant le départ (CLAT, PMI, centres de vaccination). Aucun autre vaccin dans le même bras pendant 3 mois.");
    lead(it, 42, "6 à 8 semaines avant le départ");
    if (immunodep || im.hiv) { it.status = "CI"; it.ciReasons = ["Immunodépression ou enfant vivant avec le VIH, quel que soit le taux de CD4"]; }
  })();

  // ============ GRIPPE (§ 1.8, p. 46-47 ; § 8.2) ============
  (function () {
    const it = add({ id: "grippe", name: "Grippe saisonnière", refs: ["§ 1.8, p. 46-47", "§ 8.2, p. 140"] });
    const target = (ageY != null && ageY >= 65) || preg || anyComorb || inp.fluTarget;
    if (ty.crew) { it.status = "REC"; it.reasons.push("Personnel navigant (croisière, avion), guide ou accompagnateur de voyage."); }
    if (target) { it.status = "REC"; it.reasons.push(`Personne ciblée par le calendrier des vaccinations${ty.group ? ", en particulier en voyage de groupe ou en croisière" : ""}.`); }
    if (ty.mass) { it.status = "REC"; it.reasons.push("Grand rassemblement en période de circulation grippale."); }
    if (!it.status) { it.status = ty.group ? "DISC" : "NA"; if (ty.group) it.reasons.push("Voyage en groupe / croisière : la recommandation vise les personnes ciblées par le calendrier."); else return; }
    if (v.flu) { it.status = "OK"; it.reasons.unshift("Vacciné(e) pour la saison en cours."); }
    if (ageKnown && ageM < 6) { it.status = "NA"; it.reasons = ["Pas de vaccin avant 6 mois."]; return; }
    if (ageY != null && ageY >= 65) it.schema.push("≥ 65 ans : vaccins améliorés à privilégier (Efluelda® fortement dosé ou Fluad® adjuvanté).");
    it.schema.push("Vaccins trivalents inactivés (sans B/Yamagata). 6 mois–8 ans : 1 ou 2 doses (2 doses à 1 mois en primovaccination). À renouveler chaque année.");
    if (sejours.some(s => SOUTH_HEMI.has(s.c))) it.cautions.push("Destination de l'hémisphère Sud : vaccins adaptés disponibles d'avril à septembre par importation (accès compassionnel via e-Saturne).");
    if (preg) it.cautions.push("Grossesse : recommandée (tableau 14).");
  })();

  // ============ COVID-19 (§ 1.3, p. 26 ; § 8.2) ============
  (function () {
    const it = add({ id: "covid", name: "Covid-19", refs: ["§ 1.3, p. 26", "§ 8.2, p. 141"] });
    const hajj = sejours.some(s => s.c === "SA") && ty.hadj;
    if (hajj && ((ageY != null && ageY >= 65) || preg || cm.cardio || cm.resp || cm.irc || cm.drepano || cm.cancer || cm.neuro)) {
      it.status = v.covid ? "OK" : "OBL";
      it.reasons.push("Pèlerinage avec facteur de risque de Covid grave : preuve vaccinale exigée.");
      it.cautions.push("Deux formulations dans le document : p. 26 (≥ 65 ans, grossesse, pathologie cardiaque ou respiratoire chronique, drépanocytose, IRC, hémoglobinopathies : 1 dose en 2025-2026 ou ≥ 2 doses antérieures, ou antécédent de Covid) et p. 141 (≥ 65 ans, grossesse, > 12 ans avec insuffisance cardiaque, rénale ou respiratoire, cancer ou maladie neurologique : 2-3 doses 2021-2025 ou 1 dose 2025-2026, ou attestation de rétablissement dans l'année). Vérifier les exigences saoudiennes en vigueur.");
    } else if (preg) { it.status = v.covid ? "OK" : "REC"; it.reasons.push("Grossesse : recommandée (tableau 14)."); }
    else { it.status = "INFO"; it.reasons.push("Selon les recommandations du calendrier des vaccinations (personnes ciblées). Vérifier les conditions d'entrée du pays."); }
    it.schema.push("Comirnaty JN.1® (ARNm, 30 µg dès 12 ans ; 10 µg de 5 à 11 ans) ou Nuvaxovid® (dès 12 ans). Co-administration possible avec la grippe.");
  })();

  // ============ LEPTOSPIROSE (§ 1.12, p. 55-56) ============
  (function () {
    const it = add({ id: "lepto", name: "Leptospirose", refs: ["§ 1.12, p. 55-56"] });
    const zones = sejours.filter(s => (LEPTO_REG.has(C(s.c).r) || s.c === "RE") && s.c !== "YT");
    if (!zones.length || !(ex.freshwater)) { it.status = "NA"; if (sejours.some(s => s.c === "YT") && ex.freshwater) { it.status = "NR"; it.reasons.push("Mayotte : sérovar Icterohaemorrhagiae non retrouvé, vaccin inadapté."); } return; }
    it.status = "DISC";
    it.reasons.push(`Place très limitée chez le voyageur : au cas par cas chez l'adulte, notamment expatrié, pratique régulière d'activités en eau douce, saison des pluies, sans mesures de protection (${names(zones)}).`);
    it.schema.push("Spirolept® (≥ 18 ans) : 2 doses SC à 15 jours d'intervalle, rappel 4-6 mois plus tard puis tous les 2 ans si exposition persistante. Protège uniquement contre L. interrogans sérovar Icterohaemorrhagiae.");
    it.schema.push("Dans tous les cas : messages de prévention et consultation rapide en cas de fièvre.");
    lead(it, 15, "J0-J15");
    if (ageKnown && ageY < 18) { it.status = "NA"; it.reasons = ["Vaccin réservé à l'adulte (≥ 18 ans)."]; return; }
    if (preg || bf) { it.status = "NR"; it.reasons.unshift("Pas de recommandation pendant la grossesse et l'allaitement."); }
  })();

  // ============ VARIOLE B / MPOX (§ 1.13, p. 57-61 ; figure 10) ============
  (function () {
    const it = add({ id: "mpox", name: "Variole B (mpox)", refs: ["§ 1.13, p. 57-61", "Figure 10, p. 60"] });
    const z = sejours.filter(s => s.mpox === "oui");
    if (h.mpox) { it.status = "NA"; it.reasons.push("Antécédent d'infection par le MPXV : vaccination non utile."); return; }
    if (ex.mpoxSex) { it.status = "REC"; it.reasons.push("Exposition à très haut risque (HSH ou personnes trans multipartenaires, travail du sexe, professionnels des lieux de consommation sexuelle, partenaires/cohabitants) : vaccination selon les indications nationales, quelle que soit la destination."); }
    else if (z.length) {
      const child = ageY != null && ageY < 18;
      if (child || preg || bf) { it.status = "NR"; it.reasons.push(`Zone de circulation active du clade I (${names(z)}) : enfant, femme enceinte ou allaitante → déconseiller le voyage ; vaccination non recommandée (vaccin non agréé).`); out.alerts.push({ lvl: "warn", t: "Mpox clade I : déconseiller le voyage (enfant, femme enceinte ou allaitante).", ref: "Figure 10, p. 60" }); }
      else if (immunodep) { it.status = "REC"; it.reasons.push(`Zone de circulation active du clade I (${names(z)}) : sujet immunodéprimé → déconseiller le voyage (risque de forme grave) ; vaccination si le voyage est maintenu.`); out.alerts.push({ lvl: "warn", t: "Mpox clade I et immunodépression : déconseiller le voyage ; vacciner si maintenu.", ref: "Figure 10, p. 60" }); }
      else if (ty.health || ty.humanitarian) { it.status = "REC"; it.reasons.push(`Soignant (y compris laboratoire) ou humanitaire à risque d'exposition en zone de clade I (${names(z)}).`); }
      else if ((ty.vfr || ty.expat) && ex.closeContact) { it.status = "REC"; it.reasons.push(`${ty.vfr ? "Visite à la famille (VFR)" : "Expatriation"} en zone de clade I avec promiscuité / partage de literie / relations sexuelles (${names(z)}).`); }
      else if (ty.vfr || ty.expat) { it.status = "DISC"; it.reasons.push(`${ty.vfr ? "VFR" : "Expatrié"} en zone de clade I (${names(z)}) : selon les conditions de vie sur place (promiscuité, partage de literie) et la possibilité de respecter les mesures barrières.`); }
      else { it.status = "NR"; it.reasons.push(`Autre voyageur en zone de clade I (${names(z)}) : pas de vaccination ; mesures barrières.`); }
      it.cautions.push("Mesures barrières pour tous : éviter animaux sauvages (rongeurs, primates), viande de brousse, rassemblements à contacts cutanés, personnes avec lésions cutanées.");
    } else { it.status = "NA"; return; }
    it.cautions.push("Liste des pays de circulation active du clade I : https://worldhealthorg.shinyapps.io/mpx_global/ (épidémie en cours à Madagascar, clade Ib à l'est de la RDC).");
    if (["REC", "DISC"].includes(it.status)) {
      it.schema.push(inp.smallpox1980 ? "Vacciné(e) contre la variole avant 1980 : 1 dose SC." : immunodep ? "Immunodéprimé : 3 doses SC espacées de 28 jours." : "Imvanex® / Jynneos® (≥ 18 ans) : 2 doses SC à ≥ 28 jours d'intervalle. Départ imminent : 1 dose (efficacité ≈ 79 % après J14).");
      it.schema.push("Rappel : 1 dose 2 ans après la primovaccination (si primo depuis 2022). Éviter la co-administration pendant le schéma (possible si départ imminent).");
      lead(it, 14, "1 dose ≥ 14 jours avant ; schéma complet J0-J28");
      if (Number(v.mpox || 0) >= 2 && !immunodep) { it.status = "OK"; it.reasons.unshift("Primovaccination complète (2 doses) : rappel 2 ans après si exposition persistante."); }
    }
  })();

  // ============ CHOLÉRA (§ 1.2, p. 23-25) ============
  (function () {
    const it = add({ id: "chol", name: "Choléra", refs: ["§ 1.2, p. 23-25"] });
    if ((ty.health && ex.careOfPatients) || ty.onu) { it.status = "DISC"; it.reasons.push(ty.onu ? "Personnel déployé dans le cadre d'un mandat ONU dans un pays où sévit le choléra." : "Personnel intervenant auprès de malades en situation d'épidémie."); }
    else if (ex.cholera) { it.status = "DISC"; it.reasons.push("Séjour en zone épidémique/endémique : avis spécialisé en centre de vaccinations internationales pour évaluer le risque personnel (risque faible si bonnes conditions d'hygiène)."); }
    else { it.status = "NA"; return; }
    it.schema.push("Dukoral® (≥ 2 ans) : ≥ 6 ans 2 doses orales J0-J7 ; 2-6 ans 3 doses J0-J7-J14 ; protection 1 semaine après la dernière dose.");
    it.schema.push("Vaxchora® (≥ 2 ans, vivant) : 1 dose orale ≥ 10 jours avant l'exposition ; pas d'antibiotique 14 j avant / 10 j après ; 2 h d'écart avec Vivotif®.");
    lead(it, 10, "Vaxchora® ≥ 10 jours ; Dukoral® J0-J7 + 7 jours");
    if (preg || bf || immunodep) it.cautions.push("Vaxchora® contre-indiqué (grossesse, allaitement, immunodépression).");
    if (ageKnown && ageM < 24) { it.status = "NA"; it.reasons = ["Vaccins indiqués à partir de 2 ans."]; }
  })();

  // ============ Autres : rotavirus, pneumocoque, VRS, HPV ============
  (function () {
    if (ageKnown && ageM < 6) add({ id: "rota", name: "Rotavirus", status: "REC", reasons: ["Nourrisson de moins de 6 mois : vaccination recommandée (prévention de la diarrhée)."], refs: ["§ 4.1.1, p. 117"] });
    const pn = add({ id: "pneumo", name: "Pneumocoque", refs: ["§ 8.2, p. 140", "§ 10.2.3, p. 154"] });
    if (ty.mass && ageY != null && ageY >= 65) { pn.status = "REC"; pn.reasons.push("Grand rassemblement, plus de 65 ans (notamment en cas de comorbidités)."); }
    else if (cm.drepano || im.asplenia) { pn.status = "MAJ"; pn.reasons.push("Drépanocytose / asplénie : vérifier les vaccinations complémentaires (pneumocoque, Haemophilus influenzae b, méningocoques, grippe, typhoïde) selon le calendrier."); }
    else pn.status = "NA";
    if (preg) add({ id: "vrs", name: "VRS (femme enceinte)", status: "REC", reasons: ["Tableau 14 : recommandée pendant la grossesse (selon le calendrier en vigueur)."], refs: ["Tableau 14, p. 155"] });
    if (ex.sti) add({ id: "hpv", name: "Papillomavirus (HPV)", status: "DISC", reasons: ["Sexualité exposant à un risque d'IST : vaccination HPV en respectant les conditions d'âge du calendrier."], refs: ["§ 9.1, p. 142"] });
  })();

  // ---------- Délais / intervalles ----------
  const active = items.filter(i => ["OBL", "REC"].includes(i.status));
  active.forEach(i => { if (i.lead && daysToDep < i.lead) out.warnings.push({ id: i.id, t: `${i.name} : délai avant départ (${daysToDep} j) inférieur au délai conseillé (${i.leadLabel}).` }); });
  const liveInj = active.filter(i => ["fj", "ror", "dengue"].includes(i.id) || (i.id === "chik" && /Ixchiq/.test(i.product || "")));
  if (liveInj.length >= 2) out.alerts.push({ lvl: "warn", t: `Vaccins vivants injectables (${liveInj.map(i => i.name).join(", ")}) : les administrer le même jour ou à 1 mois d'intervalle. FJ-ROR et FJ-Qdenga® : 1 mois si possible, mais même jour ou n'importe quel intervalle si départ imminent.`, ref: "§ 1.7 p. 42 ; § 1.4 p. 29 ; § 1.16 p. 69" });
  if (active.some(i => i.id === "chik") && active.length > 1) out.alerts.push({ lvl: "warn", t: "Chikungunya : éviter de co-administrer Ixchiq®/Vimkunya® avec d'autres vaccins (pas de données). Planifier une visite dédiée.", ref: "§ 1.1, p. 22" });
  if (active.some(i => i.id === "mpox") && active.length > 1) out.alerts.push({ lvl: "info", t: "Mpox : éviter si possible les autres vaccins pendant le schéma MVA-BN ; possible à n'importe quel intervalle si départ imminent.", ref: "§ 1.13, p. 61" });
  if (active.some(i => i.id === "bcg")) out.alerts.push({ lvl: "info", t: "BCG : aucun autre vaccin dans le bras du BCG pendant au moins 3 mois.", ref: "§ 1.17, p. 73" });
  out.alerts.push({ lvl: "info", t: "Terminer le programme vaccinal 10 à 15 jours avant le départ (délai plus court possible pour un rappel).", ref: "§ 1, p. 17" });
  if (daysToDep < 0) out.alerts.unshift({ lvl: "crit", t: "La date de départ est passée : vérifier la saisie.", ref: "" });
  items.sort((a, b) => (ST_ORDER[a.status] ?? 9) - (ST_ORDER[b.status] ?? 9));
  return out;
}

if (typeof module !== "undefined") module.exports = { evaluate, ST_LABEL, ST_ORDER };
