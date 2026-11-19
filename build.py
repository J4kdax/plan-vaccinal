"""Assemble index.html à partir de src/ (page autonome, sans dépendance).
Usage : python3 build.py"""
from pathlib import Path
S = Path(__file__).parent / "src"
t = (S / "template.html").read_text(encoding="utf-8")
countries = (S / "countries.json").read_text(encoding="utf-8")
palu = (S / "palu.json").read_text(encoding="utf-8")
t = t.replace("/*__COUNTRIES__*/", "const COUNTRIES = " + countries + ";\nconst COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));\nconst PALU = " + palu + ";")
for k, f in (("STATIC", "static_data.js"), ("ENGINE", "engine.js"), ("ADVICE", "advice.js"), ("UI", "ui.js"), ("FICHE", "fiche.js")):
    t = t.replace(f"/*__{k}__*/", (S / f).read_text(encoding="utf-8"))
fl = (S / "vendor" / "fflate.umd.js").read_text(encoding="utf-8")
t = t.replace("/*__FFLATE__*/", "/* fflate 0.8.2 – MIT License (c) 2023 Arjun Barrett – voir src/vendor/fflate.LICENSE */\n" + fl.replace("</script", "<\\/script"))
(Path(__file__).parent / "index.html").write_text(t, encoding="utf-8")
print("index.html généré")
