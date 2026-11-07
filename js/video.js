// Vídeo curto para Stories: MediaRecorder sobre canvas.captureStream.
export const DURACAO_MS = 5000;
export const FPS = 30;

const TIPOS = [
  { mime: 'video/mp4;codecs="avc1.42E01E"', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' }
];

// Devolve o primeiro tipo aceito pelo navegador, ou null.
export function escolherTipo() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  return TIPOS.find(t => MediaRecorder.isTypeSupported(t.mime)) || null;
}

export function videoSuportado() {
  const teste = document.createElement('canvas');
  return Boolean(escolherTipo() && typeof teste.captureStream === 'function');
}

// base: canvas 1080x1920 já desenhado. Resolve com { blob, ext }.
export function gerarVideo(base) {
  return new Promise((resolve, reject) => {
    const tipo = escolherTipo();
    const saida = document.createElement('canvas');
    saida.width = base.width;
    saida.height = base.height;
    if (!tipo || typeof saida.captureStream !== 'function') {
      reject(new Error('sem-suporte'));
      return;
    }
    const ctx = saida.getContext('2d');
    const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function quadro(p) {
      const pulso = reduzido ? 0 : 0.5 - Math.cos(p * Math.PI * 2) / 2;
      const zoom = 1 + pulso * 0.05;
      const w = saida.width * zoom;
      const h = saida.height * zoom;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#154377';
      ctx.fillRect(0, 0, saida.width, saida.height);
      ctx.drawImage(base, (saida.width - w) / 2, (saida.height - h) / 2, w, h);
      const brilho = reduzido ? 0.06 : 0.04 + pulso * 0.18;
      const gx = saida.width * (0.25 + 0.5 * p);
      const grad = ctx.createRadialGradient(gx, saida.height * 0.3, 10, gx, saida.height * 0.3, saida.width * 0.7);
      grad.addColorStop(0, `rgba(240,210,122,${brilho})`);
      grad.addColorStop(1, 'rgba(240,210,122,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, saida.width, saida.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    quadro(0);
    let gravador;
    let fluxo;
    try {
      fluxo = saida.captureStream(FPS);
      gravador = new MediaRecorder(fluxo, { mimeType: tipo.mime });
    } catch (erro) {
      reject(erro);
      return;
    }
    const partes = [];
    gravador.ondataavailable = e => { if (e.data && e.data.size > 0) partes.push(e.data); };
    gravador.onerror = e => reject(e.error || new Error('erro-gravacao'));
    const inicio = performance.now();
    let relogio = 0;
    gravador.onstop = () => {
      clearInterval(relogio);
      fluxo.getTracks().forEach(t => t.stop());
      const blob = new Blob(partes, { type: tipo.mime.split(';')[0] });
      if (blob.size > 0) resolve({ blob, ext: tipo.ext });
      else reject(new Error('vazio'));
    };
    gravador.start(500);
    relogio = setInterval(() => {
      const p = Math.min(1, (performance.now() - inicio) / DURACAO_MS);
      quadro(p);
      if (p >= 1 && gravador.state !== 'inactive') gravador.stop();
    }, 1000 / FPS);
  });
}

export async function iniciar(dados) {
  void dados;
}
