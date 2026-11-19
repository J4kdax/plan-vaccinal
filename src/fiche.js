// ---- Fiche patient au format Excel (.xlsx) : enregistrement et réouverture ----
// Classeur de 3 onglets : « Fiche » (lecture), « Données » (saisies, une ligne par champ), « Itinéraire » (une ligne par étape).
// Écriture et lecture sans dépendance externe hormis fflate (zip), intégré à la page.
const FICHE_APP = "plan-vaccinal-voyageur";
const FICHE_VERSION = 2;
const EDITION = "HCSP – Recommandations sanitaires aux voyageurs 2026 (12 juin 2026)";
const STOP_COLS = [
  ["c", "Code pays"], ["n", "Pays"], ["type", "Type (sejour / transit)"], ["days", "Durée (jours)"], ["hours", "Transit (heures)"],
  ["dengue", "Dengue (epi / high / low / none)"], ["chik", "Chikungunya (epi / circ / none)"], ["polio", "Polio (wpv / cvdpv2 / none / ?)"],
  ["mpox", "Mpox clade I (oui)"], ["fjZone", "Zone FJ visitée (oui / non)"], ["fjEpi", "Épidémie FJ"], ["jeEpi", "Épidémie EJ"],
];
const BOOL_STOP = new Set(["fjEpi", "jeEpi"]);

