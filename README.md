# Plan vaccinal du voyageur

Outil web d'aide à la décision pour orienter, en consultation, le plan vaccinal d'un voyageur selon son profil, ses antécédents, son statut vaccinal et son itinéraire.

Toutes les règles proviennent du document du Haut Conseil de la santé publique : **Recommandations sanitaires aux voyageurs, édition 2026** (établies au 12 juin 2026). Chaque proposition affichée cite la page correspondante du document.

> **Avertissement.** Outil d'aide à la décision destiné aux professionnels de santé. Il ne remplace ni l'examen clinique, ni le RCP des vaccins, ni l'avis d'un centre de vaccinations internationales. La décision reste celle du praticien. Les données épidémiologiques dynamiques (dengue, chikungunya, polio, mpox) et les conditions d'entrée des pays doivent être vérifiées au moment de la consultation.

## Confidentialité

La page est statique : aucun serveur, aucune base de données, aucun envoi réseau, aucun stockage dans le navigateur. Tous les calculs sont faits localement et disparaissent à la fermeture de l'onglet. Aucune identité n'est demandée.

## Contenu couvert

Fièvre jaune (tableau 15, obligations selon provenance et transits), poliomyélite, ROR, hépatites A et B, typhoïde, méningocoques ACWY et B, encéphalite japonaise (tableau 2), encéphalite à tiques (tableau 3), dengue, chikungunya (tableau 1), rage, BCG (annexe 3), grippe, Covid-19, leptospirose, mpox, choléra, rotavirus, pneumocoque, VRS ; contre-indications (tableau 4 – immunodépression, tableau 14 – grossesse et allaitement), délais avant départ et intervalles entre vaccins.

Non couvert : chimioprophylaxie du paludisme (annexe 4) et mesures non vaccinales.

## Structure du dépôt

```
index.html            page publiée (générée, autonome)
build.py              assemble index.html à partir de src/
src/
  template.html       structure et styles de la page
  countries.json      225 pays/territoires : région, tableau 15 (fièvre jaune), annexe 3 (tuberculose)
  static_data.js      tableaux 2 et 3, exceptions de provenance FJ, régions
  engine.js           moteur de règles (fonction pure evaluate)
  ui.js               interface
tests/test.js         43 vérifications de cas cliniques + test sur tous les pays
tools/                scripts d'extraction des tableaux depuis le PDF du HCSP
```

## Publier avec GitHub Pages

Settings → Pages → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`. Le site est servi à `https://<compte>.github.io/plan-vaccinal-voyageur/`.

## Modifier ou mettre à jour

```bash
node tests/test.js     # tous les tests doivent passer
python3 build.py       # régénère index.html
```

Pour une nouvelle édition du document HCSP : relire les chapitres 1, 8 et 10 et les annexes 1 à 3, mettre à jour `engine.js`, `static_data.js` et `countries.json`, adapter les tests, puis régénérer.

Extraction des tableaux depuis le PDF (pdfplumber et poppler requis) :

```bash
python3 tools/fj_table.py <pdf> fj.json             # tableau 15, pages 236-246
python3 tools/fj_parse.py fj.json fj_parsed.json
python3 tools/fj_clean.py fj_parsed.json fj_clean.json
pdftotext -f 248 -l 250 -layout <pdf> tb.txt         # annexe 3
python3 tools/build_data.py fj_clean.json tb.txt src/countries.json
```

Les numéros de pages sont ceux de l'édition 2026 ; ils changeront avec une nouvelle édition.

## Points du document à surveiller

- Hydroxycarbamide et fièvre jaune : « théoriquement contre-indiquée » (p. 41) contre « ne constitue pas une contre-indication » (p. 149).
- Tableau 15 : obligations OMS de janvier 2023, actualisation OMS en cours en mai 2026.
- Tuberculose : la liste du § 1.17 et l'annexe 3 ne coïncident pas.
- Covid et pèlerinage : critères différents p. 26 et p. 141.
- ROR : « quels que soient les antécédents » (p. 69) contre « sans antécédent de rougeole » (p. 10).
