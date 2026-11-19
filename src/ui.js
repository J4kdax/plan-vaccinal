// ---- Interface ----
const $ = (id) => document.getElementById(id);
const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function isoToday() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

$("bm").innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");

const COUNTRY_OPTIONS = (() => {
  let h = '<option value="">— Choisir un pays —</option>';
  REGION_ORDER.forEach(r => {
    const cs = COUNTRIES.filter(c => c.r === r).sort((a, b) => a.n.localeCompare(b.n, "fr"));
    if (!cs.length) return;
    h += `<optgroup label="${esc(REGIONS[r].label)}">` + cs.map(c => `<option value="${c.id}">${esc(c.n)}</option>`).join("") + "</optgroup>";
  });
  return h;
})();

let stops = [];
let uid = 0;
function newStop(type) { return { k: ++uid, c: "", type: type || "sejour", days: type === "transit" ? "" : 14, hours: type === "transit" ? 3 : "", dengue: "", chik: "", polio: "", mpox: "", fjZone: "", fjEpi: false, jeEpi: false }; }

function countryTags(c) {
  const t = [];
  t.push(`<span class="tag">${esc(REGIONS[c.r].label)}</span>`);
  if (c.fj === "none") t.push('<span class="tag">FJ : ni risque ni exigence</span>');
  else if (!c.fj) t.push('<span class="tag fj">FJ : non listé au tableau 15</span>');
  else {
    if (c.fj.tous) t.push('<span class="tag fj">FJ exigée pour tous</span>');
    if (c.fj.prov || c.fj.prov12 || c.fj.provAny) t.push('<span class="tag fj">FJ exigée si provenance d\'un pays à risque</span>');
    if (/^Oui/.test(c.fj.reco)) t.push(`<span class="tag fj">FJ recommandée${c.fj.reco.length > 16 ? " selon la zone" : ""}</span>`);
  }
  if (JE[c.id]) t.push('<span class="tag">Encéphalite japonaise</span>');
  if (TBE[c.id]) t.push(`<span class="tag">Encéphalite à tiques${TBE[c.id].b ? " (gras)" : ""}</span>`);
  if (c.tb) t.push(`<span class="tag">Tuberculose ${c.tb}/100 000</span>`);
  else if (TB_TEXT_ONLY[c.id]) t.push('<span class="tag">Tuberculose : § 1.17</span>');
  return t.join("");
}

function sel(id, val, opts) { return `<select data-f="${id}">` + opts.map(([v, l]) => `<option value="${v}"${String(val) === v ? " selected" : ""}>${esc(l)}</option>`).join("") + "</select>"; }

