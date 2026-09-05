/* ============================================================
   transition/script.js — dispara a animação de transição
   - ao carregar a página (OBS: "atualizar navegador quando a cena ficar ativa")
   - no evento obsSceneChanged (quando a fonte é compartilhada entre cenas)
   - a cada 3 s com ?loop=1 (pré-visualização) e ao clicar na página
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var tr = document.getElementById('tr');

  var dur = Math.max(600, parseInt(N.qs('dur', '1600'), 10));
  tr.style.setProperty('--tr-dur', dur + 'ms');
  if (N.qs('dir', 'lr') === 'rl') tr.classList.add('rl');
  document.getElementById('label').textContent = N.qs('texto', '');

  // mascote: cabeça (emote) ou corpo inteiro
  var use = document.getElementById('mascotUse');
  var mascot = document.getElementById('mascot');
  if (N.qsBool('full', false)) {
    mascot.setAttribute('viewBox', '0 0 400 600'); mascot.classList.add('full'); use.setAttribute('href', '#nj-full');
  } else {
    var emote = N.qs('emote', 'to-de-boa');
    use.setAttribute('href', '#emote-' + emote);
  }

  var timer = null;
  function play() {
    clearTimeout(timer);
    tr.classList.remove('play', 'done');
    void tr.offsetWidth;                       // força reflow para reiniciar as animações
    tr.classList.add('play');
    timer = setTimeout(function () { tr.classList.remove('play'); tr.classList.add('done'); }, dur + 50);
  }

  // dispara quando os sprites estiverem no DOM (o mascote depende deles)
  if (document.getElementById('ninja-sprites')) play();
  else document.addEventListener('ninja:sprites-ready', play, { once: true });

  // OBS: toca quando a fonte fica visível (ao entrar na cena) — não depende
  // das opções "atualizar ao ficar ativa" / "desligar quando não visível"
  if (window.obsstudio) {
    window.obsstudio.onVisibilityChange = function (visible) { if (visible) play(); };
    window.obsstudio.onActiveChange = function (active) { if (active) play(); };
  }
  // OBS: evento de troca de cena (quando a fonte é compartilhada entre cenas)
  window.addEventListener('obsSceneChanged', play);
  document.addEventListener('click', play);

  if (N.qsBool('loop', false)) setInterval(play, 3000);

  window.NinjaTransition = { play: play };
})();
