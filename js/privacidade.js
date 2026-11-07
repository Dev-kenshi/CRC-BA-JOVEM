// Aviso de privacidade (abrir, fechar, Esc) e faixa de armazenamento (crcjovem.aviso).
const CHAVE = 'crcjovem.aviso';

function jaAceitou() {
  try {
    return localStorage.getItem(CHAVE) === 'ok';
  } catch (e) {
    return false;
  }
}

function lembrar() {
  try {
    localStorage.setItem(CHAVE, 'ok');
  } catch (e) {
    // Sem armazenamento: o aviso some só nesta visita.
  }
}

export async function iniciar() {
  const faixa = document.querySelector('[data-aviso-armazenamento]');
  const ok = document.querySelector('[data-aviso-ok]');
  if (faixa) {
    if (jaAceitou()) faixa.hidden = true;
    if (ok) {
      ok.addEventListener('click', () => {
        lembrar();
        faixa.hidden = true;
      });
    }
  }

  const painel = document.querySelector('[data-privacidade]');
  const abrir = document.querySelector('[data-privacidade-abrir]');
  const fechar = document.querySelector('[data-privacidade-fechar]');
  if (!painel || !abrir) return;

  function fecharPainel() {
    if (painel.hidden) return;
    painel.hidden = true;
    abrir.setAttribute('aria-expanded', 'false');
    abrir.focus();
  }

  abrir.setAttribute('aria-expanded', 'false');
  abrir.addEventListener('click', () => {
    painel.hidden = false;
    abrir.setAttribute('aria-expanded', 'true');
    painel.focus();
  });
  if (fechar) fechar.addEventListener('click', fecharPainel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharPainel();
  });
}
