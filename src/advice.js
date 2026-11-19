// ---- Conseils de voyage selon les zones visitées (chapitres 2 à 13 et annexes 1 et 4 du document HCSP 2026) ----
// Fonction pure advise(inp) -> { sections:[...], malaria:{...} }. Chaque conseil porte sa référence.

const SUBSAH_REG = new Set(["AF_AUS", "AF_CEN", "AF_EST", "AF_OUE"]);
const TROPICAL_REG = new Set(["AF_AUS", "AF_CEN", "AF_EST", "AF_OUE", "AM_CEN", "AM_SUD", "CARA", "ASIE_SE", "ASIE_SUD", "OI", "OCE"]);
const LOWHYG_REG = new Set(["AF_AUS", "AF_CEN", "AF_EST", "AF_OUE", "AF_NOR", "AM_CEN", "AM_SUD", "CARA", "ASIE_SE", "ASIE_SUD", "ASIE_EST", "ASIE_CEN", "CAUC", "MO", "OI", "OCE", "EU_E"]);
const EEE_CH = new Set(["DE","AT","BE","BG","CY","HR","DK","ES","EE","FI","FR","GR","HU","IE","IS","IT","LV","LI","LT","LU","MT","NO","NL","PL","PT","CZ","RO","SK","SI","SE","CH"]);
const ASIA_REG = new Set(["ASIE_SE", "ASIE_SUD", "ASIE_EST", "ASIE_CEN"]);
const PALU_LBL = { eleve: "Risque élevé", modere: "Risque modéré", faible: "Risque faible", absent: "Pas de transmission" };
const PALU_RANK = { eleve: 3, modere: 2, faible: 1, absent: 0 };

