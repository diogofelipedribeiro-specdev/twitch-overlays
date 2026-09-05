# -*- coding: utf-8 -*-
"""
tools/check-links.py — valida referências a arquivos locais.

Varre *.html, *.css e *.js do projeto, extrai caminhos relativos usados em
href=, src=, url(...) e @import, e confirma que cada arquivo existe COM O
MESMO CASO DE LETRAS. Motivo: o GitHub Pages roda em Linux (case-sensitive);
um "Style.css" funciona no Windows e quebra no site publicado.

Uso:  python tools/check-links.py      (código de saída 1 se houver problema)
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", ".github", "node_modules", "tools", "__pycache__"}
SKIP_FILES = {os.path.join("assets", "source", "ninja-praiano-design-original.html")}

# padrões de referência por tipo de arquivo (só caminhos relativos;
# URLs, data:, #, {{...}} são ignorados)
HTML_PATTERNS = [
    re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I),
]
CSS_PATTERNS = [
    re.compile(r'(?<![\w$.])url\(\s*["\']?([^"\')]+)["\']?\s*\)', re.I),
    re.compile(r'@import\s+(?:url\()?["\']([^"\']+)["\']', re.I),
]
# em JS só consideramos strings que parecem caminho de arquivo com extensão conhecida
JS_PATTERNS = [
    # (começa com ./ ../ ou nome de arquivo; ignora caminhos absolutos "/x" e sufixos de URL de CDN)
    re.compile(r'["\']((?:\.{1,2}/)?[\w\-][\w\-./]*\.(?:html|css|js|svg|png|webp|json|woff2?))(?:[?#][^"\']*)?["\']', re.I),
]
EXTERNAL = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//|#|\{\{|\$\{)', re.I)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def patterns_for(fpath, text):
    ext = os.path.splitext(fpath)[1].lower()
    if ext == ".css":
        return [(text, CSS_PATTERNS)]
    if ext == ".js":
        return [(text, JS_PATTERNS)]
    # HTML: atributos no documento inteiro + url()/@import só dentro de <style>
    styles = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", text, re.S | re.I))
    return [(text, HTML_PATTERNS), (styles, CSS_PATTERNS)]


def real_case_exists(path):
    """True se `path` existe e cada segmento bate exatamente com o nome no disco."""
    if not os.path.exists(path):
        return False
    cur = ROOT
    rel = os.path.relpath(path, ROOT)
    for seg in rel.split(os.sep):
        if seg in ("", "."):
            continue
        try:
            entries = os.listdir(cur)
        except OSError:
            return False
        if seg not in entries:
            return False
        cur = os.path.join(cur, seg)
    return True


def check_file(fpath):
    problems = []
    text = io.open(fpath, encoding="utf-8", errors="replace").read()
    base = os.path.dirname(fpath)
    seen = set()
    for chunk, pats in patterns_for(fpath, text):
      for pat in pats:
        for m in pat.finditer(chunk):
            ref = m.group(1).strip()
            if not ref or EXTERNAL.match(ref) or ref in seen:
                continue
            seen.add(ref)
            clean = ref.split("?")[0].split("#")[0]
            if not clean:
                continue
            target = os.path.normpath(os.path.join(base, clean))
            if os.path.isdir(target):
                target = os.path.join(target, "index.html")
            if not real_case_exists(target):
                problems.append((ref, os.path.relpath(target, ROOT)))
    return problems


def main():
    total = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if not name.lower().endswith((".html", ".css", ".js")):
                continue
            fpath = os.path.join(dirpath, name)
            rel = os.path.relpath(fpath, ROOT)
            if rel in SKIP_FILES:
                continue
            for ref, target in check_file(fpath):
                total += 1
                print(f"ERRO  {rel}: '{ref}' -> {target} não existe (ou o caso das letras difere)")
    if total:
        print(f"\n{total} referência(s) quebrada(s).")
        sys.exit(1)
    print("ok: todas as referências locais existem com o caso correto.")


if __name__ == "__main__":
    main()
