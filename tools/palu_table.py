import sys, json, re, pdfplumber
rows = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for pno in range(253, 279):
        page = pdf.pages[pno - 1]
        for t in page.extract_tables():
            for r in t:
                cells = [re.sub(r'[ \t]+', ' ', (c or '')).strip() for c in r]
                rows.append({'p': pno, 'c': cells})
json.dump(rows, open(sys.argv[2], 'w'), ensure_ascii=False)
from collections import Counter
print(Counter(len(r['c']) for r in rows))
for r in rows[:12]:
    print(r['p'], [x[:60] for x in r['c']])
