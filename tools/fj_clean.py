import json, re, sys
recs = json.load(open(sys.argv[1]))
HDR = [
    r"la fièvre jaune \(âge du voyageur\)",
    r"fièvre jaune, y compris les voyageurs ayant transité plus de 12 heures dans un aéroport de ce pays \(âge du voyageur\)",
    r"fièvre jaune, y compris les voyageurs ayant transité, quelle que soit la durée, dans un aéroport de ce pays \(âge du voyageur\)",
]
merged = []
for r in recs:
    cols = r['cols'][:]
    for i in range(5):
        for h in HDR:
            cols[i] = re.sub(h, '', cols[i]).strip()
    name = r['name']
    # merge split records
    if name in ('Australie)', 'Galapagos)', 'dominicaine'):
        prev = merged[-1]
        prev['name'] += ' ' + name
        for i in range(5):
            if cols[i]:
                prev['cols'][i] = (prev['cols'][i] + ' ' + cols[i]).strip()
        continue
    merged.append({'page': r['page'], 'name': name, 'cols': cols})
for m in merged:
    m['name'] = m['name'].replace('Bahamas (îles', 'Bahamas (îles)').replace('Antigua-et- Barbuda', 'Antigua-et-Barbuda').replace('Papouasie- Nouvelle-Guinée', 'Papouasie-Nouvelle-Guinée').replace('Équateur (dont ïles Galapagos)', 'Équateur (dont îles Galápagos)')
    m['cols'] = [c.replace('Oui (≥ 9 mois (', 'Oui (≥ 9 mois)').replace('Oui (≥ 9 mois) (', 'Oui (≥ 9 mois)').replace('Oui ≥ (9 mois)', 'Oui (≥ 9 mois)').replace('Mato Groosso', 'Mato Grosso').replace('suelement', 'seulement').replace('d é p a r t o u p a s s a g e p a r', 'départ ou passage par').replace('en par avion', 'par avion').replace('au- dessus', 'au-dessus').replace('Lambaye que', 'Lambayeque').replace('Non pour pour', 'Non pour').replace("des ’extrêmes", 'des extrêmes').replace('nord- est', 'nord-est').replace('Nord- Ouest', 'Nord-Ouest').replace('Zamora- Chinchipe', 'Zamora-Chinchipe').replace('Morona- Santiago', 'Morona-Santiago').replace('Guinée- Bissau', 'Guinée-Bissau').replace('Ouganda RDC', 'Ouganda, RDC').strip() for c in m['cols']]
    if m['name'].startswith('Ethiopie'):
        m['cols'][2] = m['cols'][2].replace('Oui (≥ 9 mois', 'Oui (≥ 9 mois)') if not m['cols'][2].endswith(')') else m['cols'][2]
json.dump(merged, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
labels = ['TOUS', 'PROV', 'PROV12', 'PROVANY', 'RECO']
for x in merged:
    print(x['name'], '->', ' | '.join(f"{labels[i]}: {v[:70]}" for i, v in enumerate(x['cols']) if v))
print(len(merged))
