# -*- coding: utf-8 -*-
"""
Gera os assets SVG do projeto a partir do arquivo de design original do handoff.
Fonte única de verdade: assets/source/ninja-praiano-design-original.html
Saída:
  assets/svg/*.svg            -> mascote, palmeira, banner, thumbnail (standalone)
  assets/emotes/*.svg         -> 5 emotes standalone
  shared/sprites.js           -> injeta os <defs> inline em qualquer página (permite <use href="#nj-full">)
"""
import re, io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source", "ninja-praiano-design-original.html")

html = io.open(SRC, encoding="utf-8").read()

# ---- extrai os <defs> do mascote (nj-*, palm) ----
m = re.search(r"<defs>(.*?)</defs>", html, re.S)
defs = m.group(1).strip()

FONTS_STYLE = (
    "<style>@import url('https://fonts.googleapis.com/css2?family=Bungee&amp;family=Fredoka:wght@400;500;600;700"
    "&amp;family=Poppins:wght@400;600;700;800&amp;display=swap');</style>"
)

def svg_file(viewbox, body, width=None, height=None, fonts=False, title=""):
    wh = ""
    if width and height:
        wh = f' width="{width}" height="{height}"'
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<!-- {title} — gerado a partir do design original (assets/source). Identidade: ninja praiano / daretoreact -->\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{viewbox}"{wh}>\n'
        + (FONTS_STYLE + "\n" if fonts else "")
        + "<defs>\n" + defs + "\n</defs>\n"
        + body + "\n</svg>\n"
    )

def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf-8", newline="\n").write(content)
    print("ok", rel, len(content))

# ---- mascote e palmeira ----
write("assets/svg/mascote-corpo-inteiro.svg", svg_file("0 0 400 600", '<use href="#nj-full"/>', title="Mascote — corpo inteiro"))
write("assets/svg/mascote-busto.svg", svg_file("70 44 260 260", '<use href="#nj-bust"/>', title="Mascote — busto"))
write("assets/svg/mascote-cabeca.svg", svg_file("100 34 200 200", '<use href="#nj-head-noface"/><use href="#nj-face-chill"/>', title="Mascote — cabeça (tô de boa)"))
write("assets/svg/palmeira.svg", svg_file("0 20 220 320", '<use href="#palm"/>', title="Palmeira decorativa"))

# ---- emotes (rostos extraídos do design) ----
EMOTES = {
    "risada": """<g stroke="#123c3f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M166 142 L186 154 L166 166"></path>
  <path d="M234 142 L214 154 L234 166"></path>
  <path d="M172 192 C179 220 221 220 228 192 Z" fill="#123c3f"></path>
  <path d="M181 198 L219 198 L216 206 L184 206 Z" fill="#ffffff" stroke="none"></path>
</g>""",
    "hype": """<g stroke="#123c3f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="180" cy="152" r="15" fill="#ffffff"></circle>
  <circle cx="222" cy="152" r="15" fill="#ffffff"></circle>
  <circle cx="180" cy="156" r="7" fill="#123c3f" stroke="none"></circle>
  <circle cx="222" cy="156" r="7" fill="#123c3f" stroke="none"></circle>
  <path d="M183 198 C183 216 217 216 217 198 C217 191 183 191 183 198 Z" fill="#123c3f"></path>
</g>""",
    "gg": """<g stroke="#123c3f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M164 162 C172 152 192 152 198 162" fill="none" stroke-width="8"></path>
  <circle cx="224" cy="161" r="13" fill="#ffffff"></circle>
  <circle cx="221" cy="165" r="7" fill="#123c3f" stroke="none"></circle><path d="M211 157 A13 13 0 0 1 237 157 Z" fill="#123c3f" stroke="none"></path>
  <path d="M178 200 C189 214 213 216 224 198" fill="none" stroke-width="7"></path>
  <text x="152" y="132" font-family="Bungee, Impact, sans-serif" font-size="34" fill="#ffffff" stroke="#123c3f" stroke-width="5" paint-order="stroke">GG</text>
</g>""",
    "to-de-boa": """<use href="#nj-face-chill"/>""",
    "em-extase": """<g stroke="#123c3f" stroke-width="6" stroke-linejoin="round">
  <path d="M180 148 C188 140 200 148 180 172 C160 148 172 140 180 148 Z" fill="#f2807f"></path>
  <path d="M222 148 C230 140 242 148 222 172 C202 148 214 140 222 148 Z" fill="#f2807f"></path>
  <path d="M177 195 C186 213 215 215 225 193 C213 205 189 205 177 195 Z" fill="#123c3f"></path>
</g>""",
}
emote_symbols = []
for name, face in EMOTES.items():
    body = '<use href="#nj-head-noface"/>\n' + face
    write(f"assets/emotes/{name}.svg", svg_file("100 34 200 200", body, fonts=(name == "gg"), title=f"Emote — {name}"))
    # símbolo reutilizável no sprite inline (viewBox próprio, para <use href="#emote-x"> nos overlays)
    # grupo simples (sem viewBox) — usar sempre com <svg viewBox="100 34 200 200"><use href="#emote-x"/></svg>
    emote_symbols.append(f'<g id="emote-{name}">\n{body}\n</g>')

