/* ============================================================
   shared/utils.js — utilitários comuns a todos os overlays
   ============================================================ */
window.Ninja = (function () {
  'use strict';

  /** Lê um parâmetro da querystring (?chave=valor). Retorna `fallback` se ausente. */
  function qs(key, fallback) {
    var v = new URLSearchParams(location.search).get(key);
    return v === null || v === '' ? fallback : v;
  }

  /** Interpreta valores booleanos vindos da URL: 1/true/on/sim = true. */
  function qsBool(key, fallback) {
    var v = qs(key, null);
    if (v === null) return fallback;
    return /^(1|true|on|sim|yes)$/i.test(v);
  }

  /** Lê da querystring OU do NINJA_CONFIG (querystring vence). */
  function setting(qsKey, configKey, fallback) {
    var cfg = (window.NINJA_CONFIG || {})[configKey];
    return qs(qsKey, (cfg !== undefined && cfg !== '') ? cfg : fallback);
  }

  /** Escapa HTML para inserir texto de usuários com segurança. */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Substitui variáveis de template no estilo Streamlabs: {name}, {amount}, ... */
  function template(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] !== undefined ? vars[k] : '';
    });
  }

  /**
   * Ajusta dinamicamente o tamanho da fonte para o texto caber no elemento.
   * Começa em `max` px e reduz até `min` px enquanto houver overflow.
   */
  function fitText(el, max, min) {
    max = max || 40; min = min || 16;
    // limite de altura = max-height do CSS (ou a altura atual, se não houver max-height)
    var cs = getComputedStyle(el);
    var limitH = parseFloat(cs.maxHeight);
    if (!limitH || isNaN(limitH)) limitH = el.clientHeight;
    var size = max;
    el.style.fontSize = size + 'px';
    // reduz de 1 em 1 px até caber; tolerância de 1px evita o arredondamento
    // do scrollHeight que faria a fonte encolher sem necessidade
    var guard = 0;
    function overflows() {
      return el.scrollHeight > limitH + 1 || el.scrollWidth > el.clientWidth + 1;
    }
    while (overflows() && size > min && guard++ < 200) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
    return size;
  }

  /** Detecta o "parent" do chat da Twitch a partir do host atual. */
  function chatParent() {
    var forced = (window.NINJA_CONFIG || {}).CHAT_PARENT;
    if (forced) return forced;
    return location.hostname || 'localhost';
  }

  /** Gera string aleatória (usada no PKCE e no state do OAuth). */
  function randomString(len) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var arr = new Uint8Array(len || 64);
    crypto.getRandomValues(arr);
    return Array.from(arr, function (b) { return chars[b % chars.length]; }).join('');
  }

  /** SHA-256 em base64url (PKCE code_challenge). */
  async function sha256base64url(str) {
    var data = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', data);
    var bin = String.fromCharCode.apply(null, new Uint8Array(hash));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Formata milissegundos como m:ss */
  function mmss(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /** Cria um <svg><use href="#id"/></svg> apontando para os sprites injetados. */
  function spriteSvg(id, viewBox, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    if (cls) svg.setAttribute('class', cls);
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  return {
    qs: qs, qsBool: qsBool, setting: setting, escapeHtml: escapeHtml, template: template,
    fitText: fitText, chatParent: chatParent, randomString: randomString,
    sha256base64url: sha256base64url, mmss: mmss, spriteSvg: spriteSvg,
  };
})();
