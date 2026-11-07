// Busca pura do assistente. Sem DOM e sem fetch. Recebe a pergunta e a base já carregada.
// Nunca inventa fato: só devolve texto que já está nos dados, com a fonte do item.

const PONTUACAO_MINIMA = 1.0;
// Termos genéricos, depois dos sinônimos. Sozinhos não bastam para casar um item.
const GENERICOS = new Set(['data', 'preco', 'local', 'crc', 'crcba', 'jovem', 'ba', 'bahia', 'site']);

// Temas que o site não tem nos dados. Respondem com o link oficial, sem inventar valor.
const TEMAS_OFICIAIS = [
  { teste: /ouvidoria|denunci|reclama|ouvidor/, texto: 'Este site não recebe denúncia nem reclamação. Use o canal oficial de denúncia do CRCBA, ligado na seção Ouvidoria.',
    fonte: { texto: 'CRCBA, denúncia', url: 'https://servicos.crcba.org.br/spw/Sfiv2/Denuncia/Denuncia' } },
  { teste: /transparencia|prestacao de contas|portal da transparencia/, texto: 'As informações de transparência ficam no portal do CRCBA. O endereço está a validar pela comissão.',
    fonte: { texto: 'CRCBA, transparência (a validar)', url: 'https://www.crcba.org.br/transparencia/' } },
  { teste: /anuidade/, texto: 'A anuidade não está nos dados deste site. Veja valores e prazos na página oficial do CRCBA.',
    fonte: { texto: 'CRCBA, anuidade', url: 'https://www.crcba.org.br/anuidade/' } },
  { teste: /certidao/, texto: 'A certidão não está nos dados deste site. Veja como solicitar na página oficial do CRCBA.',
    fonte: { texto: 'CRCBA, certidão negativa', url: 'https://www.crcba.org.br/certidao-negativa/' } },
  { teste: /beneficio|desconto|convenio/, texto: 'Os benefícios não estão nos dados deste site. Veja a lista na página oficial do CRCBA.',
    fonte: { texto: 'CRCBA, benefícios', url: 'https://www.crcba.org.br/beneficios/' } },
  { teste: /consulta cadastral|cadastral|situacao cadastral|consultar (um )?(contador|profissional|registro)/,
    texto: 'A consulta cadastral é feita no serviço oficial do CRCBA, não neste site.',
    fonte: { texto: 'CRCBA, consulta cadastral', url: 'https://servicos.crcba.org.br/spw/Consultacadastral/Principal.aspx' } },
  { teste: /\b(endereco|enderecos|localizacao|onde (fica|e|esta|ficam)|local|chegar|mapa)\b.*\b(sede|crcba|crc)\b|\b(sede|crcba|crc)\b.*\b(endereco|enderecos|localizacao|onde (fica|e|esta)|local|chegar|mapa)\b|\bendereco\b/, exceto: /evento|tardezinha|encontro|subcomissao|exame|prova|horario|hora|funcionamento|atendimento|presidente|telefone/, sede: true,
    texto: 'O endereço da sede está a validar pela comissão. Use o contato oficial para confirmar.' }
];

export function temaOficial(pergunta) {
  const t = semAcento(pergunta).replace(/[^a-z0-9]+/g, ' ');
  return TEMAS_OFICIAIS.find(x => x.teste.test(t) && !(x.exceto && x.exceto.test(t))) || null;
}

const PALAVRAS_VAZIAS = new Set([
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'e', 'ou', 'que', 'qual', 'quais', 'quem', 'como', 'me', 'posso', 'vai', 'ser', 'ter',
  'eu', 'voce', 'voces', 'sao', 'pode', 'podem', 'quanto', 'quantos', 'quantas', 'ha', 'tem', 'existe', 'esta',
  'ao', 'aos', 'pelo', 'pela', 'seu', 'sua', 'meu', 'minha', 'se', 'sobre', 'tirar', 'solicitar', 'fazer', 'faco',
  'quero', 'gostaria', 'saber', 'preciso', 'qua', 'ola', 'oi', 'favor', 'mais', 'muito', 'foi', 'sera', 'minhas'
]);

