// Ponto de entrada. Carrega os JSON uma vez e chama iniciar() de cada módulo.
import { carregar } from './dados.js';
import * as base from './base.js';
import * as terra from './terra.js';
import * as eventos from './eventos.js';
import * as exame from './exame.js';
import * as noticias from './noticias.js';
import * as inscricao from './inscricao.js';
import * as cartao from './cartao.js';
import * as assistente from './assistente.js';
import * as trilha from './trilha.js';
import * as faq from './faq.js';
import * as privacidade from './privacidade.js';

const NOMES = ['eventos', 'noticias', 'subcomissoes', 'faq', 'exame', 'trilha', 'frases', 'filtro', 'contato'];
// terra por último: o início dela (WebGL) é pesado e não deve atrasar os textos.
const MODULOS = { base, eventos, exame, noticias, inscricao, cartao, assistente, trilha, faq, privacidade, terra };

// Módulos que ligam os botões na hora e esperam os dados por conta própria (recebem a promessa).
const IMEDIATOS = new Set(['base', 'inscricao', 'cartao', 'assistente', 'trilha', 'privacidade']);

async function executar(nome, modulo, entrada) {
  try {
    await modulo.iniciar(entrada);
  } catch (erro) {
    console.warn(`Módulo ${nome} falhou: ${erro.message}`);
  }
}

async function principal() {
  const promessa = Promise.all(NOMES.map(n => carregar(n)))
    .then(lista => Object.fromEntries(NOMES.map((n, i) => [n, lista[i]])));
  // Copiar link, QR, cartão, assistente, trilha e privacidade ligam agora, sem esperar os JSON.
  // Os outros módulos começam quando os dados chegam. Um erro ou espera num deles não segura os outros.
  await Promise.allSettled(Object.entries(MODULOS).map(([nome, modulo]) => (
    IMEDIATOS.has(nome)
      ? executar(nome, modulo, promessa)
      : promessa.then(dados => executar(nome, modulo, dados))
  )));
}

principal().catch(erro => console.warn(`Início falhou: ${erro.message}`));