# ---- banner 1200x480 (extraído do design) ----
banner_body = """<rect x="0" y="0" width="1200" height="480" fill="#e1ecd6"></rect>
<circle cx="1132" cy="76" r="54" fill="#aee1d3" stroke="#123c3f" stroke-width="6"></circle>
<rect x="0" y="300" width="1200" height="72" fill="#49cccc"></rect>
<path d="M0 300 C60 288 120 312 180 300 C240 288 300 312 360 300 C420 288 480 312 540 300 C600 288 660 312 720 300 C780 288 840 312 900 300 C960 288 1020 312 1080 300 C1140 288 1170 306 1200 300 L1200 372 L0 372 Z" fill="#49cccc" stroke="#123c3f" stroke-width="5"></path>
<path d="M0 330 C70 320 130 344 200 334 C270 324 330 348 400 338" fill="none" stroke="#7cd7cf" stroke-width="7" stroke-linecap="round"></path>
<path d="M760 340 C830 330 890 352 960 342 C1030 332 1090 352 1160 344" fill="none" stroke="#7cd7cf" stroke-width="7" stroke-linecap="round"></path>
<path d="M0 372 L1200 372 L1200 480 L0 480 Z" fill="#aee1d3" stroke="#123c3f" stroke-width="5"></path>
<g transform="translate(1046 146) scale(0.72)"><use href="#palm"></use></g>
<g transform="translate(742 34) scale(0.74)"><use href="#nj-full"></use></g>
<text x="64" y="132" font-family="Bungee, Impact, sans-serif" font-size="78" fill="#123c3f">daretoreact</text>
<rect x="66" y="160" width="292" height="50" rx="25" fill="#16c1c8" stroke="#123c3f" stroke-width="5"></rect>
<text x="92" y="193" font-family="Poppins, sans-serif" font-weight="700" font-size="20" letter-spacing="2" fill="#ffffff">NINJA DE FÉRIAS</text>
<text x="66" y="256" font-family="Poppins, sans-serif" font-weight="600" font-size="26" fill="#123c3f">lives sem compromisso · toda quarta e sábado</text>"""
write("assets/svg/banner-1200x480.svg", svg_file("0 0 1200 480", banner_body, 1200, 480, fonts=True, title="Banner Twitch 1200×480"))

