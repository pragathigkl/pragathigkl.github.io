#!/usr/bin/env python3
"""Convert Pragathi P.U. College Final PCMB Question Bank .xlsx files into
compact JSON files for uploading to Google Drive or pragathigkl.org.
Run in the folder containing your 8 Pragathi_*_Final_Question_Bank.xlsx files.
"""

import os
import json
import openpyxl

BANKS = [
    ("I PUC", "Physics", "Pragathi_I_PUC_Physics_Final_Question_Bank.xlsx"),
    ("II PUC", "Physics", "Pragathi_II_PUC_Physics_Final_Question_Bank.xlsx"),
    ("I PUC", "Chemistry", "Pragathi_I_PUC_Chemistry_Final_Question_Bank.xlsx"),
    ("II PUC", "Chemistry", "Pragathi_II_PUC_Chemistry_Final_Question_Bank.xlsx"),
    ("I PUC", "Biology", "Pragathi_I_PUC_Biology_Final_Question_Bank.xlsx"),
    ("II PUC", "Biology", "Pragathi_II_PUC_Biology_Final_Question_Bank.xlsx"),
    ("I PUC", "Mathematics", "Pragathi_I_PUC_Mathematics_Final_Question_Bank.xlsx"),
    ("II PUC", "Mathematics", "Pragathi_II_PUC_Mathematics_Final_Question_Bank.xlsx"),
]

os.makedirs("question_banks_json", exist_ok=True)
for cls, subj, fname in BANKS:
    if not os.path.exists(fname):
        print(f"Skipping missing file: {fname}")
        continue
    wb = openpyxl.load_workbook(fname, read_only=True, data_only=True)
    chapters = []
    for sname in wb.sheetnames:
        ws = wb[sname]
        qs = []
        for row in ws.iter_rows(min_row=2, max_col=9, values_only=True):
            if not isinstance(row[0], (int, float)):
                continue
            ans = str(row[7] or "").strip().upper()
            if ans not in ("A", "B", "C", "D"):
                continue
            qs.append({
                "id": f"{cls[:2]}_{subj[:3]}_{sname[:8]}_{int(row[0])}",
                "qno": int(row[0]),
                "q": str(row[1] or "").strip(),
                "a": str(row[2] or "").strip(),
                "b": str(row[3] or "").strip(),
                "c": str(row[4] or "").strip(),
                "d": str(row[5] or "").strip(),
                "ans": ans,
                "exp": str(row[8] or "").strip(),
                "tag": "PYQ" if "PYQ" in sname.upper() else ("Booster" if ("Booster" in sname or "High-Order" in sname or "Statement" in sname) else "NCERT"),
            })
        chapters.append({"chapter": sname, "questions": qs})
    wb.close()
    out_name = f"{cls.replace(' ', '_')}_{subj}.json"
    out_path = os.path.join("question_banks_json", out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(chapters, f, ensure_ascii=False)
    print(f"Exported {out_path} ({len(chapters)} chapters)")