// Grupos de sinônimos curtos. Cada palavra da pergunta e do texto vira a primeira do grupo.
const GRUPOS = [
  ['inscricao', 'inscrever', 'inscrevo', 'inscrito', 'inscrita', 'matricular'],
  ['data', 'quando', 'dia', 'agenda', 'programacao'],
  ['horario', 'hora'],
  ['prova', 'exame', 'teste'],
  ['preco', 'custa', 'custar', 'valor', 'taxa', 'pagar', 'pagamento', 'pago'],
  ['registro', 'registrar', 'registrado'],
  ['contato', 'whatsapp', 'mail', 'email', 'telefone', 'falar', 'fale', 'atendimento', 'ligar', 'zap', 'celular'],
  ['local', 'onde', 'endereco', 'lugar', 'sede'],
  ['subcomissao', 'cidade', 'regional', 'regiao'],
  ['evento', 'encontro'],
  ['denuncia', 'denunciar', 'reclamar', 'reclamacao']
];
const SINONIMO = new Map();
for (const grupo of GRUPOS) for (const p of grupo) SINONIMO.set(p, grupo[0]);

function semAcento(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function raiz(palavra) {
  let p = palavra;
  if (p.length > 4 && p.endsWith('oes')) p = p.slice(0, -3) + 'ao';
  else if (p.length > 3 && p.endsWith('s')) p = p.slice(0, -1);
  return p;
}

export function normalizar(texto) {
  return semAcento(texto)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(p => p && !PALAVRAS_VAZIAS.has(p))
    .map(raiz)
    .map(p => SINONIMO.get(p) || p);
}

function dataBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
  if (!m) return { dia: '', hora: '' };
  const hora = m[5] === '00' ? `${Number(m[4])}h` : `${Number(m[4])}h${m[5]}`;
  return { dia: `${m[3]}/${m[2]}/${m[1]}`, hora };
}

function item(titulo, corpo, resposta, fonte, tipo = 'geral') {
  return { titulo, corpo, resposta, fonte, tipo };
}

// Monta a base de conhecimento a partir de todos os JSON.
export function montarBase(dados) {
  const base = [];
  const d = dados || {};
  const ev = d.eventos && d.eventos.itens;
  if (Array.isArray(ev)) {
    for (const e of ev) {
      const ini = dataBr(e.inicio);
      const fim = dataBr(e.fim);
      const resposta = `${e.titulo}: ${ini.dia}, das ${ini.hora} às ${fim.hora}, em ${e.cidade}. Local: ${e.local}. Inscrição pelo site oficial do CRCBA.`;
      const prog = (e.programacao || []).map(p => `${p.hora} ${p.texto}`).join(' ');
      base.push(item(`${e.titulo} ${e.cidade} evento`, `${e.local} ${ini.dia} ${prog} inscrição horário`, resposta, e.fonte, 'evento'));
    }
  }
  const ex = d.exame;
  if (ex && Array.isArray(ex.itens)) {
    const lista = ex.itens.map(i => `${i.rotulo}: ${i.valor}`).join('. ');
    const validar = Array.isArray(ex.a_validar) && ex.a_validar.length
      ? ` A validar pela comissão: ${ex.a_validar.join('; ')}.` : '';
    base.push(item(`${ex.titulo} exame prova suficiência`, ex.itens.map(i => `${i.rotulo} ${i.valor}`).join(' ') + ' horário',
      `${ex.titulo}. ${lista}.${validar}`, ex.fonte));
  }
  const faq = d.faq && d.faq.itens;
  if (Array.isArray(faq)) {
    for (const f of faq) base.push(item(f.pergunta, f.resposta, f.resposta, f.fonte));
  }
  const sub = d.subcomissoes;
  if (sub && Array.isArray(sub.itens)) {
    for (const s of sub.itens) {
      base.push(item(`Subcomissão ${s.nome}`, `${s.nome} cidade Bahia contato ${s.contato}`,
        `O CRC Jovem BA tem subcomissão em ${s.nome}. Contato da subcomissão: ${s.contato}.`, s.fonte));
    }
    for (const a of sub.acoes || []) {
      base.push(item(`Ações em ${a.nome}`, `${a.texto} ${a.nome}`, `${a.nome}: ${a.texto}`, a.fonte));
    }
  }
  const tr = d.trilha && d.trilha.itens;
  if (Array.isArray(tr)) {
    for (const t of tr) {
      base.push(item(`Trilha passo ${t.id}`, t.texto,
        `Passo ${t.id} da trilha do estudante: ${t.texto}. Passo em rascunho, a validar pela comissão.`, t.fonte));
    }
  }
  const nt = d.noticias && d.noticias.itens;
  if (Array.isArray(nt)) {
    for (const n of nt) base.push(item(`${n.titulo} notícia`, n.resumo, `${n.titulo}. ${n.resumo}`, n.fonte));
  }
  const c = d.contato;
  if (c) {
    base.push(item('Contato oficial atendimento whatsapp e-mail telefone', `${c.whatsapp} ${c.email} falar com o CRCBA`,
      `Contato oficial: WhatsApp ${c.whatsapp} ou e-mail ${c.email}.`, c.fonte, 'contato'));
  }
  return base.filter(i => i.fonte && i.fonte.url);
}

