/* ============================================================
   shared/config.js — CONFIGURAÇÃO CENTRAL (placeholders)
   ------------------------------------------------------------
   Preencha os valores abaixo. Nenhum SEGREDO deve ficar aqui:
   Client IDs são públicos por natureza; tokens são obtidos
   no navegador (PKCE / Implicit) e ficam só no localStorage.
   Tudo pode ser sobrescrito por querystring (ex.: ?canal=xyz).
   ============================================================ */
window.NINJA_CONFIG = {
  /* ---------- TWITCH ---------- */

  // Login do seu canal na Twitch (minúsculo). Usado pelo chat embutido e pelo EventSub.
  // Ex.: "daretoreact"
  TWITCH_CHANNEL: "SEUCANAL",

  // Nome exibido nos overlays (pode ter maiúsculas). Vem da arte do handoff.
  CHANNEL_DISPLAY_NAME: "daretoreact",

  // Domínio "parent" exigido pelo embed do chat da Twitch.
  // Deixe VAZIO para detectar automaticamente (recomendado):
  //   - no GitHub Pages vira "SEUUSUARIO.github.io"
  //   - em teste local vira "localhost"
  // Ou force um valor, ex.: "seuusuario.github.io"
  CHAT_PARENT: "",

  // Client ID do app criado no Twitch Developer Console (https://dev.twitch.tv/console/apps)
  // Necessário apenas para os alertas em produção (EventSub WebSocket).
  TWITCH_CLIENT_ID: "SEU_TWITCH_CLIENT_ID",

  /* ---------- SPOTIFY ---------- */

  // Client ID do app criado no Spotify Developer Dashboard (https://developer.spotify.com/dashboard)
  // Usado pelo widget Now Playing (Authorization Code + PKCE, sem client secret).
  SPOTIFY_CLIENT_ID: "SEU_SPOTIFY_CLIENT_ID",

  /* ---------- ALERTAS ---------- */

  // Textos padrão dos alertas (estilo Streamlabs). Variáveis: {name}, {amount}
  ALERT_TEMPLATES: {
    follow: "{name} agora segue o canal!",
    sub:    "{name} virou sub! 🌴",
    bits:   "{name} mandou {amount} bits!",
  },

  // Duração de cada alerta na tela (ms) e intervalo entre alertas na fila
  ALERT_DURATION_MS: 7000,
  ALERT_GAP_MS: 600,
};
