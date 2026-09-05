/* ============================================================
   starting-scene/script.js — cena inicial
   - escala o palco 1920×1080 para o tamanho da janela
   - lê textos da querystring
   - monta o iframe oficial do chat da Twitch
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;

  /* ---- escala do palco ---- */
  function fit() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.getElementById('stage').style.transform = 'scale(' + s + ')';
  }
  addEventListener('resize', fit); fit();

  /* ---- textos ---- */
  document.getElementById('titulo').textContent = N.qs('titulo', 'COMEÇANDO JÁ JÁ');
  document.getElementById('sub').textContent    = N.qs('sub', 'pega uma água de coco e senta aí');
  document.getElementById('nome').textContent   = N.setting('nome', 'CHANNEL_DISPLAY_NAME', 'daretoreact');

  /* ---- chat da Twitch ----
     URL oficial do embed: https://www.twitch.tv/embed/<CANAL>/chat?parent=<HOST>
     O "parent" DEVE ser o domínio que hospeda esta página (ex.: seuusuario.github.io).
     Detectamos automaticamente pelo hostname; pode forçar com ?parent= ou em config.js. */
  var frame = document.getElementById('chatFrame');
  var body  = document.getElementById('chatBody');

  if (!N.qsBool('chat', true)) { frame.style.display = 'none'; return; }

  var canal  = String(N.setting('canal', 'TWITCH_CHANNEL', 'SEUCANAL')).toLowerCase();
  var parent = N.qs('parent', N.chatParent());
  var dark   = N.qs('tema', 'light') === 'dark';

  if (canal === 'seucanal') {
    body.innerHTML =
      '<div class="chat-notice"><div>Configure o seu canal para o chat aparecer:</div>' +
      '<code>TWITCH_CHANNEL</code> em <code>shared/config.js</code>' +
      '<div>ou abra com <code>?canal=nome_do_canal</code></div></div>';
    return;
  }
  if (location.protocol === 'file:') {
    body.innerHTML =
      '<div class="chat-notice"><div>O chat da Twitch só carrega via http(s).</div>' +
      '<div>Abra pelo GitHub Pages ou por um servidor local<br>(ex.: <code>python -m http.server</code>).</div></div>';
    return;
  }

  var url = 'https://www.twitch.tv/embed/' + encodeURIComponent(canal) + '/chat' +
            '?parent=' + encodeURIComponent(parent) + (dark ? '&darkpopout' : '');
  var iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = 'Chat da Twitch';
  iframe.setAttribute('allow', 'autoplay');
  body.appendChild(iframe);
})();