// Índice BM25. O título conta em dobro.
export function indexar(base) {
  const docs = base.map(i => {
    const termos = [...normalizar(i.titulo), ...normalizar(i.titulo), ...normalizar(i.corpo)];
    const freq = new Map();
    for (const t of termos) freq.set(t, (freq.get(t) || 0) + 1);
    return { item: i, freq, tam: termos.length };
  });
  const n = docs.length || 1;
  const media = docs.reduce((s, x) => s + x.tam, 0) / n || 1;
  const df = new Map();
  for (const x of docs) for (const t of x.freq.keys()) df.set(t, (df.get(t) || 0) + 1);
  return { docs, n, media, df };
}

// Regra de cobertura: todos os termos específicos da pergunta precisam estar no item
// (sinônimos valem). Com 3 ou mais, aceita faltar um, nunca menos de 2 casados.
function coberturaOk(casados, total) {
  if (total <= 2) return casados === total;
  return casados >= Math.max(2, total - 1);
}

// Devolve o melhor item ou null quando nada passa da cobertura e da pontuação mínima.
export function buscar(indice, pergunta, filtro) {
  const termos = [...new Set(normalizar(pergunta))];
  if (!termos.length) return null;
  const k1 = 1.2;
  const b = 0.75;
  const especificos = termos.filter(t => !GENERICOS.has(t));
  let melhor = null;
  for (const doc of indice.docs) {
    if (filtro && !filtro(doc.item)) continue;
    let pontos = 0;
    let acertos = 0;
    for (const t of termos) {
      const tf = doc.freq.get(t);
      if (!tf) continue;
      acertos++;
      const nt = indice.df.get(t) || 0;
      const idf = Math.log(1 + (indice.n - nt + 0.5) / (nt + 0.5));
      pontos += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc.tam / indice.media));
    }
    if (especificos.length) {
      const casados = especificos.filter(t => doc.freq.get(t)).length;
      if (!coberturaOk(casados, especificos.length)) continue;
    } else if (acertos / termos.length < 1) continue;
    if (pontos < PONTUACAO_MINIMA) continue;
    if (!melhor || pontos > melhor.pontos) melhor = { item: doc.item, pontos };
  }
  return melhor ? melhor.item : null;
}

// Pergunta de lista ("quais cidades têm subcomissão?") sem cidade citada lista todas.
export function listaSubcomissoes(dados, pergunta) {
  const itens = dados && dados.subcomissoes && dados.subcomissoes.itens;
  if (!Array.isArray(itens) || !itens.length) return null;
  const t = semAcento(pergunta).replace(/[^a-z0-9]+/g, ' ');
  if (!/subcomiss|cidades|regionais|onde (o crc|tem|existe|atua)/.test(t)) return null;
  if (itens.some(i => t.includes(semAcento(i.nome)))) return null;
  const fonte = itens[0].fonte;
  if (!fonte || !fonte.url) return null;
  const nomes = itens.map(i => i.nome);
  return { texto: `O CRC Jovem BA tem ${nomes.length} subcomissões: ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}.`, fonte };
}


function limpar(pergunta) {
  return semAcento(pergunta).replace(/[^a-z0-9]+/g, ' ').trim();
}

