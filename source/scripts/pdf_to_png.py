"""One-shot: convert W4_1.pdf .. W4_7.pdf into PNGs for the frontend.

Outputs to frontend/public/floorplans/floor-{n}.png at 2x scale so the floor
plans stay crisp when rendered large.
"""
from __future__ import annotations

import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "public" / "floorplans"
OUT.mkdir(parents=True, exist_ok=True)

SCALE = 2.0  # 2x for retina-ish output


def convert(pdf_path: Path, png_path: Path) -> None:
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    matrix = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    pix.save(png_path)
    doc.close()
    print(f"  {pdf_path.name} -> {png_path.relative_to(ROOT)} ({pix.width}x{pix.height})")


def main() -> int:
    print(f"Writing floor plan PNGs to {OUT.relative_to(ROOT)}/")
    for n in range(1, 8):
        pdf = ROOT / f"W4_{n}.pdf"
        png = OUT / f"floor-{n}.png"
        if not pdf.exists():
            print(f"  skip: {pdf.name} not found", file=sys.stderr)
            continue
        convert(pdf, png)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
