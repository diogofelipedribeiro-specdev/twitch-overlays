/* ============================================================
   lol/script.js — map cover do minimapa de League of Legends
   ------------------------------------------------------------
   Coordenadas dos objetivos em unidades do jogo (Summoner's Rift é um
   quadrado de ~14820 × 14881; a base azul fica embaixo/esquerda). Elas são
   normalizadas para o quadrado do minimapa (0–1000) e viram RECORTES na
   máscara SVG: onde há recorte, o minimapa real aparece; o resto fica
   coberto pela arte. As rotas viram faixas para os ícones dos laners.
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var LS_KEY = 'ninja_lol_cover';
  var LS_IMG = 'ninja_lol_cover_img';
  var MAP_W = 14820, MAP_H = 14881;

  /* ---- pontos de interesse (x, y em unidades do jogo) ---- */
  var GROUPS = {
    baron:    { label: 'Baron',      pts: [[5007, 10471]] },
    dragon:   { label: 'Dragão',     pts: [[9866, 4414]] },
    scuttle:  { label: 'Escutas',    pts: [[4230, 9640], [10500, 5220]] },
    buffs:    { label: 'Buffs',      pts: [[3871, 7901], [7862, 4106], [10931, 6990], [7099, 10827]] },
    camps:    { label: 'Camps',      pts: [[2164, 8408], [3780, 6443], [6943, 5422], [8370, 2718], [12671, 6503], [11008, 8387], [7847, 9587], [6422, 12080]] },
    wards:    { label: 'Wards',      pts: [[5400, 8900], [9500, 5900], [3200, 11100], [11600, 3800], [2700, 4900], [12100, 10000]] },
    top:      { label: 'Rota top',   lane: [[1500, 3600], [1500, 12600], [2200, 13300], [11200, 13300]] },
    mid:      { label: 'Rota mid',   lane: [[3600, 3600], [11200, 11200]] },
    bot:      { label: 'Rota bot',   lane: [[3600, 1500], [12600, 1500], [13300, 2200], [13300, 11200]] },
  };
  var DEFAULTS = {
    size: 300, x: 1620, y: 780, r: 22, lane: 46, op: 1, fit: 'cover', img: '',
    groups: ['baron', 'dragon', 'scuttle', 'buffs', 'camps', 'top', 'mid', 'bot'],
    anim: true, live: true, hud: true, guide: false,
  };

  function nx(x) { return (x / MAP_W * 1000).toFixed(1); }
  function ny(y) { return ((1 - y / MAP_H) * 1000).toFixed(1); }

  /* ---- estado: localStorage < querystring ---- */
  var S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) {}
  ['size', 'x', 'y', 'r', 'lane', 'op'].forEach(function (k) { var v = N.qs(k, null); if (v !== null && !isNaN(+v)) S[k] = +v; });
  if (N.qs('fit', null)) S.fit = N.qs('fit');
  if (N.qs('img', null) !== null) S.img = N.qs('img');
  if (N.qs('groups', null) !== null) S.groups = N.qs('groups').split(',').filter(Boolean);
  ['anim', 'live', 'hud', 'guide'].forEach(function (k) { var v = N.qs(k, null); if (v !== null) S[k] = N.qsBool(k, true); });
  var uploaded = null;
  try { uploaded = localStorage.getItem(LS_IMG); } catch (e) {}

  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---- elementos ---- */
  var cover = document.getElementById('cover');
  var cuts = document.getElementById('maskCuts');
  var rings = document.getElementById('rings');
  var img = document.getElementById('coverImg');
  var DEFAULT_IMG = 'cover-default.svg';

  /* ---- render ---- */
  function svgEl(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function lanePath(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + nx(p[0]) + ' ' + ny(p[1]); }).join(' '); }

  function render() {
    cover.style.setProperty('--size', S.size + 'px');
    cover.style.setProperty('--x', S.x + 'px');
    cover.style.setProperty('--y', S.y + 'px');
    cover.style.setProperty('--cover-op', S.op);
    cover.classList.toggle('anim', !!S.anim);
    cover.classList.toggle('guide-on', !!S.guide);
    document.getElementById('coverLive').classList.toggle('hidden', !S.live);
    document.getElementById('hud').classList.toggle('hidden', !S.hud);

    // imagem: enviada por arquivo > URL > padrão
    var src = uploaded || S.img || DEFAULT_IMG;
    if (img.getAttribute('href') !== src) img.setAttribute('href', src);
    img.setAttribute('preserveAspectRatio', S.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice');

    // recortes + anéis
    cuts.innerHTML = ''; rings.innerHTML = '';
    var i = 0;
    S.groups.forEach(function (g) {
      var G = GROUPS[g]; if (!G) return;
      if (G.pts) G.pts.forEach(function (p) {
        var cx = nx(p[0]), cy = ny(p[1]);
        cuts.appendChild(svgEl('circle', { cx: cx, cy: cy, r: S.r, fill: '#000' }));
        // anel: contorno ink por fora, teal por dentro, e um "sonar" que expande como ward
        rings.appendChild(svgEl('circle', { cx: cx, cy: cy, r: S.r + 7, class: 'ring-outer' }));
        var ring = svgEl('circle', { cx: cx, cy: cy, r: S.r + 7, class: 'pulse' });
        ring.style.animationDelay = (-(i * 0.7)) + 's';
        rings.appendChild(ring);
        var sonar = svgEl('circle', { cx: cx, cy: cy, r: S.r + 7, class: 'sonar' });
        sonar.style.animationDelay = (-(i++ * 1.1)) + 's';
        rings.appendChild(sonar);
      });
      if (G.lane) {
        var d = lanePath(G.lane);
        cuts.appendChild(svgEl('path', { d: d, fill: 'none', stroke: '#000', 'stroke-width': S.lane, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        rings.appendChild(svgEl('path', { d: d, class: 'ring-outer', 'stroke-width': S.lane + 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': .9 }));
        rings.appendChild(svgEl('path', { d: d, 'stroke-width': S.lane + 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        // deixa o miolo da rota transparente de novo (só a borda fica)
        rings.appendChild(svgEl('path', { d: d, stroke: 'transparent', 'stroke-width': S.lane, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    });
  }

  /* ---- HUD ---- */
  document.getElementById('nome').textContent = N.setting('nome', 'CHANNEL_DISPLAY_NAME', 'daretoreact');
  document.getElementById('social').textContent = N.qs('social', '');

  /* ============================================================
     PAINEL (?setup=1)
     ============================================================ */
  var setup = N.qsBool('setup', false);
  render();
  if (!setup) return;
  document.body.classList.add('is-test');

  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $('status');
  function status(m) { statusEl.textContent = m; }

  function bindRange(id, key) {
    var el = $(id), out = $(id + 'Out');
    el.value = S[key]; out.textContent = S[key];
    el.addEventListener('input', function () { S[key] = +el.value; out.textContent = el.value; render(); save(); });
  }
  bindRange('size', 'size'); bindRange('x', 'x'); bindRange('y', 'y'); bindRange('r', 'r'); bindRange('lane', 'lane'); bindRange('op', 'op');

  function bindCheck(id, key) {
    var el = $(id); el.checked = !!S[key];
    el.addEventListener('change', function () { S[key] = el.checked; render(); save(); });
  }
  bindCheck('guideChk', 'guide'); bindCheck('anim', 'anim'); bindCheck('live', 'live'); bindCheck('hudChk', 'hud');

  // grupos de recortes
  var groupsEl = $('groups');
  Object.keys(GROUPS).forEach(function (g) {
    var lab = document.createElement('label');
    var chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = S.groups.indexOf(g) >= 0;
    lab.appendChild(chk); lab.appendChild(document.createTextNode(GROUPS[g].label));
    lab.classList.toggle('on', chk.checked);
    chk.addEventListener('change', function () {
      S.groups = Object.keys(GROUPS).filter(function (k) { return k === g ? chk.checked : S.groups.indexOf(k) >= 0; });
      lab.classList.toggle('on', chk.checked); render(); save();
    });
    groupsEl.appendChild(lab);
  });

  // imagem
  $('fit').value = S.fit;
  $('fit').addEventListener('change', function () { S.fit = $('fit').value; render(); save(); });
  $('imgUrl').value = S.img;
  $('imgUrl').addEventListener('change', function () { S.img = $('imgUrl').value.trim(); render(); save(); });
  $('file').addEventListener('change', function () {
    var f = $('file').files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) { status('imagem muito grande (máx. 4 MB) — reduza antes de enviar'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      uploaded = rd.result;
      try { localStorage.setItem(LS_IMG, uploaded); status('imagem salva neste navegador (' + Math.round(f.size / 1024) + ' KB)'); }
      catch (e) { status('não coube no armazenamento do navegador; use uma imagem menor ou ?img=URL'); }
      render();
    };
    rd.readAsDataURL(f);
  });
  $('clearImg').addEventListener('click', function () {
    uploaded = null; S.img = ''; $('imgUrl').value = '';
    try { localStorage.removeItem(LS_IMG); } catch (e) {}
    render(); save(); status('imagem padrão restaurada');
  });
  $('reset').addEventListener('click', function () {
    S = Object.assign({}, DEFAULTS); save(); location.href = location.pathname + '?setup=1';
  });

  // URL com todos os ajustes (menos a imagem enviada por arquivo)
  $('copy').addEventListener('click', function () {
    var p = new URLSearchParams();
    ['size', 'x', 'y', 'r', 'lane', 'op', 'fit'].forEach(function (k) { p.set(k, S[k]); });
    if (S.img) p.set('img', S.img);
    p.set('groups', S.groups.join(','));
    p.set('anim', S.anim ? 1 : 0); p.set('live', S.live ? 1 : 0); p.set('hud', S.hud ? 1 : 0);
    var url = location.origin + location.pathname + '?' + p.toString();
    navigator.clipboard.writeText(url).then(function () { status('copiado: ' + url + (uploaded ? '  (a imagem enviada por arquivo fica só neste navegador; no OBS use "Interagir" para enviá-la ou hospede em assets/ e use ?img=)' : '')); });
  });

  status('ajuste com a guia ligada olhando o jogo no OBS; depois copie a URL.');
})();
