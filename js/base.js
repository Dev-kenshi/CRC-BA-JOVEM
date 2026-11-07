// Pular para o conteúdo, menu e atalhos de teclado (alt+1, alt+2, alt+3).
export async function iniciar(dados) {
  void dados;
  const principal = document.querySelector('main#conteudo');
  const botao = document.querySelector('[data-menu-botao]');
  const menu = document.querySelector('[data-menu]');
  const pular = document.querySelector('[data-pular]');

  const menuRecolhivel = () => getComputedStyle(botao).display !== 'none';
  const abrirMenu = aberto => {
    menu.classList.toggle('aberto', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
  };

  pular?.addEventListener('click', evento => {
    evento.preventDefault();
    principal.focus();
    principal.scrollIntoView();
  });

  botao?.addEventListener('click', () => abrirMenu(botao.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', evento => {
    if (evento.target.closest('a') && menuRecolhivel()) abrirMenu(false);
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && menuRecolhivel() && botao.getAttribute('aria-expanded') === 'true') {
      abrirMenu(false);
      botao.focus();
    }
  });

  // Atalhos documentados na página de acessibilidade.
  document.addEventListener('keydown', evento => {
    if (!evento.altKey || evento.ctrlKey || evento.metaKey) return;
    if (evento.code === 'Digit1') {
      evento.preventDefault();
      principal.focus();
      principal.scrollIntoView();
    } else if (evento.code === 'Digit2') {
      evento.preventDefault();
      if (menuRecolhivel()) abrirMenu(true);
      const primeiro = menu.querySelector('a');
      primeiro?.focus();
    } else if (evento.code === 'Digit3') {
      evento.preventDefault();
      const campo = document.querySelector('#assistente-pergunta');
      campo?.focus();
      campo?.scrollIntoView({ block: 'center' });
    }
  });

  // Marca no menu a seção que está na tela.
  const links = [...document.querySelectorAll('[data-nav]')];
  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        links.forEach(l => {
          if (l.getAttribute('href') === `#${e.target.id}`) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(l => {
      const alvo = document.querySelector(l.getAttribute('href'));
      if (alvo) observador.observe(alvo);
    });
  }
}
