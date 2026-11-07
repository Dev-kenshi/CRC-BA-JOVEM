// Gerador de cartão: nome, frase, foto, formatos, PNG, compartilhar e vídeo. Tudo no navegador.
import { gerarVideo, videoSuportado } from './video.js';

const MAX_NOME = 24;
const MAX_FRASE = 80;
const MSG_NOME = 'O nome tem palavras não permitidas. Use outro nome.';
const FRASE_PADRAO = 'Jovem liderança contábil da Bahia.';
const FORMATOS = { feed: [1080, 1350], stories: [1080, 1920] };

// Normaliza: sem acento, minúsculas.
function normalizar(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function reduzirRepeticao(palavra) {
  return palavra.replace(/(.)\1+/g, '$1');
}
const TROCAS = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
// Símbolo dentro da palavra vale como letra coringa: "b*ceta", "c*ralho", "p**ra".
// Só vale com 3 letras ou mais e pelo menos 2 letras escritas, para não pegar nomes comuns.
function coringa(texto, proibidas) {
  for (const bruto of texto.split(/\s+/)) {
    const token = bruto.replace(/[?!_.]+$/, '');
    if (!/[a-z][*#%&?!_.]+[a-z]|[a-z]{2,}[*#%&]+$/.test(token)) continue;
    const letras = token.replace(/[^a-z]/g, '');
    if (letras.length < 2) continue;
    const padrao = token.replace(/[^a-z*#%&?!_.]/g, '').replace(/[*#%&?!_.]+/g, m => `.{1,${m.length + 1}}`);
    const re = new RegExp(`^${padrao}$`);
    for (const p of proibidas) if (p.length >= 4 && re.test(p)) return true;
  }
  return false;
}
// Pega variações: troca de número e símbolo por letra, letras repetidas, letras
// separadas por espaço ou símbolo e palavra partida em dois pedaços.
export function temPalavrao(texto, lista) {
  const proibidas = new Set();
  for (const p of lista || []) {
    const n = normalizar(p).replace(/[^a-z0-9]/g, '');
    if (n) { proibidas.add(n); proibidas.add(reduzirRepeticao(n)); }
  }
  // Número no lugar da vogal: "b3ceta", "buc3ta". O dígito vale qualquer vogal.
  for (const bruto of normalizar(texto).split(/[^a-z0-9*]+/)) {
    if (!/\d/.test(bruto) || !/[a-z]/.test(bruto) || /\d{2,}/.test(bruto)) continue;
    const re = new RegExp(`^${bruto.replace(/\d/g, '[aeiou]').replace(/s$/, 's?')}$`);
    for (const p of proibidas) if (p.length >= 4 && re.test(p)) return true;
  }
  const casa = w => w && (proibidas.has(w) || proibidas.has(reduzirRepeticao(w)));
  const trocado = normalizar(texto).replace(/[0134578@$]/g, c => TROCAS[c] || c);
  if (coringa(trocado, proibidas)) return true;
  const palavras = trocado.split(/[^a-z]+/).filter(Boolean);
  // Junta sequências de letras isoladas.
  const unidos = [];
  let corrida = '';
  for (const w of palavras) {
    if (w.length === 1) { corrida += w; continue; }
    if (corrida) { unidos.push(corrida); corrida = ''; }
    unidos.push(w);
  }
  if (corrida) unidos.push(corrida);
  if (unidos.some(casa)) return true;
  // Corrida longa de letras isoladas dentro de uma frase: procura a palavra dentro dela.
  for (const u of unidos) {
    if (u.length >= 4) for (const p of proibidas) if (p.length >= 4 && reduzirRepeticao(u).includes(reduzirRepeticao(p)) && palavras.some(w => w.length === 1)) return true;
  }
  // Palavra partida em dois pedaços.
  for (let i = 0; i + 1 < palavras.length; i++) {
    if (casa(palavras[i] + palavras[i + 1])) return true;
  }
  for (let i = 0; i + 1 < unidos.length; i++) {
    if (casa(unidos[i] + unidos[i + 1])) return true;
  }
  return false;
}

// Textura do topo recortada: o anel dourado fica atrás da foto.
function textura(ctx, w, h, img) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const ih = img.naturalHeight;
  const cw = Math.min(img.naturalWidth, ih * (w / h));
  const sx = Math.max(0, Math.min(img.naturalWidth - cw, img.naturalWidth * 0.78 - cw / 2));
  ctx.drawImage(img, sx, 0, cw, ih, 0, 0, w, h);
}

function quebrar(ctx, texto, largura) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else { linhas.push(atual); atual = palavra; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Desenha o cartão inteiro em ctx com tamanho w x h.
function desenhar(ctx, w, h, est) {
  const fundo = ctx.createLinearGradient(0, 0, 0, h);
  fundo.addColorStop(0, '#066aab');
  fundo.addColorStop(1, '#154377');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, w, h);
  textura(ctx, w, h, est.fundo);
  // Véu azul no rodapé: garante a leitura do nome e da frase.
  const veu = ctx.createLinearGradient(0, h * 0.35, 0, h);
  veu.addColorStop(0, 'rgba(21,67,119,0)');
  veu.addColorStop(1, 'rgba(20,61,107,.8)');
  ctx.fillStyle = veu;
  ctx.fillRect(0, h * 0.35, w, h * 0.65);
  // Moldura dourada fina.
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#b39539';
  ctx.strokeRect(24, 24, w - 48, h - 48);

  const margem = 80;
  const topo = h > 1500 ? 200 : 90;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (est.logo && est.logo.complete && est.logo.naturalWidth) ctx.drawImage(est.logo, w / 2 - 75, topo, 150, 150);
  let y = topo + 150 + 90;

  ctx.fillStyle = '#b39539';
  ctx.fillRect(w / 2 - 90, y - 50, 180, 4);

  // Foto circular.
  const raio = h > 1500 ? 230 : 190;
  if (est.foto) {
    const cy = y + raio + 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, cy, raio, 0, Math.PI * 2);
    ctx.clip();
    const lado = Math.min(est.foto.naturalWidth, est.foto.naturalHeight);
    const sx = (est.foto.naturalWidth - lado) / 2;
    const sy = (est.foto.naturalHeight - lado) / 2;
    ctx.drawImage(est.foto, sx, sy, lado, lado, w / 2 - raio, cy - raio, raio * 2, raio * 2);
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#b39539';
    ctx.beginPath();
    ctx.arc(w / 2, cy, raio, 0, Math.PI * 2);
    ctx.stroke();
    y = cy + raio + 110;
  } else {
    y += 90;
  }

  // Nome.
  const nome = est.nome || 'Seu nome';
  let tam = 110;
  ctx.font = `700 ${tam}px sans-serif`;
  while (ctx.measureText(nome).width > w - margem * 2 && tam > 40) {
    tam -= 4;
    ctx.font = `700 ${tam}px sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  if (!est.nome) ctx.font = `italic 700 ${tam}px sans-serif`;
  ctx.fillText(nome, w / 2, y);
  y += 80;

  // Frase.
  ctx.font = '400 52px sans-serif';
  ctx.fillStyle = '#ffffff';
  for (const linha of quebrar(ctx, est.frase, w - margem * 2).slice(0, 5)) {
    ctx.fillText(linha, w / 2, y);
    y += 68;
  }

  // Assinatura e selo.
  ctx.font = '700 60px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CRC Jovem BA', w / 2, h - 110);
  ctx.fillStyle = '#b39539';
  ctx.fillRect(w / 2 - 90, h - 90, 180, 4);

  ctx.font = '700 28px sans-serif';
  const txt = 'proposta';
  const lw = ctx.measureText(txt).width + 36;
  ctx.fillStyle = 'rgba(179,149,57,.95)';
  ctx.beginPath();
  ctx.roundRect(w - lw - 40, 40, lw, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#0a1a30';
  ctx.fillText(txt, w - lw / 2 - 40, 74);
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Recebe os dados ou uma promessa deles. Os botões ligam na hora; o que usa dados espera.
export async function iniciar(entrada) {
  const pronto = Promise.resolve(entrada);
  let dados = null;
  let carregado = false;
  const $ = s => document.querySelector(s);
  const canvas = $('canvas[data-cartao-canvas]');
  const campoNome = $('#cartao-nome');
  if (!canvas || !campoNome) return;
  const contador = $('[data-cartao-contador]');
  const previaNome = $('[data-cartao-previa-nome]');
  const erro = $('[data-cartao-erro]');
  const statusVideo = $('[data-video-status]');
  const campoFrase = $('#cartao-frase-propria');
  let palavroes = [];
  let frases = [];
  const botoesFormato = [...document.querySelectorAll('button[data-formato]')];
  const logo = new Image();
  const fundo = new Image();
  const estado = { nome: '', frase: FRASE_PADRAO, foto: null, logo, fundo, formato: 'feed' };

  const aviso = document.createElement('p');
  aviso.className = 'status';
  aviso.setAttribute('data-cartao-aviso', '');
  aviso.setAttribute('aria-live', 'polite');
  if (statusVideo) statusVideo.insertAdjacentElement('afterend', aviso);

  let versao = 0;
  let cache = { versao: -1, blob: null };
  const redesenhar = () => {
    versao++;
    const ctx = canvas.getContext('2d');
    desenhar(ctx, canvas.width, canvas.height, estado);
    if (previaNome) previaNome.textContent = estado.nome || 'seu nome aqui';
  };
  const mostrarErro = msg => { if (erro) erro.textContent = msg; };

  logo.onload = redesenhar;
  fundo.onload = redesenhar;
  fundo.src = 'assets/texturas/topo-fullhd.webp';
  logo.src = 'assets/logo-crc-jovem.png';

  // Nome.
  const aplicarNome = () => {
    if (campoNome.value.length > MAX_NOME) campoNome.value = campoNome.value.slice(0, MAX_NOME);
    estado.nome = campoNome.value.trim();
    // Sem a lista de palavras ainda, o nome não vai para o cartão.
    if (estado.nome && !carregado) {
      estado.nome = '';
      if (contador) contador.textContent = `${campoNome.value.length}/${MAX_NOME}`;
      redesenhar();
      return;
    }
    if (estado.nome && temPalavrao(estado.nome, palavroes)) {
      estado.nome = '';
      mostrarErro(MSG_NOME);
      redesenhar();
      return;
    }
    if (erro && erro.textContent === MSG_NOME) mostrarErro('');
    if (contador) contador.textContent = `${campoNome.value.length}/${MAX_NOME}`;
    if (estado.nome && erro && erro.textContent.includes('Digite seu nome')) mostrarErro('');
    redesenhar();
  };
  campoNome.addEventListener('input', aplicarNome);

  // Frases prontas.
  const lista = $('[data-lista="frases"]');
  const botoesFrase = [];
  const marcarFrase = indice => botoesFrase.forEach((b, i) => b.setAttribute('aria-pressed', String(i === indice)));
  const montarFrases = () => {
    if (!lista) return;
    lista.textContent = '';
    frases.forEach((texto, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-frase', String(i + 1));
      b.setAttribute('aria-pressed', String(i === 0));
      b.textContent = texto;
      b.addEventListener('click', () => {
        estado.frase = texto;
        marcarFrase(i);
        mostrarErro('');
        redesenhar();
      });
      lista.appendChild(b);
      botoesFrase.push(b);
    });
  };
  if (lista) lista.textContent = 'Carregando...';

  // Frase própria.
  const validarFrase = () => {
    const texto = campoFrase.value.trim();
    if (texto.length > MAX_FRASE) return `A frase aceita até ${MAX_FRASE} caracteres.`;
    if (temPalavrao(texto, palavroes)) return 'A frase tem palavras não permitidas. Escreva outra.';
    return '';
  };
  if (campoFrase) {
    campoFrase.addEventListener('input', () => {
      const msg = validarFrase();
      if (msg) mostrarErro(msg);
      else if (erro && (erro.textContent.includes('palavras não permitidas') || erro.textContent.includes('aceita até'))) mostrarErro('');
    });
    $('[data-frase-usar]')?.addEventListener('click', async () => {
      if (!carregado) { mostrarErro('Carregando...'); await pronto.catch(() => {}); mostrarErro(''); }
      const texto = campoFrase.value.trim();
      if (!texto) { mostrarErro('Escreva uma frase ou escolha uma pronta.'); return; }
      const msg = validarFrase();
      if (msg) { mostrarErro(msg); return; }
      estado.frase = texto;
      marcarFrase(-1);
      mostrarErro('');
      redesenhar();
    });
  }

  // Foto, só no navegador.
  const nomeFoto = $('[data-foto-nome]');
  const textoFoto = t => { if (nomeFoto) nomeFoto.textContent = t; };
  $('input[data-foto]')?.addEventListener('change', e => {
    const arquivo = e.target.files && e.target.files[0];
    if (!arquivo) { estado.foto = null; textoFoto('Nenhuma foto escolhida'); redesenhar(); return; }
    if (!arquivo.type.startsWith('image/')) { textoFoto('Nenhuma foto escolhida'); mostrarErro('Escolha um arquivo de imagem.'); return; }
    textoFoto(arquivo.name);
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => { estado.foto = img; mostrarErro(''); redesenhar(); };
      img.onerror = () => mostrarErro('Não foi possível ler a foto.');
      img.src = leitor.result;
    };
    leitor.onerror = () => mostrarErro('Não foi possível ler a foto.');
    leitor.readAsDataURL(arquivo);
  });

  // Formatos.
  botoesFormato.forEach(b => b.addEventListener('click', () => {
    const f = b.getAttribute('data-formato');
    const [lw, lh] = FORMATOS[f];
    estado.formato = f;
    canvas.width = lw;
    canvas.height = lh;
    canvas.setAttribute('data-formato', f);
    canvas.setAttribute('data-largura', String(lw));
    canvas.setAttribute('data-altura', String(lh));
    botoesFormato.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    redesenhar();
  }));

  const exigirNome = async () => {
    if (!carregado) {
      mostrarErro('Carregando...');
      await pronto.catch(() => {});
      mostrarErro('');
      aplicarNome();
    }
    if (temPalavrao(campoNome.value, palavroes)) { mostrarErro(MSG_NOME); campoNome.focus(); return false; }
    if (!estado.nome) { mostrarErro('Digite seu nome.'); campoNome.focus(); return false; }
    mostrarErro('');
    return true;
  };
  // Reaproveita o PNG se nada mudou desde a última geração.
  const paraBlob = () => new Promise((ok, falha) => {
    if (cache.versao === versao && cache.blob) { ok(cache.blob); return; }
    const v = versao;
    canvas.toBlob(b => {
      if (!b) { falha(new Error('toBlob')); return; }
      cache = { versao: v, blob: b };
      ok(b);
    }, 'image/png');
  });
  const nomeArquivo = () => `cartao-crc-jovem-ba-${estado.formato}.png`;

  $('[data-baixar-png]')?.addEventListener('click', async () => {
    if (!(await exigirNome())) return;
    aviso.textContent = 'Gerando imagem...';
    try {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      baixarBlob(await paraBlob(), nomeArquivo());
      aviso.textContent = 'PNG baixado.';
    } catch (e) {
      mostrarErro('Não foi possível gerar o PNG.');
    }
  });

  $('[data-compartilhar]')?.addEventListener('click', async () => {
    if (!(await exigirNome())) return;
    aviso.textContent = 'Gerando imagem...';
    try {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      const blob = await paraBlob();
      const arquivo = new File([blob], nomeArquivo(), { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'CRC Jovem BA', text: estado.frase });
        aviso.textContent = 'Cartão compartilhado.';
      } else {
        baixarBlob(blob, nomeArquivo());
        aviso.textContent = 'Seu navegador não compartilha arquivos. Baixamos o PNG para você enviar.';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') aviso.textContent = 'Compartilhamento cancelado.';
      else mostrarErro('Não foi possível compartilhar o cartão.');
    }
  });

  // Vídeo para Stories.
  const botaoVideo = $('[data-gerar-video]');
  let urlVideo = null;
  botaoVideo?.addEventListener('click', async () => {
    if (!statusVideo) return;
    if (!(await exigirNome())) return;
    if (!videoSuportado()) {
      statusVideo.textContent = 'Seu navegador não tem suporte para gerar vídeo. Baixe o PNG.';
      return;
    }
    botaoVideo.disabled = true;
    statusVideo.textContent = 'Gerando o vídeo, cerca de 5 segundos. Aguarde.';
    try {
      const base = document.createElement('canvas');
      base.width = FORMATOS.stories[0];
      base.height = FORMATOS.stories[1];
      desenhar(base.getContext('2d'), base.width, base.height, estado);
      let resultado;
      try {
        resultado = await gerarVideo(base);
      } finally {
        base.width = 1;
        base.height = 1;
      }
      const { blob, ext } = resultado;
      if (urlVideo) URL.revokeObjectURL(urlVideo);
      urlVideo = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlVideo;
      link.download = `cartao-crc-jovem-ba-stories.${ext}`;
      link.textContent = 'Baixar vídeo';
      link.setAttribute('data-video-link', '');
      link.dataset.tamanho = String(blob.size);
      statusVideo.textContent = 'Vídeo pronto. ';
      statusVideo.appendChild(link);
    } catch (e) {
      statusVideo.textContent = e && e.message === 'sem-suporte'
        ? 'Seu navegador não tem suporte para gerar vídeo. Baixe o PNG.'
        : 'Não foi possível gerar o vídeo. Tente de novo ou baixe o PNG.';
    } finally {
      botaoVideo.disabled = false;
    }
  });

  redesenhar();

  try { dados = await pronto; } catch (e) { dados = null; }
  palavroes = (dados && dados.filtro && dados.filtro.palavras) || [];
  frases = ((dados && dados.frases && dados.frases.itens) || []).map(i => i.texto);
  carregado = true;
  const padrao = estado.frase;
  if (frases.length && padrao === FRASE_PADRAO) estado.frase = frases[0];
  if (lista) { lista.textContent = ''; montarFrases(); }
  if (estado.frase !== frases[0]) marcarFrase(-1);
  if (campoNome.value) aplicarNome(); else redesenhar();
}
