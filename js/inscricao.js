// Inscrição: copiar link (com alternativa) e QR Code local.
const LINK = 'https://www.crcba.org.br/eventos/';
let carregandoQr = null;

function carregarQr() {
  if (typeof window.qrcode === 'function') return Promise.resolve(true);
  if (carregandoQr) return carregandoQr;
  carregandoQr = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'vendor/qrcode.js';
    s.onload = () => resolve(typeof window.qrcode === 'function');
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return carregandoQr;
}

function copiarAntigo(texto) {
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.setAttribute('aria-hidden', 'true');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  campo.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  campo.remove();
  return ok;
}

let copiaAtual = 0;

function tentarClipboard(ms) {
  return new Promise(resolve => {
    const fim = setTimeout(() => resolve(false), ms);
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { clearTimeout(fim); resolve(false); return; }
      navigator.clipboard.writeText(LINK).then(
        () => { clearTimeout(fim); resolve(true); },
        () => { clearTimeout(fim); resolve(false); }
      );
    } catch (e) {
      clearTimeout(fim);
      resolve(false);
    }
  });
}

async function copiar(status) {
  const minha = ++copiaAtual;
  status.textContent = 'Link: copiando...';
  let ok = await tentarClipboard(1000);
  if (minha !== copiaAtual) return;
  if (!ok) ok = copiarAntigo(LINK);
  if (minha !== copiaAtual) return;
  status.textContent = ok ? 'Link copiado.' : `Link para copiar à mão: ${LINK}`;
}

async function mostrarQr(img, botao) {
  const pronto = await carregarQr();
  if (!pronto) {
    img.hidden = true;
    const st = document.querySelector('[data-copiar-status]');
    if (st) st.textContent = 'Link para copiar à mão: ' + LINK;
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(LINK);
  qr.make();
  img.src = qr.createDataURL(8, 0);
  img.hidden = false;
  if (botao) botao.setAttribute('aria-expanded', 'true');
}

export async function iniciar(dados) {
  void dados;
  const copiarBtn = document.querySelector('[data-copiar-link]');
  const status = document.querySelector('[data-copiar-status]');
  if (copiarBtn && status) copiarBtn.addEventListener('click', () => { copiar(status); });
  const qrBtn = document.querySelector('[data-qr-abrir]');
  const img = document.querySelector('[data-qr-imagem]');
  if (qrBtn && img) qrBtn.addEventListener('click', () => { mostrarQr(img, qrBtn); });
}