// Pedido de um dado de contato (site, link, instagram, e-mail, telefone) sobre um assunto.
// O item precisa trazer esse tipo de dado. Sem item assim, devolve { semDado: true }.
const PEDE_CONTATO = /\b(sites?|links?|instagram|insta|perfil|e ?mails?|telefones?|whatsapp|zap|celular)\b/;
const TERMOS_CONTATO = new Set(['site', 'link', 'instagram', 'insta', 'perfil', 'contato', 'pagina', 'oficial', 'numero']);

// E-mail, telefone e WhatsApp só vêm do item de contato. Site e link também valem num item
// que traga o endereço no texto, desde que o assunto esteja no título dele.
const SO_CONTATO = /\b(e ?mails?|telefones?|whatsapp|zap|celular|instagram|insta|perfil)\b/;
function itemTemDado(i, assunto, texto) {
  if (i.tipo === 'contato') return true;
  if (SO_CONTATO.test(texto)) return false;
  if (!/crcba\.org\.br|https?:/.test(i.resposta || '')) return false;
  const titulo = new Set(normalizar(i.titulo));
  return assunto.every(a => titulo.has(a));
}

export function pedidoDeContato(indice, pergunta) {
  const t = limpar(pergunta);
  if (!PEDE_CONTATO.test(t)) return null;
  const assunto = [...new Set(normalizar(pergunta))].filter(x => !TERMOS_CONTATO.has(x) && !GENERICOS.has(x));
  if (!assunto.length) return null;
  const achado = buscar(indice, assunto.join(' '), i => itemTemDado(i, assunto, t));
  return { semDado: !achado, item: achado };
}

// Preço, valor ou taxa de evento. O site não tem esse dado.
export function pedidoValorEvento(pergunta) {
  const t = limpar(pergunta);
  if (!/\b(preco|precos|valor|valores|custa|custo|custos|taxa|taxas|ingresso|ingressos|pagar|pago|gratis|gratuito|gratuita)\b/.test(t)) return false;
  if (!/\b(tardezinha|evento|eventos|encontro|encontros)\b/.test(t)) return false;
  return !/\b(exame|prova|suficiencia)\b/.test(t);
}

const TEXTO_VALOR_EVENTO = 'O valor da inscrição nos eventos não está nos dados oficiais deste site. A inscrição é feita em crcba.org.br/eventos.';

const NAO_CIDADE = new Set(['breve', 'geral', 'novembro', 'dezembro', 'outubro', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'sabado', 'domingo', 'semana', 'ano', 'mes', 'dia', 'hoje', 'amanha', 'bahia', 'breve', 'baixo']);

// Pergunta de evento em cidade que não tem evento nos dados.
export function eventoEmOutraCidade(dados, pergunta) {
  const eventos = dados && dados.eventos && dados.eventos.itens;
  if (!Array.isArray(eventos) || !eventos.length) return null;
  const t = limpar(pergunta);
  if (!/\b(evento|eventos|tardezinha|encontro|encontros)\b/.test(t) || /\b(exame|prova)\b/.test(t)) return null;
  const m = /\b(?:em|na cidade de)\s+(.+?)\s*\??\s*$/i.exec(String(pergunta));
  if (!m) return null;
  const lugar = m[1].trim().replace(/[?!.]+$/, '');
  const lugarT = limpar(lugar);
  const palavras = lugarT.split(' ').filter(p => p && !PALAVRAS_VAZIAS.has(p));
  if (!palavras.length || palavras.some(p => NAO_CIDADE.has(p) || /^\d/.test(p))) return null;
  if (eventos.some(e => lugarT.includes(limpar(e.cidade)) || limpar(e.id).split(' ').pop().length > 4 && lugarT.includes(limpar(e.id).split(' ').pop()))) return null;
  const fonte = eventos[0].fonte;
  if (!fonte || !fonte.url) return null;
  const lista = eventos.map(e => {
    const ini = dataBr(e.inicio);
    return `${e.titulo}, ${ini.dia}, em ${e.cidade}`;
  }).join('; ');
  return { texto: `Não há evento em ${lugar} nos dados deste site. Os eventos que existem: ${lista}.`, fonte };
}

