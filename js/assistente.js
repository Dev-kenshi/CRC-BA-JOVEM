// Assistente sem IA paga. A busca fica em busca.js. Aqui só entram DOM e eventos.
import { indisponivel } from './dados.js';
import { montarBase, indexar, escolherResposta } from './busca.js';

const LIMITE_HISTORICO = 10;
const TEXTO_NAO_SEI = 'Não sei responder isso com os dados oficiais.';
const TEXTO_VAZIO = 'Digite uma pergunta.';

function linhaFonte(fonte, rotulo) {
  const p = document.createElement('p');
  p.className = 'fonte';
  p.setAttribute('data-resposta-fonte', '');
  p.append(`${rotulo}: `);
  const a = document.createElement('a');
  a.href = fonte.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = fonte.texto;
  p.appendChild(a);
  return p;
}

function blocoContato(contato, abertura = 'Fale com o atendimento oficial: ') {
  const p = document.createElement('p');
  p.setAttribute('data-resposta-contato', '');
  p.append(abertura);
  const w = document.createElement('a');
  w.href = contato.whatsapp_url;
  w.target = '_blank';
  w.rel = 'noopener';
  w.textContent = `WhatsApp ${contato.whatsapp}`;
  const m = document.createElement('a');
  m.href = `mailto:${contato.email}`;
  m.textContent = contato.email;
  p.append(w, ' ou ', m, '.');
  return p;
}

function montarResposta(pergunta, escolha, contato) {
  const art = document.createElement('article');
  art.className = 'resposta';
  art.setAttribute('data-resposta', '');
  const q = document.createElement('p');
  q.className = 'pergunta';
  q.textContent = `Você perguntou: ${pergunta}`;
  const r = document.createElement('p');
  r.className = 'texto';
  if (escolha && escolha.sede) {
    r.textContent = escolha.texto;
    art.append(q, r, blocoContato(contato), linhaFonte(contato.fonte, 'Fonte do contato'));
  } else if (escolha) {
    r.textContent = escolha.texto;
    art.append(q, r, linhaFonte(escolha.fonte, 'Fonte'));
  } else {
    r.textContent = TEXTO_NAO_SEI;
    art.append(q, r, blocoContato(contato, 'Fale com o atendimento oficial: '), linhaFonte(contato.fonte, 'Fonte do contato'));
  }
  return art;
}

// Recebe os dados ou uma promessa deles. O formulário liga na hora e espera os dados ao enviar.
export async function iniciar(entrada) {
  const form = document.querySelector('[data-assistente-form]');
  const campo = document.querySelector('#assistente-pergunta');
  const erro = document.querySelector('[data-assistente-erro]');
  const lista = document.querySelector('[data-lista="respostas"]');
  if (!form || !campo || !lista) return;
  const pronto = Promise.resolve(entrada).catch(() => null);
  let estado = null; // { dados, indice, contato } ou 'falhou'

  pronto.then(dados => {
    const base = montarBase(dados);
    if (!base.length || !dados || !dados.contato) { estado = 'falhou'; indisponivel(lista); }
    else estado = { dados, indice: indexar(base), contato: dados.contato };
  });

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const pergunta = campo.value.trim();
    if (!pergunta) {
      if (erro) erro.textContent = TEXTO_VAZIO;
      campo.focus();
      return;
    }
    if (erro) erro.textContent = '';
    campo.value = '';
    campo.focus();
    let espera = null;
    if (!estado) {
      espera = document.createElement('article');
      espera.className = 'resposta';
      espera.setAttribute('data-resposta-carregando', '');
      espera.textContent = 'Carregando...';
      lista.prepend(espera);
      await pronto;
      await Promise.resolve();
    }
    if (estado === 'falhou' || !estado) {
      if (espera) espera.remove();
      indisponivel(lista);
      return;
    }
    const art = montarResposta(pergunta, escolherResposta(pergunta, estado.dados, estado.indice), estado.contato);
    if (espera) espera.replaceWith(art);
    else lista.prepend(art);
    while (lista.children.length > LIMITE_HISTORICO) lista.lastElementChild.remove();
  });
}