# ---- thumbnail 1280x720 (template) ----
thumb_body = """<rect x="0" y="0" width="1280" height="720" fill="#e1ecd6"></rect>
<path d="M700 0 L1280 0 L1280 720 L560 720 Z" fill="#16c1c8"></path>
<path d="M700 0 L742 0 L602 720 L560 720 Z" fill="#aee1d3"></path>
<circle cx="1130" cy="122" r="80" fill="#aee1d3" stroke="#123c3f" stroke-width="7"></circle>
<path d="M-6 620 L1286 620 L1286 726 L-6 726 Z" fill="#49cccc" stroke="#123c3f" stroke-width="6"></path>
<g transform="translate(1074 400) scale(0.7)"><use href="#palm"></use></g>
<g transform="translate(690 96) scale(1.02)"><use href="#nj-full"></use></g>
<rect x="64" y="86" width="196" height="54" rx="27" fill="#16c1c8" stroke="#123c3f" stroke-width="6"></rect>
<text x="94" y="123" font-family="Poppins, sans-serif" font-weight="800" font-size="24" letter-spacing="3" fill="#ffffff">AO VIVO</text>
<text x="64" y="256" font-family="Bungee, Impact, sans-serif" font-size="60" fill="#123c3f">REAGINDO AO</text>
<text x="64" y="340" font-family="Bungee, Impact, sans-serif" font-size="60" fill="#0f9ba1">PIOR TUTORIAL</text>
<text x="64" y="424" font-family="Bungee, Impact, sans-serif" font-size="60" fill="#123c3f">DE NINJUTSU</text>
<path d="M64 472 L470 472" stroke="#123c3f" stroke-width="6" stroke-linecap="round"></path>
<text x="64" y="524" font-family="Poppins, sans-serif" font-weight="600" font-size="30" fill="#5e7f7a">e ainda tentei fazer em casa</text>
<text x="64" y="690" font-family="Bungee, Impact, sans-serif" font-size="40" fill="#ffffff">daretoreact</text>"""
write("assets/svg/thumbnail-1280x720.svg", svg_file("0 0 1280 720", thumb_body, 1280, 720, fonts=True, title="Thumbnail template 1280×720"))

# ---- capa padrão do map cover (lol/cover-default.svg), 1000×1000 ----
cover_body = """<rect width="1000" height="1000" fill="#e1ecd6"/>
<path d="M520 0 L1000 0 L1000 1000 L340 1000 Z" fill="#16c1c8"/>
<path d="M520 0 L560 0 L380 1000 L340 1000 Z" fill="#aee1d3"/>
<circle cx="820" cy="170" r="90" fill="#aee1d3" stroke="#123c3f" stroke-width="8"/>
<path d="M0 860 L1000 860 L1000 1000 L0 1000 Z" fill="#49cccc" stroke="#123c3f" stroke-width="7"/>
<path d="M40 905 C110 895 170 919 240 909 C310 899 370 923 440 913" fill="none" stroke="#7cd7cf" stroke-width="9" stroke-linecap="round"/>
<path d="M620 915 C690 905 750 927 820 917 C890 907 950 927 1010 919" fill="none" stroke="#7cd7cf" stroke-width="9" stroke-linecap="round"/>
<g transform="translate(700 560) scale(0.95)"><use href="#palm"/></g>
<g transform="translate(60 160) scale(1.45)"><use href="#nj-bust"/></g>"""
write("lol/cover-default.svg", svg_file("0 0 1000 1000", cover_body, 1000, 1000, fonts=True, title="Capa padrão do map cover (LoL) 1000×1000"))

# ---- sprites.js (defs inline para os overlays) ----
sprite_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">'
    "<defs>\n" + defs + "\n" + "\n".join(emote_symbols) + "\n</defs></svg>"
)
assert "`" not in sprite_svg and "${" not in sprite_svg
sprites_js = f"""/* ============================================================
   shared/sprites.js — GERADO por tools/gen-assets.py
   Injeta os <defs> do mascote ninja praiano no <body> de qualquer página,
   permitindo usar os desenhos do handoff com:
     <svg viewBox="0 0 400 600"><use href="#nj-full"/></svg>       (corpo inteiro)
     <svg viewBox="70 44 260 260"><use href="#nj-bust"/></svg>     (busto)
     <svg viewBox="100 34 200 200"><use href="#emote-hype"/></svg> (emotes)
   IDs disponíveis: nj-full, nj-bust, nj-head-noface, nj-face-chill, nj-shades,
   nj-tails, palm, emote-risada, emote-hype, emote-gg, emote-to-de-boa, emote-em-extase
   ============================================================ */
(function () {{
  var SPRITES = `{sprite_svg}`;
  function inject() {{
    if (document.getElementById('ninja-sprites')) return;
    var wrap = document.createElement('div');
    wrap.id = 'ninja-sprites';
    wrap.innerHTML = SPRITES;
    document.body.insertBefore(wrap, document.body.firstChild);
    document.dispatchEvent(new CustomEvent('ninja:sprites-ready'));
  }}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
}})();
"""
write("shared/sprites.js", sprites_js)
print("done")
