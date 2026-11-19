import json, sys, re
rows = json.load(open(sys.argv[1]))
recs = []
cur = None
for r in rows:
    c = r['cells']
    if len(c) != 6:
        continue
    if c[1].startswith('Vaccination') or c[0].startswith('Pays où') or c[0].startswith('sur leur'):
        continue
    if any(x for x in c[1:]) and c[1] in ('obligatoire pour','tous les voyageurs','quelle que soit','leur provenance','(âge du voyageur)'):
        continue
    hdr_words = ('obligatoire pour', 'les voyageurs en', 'provenance d', 'pays à risque', 'transmission de', 'la fièvre jaune', '(âge du voyageur)', 'compris les voyageurs', 'ayant transité', '12 heures', 'que soit la durée', 'aéroport de ce pays', 'dans un aéroport', 'ce pays (âge', 'voyageur)', 'recommandée aux', 'en raison d', 'jaune', 'fièvre jaune, y', 'tous les voyageurs', 'quelle que soit', 'leur provenance', 'à risque de', 'voyageurs en')
    if not c[0] and all((not x) or any(x.startswith(h) for h in hdr_words) for x in c[1:]) and any(c[1:]) and r['page'] and cur is None:
        continue
    if not any(c):
        continue
    if c[0] and (any(c[1:]) or cur is None or cur.get('closed')):
        cur = {'page': r['page'], 'name': c[0], 'cols': [x for x in c[1:]]}
        recs.append(cur)
    elif c[0] and not any(c[1:]):
        # continuation of name
        cur['name'] += ' ' + c[0]
    else:
        for i in range(5):
            if c[i+1]:
                cur['cols'][i] = (cur['cols'][i] + ' ' + c[i+1]).strip()
out = []
for x in recs:
    out.append({'page': x['page'], 'name': re.sub(r'\s+', ' ', x['name']).strip(), 'cols': [re.sub(r'\s+', ' ', y).strip() for y in x['cols']]})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
labels = ['TOUS', 'PROV', 'PROV+T12h', 'PROV+Tany', 'RECO']
for x in out:
    parts = [f"{labels[i]}: {v}" for i, v in enumerate(x['cols']) if v]
    print(f"[{x['page']}] {x['name']} -> " + ' | '.join(parts))
