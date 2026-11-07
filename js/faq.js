// FAQ em details e summary, a partir de faq.json, com fonte em cada resposta.
import { indisponivel } from './dados.js';

export async function iniciar(dados) {
  const alvo = document.querySelector('[data-lista="faq"]');
  if (!alvo) return;
  const itens = dados && dados.faq && dados.faq.itens;
  if (!Array.isArray(itens) || !itens.length) {
    indisponivel(alvo);
    return;
  }
  alvo.textContent = '';
  itens.forEach((f, i) => {
    const n = i + 1;
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.setAttribute('data-faq-pergunta', String(n));
    sum.textContent = f.pergunta;
    const resp = document.createElement('p');
    resp.setAttribute('data-faq-resposta', String(n));
    resp.textContent = f.resposta;
    det.append(sum, resp);
    if (f.fonte && f.fonte.url) {
      const p = document.createElement('p');
      p.className = 'nota';
      p.append('Fonte: ');
      const a = document.createElement('a');
      a.href = f.fonte.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = f.fonte.texto;
      p.appendChild(a);
      det.appendChild(p);
    }
    alvo.appendChild(det);
  });
}
