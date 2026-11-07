// Exame de Suficiência: dados de exame.json, com fonte.
import { indisponivel } from './dados.js';

export async function iniciar(dados) {
  const alvo = document.querySelector('[data-lista="exame"]');
  if (!alvo) return;
  const ex = dados && dados.exame;
  if (!ex || !Array.isArray(ex.itens)) {
    indisponivel(alvo);
    return;
  }
  alvo.textContent = '';
  const dl = document.createElement('dl');
  dl.className = 'exame-lista';
  for (const item of ex.itens) {
    const dt = document.createElement('dt');
    dt.textContent = item.rotulo;
    const dd = document.createElement('dd');
    dd.textContent = item.valor;
    dl.append(dt, dd);
  }
  alvo.appendChild(dl);
  const link = document.querySelector('[data-exame-fonte]');
  if (link && ex.fonte) {
    link.href = ex.fonte.url;
    link.textContent = ex.fonte.texto;
  }
}
