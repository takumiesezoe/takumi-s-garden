#!/usr/bin/env python3
import argparse, re, sys
from pathlib import Path
from difflib import get_close_matches

LINK_RE = re.compile(r"\[\[([^\]\|#]+)(?:\|([^\]]+))?\]\]")

def main():
    ap = argparse.ArgumentParser(description="Verifica y corrige enlaces [[...]] de index.md contra los .md de la carpeta.")
    ap.add_argument("--index", required=True, help="Ruta al index.md (dentro de la carpeta de poemas)")
    ap.add_argument("--apply", action="store_true", help="Escribir correcciones en el index.md (hace copia .bak)")
    args = ap.parse_args()

    idx = Path(args.index)
    if not idx.exists():
        print(f"❌ No encuentro el archivo: {idx}")
        sys.exit(1)

    folder = idx.parent
    files = [p for p in folder.glob("*.md") if p.name != idx.name]
    stems = {p.stem: p for p in files}                        # exactos
    stems_lower = {p.stem.lower(): p for p in files}          # case-insensitive

    text = idx.read_text(encoding="utf-8")
    links = list(LINK_RE.finditer(text))
    if not links:
        print("ℹ️ No se encontraron enlaces [[...]] en el index.")
        sys.exit(0)

    fixes = []
    missing = []
    for m in links:
        target = m.group(1)            # texto a la izquierda del "|"
        alias  = m.group(2) or target  # lo mostrado

        # Nos quedamos con el nombre base por si alguien puso subcarpeta
        base = Path(target).name
        candidate = folder / f"{base}.md"
        if candidate.exists():
            continue  # ok

        # 1) case-insensitive
        p = stems_lower.get(base.lower())
        if p:
            fixes.append((m.span(1), target, p.stem))
            continue

        # 2) reemplazo guiones <-> espacios para ayudar
        base_spaces = base.replace("-", " ")
        p = stems_lower.get(base_spaces.lower())
        if p:
            fixes.append((m.span(1), target, p.stem))
            continue

        # 3) fuzzy por similitud
        close = get_close_matches(base.lower(), list(stems_lower.keys()), n=1, cutoff=0.75)
        if close:
            p = stems_lower[close[0]]
            fixes.append((m.span(1), target, p.stem))
        else:
            missing.append((target, f"{base}.md"))

    # Reporte
    if missing:
        print("⚠️ Enlaces que NO encuentran archivo .md en la carpeta (revisa nombres/acentos):")
        for t, name in missing:
            print(f"  - [[{t}]] -> falta '{name}'")
    else:
        print("✅ No hay enlaces rotos por nombre inexistente.")

    if fixes:
        print("\nSugerencias de corrección (target -> nombre de archivo real):")
        for _, old, new in fixes:
            if old != new:
                print(f"  - {old}  ➜  {new}")
    else:
        print("\nℹ️ No hay correcciones sugeridas (coinciden exactamente).")

    if args.apply and (fixes or missing):
        # Aplicamos solo correcciones seguras (las de 'fixes'); los 'missing' quedan para revisar a mano
        new_text = text
        # Para no desplazar offsets, iterar de atrás hacia adelante
        for span, old, new in sorted(fixes, key=lambda x: x[0][0], reverse=True):
            a, b = span
            new_text = new_text[:a] + new + new_text[b:]

        # Copia de seguridad
        bak = idx.with_suffix(idx.suffix + ".bak")
        bak.write_text(text, encoding="utf-8")
        idx.write_text(new_text, encoding="utf-8")
        print(f"\n✍️  Correcciones aplicadas a {idx} (copia en {bak.name}).")

if __name__ == "__main__":
    main()