function advise(inp) {
  const C = (id) => COUNTRY_BY_ID[id];
  const t = inp.trip, ty = t.type || {}, ex = t.exp || {}, cm = inp.comorb || {}, im = inp.immuno || {};
  const stops = (t.stops || []).filter(s => s.c && C(s.c));
  const sej = stops.filter(s => s.type !== "transit");
  const regs = new Set(sej.map(s => C(s.c).r));
  const has = (set) => sej.some(s => set.has(C(s.c).r));
  const ids = new Set(sej.map(s => s.c));
  const any = (...list) => list.some(i => ids.has(i));
  const names = (arr) => [...new Set(arr.map(s => C(s.c).n))].join(", ");
  const today = new Date(inp.today + "T12:00:00");
  const dep = new Date((t.departure || inp.today) + "T12:00:00");
  const birth = inp.birth && inp.birth.y ? new Date(Date.UTC(inp.birth.y, (inp.birth.m || 1) - 1, 15)) : null;
  const ageM = birth ? (dep.getUTCFullYear() - birth.getUTCFullYear()) * 12 + dep.getUTCMonth() - birth.getUTCMonth() : null;
  const ageY = ageM == null ? null : Math.floor(ageM / 12);
  const weight = Number(inp.weight) || null;
  const preg = !!inp.pregnant, bf = !!inp.breastfeeding;
  const totalDays = sej.reduce((a, s) => a + (Number(s.days) || 0), 0);
  const immunodep = !!(im.hiv || im.sotDone || im.hsct || im.chemo || im.isDrug || im.isStop || im.dip);
  const fragile = preg || (ageY != null && (ageY < 6 || ageY >= 65)) || immunodep || im.asplenia;
  const longHaul = sej.some(s => !["EU_NO", "EU_S", "EU_E", "AF_NOR"].includes(C(s.c).r));
  const sections = [];
  const S = (id, title, opts) => { const s = Object.assign({ id, title, items: [], refs: [], lvl: "std" }, opts || {}); sections.push(s); return s; };
  const I = (s, text, sub, ref, strong) => s.items.push({ t: text, sub: sub || null, ref: ref || null, strong: !!strong });
  if (!sej.length) return { sections, malaria: null };

  // ======================= Alertes 2026 =======================
  const al = S("alertes", "Alertes sanitaires signalées dans le document (2026)", { lvl: "high" });
  if (any("CD", "UG")) I(al, "Maladie à virus Ébola (souche Bundibugyo) en RDC (Ituri, Nord-Kivu, Sud-Kivu), cas exportés en Ouganda : urgence de santé publique de portée internationale (OMS, 17 mai 2026). Reporter le voyage si possible ; sinon hygiène des mains, aucun contact avec des malades, la viande de brousse ou des dépouilles ; appeler le SAMU-Centre 15 en cas de symptômes dans les 21 jours suivant le retour.", null, "Actualités 2026, p. 7-9", true);
  if (any("US", "CA", "MX")) I(al, "Épidémie de rougeole en Amérique du Nord (coupe du monde de football 2026) : vérifier le ROR ; risques liés à la foule et à la chaleur ; coût des soins très élevé : assurance rapatriement indispensable, inscription sur Ariane.", null, "Actualités 2026, p. 10 ; fiche Amérique du Nord, p. 212", true);
  if (any("YT")) I(al, "Mayotte : reprise de la transmission autochtone du paludisme en 2025-2026 (communes du sud, peu fréquentées par les voyageurs) ; PPAV indispensable, recommandations susceptibles d'évoluer.", null, "Points clés 2026, p. 5 ; § 3.1.2, p. 93");
  if (any("MG")) I(al, "Madagascar : épidémie de mpox toujours en cours.", null, "Points clés 2026, p. 4");
  if (any("AR", "CL")) I(al, "Argentine, Chili : hantavirus Andes (avis HCSP mai 2026), risque faible et limité à des zones restreintes ; éviter rongeurs, excréta et lieux inhabités non aérés.", null, "§ 6.6.2, p. 132");
  if (!al.items.length) sections.pop();

  // ======================= Paludisme =======================
  const palStops = sej.map(s => ({ s, c: C(s.c), d: PALU[s.c] || null }));
  const maxLvl = palStops.reduce((m, x) => { const l = x.d ? x.d.lvl : "absent"; return PALU_RANK[l] > PALU_RANK[m] ? l : m; }, "absent");
  const conv = totalDays < 30 && !ex.rural && !ty.vfr && !ty.expat && !ty.humanitarian && !ex.poorHygiene && !ex.rainy && !ex.isolated && !ex.animals;
  let malaria = null;
  if (maxLvl !== "absent") {
    const pa = S("paludisme", "Paludisme", { lvl: maxLvl === "eleve" ? "crit" : "high", badge: PALU_LBL[maxLvl] });
    const subsah = palStops.filter(x => x.d && x.d.lvl !== "absent" && (SUBSAH_REG.has(x.c.r) || ["KM", "MG", "YE"].includes(x.c.id)) && !["YT", "RE", "MU", "SC"].includes(x.c.id));
    const pngSol = palStops.filter(x => ["PG", "SB"].includes(x.c.id));
    const amAs = palStops.filter(x => x.d && x.d.lvl !== "absent" && !subsah.includes(x) && !pngSol.includes(x));
    let cpap = "non";
    const lines = [];
    if (subsah.length || pngSol.length) {
      cpap = "oui";
      lines.push(`${names([...subsah, ...pngSol].map(x => x.s))} : chimioprophylaxie (CPAP) indiquée quel que soit le type de séjour, sauf zones ou périodes sans risque (voir le détail par pays).${ty.expat ? " Expatriation : en zone sahélienne, CPAP possible pendant la seule saison des pluies, prolongée 6 semaines après la fin des pluies ; en Afrique centrale forestière, toute l'année." : ""}`);
    }
    if (amAs.length) {
      if (conv) lines.push(`${names(amAs.map(x => x.s))} : séjour conventionnel (< 1 mois, nuitées urbaines ou hébergement satisfaisant) → pas de chimioprophylaxie, PPAV et consultation sans délai en cas de fièvre.`);
      else if (totalDays < 30) { lines.push(`${names(amAs.map(x => x.s))} : séjour non conventionnel de moins d'un mois → pas de CPAP en règle générale ; traitement de réserve si séjour en condition isolée ; pour les zones à risque élevé, consulter le détail par pays.`); if (cpap === "non") cpap = "discuter"; }
      else { lines.push(`${names(amAs.map(x => x.s))} : séjour d'un mois ou plus avec nuitées rurales, ou expatriation → avis spécialisé (centre de vaccinations internationales), selon les cartes CEMV-HCSP et le tableau 16.`); if (cpap === "non") cpap = "discuter"; }
    }
    lines.forEach(l => I(pa, l, null, "Tableau 9, p. 99", true));
    if (fragile) I(pa, `Voyageur à risque de paludisme grave (${[preg ? "grossesse" : null, ageY != null && ageY < 6 ? "enfant de moins de 6 ans" : null, ageY != null && ageY >= 65 ? "personne âgée" : null, immunodep ? "immunodépression" : null, im.asplenia ? "asplénie" : null].filter(Boolean).join(", ")}) quel que soit le niveau de transmission : un séjour en zone de forte transmission peut être déconseillé.`, null, "§ 3.1.3, p. 94 ; § 3.3.1, p. 98", true);
    I(pa, "Protection personnelle antivectorielle dès la tombée du jour et la nuit : vêtements longs, répulsif cutané, moustiquaire imprégnée d'insecticide (voir la section PPAV).", null, "§ 3.2, p. 96");
    I(pa, "Toute fièvre pendant le séjour ou dans les 3 mois suivant le retour impose une consultation en urgence en signalant le voyage (3 % des accès à P. falciparum surviennent plus de 2 mois après le retour).", null, "§ 3, p. 96", true);
    I(pa, "Pas de transmission au-dessus de 1 500 m en Afrique et de 2 500 m en Amérique du Sud ou en Asie ; risque plus élevé en saison des pluies et dans les 4 à 6 semaines qui suivent ; pas de transmission urbaine de P. falciparum en Asie et en Amérique tropicale.", null, "§ 3.3.1, p. 98");
    // Choix de la molécule
    if (cpap !== "non") {
      const mol = [];
      const ap = [], dx = [], mf = [];
      // atovaquone-proguanil
      if (weight != null && weight < 5) ap.push("poids < 5 kg : pas de posologie au tableau 10");
      else if (weight != null && weight <= 40) ap.push(weight < 8 ? "5-7 kg : ½ comprimé pédiatrique/j (hors AMM, préparation magistrale)" : weight < 11 ? "8-< 11 kg : ¾ comprimé pédiatrique/j (hors AMM)" : weight < 21 ? "11-< 21 kg : 1 comprimé pédiatrique (62,5/25 mg)/j" : weight < 31 ? "21-< 31 kg : 2 comprimés pédiatriques/j" : "31-40 kg : 3 comprimés pédiatriques/j");
      else ap.push(weight ? "> 40 kg : 1 comprimé adulte (250/100 mg)/j" : "adulte et > 40 kg : 1 comprimé adulte (250/100 mg)/j ; enfant selon le poids (11-40 kg : comprimés pédiatriques)");
      ap.push("au cours d'un repas ou avec une boisson lactée, à heure fixe ; début 24 h avant l'entrée en zone à risque, pendant le séjour et 7 jours après l'avoir quittée");
      if (preg) ap.push("grossesse : possible si séjour inévitable");
      if (bf) ap.push("allaitement : à éviter par précaution (surtout enfant < 5 kg) ; l'enfant allaité doit recevoir sa propre CPAP");
      if (cm.irc) ap.push("contre-indiquée en cas d'insuffisance rénale sévère");
      if (inp.avk) ap.push("AVK : augmentation de l'INR, surveiller");
      mol.push({ n: "Atovaquone-proguanil (1re intention)", l: ap });
      // doxycycline
      if (ageY != null && ageY < 8) dx.push("contre-indiquée avant 8 ans");
      else {
        dx.push(weight != null && weight < 40 ? "≥ 8 ans et < 40 kg : 50 mg/j" : "100 mg/j (adulte ; enfant ≥ 8 ans et ≥ 40 kg)");
        dx.push("au milieu du repas du soir, au moins 1 h avant le coucher ; début la veille de l'entrée en zone à risque, pendant le séjour et 4 semaines après l'avoir quittée ; photosensibilisation (protection solaire)");
        if (preg) dx.push("grossesse : déconseillée au 1er trimestre, contre-indiquée à partir du 2e");
        if (bf) dx.push("allaitement : contre-indiquée");
        if (inp.avk) dx.push("AVK : potentialisation de l'effet");
        dx.push("contre-indiquée avec les rétinoïdes par voie générale");
      }
      mol.push({ n: "Doxycycline (1re intention)", l: dx });
      mf.push("dernière intention (effets indésirables neuropsychiatriques) ; 1 comprimé de 250 mg/semaine au-delà de 45 kg, enfant 5 mg/kg/semaine ; début 10 jours avant l'arrivée, poursuivre 3 semaines après ; contre-indiquée si antécédent de convulsions, troubles neurologiques ou psychiatriques, insuffisance hépatique sévère, acide valproïque");
      if (inp.neuroPsy) mf.push("contre-indiquée : antécédents de convulsions ou de troubles psychiatriques déclarés");
      if (ex.diving) mf.push("déconseillée en cas de plongée");
      if (preg || bf) mf.push("non recommandée chez une femme enceinte ou allaitante n'en ayant jamais pris");
      mol.push({ n: "Méfloquine (dernière intention)", l: mf });
      I(pa, "Choix de la chimioprophylaxie si elle est retenue :", mol.map(m => `${m.n} – ${m.l.join(" ; ")}`), "Tableau 10, p. 110 ; § 3.3.2, p. 108-112 ; § 10.3.6, p. 157");
      I(pa, "Prescription obligatoire, non remboursée ; acheter avant le départ en quantité suffisante (pas d'achat sur place ni sur Internet). Les produits à base d'Artemisia (tisanes, gélules) sont inefficaces et proscrits. Un déficit en G6PD ne contre-indique aucune CPAP recommandée.", null, "§ 3.3.2, p. 108-109");
    }
    if (ex.isolated || (!conv && amAs.length)) I(pa, "Traitement de réserve : seulement si une prise en charge est impossible dans les 12 h suivant une fièvre (séjour > 1 semaine en zone très isolée ou abstention de CPAP sur avis spécialisé). Adulte : arténimol-pipéraquine ou artéméther-luméfantrine (sauf zones de résistance, surtout Asie du Sud-Est), alternative atovaquone-proguanil (pas si CPAP par A/P). À éviter chez l'enfant. Jamais au retour en France ; consulter dès que possible.", null, "§ 3.4, p. 114-115 ; tableau 11");
    if (ty.repeated) I(pa, "Séjours itératifs courts (navigants, professionnels) : CPAP prolongée inadaptée ; en zone sahélienne, CPAP limitée à la saison des pluies et 6 semaines après ; atovaquone-proguanil privilégiée ; carte personnelle mentionnant les voyages ; traitement de réserve envisageable.", null, "§ 3.3.3, p. 113");
    if (ty.expat && (subsah.length || pngSol.length)) I(pa, "Séjour > 3 mois : CPAP pendant 3 à 6 mois lors du premier séjour, puis réévaluation par un référent médical ; à maintenir en situation à haut risque ; accès rapide au diagnostic (TDR) et au traitement indispensable.", null, "§ 3.3.3, p. 113");
    if (ty.vfr) I(pa, "Visite à la famille (VFR) : principal groupe touché par le paludisme d'importation (80 % des cas en 2025), souvent sans chimioprophylaxie : insister sur la CPAP et son observance, et sur le recours rapide aux soins.", null, "§ 3.1.3, p. 95");
    malaria = { max: maxLvl, cpap, stops: palStops.map(x => ({ id: x.c.id, n: x.c.n, lvl: x.d ? x.d.lvl : "absent", p: x.d ? x.d.p : null, s: x.d ? x.d.s : [], r: x.d ? x.d.r : [], listed: !!x.d })) };
    pa.refs.push("Chapitre 3, p. 90-115", "Tableau 16, annexe 4, p. 252-278");
  }

  // ======================= PPAV =======================
  const vector = has(TROPICAL_REG) || maxLvl !== "absent" || sej.some(s => s.dengue === "epi" || s.dengue === "high" || s.chik === "epi" || s.chik === "circ");
  const ticks = ex.tbeOutdoor || (ex.rural && sej.some(s => TBE[s.c]));
  if (vector || ticks) {
    const pv = S("ppav", "Protection contre les piqûres (PPAV)", { lvl: vector ? "high" : "std" });
    if (vector) {
      I(pv, "Moustiques : Aedes (dengue, chikungunya, Zika, fièvre jaune) piquent le jour, surtout en début et fin de journée ; Anopheles (paludisme) et Culex de la tombée de la nuit au lever du jour. Se protéger jour et nuit.", null, "§ 2.1.1, p. 77 ; tableau 6");
      I(pv, "Vêtements légers, amples, longs et couvrants, de couleur claire ; chaussures fermées.", null, "§ 2.2.1, p. 79");
      I(pv, maxLvl !== "absent" ? "Dormir sous une moustiquaire imprégnée d'insecticide, bien bordée et en bon état (zone impaludée) ; éviter de sortir la nuit sans protection." : "Dormir sous une moustiquaire (imprégnée de préférence) ; moustiquaires aux portes et fenêtres, climatisation et ventilation en complément.", null, "§ 2.2.1, p. 79 ; tableau 7", true);
      if (ty.expat) I(pv, "Expatriation : moustiquaires aux fenêtres (efficacité démontrée), climatisation et brasseurs d'air en complément.", null, "Messages clés, p. 74");
    }
    // Répulsifs selon le profil (tableau 8)
    const rep = [];
    if (ageM != null && ageM < 6) rep.push("Moins de 6 mois : répulsifs cutanés déconseillés ; moustiquaire sur le berceau, le landau ou la poussette.");
    else if (ageM != null && ageM < 12) rep.push("6 à 12 mois : IR3535 jusqu'à 10 % ; moustiquaire sur le berceau ou le landau recommandée.");
    else if (ageM != null && ageM < 24) rep.push("12 à 24 mois : privilégier IR3535 (10 %) ou icaridine (jusqu'à 20 %) ; moustiquaire de poussette/berceau avant l'âge de la marche.");
    else if (ageY != null && ageY < 12) rep.push("2 à 12 ans : DEET 20 %, IR3535 20 % ou icaridine 20 % ; appliqué par un adulte, ni sur les mains ni sur le visage.");
    else rep.push("À partir de 12 ans : DEET 30 % (jusqu'à 50 %, ≈ 6 h), IR3535 jusqu'à 30 % (20 % ≈ 8 h), icaridine 20-30 % (25 % ≈ 6 h). Le DEET altère les plastiques et irrite les yeux.");
    if (preg) rep.push("Grossesse : DEET ≤ 30 %, IR3535 ≤ 20 %, icaridine ≤ 20 % ; pas de diffuseur électrique d'insecticide dans la chambre.");
    if (bf) rep.push("Allaitement : tous les répulsifs utilisables selon la notice, jamais sur les seins ; se laver les mains avant la tétée.");
    I(pv, "Répulsif cutané avec AMM (numéro FR-AAAA-XXXX sur l'étiquette) adapté au profil :", rep, "§ 2.2.2, p. 80-81 ; tableau 8, p. 82 ; § 10.3.5, p. 156", true);
    I(pv, "Bon usage : préférer crème ou lotion au spray ; appliquer sur la peau découverte (et les chevilles), pas sous les vêtements, ni sur peau lésée, yeux, bouche ; crème solaire d'abord puis répulsif 20 minutes après ; renouveler après baignade dans la limite de la notice ; laver la peau au coucher.", null, "§ 2.2.4, p. 82-83");
    I(pv, "À ne pas utiliser : bracelets, huiles essentielles (dont citronnelle), appareils à ultrasons, vitamine B1, bombes insecticides, serpentins fumigènes, vêtements imprégnés de perméthrine. Diffuseurs électriques : jamais dans la chambre d'une femme enceinte ou d'un enfant de moins de 3 ans. Appoint possible : vêtements traités par spray DEET ou IR3535 (à partir de 12 mois).", null, "Tableau 7, p. 80 ; § 2.2.5, p. 83-84");
    if (has(new Set(["AM_SUD", "AM_CEN", "CARA"]))) I(pv, `Maladie à virus Oropouche (${names(sej.filter(s => ["AM_SUD", "AM_CEN", "CARA"].includes(C(s.c).r)))}) : vecteur (moucheron) actif le jour, pic de 16 h à 18 h, passe à travers les moustiquaires non imprégnées → vêtements couvrants et répulsif ; éviter les rapports non protégés avec une personne possiblement infectée.${preg || inp.pregPlan ? " Grossesse ou projet de grossesse : PPAV stricte, reconsidérer tout voyage non essentiel en cas d'épidémie avérée (atteintes fœtales)." : ""}`, null, "§ 2.3, p. 85-88", preg);
    if (preg && vector) I(pv, "Grossesse : dengue, chikungunya et Zika exposent à des complications fœtales ou néonatales ; zones de circulation du Zika : se référer à l'avis HCSP du 16 février 2017.", null, "§ 10.3.6, p. 158", true);
    if (has(new Set(["AM_SUD", "AM_CEN"])) && (ex.rural || ex.poorHygiene)) I(pv, "Amérique latine rurale, habitat précaire : punaises réduves (maladie de Chagas) la nuit → moustiquaire imprégnée.", null, "Tableau 6, p. 76");
    if (ticks) I(pv, "Tiques : vêtements couvrants clairs serrés aux chevilles et aux poignets, répulsif (efficacité limitée) ; examen corporel minutieux au retour (cuir chevelu chez l'enfant) ; retrait au tire-tique sans produit, désinfection, surveillance du point de piqûre pendant un mois.", null, "§ 2.1.3, p. 78", true);
    if (ex.animals || ex.rural) I(pv, "Bivouac : ranger vêtements et chaussures dans un sac étanche fermé.", null, "§ 2.1.5, p. 79");
  }

  // ======================= Hygiène alimentaire et diarrhée =======================
  const lowHyg = has(LOWHYG_REG);
  const fo = S("alimentation", "Eau, alimentation et diarrhée du voyageur", { lvl: lowHyg ? "high" : "std" });
  if (lowHyg) I(fo, `20 à 56 % des voyageurs adultes ont une diarrhée dans les 100 jours ; risque plus élevé en séjour long, aventureux, chez l'enfant de moins de 2 ans et l'adolescent (${names(sej.filter(s => LOWHYG_REG.has(C(s.c).r)))}).`, null, "Chapitre 4, p. 116");
  I(fo, "Hygiène : se laver les mains avant les repas, avant de manipuler des aliments et après les toilettes (solution hydro-alcoolique à défaut).", null, "§ 4.1, p. 117");
  if (lowHyg) {
    I(fo, "Eau : bouteille capsulée ouverte devant soi, ou eau bouillie 1 minute à gros bouillons, ou désinfectée (DCCNa, hypochlorite), filtrée si trouble. Éviter glaçons, jus de fruits artisanaux, glaces artisanales.", null, "§ 4.1, p. 117", true);
    I(fo, "Aliments : plats chauds servis chauds ; éviter la nourriture de rue si la chaîne du chaud ou du froid est incertaine, les crudités, les coquillages crus, les plats réchauffés ; laver ou peler soi-même les fruits ; œufs, viandes, poissons et crustacés bien cuits ; lait pasteurisé ou bouilli.", null, "§ 4.1, p. 117");
  }
  if (ageM != null && ageM < 24) I(fo, `Nourrisson : privilégier l'allaitement maternel${ageM < 6 ? " ; vaccination contre le rotavirus recommandée avant 6 mois" : ""} ; apprendre aux parents les signes de déshydratation (soif, apathie, pâleur, extrémités froides, yeux creusés, bouche sèche).`, null, "§ 4.1, 4.2.2, p. 117-118", true);
  if (preg) I(fo, "Grossesse : renforcer les règles (crudités, lait cru, charcuterie, viandes peu cuites) : hépatite E, toxoplasmose, listériose, coxiellose, brucellose.", null, "§ 10.3.4, p. 156", true);
  I(fo, "En cas de diarrhée : boire sans attendre la soif, en alternant liquides salés et sucrés, ou solutés de réhydratation orale (surtout jeunes enfants et personnes âgées) ; poursuivre l'allaitement ; réalimentation précoce.", null, "§ 4.2.2, p. 118", true);
  I(fo, "Médicaments : racécadotril possible si diarrhée bénigne ou modérée (à éviter pendant la grossesse, pas pendant l'allaitement) ; lopéramide déconseillé, réservé aux diarrhées très liquides ou abondantes ou à une nécessité fonctionnelle, à partir de 15 ans, jamais si sang dans les selles ou fièvre ; pas de probiotiques, bismuth ou rifaximine en prévention.", null, "§ 4.1.1, 4.2.2, p. 117-119 ; tableau 12", false);
  const asia = has(ASIA_REG);
  I(fo, `Antibiotique seulement si diarrhée sévère (dont sang dans les selles) ou terrain fragile, et sans possibilité de consulter : azithromycine (adulte 1 g en une prise ou 500 mg/j 3 jours ; enfant selon le poids)${asia ? ", 1re intention au retour d'Asie" : ""} ; ${asia ? "ciprofloxacine à éviter pour un séjour en Asie (résistances)" : "alternative ciprofloxacine 500 mg × 2/j 3 jours hors Asie"}.`, null, "§ 4.2.2, p. 119-120 ; tableau 12", false);
  I(fo, "Consulter : diarrhée intense, sanglante, déshydratation, persistance (surtout avant 2 ans), et systématiquement en cas de fièvre (paludisme, typhoïde).", null, "§ 4.2.1, p. 117-118", true);
  if (any("IN", "PK", "BD", "NP", "LK", "BT", "MV") || has(new Set(["ASIE_SE"]))) I(fo, "Asie du Sud-Est et sous-continent indien : acquisition fréquente de bactéries multirésistantes (jusqu'à 85 %), majorée par diarrhée, antibiotiques et soins locaux.", null, "Chapitre 4, p. 116");
  if (has(new Set(["OCE", "OI", "CARA"])) || any("ES", "PT")) I(fo, "Ciguatera (îles intertropicales, aussi Canaries et Madère) : éviter les poissons prédateurs de récif (barracuda, carangue, mérou…), se renseigner localement, ne pas manger viscères, foie, tête ; la cuisson ne détruit pas la toxine.", null, "§ 4.3.1, p. 121");
  if (any("JP", "CN", "TW", "AU", "IN") || has(new Set(["ASIE_SE", "OCE"]))) I(fo, "Poissons-globes (fugu) : risque d'intoxication grave par la tétrodotoxine.", null, "§ 4.3.2, p. 122");
  if (any("CN", "AU", "JM", "BR") || has(new Set(["ASIE_SE", "OCE", "OI"]))) I(fo, "Angiostrongylose : ne pas consommer d'escargots, crevettes d'eau douce ou crabes crus ou peu cuits ; éviter le contact avec l'escargot géant africain (jeunes enfants).", null, "§ 4.3.3, p. 122");
  if (ex.rawMilk) I(fo, "Lait cru et produits au lait cru : listériose, brucellose, fièvre Q, encéphalite à tiques ; viande peu cuite : trichinose, toxoplasmose.", null, "§ 4.3.4, p. 122");
  if (any("IN", "NP", "LK", "PK", "BD", "CN") ) I(fo, "Médications ayurvédiques ou traditionnelles, cosmétiques (khôl, surma, sindoor) : risque de métaux lourds (plomb, mercure, arsenic), notamment chez l'enfant.", null, "§ 4.3.5, p. 123");

  // ======================= Transports =======================
  const tr = S("transports", "Transports", { lvl: "std" });
  I(tr, "Accidents : première cause de rapatriement et de décès des voyageurs. Ceinture, casque à deux-roues, siège auto pour les jeunes enfants ; dans les pays à circulation difficile, éviter de conduire soi-même et la nuit, vérifier l'état du véhicule.", null, "§ 5.1, p. 124 ; § 10.2.2, p. 151", true);
  if (longHaul) {
    I(tr, "Vol ≥ 4 h : thrombose veineuse multipliée par 2 à 3. Vêtements amples, hydratation sans alcool, bouger les jambes, marcher ; bas de contention classe 2 si un facteur de risque ; avis sur une HBPM si risque élevé (antécédent de thrombose, cancer actif, chirurgie récente, 2 facteurs). Aspirine non recommandée.", inp.vte || preg || cm.cancer || (ageY != null && ageY >= 65) ? ["Facteur de risque présent dans le profil : contention de classe 2 au minimum."] : null, "§ 5.2.4, p. 126", !!(inp.vte || preg || cm.cancer));
    I(tr, "Décalage horaire : décaler le coucher avant le départ, vivre à l'heure locale, s'exposer à la lumière naturelle ; mélatonine 0,5 à 5 mg au coucher possible chez l'adulte si ≥ 5 fuseaux horaires (précautions : épilepsie, AVK). Adapter les horaires des médicaments (contraceptifs, anticoagulants, insuline).", null, "§ 5.2.2, p. 124-125");
  }
  if (preg) I(tr, "Grossesse : période idéale entre 12 et 28 SA ; avion refusé après 36 SA (32 SA si grossesse multiple) ; croisières refusées après 28 SA ; longs trajets en voiture sur mauvaises routes déconseillés.", null, "§ 10.3.2, p. 156 ; § 5.2.3, p. 125", true);
  if (ageM != null && ageM < 1) I(tr, "Nouveau-né : avion contre-indiqué avant 48 h de vie ; reporter au-delà de la 1re semaine ; prématuré : attendre 41 SA d'âge corrigé.", null, "§ 5.2.3, p. 125 ; § 10.2.3, p. 152", true);
  if (ty.group) I(tr, "Croisière : mal de mer, infections respiratoires et digestives (grippe, Covid-19, norovirus), traumatismes ; stock suffisant de médicaments dans l'emballage d'origine avec ordonnance en DCI (anglais si possible).", null, "§ 5.3, p. 127");
  if (ageY != null && ageY >= 2 && ageY <= 12) I(tr, "Mal des transports plus fréquent de 2 à 12 ans : antihistaminique sédatif 2 h avant (dimenhydrinate sirop dès 2 ans).", null, "§ 5.4, p. 127");
  if (cm.resp || cm.cardio) I(tr, "Maladie cardiaque ou respiratoire : vérifier l'absence de contre-indication au vol (angor de repos, infarctus ou AVC récent…) ; test d'hypoxie à discuter selon la pathologie respiratoire.", null, "§ 5.2.3, p. 125 ; § 10.1.3, p. 144-145");

  // ======================= Environnement et activités =======================
  const en = S("environnement", "Environnement, baignade et activités", { lvl: "std" });
  if (has(TROPICAL_REG) || ex.freshwater) I(en, "Ne pas marcher pieds nus sur les plages ni sur les sols boueux ou humides ; ne pas se baigner ni marcher dans l'eau douce (bilharziose, leptospirose, amibes) ; soigner et couvrir toute plaie ; ne pas faire sécher le linge au sol (myiase) ou le repasser.", null, "§ 6.1, p. 127 ; fiches régionales", true);
  if (has(TROPICAL_REG) || has(new Set(["AF_NOR", "MO"]))) I(en, `Chaleur : éviter le soleil aux heures chaudes, boire souvent, lieux ventilés, activité physique aux heures fraîches, acclimatation progressive${(ageY != null && (ageY < 6 || ageY >= 65)) ? " ; vigilance renforcée (jeune enfant ou personne âgée : coup de chaleur, déshydratation)" : ""}.`, null, "§ 6.2, p. 128 ; § 10.4, p. 158");
  I(en, "Soleil : éviter 12 h-16 h, vêtements couvrants, chapeau à larges bords, lunettes CE3 (CE4 en haute montagne), écran solaire indice élevé renouvelé (2 mg/cm²).", ageY != null && ageY < 15 ? ["Enfant : t-shirt ou lycra pour les activités aquatiques, crème renouvelée après chaque baignade."] : null, "§ 6.3, p. 128-129 ; § 10.2.1, p. 150");
  if (has(ASIA_REG) || has(new Set(["AM_CEN", "AM_SUD"])) || has(SUBSAH_REG)) I(en, "Grandes métropoles polluées (Asie, Amérique latine, certaines villes d'Afrique) : surveiller l'indice de qualité de l'air (AQI > 100 = mauvais) ; personnes vulnérables : éviter les activités intenses en plein air ; masques chirurgicaux inefficaces, FFP2 partiellement efficaces lors des pics.", null, "§ 6.5, p. 129-131");
  I(en, "Animaux : ne pas approcher, caresser ni nourrir les animaux, même familiers, jeunes ou morts ; surveiller les enfants. Morsure, griffure, léchage sur plaie : laver 15 min à l'eau et au savon, antiseptique, consulter (rage, tétanos ; singe : herpès B, valaciclovir dans les 5 jours).", null, "§ 6.6.3, p. 134 ; § 1.15, p. 66", has(new Set(["AF_AUS","AF_CEN","AF_EST","AF_OUE","AF_NOR","ASIE_SE","ASIE_SUD","AM_SUD"])));
  if (ex.rural || ex.animals || ex.isolated) I(en, "Rongeurs : éviter contacts, excréta et habitats ; ne pas dormir à même le sol ; masque, gants et lunettes pour aérer ou nettoyer un lieu inhabité ; stocker les aliments.", null, "§ 6.6.2, p. 132-133");
  if (ex.rural || ex.animals) I(en, "Envenimations (serpents, scorpions, araignées, scolopendres) : chaussures fermées, attention en soulevant pierres et bois, secouer vêtements et chaussures ; consulter si symptômes marqués.", null, "§ 6.6.1, p. 131 ; annexe 7");
  if (has(new Set(["OCE", "OI", "CARA", "ASIE_SE"])) || ex.diving) I(en, "Mer : courants, méduses, poissons venimeux, coraux ; se renseigner localement, respecter les consignes, éviter les plages désertes non surveillées.", any("RE", "NC") ? ["Requins : attaques signalées à La Réunion et en Nouvelle-Calédonie."] : null, "§ 7.2, p. 136");
  if (ex.diving) I(en, "Plongée avec bouteilles : avis médical spécialisé ; vérifier encadrement et matériel ; gants et combinaison ; 24 h minimum entre la dernière plongée et l'avion.", [preg ? "Plongée incompatible avec la grossesse." : null, cm.drepano ? "Plongée contre-indiquée en cas de drépanocytose." : null].filter(Boolean), "§ 7.3, p. 137 ; § 10.3.3, p. 156", true);
  if (ex.altitude) I(en, "Altitude > 2 500 m : avis médical spécialisé ; « ne pas monter trop vite, trop haut » ; mal aigu des montagnes (céphalées, insomnie, nausées) pouvant évoluer vers des œdèmes pulmonaire ou cérébral ; redescendre. Acétazolamide 125 mg × 2/j (250 mg au-delà de 80 kg ; enfant 2,5-5 mg/kg/j) de 2 jours avant à 2 jours après le point culminant, sauf allergie aux sulfamides (alternative : dexaméthasone).", [ageM != null && ageM < 12 ? "Nourrisson : altitude au-delà de 2 000-2 500 m déconseillée ; risque de mort subite au-dessus de 1 600 m avant 12 mois." : null, preg ? "Grossesse : activités physiques déconseillées au-dessus de 2 000 m." : null, cm.drepano ? "Drépanocytose : séjour en altitude contre-indiqué." : null].filter(Boolean), "§ 7.4, p. 137 ; § 10.3.3, p. 156 ; § 10.1.8, p. 149", true);
  if (ex.cold) I(en, "Grand froid : plusieurs couches avec couche externe imperméable, couvrir tête, mains et pieds, pas de vêtements humides ; frissons et engourdissement = alerte.", ageY != null && ageY < 6 ? ["Enfant : porte-bébé proscrit par temps froid (hypothermie, gelures)."] : null, "§ 6.4, p. 129 ; § 10.2.1, p. 150");
  I(en, "Sport : prévoir plusieurs jours d'adaptation (fatigue, décalage horaire, chaleur). Piscines et spas : normes variables, légionellose ; surveiller les enfants (noyade).", null, "§ 7.1-7.2, p. 136 ; § 10.2.1, p. 150");

  // ======================= Comportements =======================
  const co = S("comportements", "Sexualité, soins et comportements à risque", { lvl: "std" });
  I(co, "Préservatif (digue dentaire pour les rapports oro-génitaux ou oro-anaux) ; PrEP du VIH à proposer en cas de prise de risque prévisible ; après un rapport à risque ou une agression : consultation en urgence (traitement post-exposition dans les heures, contraception d'urgence, certificat).", null, "§ 9.1, p. 142", !!ex.sti);
  I(co, "Soins à l'étranger : refuser tout geste sans matériel stérile à usage unique (injections, acupuncture, transfusions à risque) ; tatouages et piercings déconseillés pendant le voyage (hépatites B et C, VIH, mpox).", null, "§ 9.2-9.3, p. 142-143");
  I(co, "Alcool frelaté (méthanol), drogues (législation locale, soumission chimique)." + (has(new Set(["AM_SUD"])) ? " Ayahuasca en Amérique du Sud : risques importants, notamment en association." : ""), null, "§ 9.4, p. 143");
  if (ageY != null && ageY < 18 && (has(SUBSAH_REG) || has(new Set(["AF_NOR", "MO", "ASIE_SUD", "ASIE_SE"])))) I(co, "Si le voyage concerne une fillette ou une adolescente : aborder systématiquement le risque de mutilation génitale ou de mariage forcé selon le pays (figure 30) ; informer la famille de l'interdiction en France ; numéro 3919 ; information préoccupante ou signalement si risque.", null, "§ 10.2.1, p. 150-151", true);

  // ======================= Situations personnelles =======================
  const pe = S("profil", "Précautions liées au profil du voyageur", { lvl: "std" });
  if (anyChronic(cm) || immunodep) I(pe, "Maladie chronique : consultation avant le départ, fiche résumant la pathologie et le traitement (langue du pays ou anglais), traitement complet pour tout le séjour avec marge, une partie en cabine, ordonnance en DCI et en anglais, coordonnées d'un correspondant médical sur place.", null, "§ 10.1.1-10.1.2, p. 144 ; § 12.2, p. 162", true);
  if (cm.diabete) I(pe, "Diabète insulino-traité : avis du diabétologue, matériel en double réparti dans plusieurs bagages, certificat pour les aiguilles en cabine, sucres rapides à bord, pompe et capteurs à signaler aux contrôles (pas de rayons X), adaptation de l'insuline si > 3 h de décalage.", null, "§ 10.1.4, p. 146-147");
  if (cm.resp) I(pe, "Maladie respiratoire : être équilibré avant le départ, traitement de crise en cabine ; BPCO : prévention de la thrombose sur vol long ; test d'hypoxie selon la gravité ; pneumothorax : 7 jours après normalisation radiologique.", null, "§ 10.1.3, p. 144-146");
  if (cm.drepano) I(pe, "Drépanocytose : hyperhydratation 24 h avant et pendant le vol, vêtements chauds, contention, antalgiques en cabine, certificat pour l'oxygène à bord ; plongée et altitude contre-indiquées ; consulter au moindre signe infectieux.", null, "§ 10.1.8, p. 149 ; § 10.2.3, p. 154", true);
  if (immunodep) I(pe, "Immunodépression : consultation spécialisée avant le départ, hygiène alimentaire renforcée, protection solaire stricte (risque de cancer cutané), attention aux interactions médicamenteuses et aux sulfamides photosensibilisants.", null, "§ 10.1.7, p. 148-149", true);
  if (ageY != null && ageY < 15) I(pe, "Enfant : copie du carnet de santé ; vigilance sur les répulsifs, le soleil, la chaleur, la noyade, les animaux, la douche quotidienne et le séchage des plis ; prévenir brûlures et intoxications domestiques (produits pétroliers, caustiques, pesticides).", null, "§ 10.2.1, p. 150-151");
  if (ageY != null && ageY >= 65) I(pe, "Personne âgée : consultation du médecin traitant ; vigilance accrue à la chaleur et au froid (moindre perception de la déshydratation), décompensation des maladies chroniques lors des infections (arboviroses).", null, "§ 10.4, p. 158");
  if (preg) I(pe, "Grossesse : avis du médecin ou de la sage-femme, copie du dossier de suivi, certificat de non-contre-indication au voyage (aérien), assurance couvrant la grossesse ; trekking, canyoning et plongée incompatibles.", null, "§ 10.3.1, 10.3.3, p. 154-156", true);
  if (!pe.items.length) sections.pop();

  // ======================= Trousse à pharmacie =======================
  const tp = S("trousse", "Trousse à pharmacie (à adapter)", { lvl: "std" });
  const tl = ["Paracétamol ; sels de réhydratation orale" + (ageY != null && ageY < 3 ? " (indispensables chez le nourrisson)" : "") + " ; antisécrétoire (racécadotril) éventuellement", "Antihistaminique ; stylo d'adrénaline si antécédent d'anaphylaxie", "Antiseptique, pansements stériles, sutures adhésives, sérum physiologique, thermomètre, pince à épiler", "Écran solaire IP 50+, gel hydro-alcoolique, préservatifs, produit de désinfection de l'eau"];
  if (vector) tl.push("Répulsif adapté (tableau 8)" + (maxLvl !== "absent" ? ", moustiquaire et produit d'imprégnation, antipaludique préventif (et de réserve si indiqué)" : ""));
  if (longHaul && (inp.vte || preg)) tl.push("Bas de contention classe 2");
  if (ex.isolated) tl.push("Antibiotiques en prescription anticipée si accès aux soins limité, avec explications : azithromycine (diarrhée grave), fosfomycine-trométamol (cystite), ofloxacine auriculaire (baignades, plongée), amoxicilline ou céphalosporine (infection ORL ou pulmonaire)");
  if (anyChronic(cm) || immunodep) tl.push("Traitement chronique en quantité suffisante avec marge, matériel d'injection et certificat");
  I(tp, "Médicaments dans leur emballage d'origine, galénique adaptée à l'âge (pas de formes liquides ni de suppositoires) :", tl, "Chapitre 11, p. 159-160");
  I(tp, "Méfiance vis-à-vis des médicaments achetés sur place (contrefaçons fréquentes).", null, "Chapitre 11, p. 160");

  // ======================= Administratif =======================
  const ad = S("administratif", "Assurance, documents et médicaments", { lvl: "std" });
  const allEEE = sej.every(s => EEE_CH.has(s.c));
  if (allEEE) I(ad, "Union européenne, EEE, Suisse : carte européenne d'assurance maladie (en ligne ou auprès de la caisse).", null, "§ 12.1.1, p. 161", true);
  else I(ad, `Hors UE : assurance couvrant les frais médicaux fortement recommandée${totalDays > 180 || ty.expat ? " ; séjour de plus de 6 mois : assurance maladie indispensable (Caisse des Français de l'étranger ou assureur privé)" : ""}.`, null, "§ 12.1.1, p. 161", true);
  I(ad, `Assistance rapatriement : vérifier couverture, plafonds et exclusions (maladie chronique, hospitalisation récente)${totalDays > 90 ? " ; séjour de plus de 3 mois : contrat d'assistance spécifique" : ""}${any("US", "CA") ? " ; coûts des soins très élevés aux États-Unis et au Canada" : ""}. Inscription sur Ariane (alertes du ministère des Affaires étrangères).`, null, "§ 12.1, p. 161 ; fiche Amérique du Nord", true);
  I(ad, "Médicaments : ordonnance originale en DCI (traduction anglaise), traitement en cabine, quantité limitée à la durée prescrite (3 mois maximum à défaut) ; hors Schengen, se renseigner auprès de l'ambassade du pays.", null, "§ 12.3.1, p. 162");
  if (inp.narcotics) I(ad, `Médicaments stupéfiants ou assimilés : ${allEEE ? "espace Schengen → autorisation de l'ARS (formulaire CERFA 10083*03)" : "hors Schengen → vérifier sur le site de l'OICS si une attestation est exigée, demande à l'ANSM au moins 10 jours avant le départ (28 jours maximum)"}.`, null, "§ 12.3.2, p. 162-163", true);

  // ======================= Au retour =======================
  const re = S("retour", "Au retour", { lvl: "std" });
  if (maxLvl !== "absent") I(re, "Fièvre dans les 3 mois : consultation en urgence (service d'urgences hospitalier) en signalant le séjour ; recherche du paludisme en urgence.", null, "§ 3.1.3, p. 94", true);
  I(re, "Consulter en cas de fièvre, diarrhée persistante, éruption ou symptômes inhabituels, en mentionnant le voyage.", null, "Chapitre 13, p. 164");
  if (has(new Set(["AM_SUD", "AM_CEN", "CARA"]))) I(re, "Symptômes dans les 2 semaines après une zone d'épidémie d'Oropouche : consultation (RT-PCR, sérologie) ; si confirmé : pas d'aspirine ni d'AINS, préservatif 6 semaines pour les hommes.", null, "§ 2.3, p. 88");
  I(re, "Hospitalisation de 24 h ou plus à l'étranger dans les 12 derniers mois : le signaler lors de toute hospitalisation (dépistage de bactéries hautement résistantes).", null, "Chapitre 13, p. 164 ; § 9.2.2, p. 143");
  I(re, "Punaises de lit : inspecter la chambre à l'arrivée, ne pas poser les bagages sur le lit ; en cas de doute au retour, laver les vêtements à 60 °C ou congeler à -20 °C pendant 48 h.", null, "§ 2.1.2, p. 77");
  if (ticks) I(re, "Piqûre de tique : surveiller le point de piqûre un mois ; consulter en cas de rougeur qui s'étend ou de fièvre.", null, "§ 2.1.3, p. 78");

  return { sections, malaria, conv };
}
function anyChronic(cm) { return !!(cm.hta || cm.diabete || cm.cardio || cm.resp || cm.neurovasc || cm.hepato || cm.muco || cm.irc || cm.cancer || cm.neuro || cm.drepano); }

if (typeof module !== "undefined") module.exports = { advise };
