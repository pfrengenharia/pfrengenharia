/* =====================================================================
   PFR Engenharia — camada rica de animação (etapa 7).
   Liga os ganchos deixados pelo front-end (etapa 6): [data-reveal],
   .hero-media, [data-underline], [data-count], [data-parallax].
   Regra que vence tudo: scroll NATIVO, sem momentum/inércia — este
   arquivo não toca no scroll, só observa e anima transform/opacity.

   Segurança (nunca conteúdo presa invisível):
   1) O CSS (style.css) só esconde os ganchos quando o <html> tem a
      classe .motion-on — e essa classe só é adicionada aqui, e só
      quando NÃO há prefers-reduced-motion. Sem este arquivo rodando
      (JS desligado) ou com reduced-motion, o CSS nunca esconde nada.
   2) Rede de tempo CONDICIONAL depois de 2.5s: se o IntersectionObserver não
      revelou nada, força .in em tudo; se revelou algo, só garante o que está
      na viewport. Varrer a página inteira aqui apagava a animação de todas as
      seções abaixo da dobra.
   ===================================================================== */
(function () {
  'use strict';

  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = matchMedia('(hover: none)').matches;

  /* Reduced motion: o CSS já mostra o estado final sem .motion-on.
     Não liga observer, não anima contador, não faz parallax. */
  if (RM) { return; }

  var html = document.documentElement;
  html.classList.add('motion-on');

  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- Título — sublinhado que desenha ---------- */
  var underlineEls = $$('[data-underline]');
  if (underlineEls.length) {
    if ('IntersectionObserver' in window) {
      var ioU = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            ioU.unobserve(entry.target);
          }
        });
      }, { threshold: .4 });
      underlineEls.forEach(function (el) { ioU.observe(el); });
    } else {
      underlineEls.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- Rede de tempo: nada fica preso invisível ----------
     A versão anterior varria a PÁGINA INTEIRA depois de 2.5s. O efeito
     colateral matava o produto: 2.5s após o load, todas as seções abaixo da
     dobra já estavam reveladas, e o visitante rolava um site sem nenhuma
     animação. A rede virou condicional:

     - se NADA foi revelado, o IntersectionObserver não está funcionando
       (aba de fundo, iframe fora de vista, browser antigo) → mostra tudo;
     - se ALGO foi revelado, o observer funciona → só garante o que está
       na viewport agora, e deixa o resto para o scroll.

     Assim o conteúdo continua não podendo ficar preso invisível, sem que a
     rede engula a animação de todas as seções. */
  setTimeout(function () {
    var jaRevelados = $$('[data-reveal].in').length;
    var presos = $$('[data-reveal]:not(.in), [data-underline]:not(.in), .hero-media:not(.in)');
    if (jaRevelados === 0) {
      presos.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    presos.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { el.classList.add('in'); }
    });
  }, 2500);

  /* ---------- Hero — zoom invertido no modelo BIM ---------- */
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { heroMedia.classList.add('in'); });
    });
  }

  /* ---------- Contadores (números de autoridade) ---------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var ioC = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          ioC.unobserve(entry.target);
        }
      });
    }, { threshold: .6 });
    counters.forEach(function (el) { ioC.observe(el); });
  }

  function animateCount(el) {
    var to = parseFloat(el.getAttribute('data-count')) || 0;
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    var dur = 900;
    var start = null;

    function step(t) {
      if (start === null) { start = t; }
      var p = Math.min((t - start) / dur, 1);
      var val = Math.floor(p * to);
      el.textContent = prefix + val.toLocaleString('pt-BR') + suffix;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + to.toLocaleString('pt-BR') + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- Parallax MUITO sutil — modelo BIM do hero ---------- */
  if (!TOUCH) {
    var heroWrap = document.querySelector('[data-parallax]');
    var heroSection = document.getElementById('hero');
    if (heroWrap && heroSection && 'IntersectionObserver' in window) {
      var factor = parseFloat(heroWrap.getAttribute('data-parallax')) || .05;
      var heroVisible = true;
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(heroSection);

      var pending = false, net = null;
      function applyParallax() {
        if (!heroVisible) { return; }
        var y = window.scrollY * factor;
        heroWrap.style.setProperty('--parallax-y', y + 'px');
      }
      function schedule() {
        if (!heroVisible) { return; }
        if (!pending) {
          pending = true;
          requestAnimationFrame(function () { applyParallax(); pending = false; });
        }
        /* rede: sem ela o parallax "congela" em aba de fundo/iframe fora de vista */
        clearTimeout(net);
        net = setTimeout(function () { if (pending) { applyParallax(); pending = false; } }, 120);
      }
      window.addEventListener('scroll', schedule, { passive: true });
    }
  }
})();