// "Qual o horário da Tardezinha?" sem cidade lista todas as Tardezinhas.
export function listaTardezinhas(dados, pergunta) {
  const eventos = ((dados && dados.eventos && dados.eventos.itens) || []).filter(e => /tardezinha/i.test(e.titulo));
  if (eventos.length < 2) return null;
  const t = limpar(pergunta);
  if (!/\btardezinhas?\b/.test(t)) return null;
  if (PEDE_CONTATO.test(t)) return null;
  if (eventos.some(e => t.includes(limpar(e.cidade)) || limpar(e.id).split(' ').pop().length > 4 && t.includes(limpar(e.id).split(' ').pop()))) return null;
  const resto = normalizar(pergunta).filter(x => !['tardezinha', 'contabil', 'data', 'horario', 'local', 'evento', 'inscricao'].includes(x) && !GENERICOS.has(x));
  if (resto.length) return null;
  const fonte = eventos[0].fonte;
  if (!fonte || !fonte.url) return null;
  const partes = eventos.map(e => {
    const ini = dataBr(e.inicio);
    const fim = dataBr(e.fim);
    return `${e.titulo}: ${ini.dia}, das ${ini.hora} às ${fim.hora}, em ${e.cidade}. Local: ${e.local}.`;
  });
  return { texto: `Há ${eventos.length} Tardezinhas. ${partes.join(' ')} Inscrição pelo site oficial do CRCBA.`, fonte };
}

// Trilha do estudante: pergunta sobre a trilha ou sobre solicitar o registro lista os passos.
const PEDE_TRILHA = /\btrilha\b|\b(solicito|solicitar|solicita|faco|fazer|peco|pedir|tirar|tiro|obter|obtenho)\b( o| meu| um)? registro\b|\bregistro (no|do|de) (crcba|crc|conselho)\b/;
export function respostaTrilha(dados, pergunta) {
  const itens = dados && dados.trilha && dados.trilha.itens;
  if (!Array.isArray(itens) || !itens.length) return null;
  if (!PEDE_TRILHA.test(limpar(pergunta))) return null;
  const passos = itens.map(i => `${i.id}. ${i.texto}`).join('; ');
  const fonte = itens[itens.length - 1].fonte || itens[0].fonte;
  if (!fonte || !fonte.url) return null;
  return { texto: `A trilha do estudante tem ${itens.length} passos: ${passos}. Passos em rascunho, a validar pela comissão.`, fonte };
}

// Ponto de entrada. Recebe a pergunta e a base (objeto dados), devolve o item escolhido ou null.
// Devolve { tipo, texto, fonte, sede? } com tipo lista, tema ou busca.
export function escolherResposta(pergunta, dados, indice) {
  const lista = listaSubcomissoes(dados, pergunta);
  if (lista) return { tipo: 'lista', texto: lista.texto, fonte: lista.fonte };
  const tema = temaOficial(pergunta);
  if (tema) return { tipo: 'tema', texto: tema.texto, fonte: tema.fonte, sede: !!tema.sede };
  const trilha = respostaTrilha(dados, pergunta);
  if (trilha) return { tipo: 'trilha', texto: trilha.texto, fonte: trilha.fonte };
  if (pedidoValorEvento(pergunta)) {
    return { tipo: 'valor-evento', texto: TEXTO_VALOR_EVENTO, fonte: { texto: 'CRCBA, eventos', url: 'https://www.crcba.org.br/eventos/' }, sede: true };
  }
  const fora = eventoEmOutraCidade(dados, pergunta);
  if (fora) return { tipo: 'evento-sem-cidade', texto: fora.texto, fonte: fora.fonte };
  const tarde = listaTardezinhas(dados, pergunta);
  if (tarde) return { tipo: 'lista-eventos', texto: tarde.texto, fonte: tarde.fonte };
  const idx = indice || indexar(montarBase(dados));
  const contatoPedido = pedidoDeContato(idx, pergunta);
  if (contatoPedido) {
    return contatoPedido.item ? { tipo: 'busca', texto: contatoPedido.item.resposta, fonte: contatoPedido.item.fonte } : null;
  }
  const achado = buscar(idx, pergunta);
  return achado ? { tipo: 'busca', texto: achado.resposta, fonte: achado.fonte } : null;
}
