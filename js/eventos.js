// Eventos: cartões, estado, contagem regressiva (fuso -03:00), programação e link .ics.
import { indisponivel } from './dados.js';

const ROTULO = { antes: 'Em breve', hoje: 'Acontece hoje', encerrado: 'Encerrado' };

function criar(tag, atributos = {}, texto = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  if (texto) el.textContent = texto;
  return el;
}

function formatarData(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function formatarHora(iso) {
  const [h, min] = iso.slice(11, 16).split(':');
  return min === '00' ? `${h}h` : `${h}h${min}`;
}

// Calcula o estado e a diferença em ms. Datas ISO já trazem -03:00.
export function calcular(evento, agora = Date.now()) {
  const inicio = Date.parse(evento.inicio);
  const fim = Date.parse(evento.fim);
  const fimDoDia = Date.parse(`${evento.inicio.slice(0, 10)}T23:59:59-03:00`);
  let estado = 'encerrado';
  if (agora < inicio) estado = 'antes';
  else if (agora <= Math.max(fim, fimDoDia)) estado = 'hoje';
  let dias = 0, horas = 0, minutos = 0;
  if (estado === 'antes') {
    const total = Math.floor((inicio - agora) / 60000);
    dias = Math.floor(total / 1440);
    horas = Math.floor((total % 1440) / 60);
    minutos = total % 60;
  }
  return { estado, dias, horas, minutos };
}

function numero(el, valor) {
  el.dataset.valor = String(Math.trunc(valor));
  el.querySelector('strong').textContent = String(Math.trunc(valor));
}

function atualizar(cartoes, itens) {
  const agora = Date.now();
  for (const ev of itens) {
    const cartao = cartoes.get(ev.id);
    if (!cartao) continue;
    const r = calcular(ev, agora);
    const est = cartao.querySelector('[data-estado]');
    est.dataset.estado = r.estado;
    est.textContent = ROTULO[r.estado];
    numero(cartao.querySelector('[data-contagem-dias]'), r.dias);
    numero(cartao.querySelector('[data-contagem-horas]'), r.horas);
    numero(cartao.querySelector('[data-contagem-minutos]'), r.minutos);
  }
}

function celula(atributo, rotulo) {
  const c = criar('div', { [atributo]: '', 'data-valor': '0' });
  c.appendChild(criar('strong', {}, '0'));
  c.appendChild(document.createTextNode(rotulo));
  return c;
}

export async function iniciar(dados) {
  const lista = document.querySelector('[data-lista="eventos"]');
  const prog = document.querySelector('[data-lista="programacao"]');
  if (!dados || !dados.eventos || !Array.isArray(dados.eventos.itens)) {
    indisponivel(lista);
    indisponivel(prog);
    return;
  }
  const itens = dados.eventos.itens;
  const cartoes = new Map();
  if (lista) lista.textContent = '';
  for (const ev of itens) {
    const art = criar('article', { class: 'evento', 'data-evento': ev.id, 'aria-labelledby': `ev-${ev.id}` });
    art.appendChild(criar('h3', { id: `ev-${ev.id}` }, ev.titulo));
    art.appendChild(criar('p', {}, `${formatarData(ev.inicio)}, das ${formatarHora(ev.inicio)} às ${formatarHora(ev.fim)}. ${ev.cidade}.`));
    art.appendChild(criar('p', {}, ev.local));
    art.appendChild(criar('p', { class: 'evento-estado', 'data-estado': 'antes' }, ROTULO.antes));
    const cont = criar('div', { class: 'contagem', role: 'group', 'aria-label': 'Tempo até o início' });
    cont.appendChild(celula('data-contagem-dias', 'dias'));
    cont.appendChild(celula('data-contagem-horas', 'horas'));
    cont.appendChild(celula('data-contagem-minutos', 'minutos'));
    art.appendChild(cont);
    const acoes = criar('p', { class: 'acoes' });
    acoes.appendChild(criar('a', { class: 'botao', href: ev.inscricao_url, target: '_blank', rel: 'noopener' }, 'Inscrever-se'));
    acoes.appendChild(criar('a', { class: 'botao botao-claro', 'data-ics': ev.id, href: `calendario/${ev.id}.ics`, download: `${ev.id}.ics` }, 'Adicionar ao calendário'));
    art.appendChild(acoes);
    const fonte = criar('p', { class: 'nota' }, 'Fonte: ');
    fonte.appendChild(criar('a', { href: ev.fonte.url, target: '_blank', rel: 'noopener' }, ev.fonte.texto));
    art.appendChild(fonte);
    lista.appendChild(art);
    cartoes.set(ev.id, art);
  }

  if (prog) {
    prog.textContent = '';
    for (const ev of itens) {
      const bloco = criar('div', { class: 'prog-evento' });
      bloco.appendChild(criar('h4', {}, `${ev.titulo}, ${formatarData(ev.inicio)}`));
      const ul = criar('ul');
      for (const p of ev.programacao || []) ul.appendChild(criar('li', {}, `${p.hora}: ${p.texto}`));
      bloco.appendChild(ul);
      prog.appendChild(bloco);
    }
  }

  atualizar(cartoes, itens);
  setInterval(() => atualizar(cartoes, itens), 60000);
}
