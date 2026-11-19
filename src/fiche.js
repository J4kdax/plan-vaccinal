// ---- Fiche patient : enregistrement (fichier HTML lisible + données intégrées) et réouverture ----
const FICHE_APP = "plan-vaccinal-voyageur";
const FICHE_VERSION = 1;
const EDITION = "HCSP – Recommandations sanitaires aux voyageurs 2026 (12 juin 2026)";

function serializeState() {
  const fields = {};
  document.querySelectorAll("#form input[id], #form select[id]").forEach(el => {
    if (el.closest("#stops")) return;
    fields[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  return {
    app: FICHE_APP, version: FICHE_VERSION, edition: EDITION,
    savedAt: new Date().toISOString(), consultDate: isoToday(),
    fields,
    stops: stops.map(({ k, ...rest }) => rest),
  };
}

function restoreState(d) {
  if (!d || d.app !== FICHE_APP || !d.fields) throw new Error("Ce fichier n'est pas une fiche de l'outil Plan vaccinal du voyageur.");
  resetForm();
  Object.entries(d.fields).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (!el || !el.closest("#form")) return;
    if (el.type === "checkbox") el.checked = !!v; else el.value = v;
  });
  $("cd4row").hidden = !$("hiv").checked;
  stops = (d.stops && d.stops.length ? d.stops : [{}]).map(s => Object.assign(newStop(s.type || "sejour"), s, { k: ++uid }));
  renderStops(); update(); setTab("vacc");
  $("exampleBanner").hidden = true; $("btnExample").hidden = false;
  const saved = d.savedAt ? new Date(d.savedAt) : null;
  $("ficheBanner").hidden = false;
  $("ficheBanner").innerHTML = `<span class="dot"></span><b>Fiche ouverte</b> · ${esc(d.fields.ref || "sans référence")}${saved ? ` · enregistrée le ${saved.toLocaleDateString("fr-FR")} à ${saved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}. Âge et délais sont recalculés à la date du jour.${d.edition && d.edition !== EDITION ? ` <b>Attention :</b> fiche établie avec « ${esc(d.edition)} ».` : ""}`;
}

function slug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function ficheFilename(state) {
  const ref = slug(state.fields.ref) || "sans-reference";
  const dest = [...new Set(state.stops.filter(s => s.c && s.type !== "transit").map(s => s.c))].join("-") || "sans-destination";
  const dep = state.fields.departure ? `_depart-${state.fields.departure}` : "";
  return `fiche-voyageur_${ref}_consult-${state.consultDate}_${dest}${dep}.html`;
}

function ficheHtml(state) {
  const { inp, r } = last;
  const P = r.profile, a = lastAdv;
  const lbl = (id) => { const el = document.getElementById(id); const l = el && el.closest("label"); return l ? l.textContent.trim().replace(/\s+/g, " ") : id; };
  const checked = (sel) => [...document.querySelectorAll(sel)].filter(el => el.checked && !el.closest("#stops") && el.id !== "menConj").map(el => lbl(el.id));
  const f = state.fields;
  const frDate = (iso) => iso ? new Date(iso + (iso.length === 7 ? "-15" : "") + "T12:00:00").toLocaleDateString("fr-FR", iso.length === 7 ? { month: "long", year: "numeric" } : undefined) : "–";
  const ident = [f.by ? `Naissance ${MONTHS[(Number(f.bm) || 1) - 1]} ${f.by}` : null, f.weight ? `poids ${f.weight} kg` : null, f.hiv && f.cd4 ? `CD4 ${f.cd4}/mm³` : null, f.hiv && f.cd4pct ? `CD4 ${f.cd4pct} %` : null].filter(Boolean);
  const prof = ident.concat(checked("#sec1 input[type=checkbox], #sec3 input[type=checkbox]"));
  const sel = (id) => { const el = document.getElementById(id); return el && el.selectedOptions ? el.selectedOptions[0].textContent : ""; };
  const vac = [`dTP(Ca) : ${sel("dtp").toLowerCase()}`, f.polioLast ? `dernière dose polio : ${frDate(f.polioLast)}` : null, `ROR : ${sel("ror").toLowerCase()} dose(s)${f.rorEarly ? " (1re avant 12 mois)" : ""}`,
    f.fjDone ? `fièvre jaune : vacciné(e)${f.fjDate ? " en " + frDate(f.fjDate) : ""}${f.fjUnder2 ? ", avant 2 ans" : ""}${f.fjPreg ? ", pendant une grossesse" : ""}` : "fièvre jaune : non vacciné(e)",
    `hépatite A : ${f.hepa} dose(s)`, `hépatite B : ${sel("hepb").toLowerCase()}`, f.men ? `méningocoque ACWY : ${frDate(f.men)}${f.menConj ? " (conjugué)" : ""}` : null, f.typh ? `typhoïde : ${frDate(f.typh)}` : null,
    Number(f.je) ? `encéphalite japonaise : ${f.je} dose(s)` : null, Number(f.tbe) ? `encéphalite à tiques : ${f.tbe} dose(s)` : null, Number(f.dengueV) ? `Qdenga® : ${f.dengueV} dose(s)` : null, Number(f.mpoxV) ? `mpox : ${f.mpoxV} dose(s)` : null,
    f.chikV ? "chikungunya : vacciné(e)" : null, f.rageV ? "rage : pré-exposition complète" : null, f.bcgV ? "BCG fait" : null, f.fluV ? "grippe : saison en cours" : null, f.covidV ? "Covid-19 : saison en cours" : null].filter(Boolean);
  const trip = checked("#sec2 input[type=checkbox]");
  const it = inp.trip.stops.filter(s => s.c).map(s => `${COUNTRY_BY_ID[s.c].n} (${s.type === "transit" ? `transit ${s.hours} h` : `${s.days} j`})`).join(" → ");
  const grp = (s) => r.items.filter(i => i.status === s);
  const order = [["OBL", "Obligatoire ou exigé"], ["CI", "Contre-indiqué"], ["REC", "Recommandé"], ["MAJ", "Mise à jour du calendrier"], ["DISC", "À discuter"], ["OK", "À jour"], ["NR", "Non recommandé"]];
  const vrows = order.map(([s, l]) => grp(s).map(i => `<tr><td><b>${esc(i.name)}</b>${i.product ? `<br><small>${esc(i.product)}</small>` : ""}</td><td class="st st-${s}">${l}</td><td>${esc(i.reasons[0] || "")}${i.ciReasons ? `<br><b>CI :</b> ${esc(i.ciReasons.join(" ; "))}` : ""}${["OBL", "REC"].includes(s) && i.schema[0] ? `<br><small>Schéma : ${esc(i.schema[0])}</small>` : ""}</td></tr>`).join("")).join("");
  const crit = r.alerts.filter(x => x.lvl === "crit").map(x => `<li>${esc(x.t)}</li>`).join("") + r.warnings.map(w => `<li>${esc(w.t)}</li>`).join("");
  const PLx = { eleve: "risque élevé", modere: "risque modéré", faible: "risque faible", absent: "pas de transmission" };
  const pal = a && a.malaria ? `<p><b>Paludisme :</b> ${a.malaria.stops.map(x => `${esc(x.n)} – ${PLx[x.lvl]}`).join(" ; ")}. Chimioprophylaxie : ${({ oui: "indiquée", non: "non indiquée", discuter: "à discuter / avis spécialisé" })[a.malaria.cpap]}.</p>` : "";
  const adv = a ? a.sections.map(s => { const st = s.items.filter(i => i.strong); return st.length ? `<h3>${esc(s.title)}</h3><ul>${st.map(i => `<li>${esc(i.t)}${i.sub && i.sub.length ? `<ul>${i.sub.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>` : ""; }).join("") : "";
  const data = JSON.stringify(state).replace(/</g, "\\u003c");
  const ref = state.fields.ref || "Sans référence";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fiche voyageur – ${esc(ref)} – ${state.consultDate}</title>
<style>
body{font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1b2a30;max-width:900px;margin:24px auto;padding:0 18px}
header{border-bottom:3px solid #1b2a30;padding-bottom:10px;margin-bottom:14px}
h1{font-size:24px;margin:0}h2{font-size:17px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.03em}h3{font-size:14.5px;margin:12px 0 4px}
.meta{color:#5c6a6e;font-size:12.5px}.conf{background:#fff3cd;border:1px solid #e2bf4c;padding:6px 10px;border-radius:6px;font-size:12.5px;margin:10px 0}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #ddd6c6;padding:6px 8px;vertical-align:top;text-align:left}
.st{font-weight:700;white-space:nowrap}.st-OBL{color:#8a1f4f}.st-CI{color:#b42318}.st-REC{color:#16683f}.st-MAJ{color:#1f58a3}.st-DISC{color:#93570a}.st-OK{color:#46675d}.st-NR{color:#646b70}
.crit{border-left:4px solid #b42318;padding:4px 10px;background:#fce9e6}ul{margin:4px 0;padding-left:20px}small{color:#5c6a6e}
footer{margin-top:24px;border-top:1px solid #ddd6c6;padding-top:8px;font-size:11.5px;color:#5c6a6e}
@media print{body{margin:0}.conf{break-inside:avoid}tr{break-inside:avoid}}
</style></head><body>
<header><h1>Fiche voyageur – plan vaccinal et conseils</h1>
<div class="meta">Référence : <b>${esc(ref)}</b> · Consultation du ${new Date(state.savedAt).toLocaleDateString("fr-FR")} · Départ prévu le ${esc(frDate(state.fields.departure))} · Âge au départ : ${ageText(P.ageM)}</div></header>
<div class="conf">Document contenant des données de santé, couvert par le secret médical : à conserver dans le dossier du patient. Pour reprendre la consultation, ouvrez ce fichier depuis l'outil (bouton « Ouvrir une fiche »).</div>
<h2>Voyage</h2><p><b>Itinéraire :</b> ${esc(it || "–")} · durée des séjours ${P.totalDays} j</p>${trip.length ? `<p><b>Type et conditions :</b> ${esc(trip.join(" ; "))}</p>` : ""}
<h2>Profil</h2><p>${prof.length ? esc(prof.join(" ; ")) : "Aucun facteur particulier renseigné."}</p>
<p><b>Statut vaccinal déclaré :</b> ${esc(vac.join(" ; "))}</p>
${crit ? `<h2>Points d'alerte</h2><div class="crit"><ul>${crit}</ul></div>` : ""}
<h2>Vaccinations</h2><table><thead><tr><th>Vaccin</th><th>Statut</th><th>Motif et schéma</th></tr></thead><tbody>${vrows}</tbody></table>
${pal || adv ? `<h2>Conseils prioritaires</h2>${pal}${adv}` : ""}
<footer>Proposition d'aide à la décision à valider par le praticien. Source : ${esc(EDITION)}. Vérifier les données épidémiologiques et les conditions d'entrée en vigueur.</footer>
<script type="application/json" id="pvv-data">${data}<\/script>
</body></html>`;
}

function saveFiche() {
  if (!last) return;
  const state = serializeState();
  const html = ficheHtml(state);
  const name = ficheFilename(state);
  try {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Fiche enregistrée : " + name);
  } catch (e) { toast("Le navigateur a refusé le téléchargement"); }
}

function readFiche(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const txt = String(fr.result).trim();
      let d;
      if (txt.startsWith("{")) d = JSON.parse(txt);
      else { const doc = new DOMParser().parseFromString(txt, "text/html"); const node = doc.getElementById("pvv-data"); if (!node) throw new Error("Aucune donnée de fiche dans ce fichier."); d = JSON.parse(node.textContent); }
      restoreState(d); window.scrollTo(0, 0); toast("Fiche chargée");
    } catch (e) { toast(e.message || "Fichier illisible"); }
  };
  fr.readAsText(file);
}
$("btnSave").onclick = saveFiche;
$("fileOpen").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) readFiche(f); e.target.value = ""; });
document.addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); document.body.classList.add("dropping"); } });
document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dropping"); });
document.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); document.body.classList.remove("dropping"); readFiche(e.dataTransfer.files[0]); } });
