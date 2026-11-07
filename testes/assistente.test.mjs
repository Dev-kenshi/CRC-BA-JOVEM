// Testes da busca do assistente e do filtro de nomes. Usam os JSON reais de dados/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escolherResposta, indexar, montarBase } from '../js/busca.js';
import { temPalavrao } from '../js/cartao.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dados = {};
for (const f of readdirSync(join(raiz, 'dados'))) {
  if (f.endsWith('.json')) dados[f.replace('.json', '')] = JSON.parse(readFileSync(join(raiz, 'dados', f), 'utf8'));
}
const indice = indexar(montarBase(dados));
const responder = p => escolherResposta(p, dados, indice);

const semValor = r => /não está nos dados oficiais/.test(r.texto) && /crcba\.org\.br\/eventos/.test(r.texto) && r.sede === true && !/\d{2}\/\d{2}\/\d{4}/.test(r.texto);
const semEventoNaCidade = r => /Não há evento em/.test(r.texto) && /Salvador/.test(r.texto) && /Vitória da Conquista/.test(r.texto) && !/subcomiss/i.test(r.texto);

const FORA = [
  'Qual o horário de atendimento?',
  'Quem é o presidente da comissão?',
  'Como funciona o cartão?',
  'Quantos seguidores o CRC Jovem tem?',
  'Qual a previsão do tempo para Salvador?',
  'Quem faz o site?',
  'Me passa uma receita de bolo',
  'Qual o telefone do presidente?',
  'Qual o horário de funcionamento da sede?',
  'Quem é o presidente do CRCBA?',
  'Qual o site do CFC Jovem?',
  'Qual o site do CFC?',
  'Qual o link do CFC?',
  'Qual o instagram do CFC?',
  'Qual o telefone do Exame?',
  'Qual o e-mail do SENAC?',
  'Qual a senha do wifi da sede?',
  'senha do wifi da sede'
];
for (const p of FORA) {
  test(`fora da base: ${p}`, () => assert.equal(responder(p), null));
}

const CERTAS = [
  ['Como falo com a ouvidoria?', r => /denúncia/.test(r.texto) && /Denuncia/.test(r.fonte.url)],
  ['Quero fazer uma denúncia', r => /Denuncia/.test(r.fonte.url)],
  ['Onde fica a transparência do CRCBA?', r => /transparencia/.test(r.fonte.url) && /validar/.test(r.texto)],
  ['Tem portal da transparência?', r => /transparencia/.test(r.fonte.url)],
  ['Como pago a anuidade?', r => r.fonte.url.includes('crcba.org.br/anuidade')],
  ['Qual o endereço da sede?', r => r.sede === true && /a validar/.test(r.texto)],
  ['Qual a taxa do Exame de Suficiência?', r => r.texto.includes('199')],
  ['Quando é a prova do Exame?', r => r.texto.includes('13/12/2026')],
  ['Quando é a Tardezinha em Salvador?', r => r.texto.includes('07/11/2026') && /Salvador/.test(r.texto)],
  ['Quando é a Tardezinha no Sudoeste?', r => r.texto.includes('14/11/2026')],
  ['Qual o WhatsApp do CRCBA?', r => r.texto.includes('(71) 2109-4000')],
  ['Qual o e-mail de contato?', r => r.texto.includes('atendimento@crc-ba.org.br')],
  ['Como faço uma denúncia?', r => /den[uú]ncia/i.test(r.texto)],
  ['Quais cidades têm subcomissão?', r => r.tipo === 'lista' && /9 subcomiss/.test(r.texto)],
  ['Tem subcomissão em Itabuna?', r => /Itabuna/.test(r.texto) && !/Salvador/.test(r.texto)],
  ['Como faço a inscrição?', r => /crcba\.org\.br\/eventos/.test(r.texto)],
  ['Como faço o registro na trilha do estudante?', r => /trilha|registro/i.test(r.texto)],
  ['Como tirar a certidão?', r => r.fonte.url.includes('certidao')],
  ['Quais os benefícios para o contador?', r => r.fonte.url.includes('beneficios')],
  ['Como faço a consulta cadastral?', r => r.fonte.url.includes('Consultacadastral')],
  ['Quanto custa o Exame?', r => r.texto.includes('199')],
  ['Qual a taxa do Exame?', r => r.texto.includes('199')],
  ['Quanto custa a inscrição na Tardezinha?', semValor],
  ['Qual o valor da inscrição na Tardezinha?', semValor],
  ['Qual o preço da Tardezinha de Vitória da Conquista?', semValor],
  ['Qual o preço da Tardezinha?', semValor],
  ['Quanto custa o evento?', semValor],
  ['Tem taxa para o evento?', semValor],
  ['Tem evento em Feira de Santana?', semEventoNaCidade],
  ['Tem evento em Itabuna?', semEventoNaCidade],
  ['Qual o horário da Tardezinha?', r => /Salvador/.test(r.texto) && /Vitória da Conquista/.test(r.texto) && /Tardezinhas/.test(r.texto)],
  ['Como funciona a trilha?', r => r.tipo === 'trilha' && /5 passos/.test(r.texto) && /a validar/.test(r.texto) && /crcba\.org\.br/.test(r.fonte.url)],
  ['Como solicito o registro?', r => r.tipo === 'trilha' && /Solicitar o registro/.test(r.texto) && /a validar/.test(r.texto) && !!r.fonte.url],
  ['Qual o contato de Itabuna?', r => /Itabuna/.test(r.texto) && !/Salvador/.test(r.texto)]
];
for (const [p, ok] of CERTAS) {
  test(`acerta: ${p}`, () => {
    const r = responder(p);
    assert.ok(r, 'devia responder');
    assert.ok((r.fonte && r.fonte.url) || r.sede, 'devia trazer fonte ou o contato oficial');
    assert.ok(ok(r), `resposta inesperada: ${r.texto}`);
  });
}

test('lista das 9 subcomissões tem 9 nomes', () => {
  assert.equal(dados.subcomissoes.itens.length, 9);
});

const PERMITIDOS = ['Ana Cunha', 'Cássia', 'Computador', 'Disputa', 'Caralina', 'Bruna Rabelo', 'Pietra', 'Cuiabá', 'Curitiba', 'Marcos', 'Débora', 'Paulo Cunha', 'Escuta', 'Reputação', 'Deputada', 'Ana-Paula', 'Dr.Silva', 'J. Souza', 'Maria Clara!', 'Bia*', 'Ana 2', 'Turma 3B', 'Joao 10'];
for (const n of PERMITIDOS) {
  test(`filtro aceita: ${n}`, () => assert.equal(temPalavrao(n, dados.filtro.palavras), false));
}
const RECUSADOS = ['b*ceta', 'B u c e t a', 'Buceeeta', 'Vai tomar no cu', 'tomar no c u', 'Ana Putaria', 'Puta', 'putinha', 'Maria Puta', 'Joao Merda', 'p0rra', 'Fdp', 'Boceta', 'b*ceta', 'bu*eta', 'b**eta', 'c*ralho', 'm*rda', 'p*rra', 'vai tomar no cu', 'VAI TOMAR NO CÚ', 'v a i t o m a r n o c u', 'b3ceta', 'buc3ta', 'b3c3ta', 'p0rra', 'B3CETA', 'm3rda', 'b3ceta de ouro', 'Joao b3ceta', 'meu b3ceta', 'b3cetas', 'Ana B3ceta'];
for (const n of RECUSADOS) {
  test(`filtro recusa: ${n}`, () => assert.equal(temPalavrao(n, dados.filtro.palavras), true));
}
