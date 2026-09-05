/* ============================================================
   now-playing/script.js — Spotify "currently playing"
   ------------------------------------------------------------
   Auth: Authorization Code with PKCE (sem client secret, 100% front-end)
     - /authorize com code_challenge (S256)
     - troca do code em /api/token com code_verifier
     - refresh_token renovado automaticamente (também sem secret)
   Dados: GET https://api.spotify.com/v1/me/player/currently-playing (polling)
   Escopos: user-read-currently-playing user-read-playback-state
   Tokens ficam SÓ no localStorage deste navegador (OBS tem o dele).
   ============================================================ */
(function () {
  'use strict';
  var N = window.Ninja;
  var CFG = window.NINJA_CONFIG || {};

  var LS = { access: 'ninja_sp_access', refresh: 'ninja_sp_refresh', exp: 'ninja_sp_exp', verifier: 'ninja_sp_verifier', state: 'ninja_sp_state' };
  var SCOPES = 'user-read-currently-playing user-read-playback-state';
  var AUTH_URL = 'https://accounts.spotify.com/authorize';
  var TOKEN_URL = 'https://accounts.spotify.com/api/token';
  var API_URL = 'https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode';

  var clientId = N.setting('client_id', 'SPOTIFY_CLIENT_ID', '');
  var setup = N.qsBool('setup', false);
  var autohide = N.qsBool('autohide', false);
  var demo = N.qsBool('demo', false);
  var POLL = Math.max(1000, parseInt(N.qs('poll', '3000'), 10));

  /* ---- elementos ---- */
  var el = {
    np: document.getElementById('np'), cover: document.getElementById('cover'), kicker: document.getElementById('kicker'),
    title: document.getElementById('title'), titleWrap: document.querySelector('.np-title'), artist: document.getElementById('artist'),
    fill: document.getElementById('fill'), cur: document.getElementById('cur'), dur: document.getElementById('dur'),
    status: document.getElementById('status'), setupRow: document.getElementById('setupRow'),
  };
  if (N.qsBool('compact', false)) el.np.classList.add('compact');
  if (N.qs('tema', 'light') === 'dark') el.np.classList.add('dark');

  function status(msg, cls) {
    console.log('[spotify] ' + msg);
    el.status.textContent = msg; el.status.className = 'sp-status ' + (cls || '');
  }
  function redirectUri() { return location.origin + location.pathname; }

  /* ============================================================
     PKCE
     ============================================================ */
  async function login() {
    if (!clientId || clientId === 'SEU_SPOTIFY_CLIENT_ID') { status('configure SPOTIFY_CLIENT_ID em shared/config.js', 'err'); return; }
    var verifier = N.randomString(64);
    var challenge = await N.sha256base64url(verifier);
    var state = N.randomString(16);
    localStorage.setItem(LS.verifier, verifier);
    localStorage.setItem(LS.state, state);
    var p = new URLSearchParams({
      response_type: 'code', client_id: clientId, scope: SCOPES,
      code_challenge_method: 'S256', code_challenge: challenge,
      redirect_uri: redirectUri(), state: state,
    });
    location.href = AUTH_URL + '?' + p.toString();
  }

  async function exchangeCode(code) {
    var verifier = localStorage.getItem(LS.verifier);
    var r = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code: code, redirect_uri: redirectUri(), code_verifier: verifier }),
    });
    var j = await r.json();
    if (!r.ok) throw new Error(j.error_description || j.error || 'falha na troca do code');
    saveTokens(j);
  }

  async function refresh() {
    var rt = localStorage.getItem(LS.refresh);
    if (!rt) throw new Error('sem refresh_token');
    var r = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: rt }),
    });
    var j = await r.json();
    if (!r.ok) { localStorage.removeItem(LS.refresh); throw new Error(j.error_description || 'refresh falhou'); }
    saveTokens(j);
  }

  function saveTokens(j) {
    localStorage.setItem(LS.access, j.access_token);
    if (j.refresh_token) localStorage.setItem(LS.refresh, j.refresh_token);
    localStorage.setItem(LS.exp, String(Date.now() + (j.expires_in || 3600) * 1000 - 60000));
  }

  async function getAccessToken() {
    var exp = parseInt(localStorage.getItem(LS.exp) || '0', 10);
    if (!localStorage.getItem(LS.access) || Date.now() > exp) await refresh();
    return localStorage.getItem(LS.access);
  }

  function logout() { Object.values(LS).forEach(function (k) { localStorage.removeItem(k); }); location.reload(); }

  function obsUrl() {
    // URL para o OBS: parâmetros atuais (menos setup/demo) + refresh_token no hash.
    // Na primeira carga a página guarda o token no localStorage do OBS e limpa o hash.
    var p = new URLSearchParams(location.search); p.delete('setup'); p.delete('demo'); p.delete('code'); p.delete('state');
    var q = p.toString();
    return location.origin + location.pathname + (q ? '?' + q : '') + '#refresh_token=' + localStorage.getItem(LS.refresh);
  }

  /* ---- token vindo pelo hash (URL do OBS) ---- */
  (function readHash() {
    if (!location.hash) return;
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.get('refresh_token')) {
      localStorage.setItem(LS.refresh, h.get('refresh_token'));
      localStorage.removeItem(LS.access); localStorage.removeItem(LS.exp);
      history.replaceState(null, '', location.pathname + location.search);
    }
  })();

  /* ---- painel ---- */
  function renderPanel() {
    if (!setup) return;
    document.body.classList.add('is-test');
    document.getElementById('uri').textContent = redirectUri();
    el.setupRow.innerHTML = '';
    var has = !!localStorage.getItem(LS.refresh);
    if (!has) {
      var b = document.createElement('button'); b.textContent = 'Conectar Spotify'; b.onclick = login; el.setupRow.appendChild(b);
      status('clique em Conectar Spotify');
    } else {
      var c = document.createElement('button'); c.textContent = 'Copiar URL para o OBS';
      c.onclick = function () { navigator.clipboard.writeText(obsUrl()).then(function () { c.textContent = 'Copiado!'; }); };
      var d = document.createElement('button'); d.textContent = 'Desconectar'; d.className = 'secondary'; d.onclick = logout;
      el.setupRow.appendChild(c); el.setupRow.appendChild(d);
    }
  }

  /* ============================================================
     UI
     ============================================================ */
  var track = null;         // { title, artist, cover, duration, progress, playing, fetchedAt }

  function render(t) {
    track = t;
    if (!t) {
      el.np.dataset.state = 'idle';
      el.kicker.textContent = 'spotify';
      el.title.textContent = 'nada tocando';
      el.artist.textContent = 'de boa na praia 🌴';
      el.cover.src = ''; el.fill.style.width = '0%'; el.cur.textContent = '0:00'; el.dur.textContent = '0:00';
      el.titleWrap.classList.remove('scroll');
      el.np.classList.toggle('hidden', autohide);
      return;
    }
    el.np.classList.remove('hidden');
    el.np.dataset.state = t.playing ? 'playing' : 'paused';
    el.kicker.textContent = t.playing ? 'tocando agora' : 'pausado';
    if (el.title.textContent !== t.title) {
      el.title.textContent = t.title;
      // ativa marquee se o título não couber
      requestAnimationFrame(function () {
        var over = el.title.scrollWidth > el.titleWrap.clientWidth;
        el.titleWrap.classList.toggle('scroll', over);
        el.titleWrap.style.setProperty('--w', el.titleWrap.clientWidth + 'px');
      });
    }
    el.artist.textContent = t.artist;
    if (el.cover.getAttribute('src') !== t.cover) el.cover.src = t.cover || '';
    el.dur.textContent = N.mmss(t.duration);
    tickProgress();
  }

  // interpola o progresso entre um polling e outro (fica fluido a 60 fps)
  function tickProgress() {
    if (!track) return;
    var p = track.progress + (track.playing ? Date.now() - track.fetchedAt : 0);
    p = Math.min(p, track.duration);
    el.fill.style.width = (track.duration ? (p / track.duration) * 100 : 0) + '%';
    el.cur.textContent = N.mmss(p);
  }
  setInterval(tickProgress, 250);

  /* ============================================================
     POLLING
     ============================================================ */
  var backoffUntil = 0;
  async function poll() {
    if (Date.now() < backoffUntil) return schedule();
    try {
      var token = await getAccessToken();
      var r = await fetch(API_URL, { headers: { Authorization: 'Bearer ' + token } });
      if (r.status === 204) { render(null); status('conectado — nada tocando', 'ok'); return schedule(); }
      if (r.status === 401) { await refresh(); return schedule(500); }
      if (r.status === 429) { backoffUntil = Date.now() + (parseInt(r.headers.get('Retry-After') || '5', 10) * 1000); return schedule(); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var j = await r.json();
      var item = j.item;
      if (!item) { render(null); return schedule(); }
      var isTrack = item.type === 'track';
      render({
        title: item.name,
        artist: isTrack ? item.artists.map(function (a) { return a.name; }).join(', ') : (item.show && item.show.name) || '',
        cover: (isTrack ? item.album.images : item.images || [])[0] && (isTrack ? item.album.images : item.images)[0].url,
        duration: item.duration_ms, progress: j.progress_ms || 0, playing: !!j.is_playing, fetchedAt: Date.now(),
      });
      status('conectado — ' + item.name, 'ok');
    } catch (e) {
      status(e.message, 'err');
      if (/refresh|sem refresh_token/.test(e.message)) { renderPanel(); return; } // precisa logar de novo
    }
    schedule();
  }
  var timer = null;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(poll, ms || POLL); }

  /* ============================================================
     BOOT
     ============================================================ */
  (async function boot() {
    renderPanel();

    // volta do /authorize com ?code=
    var q = new URLSearchParams(location.search);
    if (q.get('code')) {
      try {
        if (q.get('state') !== localStorage.getItem(LS.state)) throw new Error('state inválido');
        await exchangeCode(q.get('code'));
        q.delete('code'); q.delete('state'); q.set('setup', '1');
        history.replaceState(null, '', location.pathname + '?' + q.toString());
        setup = true; renderPanel();
        status('conectado! copie a URL para o OBS', 'ok');
      } catch (e) { status('erro no login: ' + e.message, 'err'); return; }
    } else if (q.get('error')) {
      status('Spotify recusou: ' + q.get('error'), 'err'); return;
    }

    if (demo) {
      render({ title: 'Garota de Ipanema (Ninja Remix)', artist: 'Tom Jobim, DJ Praiano', cover: '', duration: 214000, progress: 61000, playing: true, fetchedAt: Date.now() });
      status('modo demo', 'ok');
      return;
    }

    if (!localStorage.getItem(LS.refresh)) {
      render(null);
      status(setup ? 'clique em Conectar Spotify' : 'sem login — abra com ?setup=1', 'err');
      return;
    }
    poll();
  })();
})();
