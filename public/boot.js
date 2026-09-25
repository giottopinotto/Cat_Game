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
    if (/^[a-z]{2,12}$/.test(look.accent) && look.accent !== 'lilla' && num(look.h, 0, 360) && num(look.s, 0, 100) && num(look.l, 0, 100)) {
      root.setAttribute('data-accent', look.accent);
      root.style.setProperty('--h', String(look.h));
      root.style.setProperty('--ps', look.s + '%');
      root.style.setProperty('--pl', look.l + '%');
    }
  } catch (e) {
    /* nessuna preferenza salvata: si parte in lilla */
  }
})();
