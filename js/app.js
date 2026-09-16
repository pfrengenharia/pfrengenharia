/* =====================================================================
   PFR Engenharia — baseline de comportamento (etapa 6).
   A camada rica de animação é da etapa 7: aqui ficam apenas os
   comportamentos funcionais (header, menu, accordion, lightbox, cookies).
   Scroll é NATIVO + scroll-behavior:smooth. Nada de momentum/inércia.
   ===================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Ano do rodapé ---------- */
  var ano = $('#ano');
  if (ano) { ano.textContent = String(new Date().getFullYear()); }

  /* ---------- Header: transparente no topo, sólido ao rolar ----------
     O sólido é o padrão do CSS; a transparência é ADICIONADA aqui. Assim, se
     este script não rodar (ou ainda não tiver rodado, no reload de uma página
     restaurada já rolada), o header continua legível em vez de sumir. */
  var header = $('#header');
  function onScroll() {
    if (!header) { return; }
    var noTopo = window.scrollY <= 24;
    header.classList.toggle('is-top', noTopo);
    header.classList.toggle('is-solid', !noTopo);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu off-canvas ---------- */
  var burger = $('#burger');
  var drawer = $('#drawer');
  var scrim  = $('#scrim');

  function setDrawer(open) {
    if (!drawer) { return; }
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (scrim)  { scrim.classList.toggle('is-open', open); }
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }
    document.body.classList.toggle('is-locked', open);
  }

  if (burger) { burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('is-open')); }); }
  if (scrim)  { scrim.addEventListener('click',  function () { setDrawer(false); }); }
  var drawerClose = $('#drawerClose');
  if (drawerClose) { drawerClose.addEventListener('click', function () { setDrawer(false); }); }
  $$('.drawer__link').forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });

  /* ---------- Accordion (FAQ) — abre/fecha com transição de max-height.
     Gesto do usuário (não reveal de scroll): não tem risco de "conteúdo
     preso invisível". A duração é lida do CSS em tempo real, então some
     instantaneamente sob reduced-motion (transition-duration ~0 via a
     regra global @media prefers-reduced-motion) sem precisar duplicar
     a lógica de RM aqui. */
  function faqTransitionMs(panel) {
    var d = (window.getComputedStyle(panel).transitionDuration || '0s').split(',')[0].trim();
    var n = parseFloat(d) || 0;
    return d.indexOf('ms') >= 0 ? n : n * 1000;
  }

  function openFaqPanel(panel) {
    panel.hidden = false;
    panel.style.maxHeight = '0px';
    void panel.offsetHeight; /* força reflow: garante o "de onde" antes do "para onde" */
    panel.style.maxHeight = panel.scrollHeight + 'px';
  }

  function closeFaqPanel(panel) {
    var durMs = faqTransitionMs(panel);
    if (durMs <= 1) {
      panel.hidden = true;
      panel.style.maxHeight = '';
      return;
    }
    panel.style.maxHeight = panel.scrollHeight + 'px';
    void panel.offsetHeight;
    panel.style.maxHeight = '0px';
    var done = false;
    function finish() {
      if (done) { return; }
      done = true;
      panel.hidden = true;
      panel.style.maxHeight = '';
      panel.removeEventListener('transitionend', onEnd);
    }
    function onEnd(e) { if (e.propertyName === 'max-height') { finish(); } }
    panel.addEventListener('transitionend', onEnd);
    setTimeout(finish, durMs + 80); /* rede: cobre transitionend perdido (aba de fundo etc.) */
  }

  $$('.faq__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open  = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!panel) { return; }
      if (open) { closeFaqPanel(panel); } else { openFaqPanel(panel); }
    });
  });

  /* painel aberto some/estica corretamente se a janela mudar de tamanho */
  window.addEventListener('resize', function () {
    $$('.faq__panel').forEach(function (p) {
      if (!p.hidden && p.style.maxHeight) { p.style.maxHeight = p.scrollHeight + 'px'; }
    });
  });

  /* ---------- Lightbox do portfólio ---------- */
  var lb      = $('#lightbox');
  var lbImg   = $('#lbImg');
  var lbCap   = $('#lbCap');
  var lbCount = $('#lbCount');
  /* O portfólio tem mais de uma grade (hidrossanitário e PPCI). O índice do
     data-lb é global, mas as setas e o contador andam só dentro da grade de
     onde a imagem foi aberta — senão o visitante sai do assunto sem perceber. */
  var items   = $$('.folio__card').map(function (card) {
    var img = $('img', card);
    var ttl = $('.folio__title', card);
    return {
      src:   img ? img.getAttribute('src') : '',
      w:     img ? img.getAttribute('width') : '',
      h:     img ? img.getAttribute('height') : '',
      cap:   ttl ? ttl.textContent.trim() : '',
      group: card.parentNode
    };
  });

  /* Faixa contígua de itens da mesma grade que contém o índice i. */
  function lbRange(i) {
    var g = items[i].group, a = i, b = i;
    while (a > 0 && items[a - 1].group === g) { a--; }
    while (b < items.length - 1 && items[b + 1].group === g) { b++; }
    return { start: a, len: b - a + 1 };
  }
  var lbIndex = 0;
  var lbLastFocus = null;

  function lbRender() {
    if (!items.length || !lbImg) { return; }
    var it = items[lbIndex];
    lbImg.setAttribute('src', it.src);
    lbImg.setAttribute('alt', it.cap);
    if (it.w) { lbImg.setAttribute('width', it.w); }
    if (it.h) { lbImg.setAttribute('height', it.h); }
    if (lbCap)   { lbCap.textContent = it.cap; }
    if (lbCount) {
      var r = lbRange(lbIndex);
      lbCount.textContent = (lbIndex - r.start + 1) + '/' + r.len;
    }
  }

  function lbOpen(i) {
    if (!lb) { return; }
    lbLastFocus = document.activeElement;
    lbIndex = i;
    lbRender();
    lb.hidden = false;
    document.body.classList.add('is-locked');
    var close = $('#lbClose');
    if (close) { close.focus(); }
  }

  function lbClose() {
    if (!lb) { return; }
    lb.hidden = true;
    document.body.classList.remove('is-locked');
    if (lbLastFocus && lbLastFocus.focus) { lbLastFocus.focus(); }
  }

  function lbStep(delta) {
    if (!items.length) { return; }
    var r = lbRange(lbIndex);
    lbIndex = r.start + ((lbIndex - r.start + delta) % r.len + r.len) % r.len;
    lbRender();
  }

  $$('.folio__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.getAttribute('data-lb'), 10);
      lbOpen(isNaN(i) || i < 0 || i >= items.length ? 0 : i);
    });
  });
  var lbCloseBtn = $('#lbClose'); if (lbCloseBtn) { lbCloseBtn.addEventListener('click', lbClose); }
  var lbPrevBtn  = $('#lbPrev');  if (lbPrevBtn)  { lbPrevBtn.addEventListener('click', function () { lbStep(-1); }); }
  var lbNextBtn  = $('#lbNext');  if (lbNextBtn)  { lbNextBtn.addEventListener('click', function () { lbStep(1); }); }
  if (lb) {
    lb.addEventListener('click', function (e) { if (e.target === lb) { lbClose(); } });
  }

  document.addEventListener('keydown', function (e) {
    if (lb && !lb.hidden) {
      if (e.key === 'Escape')     { lbClose(); }
      if (e.key === 'ArrowLeft')  { lbStep(-1); }
      if (e.key === 'ArrowRight') { lbStep(1); }
      return;
    }
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) { setDrawer(false); }
  });

  /* ---------- Banner de cookies (LGPD) ---------- */
  var KEY = 'pfr_cookie_consent';
  var cookie = $('#cookie');

  window.dataLayer = window.dataLayer || [];

  function pushConsent(value) {
    var permitido = value === 'accepted' ? 'granted' : 'denied';
    /* O Consent Mode do Google só entende gtag('consent','update',...). Empurrar
       as chaves soltas no dataLayer serve de variável para o GTM, mas NÃO segura
       tag nenhuma. O padrão negado é declarado no <head>, antes do contêiner;
       aqui ele é atualizado com a decisão real do visitante. */
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': permitido,
        'ad_user_data': permitido,
        'ad_personalization': permitido,
        'analytics_storage': permitido
      });
    }
    window.dataLayer.push({
      event: 'cookie_consent',
      cookie_consent: value,
      analytics_storage: permitido,
      ad_storage:        permitido
    });
  }

  /* O banner é fixo no canto inferior ESQUERDO (regra fixa do vault: nunca à
     direita, para deixar o canto livre). Como os CTAs da página
     também são alinhados à esquerda, o banner precisa RESERVAR espaço enquanto está
     aberto, senão cobre o CTA do hero — medido colidindo em 1280x800 e 1440x900.
     A classe abaixo é o que o CSS usa para abrir essa folga. */
  function marcarBannerAberto(aberto) {
    document.documentElement.classList.toggle('cookie-open', aberto);
  }

  function decide(value) {
    try { localStorage.setItem(KEY, value); } catch (err) { /* storage indisponível */ }
    pushConsent(value);
    if (cookie) { cookie.hidden = true; }
    marcarBannerAberto(false);
  }

  if (cookie) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { saved = null; }
    if (saved) {
      pushConsent(saved);
      cookie.hidden = true;
      marcarBannerAberto(false);
    } else {
      cookie.hidden = false;
      marcarBannerAberto(true);
    }
    var acc = $('#cookieAccept'); if (acc) { acc.addEventListener('click', function () { decide('accepted'); }); }
    var rej = $('#cookieReject'); if (rej) { rej.addEventListener('click', function () { decide('rejected'); }); }
  }

  /* ---------- Sinal para o harness: a página "acordou" ---------- */
  document.documentElement.setAttribute('data-app-ready', '1');
})();
