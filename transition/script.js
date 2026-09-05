/* ============================================================
   transition/script.js — dispara a animação de transição
   Modos:
     reveal (padrão) — a tela já começa coberta (classe "covered" no HTML);
                       ao tocar, a onda sai e revela a cena nova.
     full            — entrada + saída (pré-visualização).
   Gatilhos: carregamento da página, eventos do OBS (visibilidade / cena),
   clique na página e ?loop=1 (repete a cada 3 s).
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var tr = document.getElementById('tr');

  var mode = N.qs('mode', 'reveal') === 'full' ? 'full' : 'reveal';
  var dur = Math.max(600, parseInt(N.qs('dur', mode === 'full' ? '1600' : '1400'), 10));
  tr.style.setProperty('--tr-dur', dur + 'ms');
  if (N.qs('dir', 'lr') === 'rl') tr.classList.add('rl');
  document.getElementById('label').textContent = N.qs('texto', '');
  if (mode === 'full') tr.classList.remove('covered');

  // mascote: cabeça (emote) ou corpo inteiro
  var use = document.getElementById('mascotUse');
  var mascot = document.getElementById('mascot');
  if (N.qsBool('full', false)) {
    mascot.setAttribute('viewBox', '0 0 400 600'); mascot.classList.add('full'); use.setAttribute('href', '#nj-full');
  } else {
    use.setAttribute('href', '#emote-' + N.qs('emote', 'to-de-boa'));
  }

  var timer = null;
  function play() {
    clearTimeout(timer);
    tr.classList.remove('play', 'play-out', 'done');
    if (mode === 'reveal') {
      tr.classList.add('covered');             // cobre na hora (sem animação)
      void tr.offsetWidth;                     // força reflow
      requestAnimationFrame(function () { tr.classList.add('play-out'); });
      timer = setTimeout(function () { tr.classList.remove('covered', 'play-out'); tr.classList.add('done'); }, dur + 50);
    } else {
      void tr.offsetWidth;
      tr.classList.add('play');
      timer = setTimeout(function () { tr.classList.remove('play'); tr.classList.add('done'); }, dur + 50);
    }
  }

  // primeira execução: espera os sprites (o mascote depende deles); a tela já está coberta
  if (document.getElementById('ninja-sprites')) play();
  else document.addEventListener('ninja:sprites-ready', play, { once: true });

  // OBS: toca quando a fonte fica visível/ativa (ao entrar na cena) — não depende
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
