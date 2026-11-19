# Plan vaccinal du voyageur

Outil web d'aide à la décision pour orienter, en consultation, le plan vaccinal d'un voyageur selon son profil, ses antécédents, son statut vaccinal et son itinéraire.

Toutes les règles proviennent du document du Haut Conseil de la santé publique : **Recommandations sanitaires aux voyageurs, édition 2026** (établies au 12 juin 2026). Chaque proposition affichée cite la page correspondante du document.

> **Avertissement.** Outil d'aide à la décision destiné aux professionnels de santé. Il ne remplace ni l'examen clinique, ni le RCP des vaccins, ni l'avis d'un centre de vaccinations internationales. La décision reste celle du praticien. Les données épidémiologiques dynamiques (dengue, chikungunya, polio, mpox) et les conditions d'entrée des pays doivent être vérifiées au moment de la consultation.

## Fiche patient

- **Enregistrer la fiche** télécharge un fichier HTML nommé `fiche-voyageur_<référence>_consult-<AAAA-MM-JJ>_<pays>_depart-<AAAA-MM-JJ>.html` (pays en codes ISO, par exemple `KE-TZ`). Il s'ouvre dans n'importe quel navigateur comme une fiche lisible et imprimable (itinéraire, profil, statut vaccinal déclaré, vaccinations, conseils prioritaires) et contient aussi les données saisies.
- **Ouvrir une fiche** (ou glisser-déposer le fichier sur la page) recharge toutes les saisies pour modifier la consultation. L'âge et les délais sont recalculés à la date du jour.
- La référence patient est libre : préférer des initiales ou un numéro de dossier. Le fichier contient des données de santé et relève du secret médical : il se conserve dans le dossier du patient.

## Confidentialité

La page est statique : aucun serveur, aucune base de données, aucun envoi réseau, aucun stockage dans le navigateur. Les seules données conservées sont celles des fiches que le praticien enregistre lui-même sur son poste. Tous les calculs sont faits localement et disparaissent à la fermeture de l'onglet. Aucune identité n'est demandée.

## Contenu couvert

Fièvre jaune (tableau 15, obligations selon provenance et transits), poliomyélite, ROR, hépatites A et B, typhoïde, méningocoques ACWY et B, encéphalite japonaise (tableau 2), encéphalite à tiques (tableau 3), dengue, chikungunya (tableau 1), rage, BCG (annexe 3), grippe, Covid-19, leptospirose, mpox, choléra, rotavirus, pneumocoque, VRS ; contre-indications (tableau 4 – immunodépression, tableau 14 – grossesse et allaitement), délais avant départ et intervalles entre vaccins.

Onglet **Conseils de voyage**, adapté aux pays visités et au profil : alertes 2026, paludisme (niveau de risque et recommandations par pays du tableau 16, indication de la chimioprophylaxie selon le tableau 9, choix et posologie des molécules selon le tableau 10, traitement de réserve), protection contre les piqûres (répulsifs selon l'âge et la grossesse, tableau 8), eau, alimentation et diarrhée du voyageur, transports, environnement et activités (baignade, plongée, altitude, chaleur, froid, animaux), comportements à risque, précautions selon le profil, trousse à pharmacie, assurance et médicaments, conduite à tenir au retour.

Non reproduit : les cartes de risque du paludisme CEMV-HCSP (figures 21 à 48), à consulter dans le document pour les séjours non conventionnels.

## Structure du dépôt

```
index.html            page publiée (générée, autonome)
build.py              assemble index.html à partir de src/
src/
  template.html       structure et styles de la page
  countries.json      225 pays/territoires : région, tableau 15 (fièvre jaune), annexe 3 (tuberculose)
  static_data.js      tableaux 2 et 3, exceptions de provenance FJ, régions
  palu.json           tableau 16 (paludisme par pays, annexe 4)
  engine.js           moteur de règles vaccinales (fonction pure evaluate)
  advice.js           moteur de conseils de voyage (fonction pure advise)
  ui.js               interface
  fiche.js            enregistrement et réouverture des fiches patient
tests/test.js         43 vérifications de cas cliniques (vaccins) + test sur tous les pays
tests/test_advice.js  vérifications des conseils + test sur tous les pays
tools/                scripts d'extraction des tableaux depuis le PDF du HCSP
```

## Publier avec GitHub Pages

Settings → Pages → Source : *Deploy from a branch* → branche `main`, dossier `/ (root)`. Le site est servi à `https://<compte>.github.io/plan-vaccinal-voyageur/`.

## Modifier ou mettre à jour

```bash
node tests/test.js && node tests/test_advice.js   # tous les tests doivent passer
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
