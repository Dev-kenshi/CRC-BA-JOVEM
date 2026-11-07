// Trilha do estudante: checklist de trilha.json, salvo em localStorage (crcjovem.trilha).
import { indisponivel } from './dados.js';

const CHAVE = 'crcjovem.trilha';

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch (e) {
    return [];
  }
}

function gravar(ids) {
  try {
    if (ids.length) localStorage.setItem(CHAVE, JSON.stringify(ids));
    else localStorage.removeItem(CHAVE);
    return true;
  } catch (e) {
    return false;
  }
}

// Recebe os dados ou uma promessa deles. Os botões ligam na hora; a lista aparece quando os dados chegam.
export async function iniciar(entrada) {
  const alvo = document.querySelector('[data-lista="trilha"]');
  if (!alvo) return;
  const progresso = document.querySelector('[data-trilha-progresso]');
  const salvo = document.querySelector('[data-trilha-salvo]');
  const limpar = document.querySelector('[data-trilha-limpar]');
  const marcados = new Set(ler());
  const caixas = [];
  let pronto = false;

  function atualizar() {
    const k = caixas.filter(c => c.checked).length;
    if (progresso) progresso.textContent = `${k} de ${caixas.length}`;
  }

  function avisar(ok) {
    if (!salvo) return;
    salvo.textContent = ok ? 'Salvo neste navegador' : 'Não foi possível salvar neste navegador';
    salvo.hidden = false;
  }

  function persistir() {
    const ids = caixas.filter(c => c.checked).map(c => Number(c.getAttribute('data-trilha-item')));
    avisar(gravar(ids));
  }

  alvo.addEventListener('change', () => {
    atualizar();
    persistir();
  });
  if (limpar) {
    limpar.addEventListener('click', () => {
      marcados.clear();
      for (const c of caixas) c.checked = false;
      gravar([]);
      if (pronto) atualizar();
      if (salvo) salvo.hidden = true;
    });
  }

  alvo.textContent = 'Carregando...';
  let dados = null;
  try { dados = await entrada; } catch (e) { dados = null; }
  const itens = dados && dados.trilha && dados.trilha.itens;
  if (!Array.isArray(itens) || !itens.length) {
    indisponivel(alvo);
    return;
  }
  alvo.textContent = '';
  for (const t of itens) {
    const li = document.createElement('li');
    const cx = document.createElement('input');
    cx.type = 'checkbox';
    cx.id = `trilha-item-${t.id}`;
    cx.setAttribute('data-trilha-item', String(t.id));
    cx.checked = marcados.has(Number(t.id));
    const rot = document.createElement('label');
    rot.htmlFor = cx.id;
    rot.textContent = t.texto;
    li.append(cx, rot);
    alvo.appendChild(li);
    caixas.push(cx);
  }
  pronto = true;
  atualizar();
}
