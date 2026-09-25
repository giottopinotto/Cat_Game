// Colore e tema scelti, applicati prima che la pagina si disegni: così anche la
// schermata di apertura ha subito il colore giusto. (File separato: la protezione
// del sito non permette script scritti dentro la pagina.)
(function () {
  try {
    var look = JSON.parse(localStorage.getItem('zig-look') || 'null');
    if (!look || typeof look !== 'object') return;
    var root = document.documentElement;
    var h = new Date().getHours();
    var dark = look.theme === 'dark' || (look.theme === 'auto' && (h >= 20 || h < 7));
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    var num = function (v, min, max) {
      return typeof v === 'number' && isFinite(v) && v >= min && v <= max;
    };
    var bar = dark ? '#1c1730' : '#9f7aea';
    if (/^[a-z]{2,12}$/.test(look.accent) && look.accent !== 'lilla' && num(look.h, 0, 360) && num(look.s, 0, 100) && num(look.l, 0, 100)) {
      root.setAttribute('data-accent', look.accent);
      root.style.setProperty('--h', String(look.h));
      root.style.setProperty('--ps', look.s + '%');
      root.style.setProperty('--pl', look.l + '%');
      bar = dark ? 'hsl(' + look.h + ', 38%, 12%)' : 'hsl(' + look.h + ', ' + look.s + '%, ' + look.l + '%)';
      // Icona della scheda nel colore scelto fin da subito.
      var icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.setAttribute('href', 'icons/' + look.accent + '/favicon.svg');
    }
    // Colore della barra in alto del telefono.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bar);
  } catch (e) {
    /* nessuna preferenza salvata: si parte in lilla */
  }
})();
