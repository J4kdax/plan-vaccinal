import sys, json, pdfplumber
pdf_path = sys.argv[1]
rows_out = []
with pdfplumber.open(pdf_path) as pdf:
    for pno in range(236, 247):  # pages 236..246 (1-indexed)
        page = pdf.pages[pno - 1]
        tables = page.extract_tables()
        for t in tables:
            for r in t:
                cells = [(c or '').replace('\n', ' ').strip() for c in r]
                rows_out.append({'page': pno, 'cells': cells})
json.dump(rows_out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
for r in rows_out:
    print(r['page'], ' || '.join(r['cells']))
