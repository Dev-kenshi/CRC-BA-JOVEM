// Notícias: só itens de noticias.json com fonte.
import { indisponivel } from './dados.js';

export async function iniciar(dados) {
  const alvo = document.querySelector('[data-lista="noticias"]');
  if (!alvo) return;
  if (!dados || !dados.noticias || !Array.isArray(dados.noticias.itens)) {
    indisponivel(alvo);
    return;
  }
  alvo.textContent = '';
  for (const n of dados.noticias.itens) {
    if (!n.fonte || !n.fonte.url) continue;
    const art = document.createElement('article');
    art.className = 'noticia';
    art.setAttribute('data-noticia', n.id);
    const h = document.createElement('h3');
    h.textContent = n.titulo;
    const p = document.createElement('p');
    p.textContent = n.resumo;
    const f = document.createElement('p');
    f.className = 'nota';
    f.append('Fonte: ');
    const a = document.createElement('a');
    a.href = n.fonte.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = n.fonte.texto;
    f.appendChild(a);
    art.append(h, p, f);
    alvo.appendChild(art);
  }
}