function renderStops() {
  const box = $("stops");
  box.innerHTML = stops.map((s, i) => {
    const c = s.c ? COUNTRY_BY_ID[s.c] : null;
    const zoneNeeded = c && c.fj && c.fj !== "none" && /^Oui/.test(c.fj.reco) && c.fj.reco.length > 16 && !/seulement en cas d.exposition importante/.test(c.fj.reco.slice(0, 80));
    const polioDef = c ? (POLIO_DEFAULT[c.id] || "") : "";
    const ctx = c && s.type !== "transit" ? `
      <div class="ctx">
        <label class="field"><span class="lab">Dengue</span>${sel("dengue", s.dengue, [["", "Non renseigné"], ["epi", "Épidémie avérée"], ["high", "Endémique > 100/100 000"], ["low", "Circulation < 100/100 000"], ["none", "Pas de circulation"]])}</label>
        <label class="field"><span class="lab">Chikungunya</span>${sel("chik", s.chik, [["", "Non renseigné"], ["epi", "Zone épidémique"], ["circ", "Circulation active < 12 mois"], ["none", "Pas de circulation"]])}</label>
        <label class="field"><span class="lab">Poliovirus (liste OMS)</span>${sel("polio", s.polio || polioDef || "none", [["none", "Aucun signalé"], ["wpv", "PVS1 / PVDVc1 / PVDVc3"], ["cvdpv2", "PVDVc2"], ["?", "À vérifier"]])}</label>
        <label class="field"><span class="lab">Mpox clade I actif</span>${sel("mpox", s.mpox, [["", "Non"], ["oui", "Oui"]])}</label>
        ${zoneNeeded ? `<label class="field"><span class="lab">Zone à risque de FJ visitée ?</span>${sel("fjZone", s.fjZone, [["", "À préciser"], ["oui", "Oui"], ["non", "Non"]])}</label>` : ""}
      </div>
      <div class="row" style="font-size:12.5px">
        ${c.fj && c.fj !== "none" ? `<label><input type="checkbox" data-f="fjEpi"${s.fjEpi ? " checked" : ""}> Épidémie de fièvre jaune signalée</label>` : ""}
        ${JE[c.id] ? `<label><input type="checkbox" data-f="jeEpi"${s.jeEpi ? " checked" : ""}> Épidémie d'encéphalite japonaise</label>` : ""}
      </div>` : "";
    return `<div class="stop${s.type === "transit" ? " transit" : ""}" data-k="${s.k}">
      <div class="stop-head">
        <span class="stop-num">${String(i + 1).padStart(2, "0")}</span>
        <select data-f="c" aria-label="Pays de l'étape ${i + 1}">${COUNTRY_OPTIONS.replace(`value="${s.c}"`, `value="${s.c}" selected`)}</select>
        <span class="stop-ctrl">
          <button type="button" class="icon" data-a="up" aria-label="Monter l'étape">↑</button>
          <button type="button" class="icon" data-a="down" aria-label="Descendre l'étape">↓</button>
          <button type="button" class="icon" data-a="del" aria-label="Supprimer l'étape">×</button>
        </span>
      </div>
      <div class="row">
        ${sel("type", s.type, [["sejour", "Séjour"], ["transit", "Transit aéroport"]])}
        ${s.type === "transit" ? `<label>Durée <input type="number" min="0" data-f="hours" value="${esc(s.hours)}"> h</label>` : `<label>Durée <input type="number" min="1" data-f="days" value="${esc(s.days)}"> jours</label>`}
      </div>
      ${c ? `<div class="tags">${countryTags(c)}</div>` : ""}
      ${ctx}
    </div>`;
  }).join("");
}

$("stops").addEventListener("change", onStopEvent);
$("stops").addEventListener("input", (e) => { if (e.target.type === "number") onStopEvent(e); });
$("stops").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const k = Number(b.closest(".stop").dataset.k); const i = stops.findIndex(s => s.k === k);
  if (b.dataset.a === "del") stops.splice(i, 1);
  if (b.dataset.a === "up" && i > 0) [stops[i - 1], stops[i]] = [stops[i], stops[i - 1]];
  if (b.dataset.a === "down" && i < stops.length - 1) [stops[i + 1], stops[i]] = [stops[i], stops[i + 1]];
  renderStops(); update();
});
function onStopEvent(e) {
  const el = e.target; const f = el.dataset.f; if (!f) return;
  const s = stops.find(x => x.k === Number(el.closest(".stop").dataset.k));
  s[f] = el.type === "checkbox" ? el.checked : el.value;
  if (f === "c") { s.dengue = ""; s.chik = ""; s.polio = POLIO_DEFAULT[el.value] || "none"; s.mpox = ""; s.fjZone = ""; s.fjEpi = false; s.jeEpi = false; }
  if (f === "c" || f === "type") renderStops();
  update();
}
$("addStop").onclick = () => { stops.push(newStop("sejour")); renderStops(); update(); };
$("addTransit").onclick = () => { stops.push(newStop("transit")); renderStops(); update(); };
$("form").addEventListener("change", (e) => { if (!e.target.closest("#stops")) update(); });
$("form").addEventListener("input", (e) => { if (!e.target.closest("#stops") && e.target.type === "number") update(); });
$("form").addEventListener("submit", (e) => e.preventDefault());
$("hiv").addEventListener("change", () => { $("cd4row").hidden = !$("hiv").checked; });

function grp(name) { const o = {}; document.querySelectorAll(`[data-g="${name}"]`).forEach(el => { o[el.id] = el.checked; }); return o; }
function collect() {
  const im = grp("immuno"); im.cd4 = $("cd4").value; im.cd4pct = $("cd4pct").value;
  return {
    today: isoToday(),
    birth: { y: Number($("by").value) || null, m: Number($("bm").value) },
    pregnant: $("pregnant").checked, pregPlan: $("pregPlan").checked, breastfeeding: $("breastfeeding").checked, infantUnder6m: $("infantUnder6m").checked,
    weight: $("weight").value, neuroPsy: $("neuroPsy").checked, avk: $("avk").checked, vte: $("vte").checked, narcotics: $("narcotics").checked,
    arthralgia: $("arthralgia").checked, complement: $("complement").checked, antiIFN: $("antiIFN").checked, fluTarget: $("fluTarget").checked, smallpox1980: $("smallpox1980").checked,
    immuno: im, comorb: grp("comorb"), hist: grp("hist"), meds: grp("meds"),
    vacc: {
      dtp: $("dtp").value, polioLast: $("polioLast").value || null, ror: $("ror").value, rorEarly: $("rorEarly").checked,
      fj: { done: $("fjDone").checked, date: $("fjDate").value ? $("fjDate").value + "-15" : null, under2: $("fjUnder2").checked, pregnant: $("fjPreg").checked },
      hepa: $("hepa").value, hepb: $("hepb").value, men: $("men").value || null, menConj: $("menConj").checked, typh: $("typh").value || null,
      je: $("je").value, tbe: $("tbe").value, dengue: $("dengueV").value, mpox: $("mpoxV").value,
      chik: $("chikV").checked, rage: $("rageV").checked, bcg: $("bcgV").checked, flu: $("fluV").checked, covid: $("covidV").checked,
    },
    trip: { departure: $("departure").value || isoToday(), stops: stops.map(s => ({ ...s, days: Number(s.days) || 0, hours: Number(s.hours) || 0 })), type: grp("type"), exp: grp("exp") },
  };
}

function ageText(m) { if (m == null) return "–"; if (m < 24) return `${m} mois`; const y = Math.floor(m / 12), r = m % 12; return y + " ans" + (y < 6 && r ? ` ${r} mois` : ""); }
const GROUPS = [["OBL", "Obligatoire ou exigé"], ["CI", "Contre-indiqué"], ["REC", "Recommandé"], ["MAJ", "Mise à jour du calendrier"], ["DISC", "À discuter, au cas par cas"], ["OK", "À jour"]];
let last = null;
const ICON = {
  crit: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="12" r=".9" fill="currentColor"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5V8.5l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 7v4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.8" r=".9" fill="currentColor"/></svg>',
};
function fmtDate(iso, minus) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - (minus || 0)); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }

function card(it, days) {
  const late = it.lead && days < it.lead && ["OBL", "REC"].includes(it.status);
  const caut = [...new Set(it.cautions)];
  const open = ["OBL", "REC", "CI"].includes(it.status) ? " open" : "";
  return `<article class="card s-${it.status}">
    <div class="card-h"><h3>${esc(it.name)}${it.product ? `<span class="prod">${esc(it.product)}</span>` : ""}</h3><span class="stamp">${ST_LABEL[it.status]}</span></div>
    <ul>${it.reasons.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    ${it.ciReasons ? `<div class="ci">Contre-indication : ${esc(it.ciReasons.join(" ; "))}</div>` : ""}
    ${it.lead && ["OBL", "REC", "MAJ", "DISC"].includes(it.status) ? `<div class="lead${late ? " late" : ""}">${ICON.warn} ${esc(it.leadLabel)}${late ? ` · départ dans ${days} j` : ""}</div>` : ""}
    ${it.schema.length || caut.length ? `<details${open}><summary>Schéma et précautions</summary><div class="dgrid">
      ${it.schema.length ? `<div class="blk"><b>Schéma</b><ul>${it.schema.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
      ${caut.length ? `<div class="blk"><b>Précautions</b><ul>${caut.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
    </div></details>` : ""}
    <div class="refs">${it.refs.map(r => `<span>${esc(r)}</span>`).join("")}</div>
  </article>`;
}

function routeHtml(stopsIn) {
  const s = stopsIn.filter(x => x.c);
  if (!s.length) return "";
  const nodes = ['<div class="node home"><span class="cc">FR</span><span class="nm">Départ</span></div>'];
  s.forEach(x => {
    const c = COUNTRY_BY_ID[x.c];
    nodes.push(`<div class="node${x.type === "transit" ? " transit" : ""}" title="${esc(c.n)}"><span class="cc">${esc(c.id)}</span><span class="nm">${esc(c.n.length > 18 ? c.n.slice(0, 17) + "…" : c.n)} · ${x.type === "transit" ? x.hours + " h" : x.days + " j"}</span></div>`);
  });
  return `<div class="route">${nodes.join('<span class="leg" aria-hidden="true"></span>')}</div>`;
}

function timelineHtml(r, depIso) {
  const days = r.profile.daysToDep;
  const its = r.items.filter(i => ["OBL", "REC"].includes(i.status) && i.lead).sort((a, b) => b.lead - a.lead);
  if (!its.length) return "";
  const maxLead = Math.max(...its.map(i => i.lead));
  const span = Math.max(28, Math.ceil(Math.max(maxLead, Math.max(days, 0)) * 1.12 / 7) * 7);
  const x = (before) => (100 * (span - before) / span);
  const step = span <= 42 ? 7 : span <= 98 ? 14 : 28;
  const ticks = []; for (let d = 0; d <= span; d += step) ticks.push(d);
  const gl = ticks.map(d => `<span class="gl" style="left:${x(d)}%"></span>`).join("");
  const today = days >= 0 && days <= span ? `<span class="mark" style="left:${x(days)}%" title="Aujourd'hui"></span>` : "";
  const rows = its.map(i => {
    const left = x(i.lead), late = days < i.lead;
    const lateW = late ? 100 * (i.lead - Math.max(days, 0)) / i.lead : 0;
    return `<div class="name">${esc(i.name)}<span class="date">${late ? "délai dépassé" : "commencer au plus tard le " + fmtDate(depIso, i.lead)}</span></div>
      <div class="track">${gl}<span class="bar ${i.status}" style="left:${left}%;width:${100 - left}%">${late ? `<span class="late" style="width:${lateW}%"></span>` : ""}</span>${today}</div>`;
  }).join("");
  const axis = ticks.map(d => `<span style="left:${x(d)}%${d === 0 ? ";transform:translateX(-100%)" : ""}">${d === 0 ? "départ" : "J-" + d}</span>`).join("");
  const todayLbl = days >= 0 && days <= span ? `<div class="axis"><span class="today" style="left:${x(days)}%">aujourd'hui · J-${days}</span></div>` : "<div></div>";
  const lateN = its.filter(i => days < i.lead).length;
  return `<h2>Calendrier avant le départ</h2>
    <div class="note">Délai minimal conseillé pour chaque vaccin obligatoire ou recommandé, compté à rebours depuis le départ (${fmtDate(depIso).replace(/\.$/, "")}). ${lateN ? `<b style="color:var(--s-ci)">${lateN} délai(s) déjà dépassé(s)</b> : voir les schémas accélérés dans les fiches.` : "Tous les délais sont tenables."}</div>
    <div class="tl"><div></div>${todayLbl}${rows}<div></div><div class="axis">${axis}</div></div>`;
}

function update() {
  const inp = collect();
  const r = evaluate(inp); last = { inp, r };
  const P = r.profile;
  $("ageOut").textContent = ageText(P.ageM);
  $("daysOut").textContent = P.daysToDep + " j";
  const vis = r.items.filter(i => i.status !== "NA");
  const counts = {}; vis.forEach(i => counts[i.status] = (counts[i.status] || 0) + 1);
  const order = ["OBL", "CI", "REC", "MAJ", "DISC", "OK", "NR"];
  const total = order.reduce((a, s) => a + (counts[s] || 0), 0) || 1;
  const nStops = inp.trip.stops.filter(s => s.c).length;
  const flags = [P.immunodep ? '<span class="tag fj">Immunodépression</span>' : "", inp.pregnant ? '<span class="tag fj">Grossesse</span>' : "", inp.breastfeeding ? '<span class="tag">Allaitement</span>' : ""].join("");
  $("summary").innerHTML = `
    ${routeHtml(inp.trip.stops) || '<div class="empty">Ajoutez une étape à l\'itinéraire pour obtenir les recommandations liées à la destination.</div>'}
    <div class="facts">
      <div class="fact"><div class="k">Âge au départ</div><div class="v">${ageText(P.ageM)}</div></div>
      <div class="fact"><div class="k">Départ dans</div><div class="v">${P.daysToDep} j</div></div>
      <div class="fact"><div class="k">Durée des séjours</div><div class="v">${P.totalDays} j</div></div>
      <div class="fact"><div class="k">À faire</div><div class="v">${(counts.OBL || 0) + (counts.REC || 0) + (counts.MAJ || 0)}</div></div>
    </div>
    ${flags ? `<div class="flags">${flags}</div>` : ""}
    <div class="sbar" role="img" aria-label="Répartition des statuts">${order.filter(s => counts[s]).map(s => `<span class="c-${s}" style="flex:${counts[s]}"></span>`).join("")}</div>
    <div class="legend">${order.filter(s => counts[s]).map(s => `<span><i class="c-${s}"></i>${ST_LABEL[s]} <b>${counts[s]}</b></span>`).join("")}</div>`;
  if (!nStops) {
    $("summary").innerHTML = `<div class="empty"><b>Nouveau patient</b><br>Renseignez le voyageur puis ajoutez au moins une étape à l'itinéraire : les recommandations s'afficheront ici.</div>`;
    $("timeline").hidden = true; $("alerts").innerHTML = ""; $("groups").innerHTML = "";
    $("jump").innerHTML = "Voir le plan";
    $("sum1").textContent = P.ageM == null ? "à renseigner" : ageText(P.ageM);
    $("sum2").textContent = "itinéraire à saisir"; $("sum3").textContent = ""; $("sum4").textContent = "";
    $("tcVacc").textContent = ""; renderAdvice(inp);
    return;
  }
  const tl = timelineHtml(r, inp.trip.departure);
  $("timeline").innerHTML = tl; $("timeline").hidden = !tl;
  const al = [...r.alerts.filter(a => a.lvl === "crit"), ...r.alerts.filter(a => a.lvl === "warn"), ...r.alerts.filter(a => a.lvl === "info")];
  $("alerts").innerHTML = al.map(a => `<div class="alert ${a.lvl}">${ICON[a.lvl]}<div>${esc(a.t)}${a.ref ? ` <span class="ref">${esc(a.ref)}</span>` : ""}</div></div>`).join("");
  let h = "";
  GROUPS.forEach(([s, label]) => { const its = vis.filter(i => i.status === s); if (its.length) h += `<section class="group"><h2><span class="count c-${s}">${its.length}</span>${label}</h2><div class="cards">${its.map(i => card(i, P.daysToDep)).join("")}</div></section>`; });
  const rest = vis.filter(i => ["NR", "INFO"].includes(i.status));
  if (rest.length) h += `<details class="collapsed-group"><summary>Non recommandé ou pour information (${rest.length})</summary><div class="cards">${rest.map(i => card(i, P.daysToDep)).join("")}</div></details>`;
  $("groups").innerHTML = h;
  $("tcVacc").textContent = (counts.OBL || 0) + (counts.REC || 0) + (counts.MAJ || 0) || "";
  renderAdvice(inp);
  $("jump").innerHTML = `Voir le plan <b>${(counts.OBL || 0) + (counts.REC || 0) + (counts.MAJ || 0)}</b> à faire${counts.CI ? ` · <b>${counts.CI}</b> CI` : ""}`;
  // résumés des sections
  $("sum1").textContent = [ageText(P.ageM), inp.pregnant ? "grossesse" : "", inp.breastfeeding ? "allaitement" : ""].filter(Boolean).join(" · ");
  $("sum2").textContent = nStops ? `${nStops} étape${nStops > 1 ? "s" : ""} · J-${P.daysToDep}` : "itinéraire à saisir";
  const nT = document.querySelectorAll('#sec3 input[type=checkbox]:checked').length;
  $("sum3").textContent = nT ? `${nT} élément${nT > 1 ? "s" : ""} coché${nT > 1 ? "s" : ""}` : "aucun facteur";
  $("sum4").textContent = $("dtp").value === "ajour" ? "dTP à jour" : "dTP à vérifier";
}


let lastAdv = null;
const PL = { eleve: "Risque élevé", modere: "Risque modéré", faible: "Risque faible", absent: "Pas de transmission" };
function renderAdvice(inp) {
  const a = advise(inp); lastAdv = a;
  const secs = a.sections;
  $("tcAdv").textContent = secs.length || "";
  if (!secs.length) { $("advToc").innerHTML = ""; $("advice").innerHTML = '<div class="empty">Ajoutez une étape à l\'itinéraire pour afficher les conseils liés aux zones visitées.</div>'; return; }
  $("advToc").innerHTML = secs.map(s => `<button type="button" data-sec="${s.id}" class="lv-${s.lvl}">${esc(s.title)}</button>`).join("");
  $("advice").innerHTML = secs.map(s => {
    let pal = "";
    if (s.id === "paludisme" && a.malaria) {
      pal = `<div class="pal">${a.malaria.stops.map(x => `<details><summary><span class="cn">${esc(x.n)} ${x.p ? `<small>· tableau 16, p. ${x.p}</small>` : "<small>· non listé au tableau 16</small>"}</span><span class="lvl ${x.lvl}">${PL[x.lvl]}</span></summary>
        <div class="body">${x.listed ? `<div><b>Situation</b><ul>${x.s.map(l => `<li>${esc(l).replace(/^(Risque (?:élevé|modéré|faible)|Aucun risque)/, "<b>$1</b>")}</li>`).join("")}</ul></div><div><b>Recommandations</b><ul>${x.r.map(l => /^Voir /.test(l) ? `<li class="note">${esc(l)} (cartes du document HCSP)</li>` : `<li>${esc(l)}</li>`).join("") || "<li>Aucune mesure spécifique au paludisme.</li>"}</ul></div>` : "<div>Pays non listé au tableau 16 : pas de transmission connue.</div>"}</div></details>`).join("")}</div>`;
    }
    return `<section class="adv lv-${s.lvl}" id="adv-${s.id}">
      <div class="adv-h"><h3>${esc(s.title)}</h3>${s.badge ? `<span class="lvl ${a.malaria ? a.malaria.max : ""}">${esc(s.badge)}</span>` : ""}</div>
      ${pal}
      <ul class="items">${s.items.map(i => `<li class="${i.strong ? "strong" : ""}">${esc(i.t)}${i.ref ? ` <span class="r">${esc(i.ref)}</span>` : ""}${i.sub && i.sub.length ? `<ul>${i.sub.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>
    </section>`;
  }).join("");
}
$("advToc").addEventListener("click", (e) => { const b = e.target.closest("button[data-sec]"); if (b) document.getElementById("adv-" + b.dataset.sec).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
function setTab(which) {
  const v = which === "vacc";
  $("tabVacc").setAttribute("aria-selected", v); $("tabAdv").setAttribute("aria-selected", !v);
  $("panelVacc").hidden = !v; $("panelAdv").hidden = v;
}
$("tabVacc").onclick = () => setTab("vacc");
$("tabAdv").onclick = () => setTab("adv");
$("tabVacc").addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { setTab("adv"); $("tabAdv").focus(); } });
$("tabAdv").addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") { setTab("vacc"); $("tabVacc").focus(); } });

function summaryText() {
  const { inp, r } = last; const P = r.profile;
  const L = [];
  L.push("PLAN VACCINAL DU VOYAGEUR – aide à la décision (HCSP, Recommandations sanitaires aux voyageurs 2026)");
  L.push(`Âge au départ : ${ageText(P.ageM)} | Départ : ${inp.trip.departure} (J-${P.daysToDep}) | Durée des séjours : ${P.totalDays} j`);
  L.push("Itinéraire : " + inp.trip.stops.filter(s => s.c).map(s => COUNTRY_BY_ID[s.c].n + (s.type === "transit" ? ` (transit ${s.hours} h)` : ` (${s.days} j)`)).join(" → "));
  const crit = r.alerts.filter(a => a.lvl === "crit");
  if (crit.length) { L.push(""); crit.forEach(a => L.push("! " + a.t)); }
  GROUPS.concat([["NR", "Non recommandé"]]).forEach(([s, label]) => {
    const its = r.items.filter(i => i.status === s); if (!its.length) return;
    L.push(""); L.push(label.toUpperCase());
    its.forEach(i => { L.push(`- ${i.name}${i.product ? " (" + i.product + ")" : ""} : ${i.reasons[0] || ""}`); if (["OBL", "REC"].includes(s) && i.schema[0]) L.push(`  Schéma : ${i.schema[0]}`); if (i.ciReasons) L.push(`  CI : ${i.ciReasons.join(" ; ")}`); });
  });
  if (r.warnings.length) { L.push(""); r.warnings.forEach(w => L.push("Délai : " + w.t)); }
  if (lastAdv && lastAdv.sections.length) {
    L.push(""); L.push("CONSEILS DE VOYAGE");
    if (lastAdv.malaria) L.push("Paludisme : " + lastAdv.malaria.stops.map(x => `${x.n} ${PL[x.lvl].toLowerCase()}`).join(" ; ") + " – chimioprophylaxie : " + ({ oui: "indiquée", non: "non indiquée", discuter: "à discuter / avis spécialisé" })[lastAdv.malaria.cpap]);
    lastAdv.sections.forEach(s => { const st = s.items.filter(i => i.strong); if (st.length) { L.push(`- ${s.title} :`); st.forEach(i => L.push(`  · ${i.t}`)); } });
  }
  L.push(""); L.push("Proposition à valider par le praticien. Vérifier les données épidémiologiques et les conditions d'entrée en vigueur.");
  return L.join("\n");
}
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 1800); }
$("btnCopy").onclick = async () => {
  const txt = summaryText(); const box = $("copybox"); box.value = txt;
  try { await navigator.clipboard.writeText(txt); box.classList.remove("on"); toast("Synthèse copiée"); }
  catch (e) { box.classList.add("on"); box.focus(); box.select(); toast("Copie automatique refusée : sélectionnez le texte affiché"); }
};

function resetForm() {
  document.querySelectorAll("#form input[type=checkbox]").forEach(el => el.checked = el.id === "menConj");
  document.querySelectorAll("#form input[type=number], #form input[type=month], #form input[type=text]").forEach(el => el.value = "");
  $("bm").value = "1"; $("dtp").value = "inconnu"; $("ror").value = "inconnu"; $("hepa").value = "0"; $("hepb").value = "inconnu";
  ["je", "tbe", "dengueV", "mpoxV"].forEach(id => $(id).value = "0");
  $("departure").value = addDays(isoToday(), 30); $("cd4row").hidden = true;
  stops = [newStop("sejour")];
}
$("btnReset").onclick = () => { resetForm(); $("exampleBanner").hidden = true; $("ficheBanner").hidden = true; $("btnExample").hidden = false; renderStops(); update(); window.scrollTo(0, 0); };
$("btnExample").onclick = () => { loadExample(); $("ficheBanner").hidden = true; $("exampleBanner").hidden = false; $("btnExample").hidden = true; renderStops(); update(); };

function loadExample() {
  resetForm();
  $("bm").value = "3"; $("by").value = "1985";
  $("departure").value = addDays(isoToday(), 35);
  $("dtp").value = "ajour"; $("ror").value = "2"; $("polioLast").value = "2019-06"; $("hepb").value = "3";
  $("rural").checked = true; $("animals").checked = true;
  stops = [Object.assign(newStop("sejour"), { c: "KE", days: 10, fjZone: "oui", polio: "none" }), Object.assign(newStop("sejour"), { c: "TZ", days: 12, polio: "none" })];
}
resetForm(); renderStops(); update();
setTimeout(() => document.body.classList.remove("intro"), 1400);