// ---------- état du formulaire ----------
function formControls() { return [...document.querySelectorAll("#form input[id], #form select[id]")].filter(el => !el.closest("#stops") && el.type !== "file"); }
function labelOf(el) {
  const l = el.closest("label"); if (l) return l.textContent.trim().replace(/\s+/g, " ");
  const f = el.closest(".field"); if (f && f.querySelector(".lab")) return f.querySelector(".lab").textContent.trim();
  const cell = el.closest(".cell"); if (cell && cell.previousElementSibling) return cell.previousElementSibling.textContent.trim();
  return el.getAttribute("aria-label") || el.id;
}
function serializeState() {
  const fields = {};
  formControls().forEach(el => { fields[el.id] = el.type === "checkbox" ? el.checked : el.value; });
  return { app: FICHE_APP, version: FICHE_VERSION, edition: EDITION, savedAt: new Date().toISOString(), consultDate: isoToday(), fields, stops: stops.map(({ k, ...rest }) => rest) };
}
function restoreState(d) {
  if (!d || d.app !== FICHE_APP || !d.fields) throw new Error("Ce fichier n'est pas une fiche de l'outil Plan vaccinal du voyageur.");
  resetForm();
  Object.entries(d.fields).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (!el || !el.closest("#form") || el.closest("#stops")) return;
    if (el.type === "checkbox") el.checked = v === true || v === "oui" || v === "true" || v === 1 || v === "1";
    else el.value = v == null ? "" : String(v);
  });
  $("cd4row").hidden = !$("hiv").checked;
  stops = (d.stops && d.stops.length ? d.stops : [{}]).map(s => Object.assign(newStop(s.type || "sejour"), s, { k: ++uid }));
  renderStops(); update(); setTab("vacc");
  $("exampleBanner").hidden = true; $("btnExample").hidden = false;
  const saved = d.savedAt ? new Date(d.savedAt) : null;
  $("ficheBanner").hidden = false;
  $("ficheBanner").innerHTML = `<span class="dot"></span><b>Fiche ouverte</b> · ${esc(d.fields.ref || "sans référence")}${saved && !isNaN(saved) ? ` · enregistrée le ${saved.toLocaleDateString("fr-FR")} à ${saved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}. Âge et délais sont recalculés à la date du jour.${d.edition && d.edition !== EDITION ? ` <b>Attention :</b> fiche établie avec « ${esc(d.edition)} ».` : ""}`;
}

// ---------- nom de fichier ----------
function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
function ficheFilename(state) {
  const ref = slug(state.fields.ref) || "sans-reference";
  const dest = [...new Set(state.stops.filter(s => s.c && s.type !== "transit").map(s => s.c))].join("-") || "sans-destination";
  const dep = state.fields.departure ? `_depart-${state.fields.departure}` : "";
  return `fiche-voyageur_${ref}_consult-${state.consultDate}${"_" + dest}${dep}.xlsx`;
}

// ---------- contenu lisible (onglet « Fiche ») ----------
function frDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso + (iso.length === 7 ? "-15" : "") + "T12:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("fr-FR", iso.length === 7 ? { month: "long", year: "numeric" } : undefined);
}
function ficheRows(state) {
  const { inp, r } = last; const P = r.profile, a = lastAdv, f = state.fields;
  const checked = (sel) => [...document.querySelectorAll(sel)].filter(el => el.checked && !el.closest("#stops") && el.id !== "menConj").map(labelOf);
  const ident = [f.by ? `Naissance ${MONTHS[(Number(f.bm) || 1) - 1]} ${f.by}` : null, f.weight ? `poids ${f.weight} kg` : null, f.hiv && f.cd4 ? `CD4 ${f.cd4}/mm³` : null, f.hiv && f.cd4pct ? `CD4 ${f.cd4pct} %` : null].filter(Boolean);
  const prof = ident.concat(checked("#sec1 input[type=checkbox], #sec3 input[type=checkbox]"));
  const trip = checked("#sec2 input[type=checkbox]");
  const sel = (id) => { const el = document.getElementById(id); return el && el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].textContent : ""; };
  const vac = [`dTP(Ca) : ${sel("dtp").toLowerCase()}`, f.polioLast ? `dernière dose polio : ${frDate(f.polioLast)}` : null, `ROR : ${sel("ror").toLowerCase()} dose(s)${f.rorEarly ? " (1re avant 12 mois)" : ""}`,
    f.fjDone ? `fièvre jaune : vacciné(e)${f.fjDate ? " en " + frDate(f.fjDate) : ""}${f.fjUnder2 ? ", avant 2 ans" : ""}${f.fjPreg ? ", pendant une grossesse" : ""}` : "fièvre jaune : non vacciné(e)",
    `hépatite A : ${f.hepa} dose(s)`, `hépatite B : ${sel("hepb").toLowerCase()}`, f.men ? `méningocoque ACWY : ${frDate(f.men)}${f.menConj ? " (conjugué)" : ""}` : null, f.typh ? `typhoïde : ${frDate(f.typh)}` : null,
    Number(f.je) ? `encéphalite japonaise : ${f.je} dose(s)` : null, Number(f.tbe) ? `encéphalite à tiques : ${f.tbe} dose(s)` : null, Number(f.dengueV) ? `Qdenga® : ${f.dengueV} dose(s)` : null, Number(f.mpoxV) ? `mpox : ${f.mpoxV} dose(s)` : null,
    f.chikV ? "chikungunya : vacciné(e)" : null, f.rageV ? "rage : pré-exposition complète" : null, f.bcgV ? "BCG fait" : null, f.fluV ? "grippe : saison en cours" : null, f.covidV ? "Covid-19 : saison en cours" : null].filter(Boolean);
  const it = inp.trip.stops.filter(s => s.c).map(s => `${COUNTRY_BY_ID[s.c].n} (${s.type === "transit" ? `transit ${s.hours} h` : `${s.days} j`})`).join(" → ");
  const B = (v) => ({ v, b: true });
  const rows = [];
  const SP = (v) => ({ v, span: true });
  rows.push([{ v: "Fiche voyageur – plan vaccinal et conseils", b: true, span: true }]);
  rows.push([SP("Document contenant des données de santé, couvert par le secret médical. Pour reprendre la consultation : bouton « Ouvrir une fiche » de l'outil (ne pas modifier les onglets Données et Itinéraire).")]);
  rows.push([]);
  rows.push([B("Référence"), SP(f.ref || "Sans référence")]);
  rows.push([B("Consultation du"), SP(new Date(state.savedAt).toLocaleDateString("fr-FR"))]);
  rows.push([B("Départ prévu le"), SP(frDate(f.departure))]);
  rows.push([B("Âge au départ"), SP(ageText(P.ageM))]);
  rows.push([B("Itinéraire"), SP((it || "–") + ` (séjours : ${P.totalDays} j)`)]);
  if (trip.length) rows.push([B("Type et conditions"), SP(trip.join(" ; "))]);
  rows.push([B("Profil"), SP(prof.length ? prof.join(" ; ") : "Aucun facteur particulier renseigné")]);
  rows.push([B("Statut vaccinal déclaré"), SP(vac.join(" ; "))]);
  const crit = r.alerts.filter(x => x.lvl === "crit").map(x => x.t).concat(r.warnings.map(w => w.t));
  if (crit.length) { rows.push([]); rows.push([B("Points d'alerte")]); crit.forEach(t => rows.push(["", SP(t)])); }
  rows.push([]); rows.push([B("Vaccin"), B("Statut"), B("Motif"), B("Schéma ou contre-indication")]);
  [["OBL", "Obligatoire ou exigé"], ["CI", "Contre-indiqué"], ["REC", "Recommandé"], ["MAJ", "Mise à jour du calendrier"], ["DISC", "À discuter"], ["OK", "À jour"], ["NR", "Non recommandé"]].forEach(([s, l]) =>
    r.items.filter(i => i.status === s).forEach(i => rows.push([i.name + (i.product ? ` (${i.product})` : ""), l, i.reasons.join(" "), i.ciReasons ? "CI : " + i.ciReasons.join(" ; ") : (["OBL", "REC"].includes(s) ? (i.schema[0] || "") : "")])));
  if (a && a.sections.length) {
    rows.push([]); rows.push([B("Conseils prioritaires")]);
    const PLx = { eleve: "risque élevé", modere: "risque modéré", faible: "risque faible", absent: "pas de transmission" };
    if (a.malaria) rows.push([B("Paludisme"), SP(a.malaria.stops.map(x => `${x.n} : ${PLx[x.lvl]}`).join(" ; ") + " – chimioprophylaxie " + ({ oui: "indiquée", non: "non indiquée", discuter: "à discuter / avis spécialisé" })[a.malaria.cpap])]);
    a.sections.forEach(s => s.items.filter(i => i.strong).forEach(i => rows.push([s.title, SP(i.t + (i.sub && i.sub.length ? " — " + i.sub.join(" ; ") : ""))])));
  }
  rows.push([]); rows.push([B("Source"), SP(EDITION)]);
  rows.push([B("Avertissement"), SP("Proposition d'aide à la décision à valider par le praticien. Vérifier les données épidémiologiques et les conditions d'entrée en vigueur.")]);
  return rows;
}
function dataRows(state) {
  const rows = [[{ v: "Champ (ne pas modifier)", b: true }, { v: "Libellé", b: true }, { v: "Valeur", b: true }, { v: "Valeur affichée", b: true }]];
  [["_app", "Application", state.app], ["_version", "Version du format", String(state.version)], ["_edition", "Référentiel", state.edition], ["_savedAt", "Enregistrée le", state.savedAt], ["_consultDate", "Date de consultation", state.consultDate]].forEach(x => rows.push(x));
  formControls().forEach(el => {
    const v = state.fields[el.id];
    const shown = el.tagName === "SELECT" && el.selectedOptions[0] ? el.selectedOptions[0].textContent : "";
    rows.push([el.id, labelOf(el), el.type === "checkbox" ? (v ? "oui" : "non") : (v == null ? "" : String(v)), shown]);
  });
  return rows;
}
function stopRows(state) {
  const rows = [[{ v: "Ordre", b: true }, ...STOP_COLS.map(([, l]) => ({ v: l, b: true }))]];
  state.stops.forEach((s, i) => rows.push([i + 1, ...STOP_COLS.map(([k]) => k === "n" ? (s.c && COUNTRY_BY_ID[s.c] ? COUNTRY_BY_ID[s.c].n : "") : BOOL_STOP.has(k) ? (s[k] ? "oui" : "non") : (s[k] == null ? "" : String(s[k])))]));
  return rows;
}

// ---------- écriture XLSX ----------
function xe(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); }
function colName(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function sheetXml(rows, widths, wrap) {
  const cols = widths ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const last = widths ? widths.length - 1 : 0;
  const merges = [];
  const lines = (txt, w) => String(txt).split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / Math.max(8, w * 1.05))), 0);
  const body = rows.map((row, ri) => {
    let ht = 1;
    row.forEach((cell, ci) => {
      if (cell == null || cell === "") return;
      const o = typeof cell === "object" ? cell : { v: cell };
      const end = o.span && widths ? last : ci;
      if (end > ci) merges.push(`${colName(ci)}${ri + 1}:${colName(end)}${ri + 1}`);
      if (wrap && widths && typeof o.v === "string") { const w = widths.slice(ci, end + 1).reduce((a, b) => a + b, 0); ht = Math.max(ht, lines(o.v, w)); }
    });
    const htAttr = wrap && ht > 1 ? ` ht="${(ht * 15 + 3).toFixed(0)}" customHeight="1"` : "";
    return `<row r="${ri + 1}"${htAttr}>${row.map((cell, ci) => {
    if (cell == null || cell === "") return "";
    const o = typeof cell === "object" ? cell : { v: cell };
    const ref = colName(ci) + (ri + 1);
    const st = o.b ? (wrap ? 3 : 1) : (wrap ? 2 : 0);
    if (typeof o.v === "number") return `<c r="${ref}" s="${st}"><v>${o.v}</v></c>`;
    return `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xe(o.v)}</t></is></c>`;
  }).join("")}</row>`; }).join("");
  const mc = merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"/></sheetViews>${cols}<sheetData>${body}</sheetData>${mc}<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
function buildXlsx(sheets) {
  const enc = (s) => fflate.strToU8(s);
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main", rns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const files = {
    "[Content_Types].xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    "_rels/.rels": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rns}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}" xmlns:r="${rns}"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rns}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="${rns}/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = enc(sheetXml(s.rows, s.widths, s.wrap)); });
  return fflate.zipSync(files, { level: 6 });
}

// ---------- lecture XLSX (y compris après réenregistrement par Excel, LibreOffice ou Numbers) ----------
function xmlDoc(files, path) { const f = files[path]; return f ? new DOMParser().parseFromString(fflate.strFromU8(f), "application/xml") : null; }
function tags(node, name) { return node ? [...node.getElementsByTagNameNS("*", name)] : []; }
function colIndex(ref) { const m = /^([A-Z]+)/.exec(ref || ""); let n = 0; if (m) for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
function readXlsx(u8) {
  const files = fflate.unzipSync(u8);
  const wb = xmlDoc(files, "xl/workbook.xml"); if (!wb) throw new Error("Classeur Excel illisible.");
  const rels = {}; tags(xmlDoc(files, "xl/_rels/workbook.xml.rels"), "Relationship").forEach(r => { rels[r.getAttribute("Id")] = r.getAttribute("Target"); });
  const ss = tags(xmlDoc(files, "xl/sharedStrings.xml"), "si").map(si => tags(si, "t").map(t => t.textContent).join(""));
  const out = {};
  tags(wb, "sheet").forEach(sh => {
    const rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    let target = rels[rid]; if (!target) return;
    target = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const doc = xmlDoc(files, target); const rows = [];
    tags(doc, "row").forEach((row, ri) => {
      const rIdx = (Number(row.getAttribute("r")) || ri + 1) - 1; const arr = [];
      tags(row, "c").forEach((c, ci) => {
        const idx = c.getAttribute("r") ? colIndex(c.getAttribute("r")) : ci; const t = c.getAttribute("t"); const vEl = tags(c, "v")[0];
        let v = "";
        if (t === "s") v = ss[Number(vEl && vEl.textContent)] || "";
        else if (t === "inlineStr") v = tags(c, "t").map(x => x.textContent).join("");
        else if (t === "b") v = vEl && vEl.textContent === "1";
        else if (vEl) v = t === "str" || t === "e" ? vEl.textContent : Number(vEl.textContent);
        arr[idx] = v;
      });
      rows[rIdx] = arr;
    });
    out[sh.getAttribute("name")] = rows.map(r => r || []);
  });
  return out;
}
function excelSerialToIso(n, withDay) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000); const iso = d.toISOString().slice(0, 10); return withDay ? iso : iso.slice(0, 7); }
function stateFromWorkbook(book) {
  const data = book["Données"] || Object.values(book).find(rows => rows.some(r => r[0] === "_app"));
  if (!data) throw new Error("Onglet « Données » introuvable : ce classeur n'est pas une fiche de l'outil.");
  const meta = {}, fields = {};
  data.slice(1).forEach(r => {
    const id = r[0]; if (!id) return;
    if (String(id).startsWith("_")) { meta[String(id).slice(1)] = r[2]; return; }
    const el = document.getElementById(id); let v = r[2] == null ? "" : r[2];
    if (el && typeof v === "number" && (el.type === "month" || el.type === "date")) v = excelSerialToIso(v, el.type === "date");
    if (el && el.type === "checkbox") v = v === true || /^(oui|true|1|vrai|x)$/i.test(String(v).trim());
    fields[id] = v;
  });
  const it = book["Itinéraire"] || [];
  const head = it[0] || [];
  const stopsOut = it.slice(1).filter(r => r && r.some(x => x !== "" && x != null)).map(r => {
    const s = {};
    STOP_COLS.forEach(([k, l]) => {
      const ci = head.indexOf(l); if (ci < 0 || k === "n") return;
      let v = r[ci]; if (v == null) v = "";
      if (BOOL_STOP.has(k)) v = v === true || /^(oui|true|1|vrai|x)$/i.test(String(v).trim());
      else if (k === "days" || k === "hours") v = v === "" ? "" : Number(v);
      else v = String(v).trim();
      s[k] = v;
    });
    return s;
  });
  return { app: meta.app, version: Number(meta.version) || 0, edition: meta.edition, savedAt: meta.savedAt, consultDate: meta.consultDate, fields, stops: stopsOut };
}

// ---------- actions ----------
function saveFiche() {
  if (!last) return;
  const state = serializeState();
  const bytes = buildXlsx([
    { name: "Fiche", rows: ficheRows(state), widths: [28, 22, 75, 55], wrap: true },
    { name: "Données", rows: dataRows(state), widths: [16, 60, 26, 30], wrap: false },
    { name: "Itinéraire", rows: stopRows(state), widths: [8, 11, 24, 20, 13, 15, 30, 28, 28, 16, 22, 12, 12], wrap: false },
  ]);
  const name = ficheFilename(state);
  try {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Fiche enregistrée : " + name);
  } catch (e) { toast("Le navigateur a refusé le téléchargement"); }
}
function readFiche(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const u8 = new Uint8Array(fr.result);
      let d;
      if (u8[0] === 0x50 && u8[1] === 0x4b) d = stateFromWorkbook(readXlsx(u8)); // signature ZIP : classeur .xlsx
      else {
        const txt = new TextDecoder().decode(u8).trim(); // anciennes fiches .html ou .json
        if (txt.startsWith("{")) d = JSON.parse(txt);
        else { const node = new DOMParser().parseFromString(txt, "text/html").getElementById("pvv-data"); if (!node) throw new Error("Format non reconnu : ouvrez une fiche .xlsx enregistrée par l'outil."); d = JSON.parse(node.textContent); }
      }
      restoreState(d); window.scrollTo(0, 0); toast("Fiche chargée");
    } catch (e) { toast(e.message || "Fichier illisible"); }
  };
  fr.readAsArrayBuffer(file);
}
$("btnSave").onclick = saveFiche;
$("fileOpen").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) readFiche(f); e.target.value = ""; });
document.addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); document.body.classList.add("dropping"); } });
document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dropping"); });
document.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); document.body.classList.remove("dropping"); readFiche(e.dataTransfer.files[0]); } });
