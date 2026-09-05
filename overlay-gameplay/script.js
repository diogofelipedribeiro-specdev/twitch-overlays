/* ============================================================
   overlay-gameplay/script.js — HUD de gameplay
   Lê os parâmetros da URL e liga/desliga a moldura da câmera.
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var hud = document.getElementById('hud');

  // ?cam=1 (padrão) = COM câmera · ?cam=0 = SEM câmera
  var comCamera = N.qsBool('cam', true);
  hud.classList.toggle('no-cam', !comCamera);

  // canto: bl | br | tl | tr
  var pos = N.qs('pos', 'bl');
  if (/^(bl|br|tl|tr)$/.test(pos)) hud.dataset.pos = pos;

  // largura da câmera (px)
  var w = parseInt(N.qs('w', '480'), 10);
  if (w > 100) hud.style.setProperty('--cam-w', w + 'px');

  // textos
  document.getElementById('nome').textContent   = N.setting('nome', 'CHANNEL_DISPLAY_NAME', 'daretoreact');
  document.getElementById('social').textContent = N.qs('social', '');

  // pontinho "ao vivo"
  document.getElementById('live').classList.toggle('hidden', !N.qsBool('live', true));
})();
