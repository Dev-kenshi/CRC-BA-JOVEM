// Terra 3D da seção inicial. Modo webgl com texturas locais ou modo estático com bahia.svg.
// Lista acessível de cidades gera os botões [data-cidade] e gira a Terra até a cidade.
// three.js entra por import() dinâmico, só depois do teste de WebGL, para o resto do site não esperar.
let THREE;

const GRAUS = Math.PI / 180;
const BAHIA = { lat: -12.9, lon: -41.7 };
// Contorno simplificado da Bahia (desenho próprio, pares lon e lat).
const CONTORNO = [
  [-46.3, -12.4], [-45.8, -11.2], [-44.7, -10.3], [-43.3, -9.2], [-42.0, -9.0], [-41.3, -8.6],
  [-40.8, -8.9], [-38.3, -9.0], [-37.9, -9.6], [-37.6, -10.4], [-37.35, -11.6], [-37.7, -12.1],
  [-38.4, -12.9], [-38.9, -13.4], [-39.1, -14.4], [-38.95, -15.8], [-39.2, -17.7], [-39.5, -18.2],
  [-40.0, -18.3], [-41.0, -17.7], [-41.5, -16.4], [-42.3, -15.8], [-42.9, -15.3], [-43.6, -14.9],
  [-44.2, -14.3], [-44.6, -13.9], [-45.9, -13.8],
];
const TEXTURAS = {
  dia: 'assets/earth/surface-2k.webp',
  nuvens: 'assets/earth/clouds-2k.webp',
  luzes: 'assets/earth/lights-2k.webp',
  relevo: 'assets/earth/relief-2k.webp',
};

function direcao(lat, lon) {
  const la = lat * GRAUS;
  const lo = lon * GRAUS;
  const c = Math.cos(la);
  return new THREE.Vector3(c * Math.cos(lo), Math.sin(la), -c * Math.sin(lo));
}

// Ângulos que trazem lat e lon para a frente da câmera, com o norte para cima.
function angulosPara(lat, lon) {
  return { guinada: (-90 - lon) * GRAUS, arfagem: lat * GRAUS };
}

function caminhoCurto(de, para) {
  let d = (para - de) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return de + d;
}

function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (erro) {
    return false;
  }
}

function texturaContorno() {
  const larg = 2048;
  const alt = 1024;
  const c = document.createElement('canvas');
  c.width = larg;
  c.height = alt;
  const g = c.getContext('2d');
  g.beginPath();
  CONTORNO.forEach(([lo, la], i) => {
    const x = ((lo + 180) / 360) * larg;
    const y = ((90 - la) / 180) * alt;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  });
  g.closePath();
  g.fillStyle = 'rgba(240, 210, 122, 0.30)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(240, 210, 122, 0.95)';
  g.lineJoin = 'round';
  g.stroke();
  return new THREE.CanvasTexture(c);
}

function mostrarEstatico(bloco, alternativa) {
  bloco.setAttribute('data-terra-modo', 'estatico');
  if (!alternativa) return;
  if (!alternativa.querySelector('img')) {
    const img = document.createElement('img');
    img.src = 'assets/bahia.svg';
    img.alt = 'Mapa simplificado da Bahia com as nove subcomissões';
    img.width = 380;
    img.height = 420;
    alternativa.appendChild(img);
  }
  alternativa.hidden = false;
}

function montarLista(lista, itens, aoEscolher) {
  const botoes = [];
  if (!lista) return botoes;
  lista.textContent = '';
  itens.forEach(item => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.nome;
    b.setAttribute('data-cidade', item.slug);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => aoEscolher(item));
    li.appendChild(b);
    lista.appendChild(li);
    botoes.push(b);
  });
  return botoes;
}

export async function iniciar(dados) {
  const bloco = document.querySelector('[data-terra]');
  if (!bloco) return;
  const palco = bloco.querySelector('[data-terra-palco]');
  const alternativa = bloco.querySelector('[data-terra-alternativa]');
  const foco = document.querySelector('[data-terra-foco]');
  const lista = document.querySelector("[data-lista='cidades']");
  const itens = dados && dados.subcomissoes && Array.isArray(dados.subcomissoes.itens) ? dados.subcomissoes.itens : null;

  if (!itens) {
    if (lista) lista.textContent = 'Conteúdo indisponível no momento.';
    mostrarEstatico(bloco, alternativa);
    return;
  }

  let escolhida = null;
  let irPara = () => {};
  const botoes = montarLista(lista, itens, item => {
    escolhida = item;
    botoes.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-cidade') === item.slug)));
    if (foco) foco.textContent = item.nome;
    irPara(item);
  });

  const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzido || !palco || !temWebGL()) {
    mostrarEstatico(bloco, alternativa);
    return;
  }

  try {
    THREE = await import('../vendor/three.min.js');
  } catch (erro) {
    console.warn(`Terra sem three.js: ${erro.message}`);
    mostrarEstatico(bloco, alternativa);
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (erro) {
    console.warn(`Terra sem WebGL: ${erro.message}`);
    mostrarEstatico(bloco, alternativa);
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  palco.appendChild(renderer.domElement);
  bloco.setAttribute('data-terra-modo', 'webgl');
  if (alternativa) alternativa.hidden = true;

  const recursos = [];
  const guardar = r => { recursos.push(r); return r; };

  const voltarAoEstatico = motivo => {
    console.warn(`Terra 3D indisponível: ${motivo}`);
    recursos.forEach(r => r.dispose && r.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    mostrarEstatico(bloco, alternativa);
  };

  const carregador = new THREE.TextureLoader();
  let tex;
  try {
    const nomes = Object.keys(TEXTURAS);
    const lidas = await Promise.all(nomes.map(n => carregador.loadAsync(TEXTURAS[n])));
    tex = Object.fromEntries(nomes.map((n, i) => [n, lidas[i]]));
  } catch (erro) {
    voltarAoEstatico(erro && erro.message ? erro.message : 'textura não carregou');
    return;
  }
  Object.values(tex).forEach(t => {
    guardar(t);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });
  tex.dia.colorSpace = THREE.SRGBColorSpace;
  tex.luzes.colorSpace = THREE.SRGBColorSpace;

  const cena = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  const mundo = new THREE.Group();
  const pivo = new THREE.Group();
  mundo.add(pivo);
  cena.add(mundo);

  const esfera = guardar(new THREE.SphereGeometry(1, 96, 64));
  const matTerra = guardar(new THREE.MeshStandardMaterial({
    map: tex.dia, bumpMap: tex.relevo, bumpScale: 0.02, roughness: 0.92, metalness: 0,
    emissive: new THREE.Color(0xffd9a0), emissiveMap: tex.luzes, emissiveIntensity: 0.55,
  }));
  pivo.add(new THREE.Mesh(esfera, matTerra));

  const matBahia = guardar(new THREE.MeshBasicMaterial({
    map: guardar(texturaContorno()), transparent: true, depthWrite: false,
  }));
  const bahia = new THREE.Mesh(esfera, matBahia);
  bahia.scale.setScalar(1.002);
  pivo.add(bahia);

  const matNuvens = guardar(new THREE.MeshStandardMaterial({
    color: 0xffffff, alphaMap: tex.nuvens, transparent: true, opacity: 0.4, depthWrite: false, roughness: 1,
  }));
  const nuvens = new THREE.Mesh(esfera, matNuvens);
  nuvens.scale.setScalar(1.012);
  pivo.add(nuvens);

  const matAtmo = guardar(new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(0.25, 0.62, 1.0, pow(clamp(r,0.0,1.0), 2.4) * 0.7); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const atmo = new THREE.Mesh(esfera, matAtmo);
  atmo.scale.setScalar(1.07);
  mundo.add(atmo);

  // Marcadores das subcomissões.
  const geoPonto = guardar(new THREE.SphereGeometry(1, 16, 12));
  const matPonto = guardar(new THREE.MeshBasicMaterial({ color: 0xf0d27a }));
  const matSel = guardar(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const pontos = new Map();
  itens.forEach(item => {
    const m = new THREE.Mesh(geoPonto, matPonto);
    m.position.copy(direcao(item.lat, item.lon).multiplyScalar(1.01));
    m.scale.setScalar(0.011);
    pivo.add(m);
    pontos.set(item.slug, m);
  });

  cena.add(new THREE.HemisphereLight(0xdceeff, 0x0a1626, 0.9));
  const sol = new THREE.DirectionalLight(0xfff1d8, 2.2);
  sol.position.set(-300, 250, 700);
  cena.add(sol);

  // Estado da orientação.
  const alvo = angulosPara(BAHIA.lat, BAHIA.lon);
  const atual = { ...alvo };
  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  const aplicar = (t) => {
    const balanco = Math.sin(t / 3200) * 0.05;
    euler.set(atual.arfagem, atual.guinada + balanco, 0);
    pivo.quaternion.setFromEuler(euler);
    nuvens.rotation.y = t / 90000;
  };
  irPara = item => {
    const a = angulosPara(item.lat, item.lon);
    alvo.guinada = caminhoCurto(atual.guinada, a.guinada);
    alvo.arfagem = a.arfagem;
    if (!rodando) {
      atual.guinada = alvo.guinada;
      atual.arfagem = alvo.arfagem;
      renderizar(performance.now());
    }
  };

  // Posição e tamanho: a Terra fica atrás do texto, à direita no desktop.
  const layout = () => {
    const rb = bloco.getBoundingClientRect();
    const heroi = bloco.querySelector('.heroi');
    const rh = heroi ? heroi.getBoundingClientRect() : rb;
    const topo = Math.max(0, rh.top - rb.top);
    const altura = Math.max(300, Math.round(rh.height + topo));
    const larg = Math.max(1, Math.round(rb.width));
    palco.style.bottom = 'auto';
    palco.style.height = `${altura}px`;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(larg, altura, false);
    camera.left = -larg / 2;
    camera.right = larg / 2;
    camera.top = altura / 2;
    camera.bottom = -altura / 2;
    camera.updateProjectionMatrix();
    const largo = larg >= 900;
    // Desktop: globo na coluna direita. Celular e tablet: globo abaixo do texto.
    const diam = largo ? Math.min(larg * 0.4, altura - 20, 640) : Math.min(larg * 0.8, 480);
    const cx = largo ? larg * 0.73 : larg / 2;
    const cy = largo ? altura / 2 : altura - diam / 2 - 12;
    mundo.scale.setScalar(diam / 2);
    mundo.position.set(cx - larg / 2, altura / 2 - cy, 0);
    renderer.domElement.style.opacity = '1';
  };

  let rodando = false;
  let dentro = false;
  let quadro = 0;
  let ultimo = 0;
  const renderizar = t => {
    atual.guinada += (alvo.guinada - atual.guinada) * 0.07;
    atual.arfagem += (alvo.arfagem - atual.arfagem) * 0.07;
    aplicar(t);
    pontos.forEach((m, slug) => {
      const sel = escolhida && escolhida.slug === slug;
      m.material = sel ? matSel : matPonto;
      m.scale.setScalar(sel ? 0.022 + Math.sin(t / 260) * 0.003 : 0.011);
    });
    renderer.render(cena, camera);
  };
  const laco = t => {
    if (!rodando) return;
    quadro = requestAnimationFrame(laco);
    if (t - ultimo < 33) return;
    ultimo = t;
    renderizar(t);
  };
  function pedir() {
    const deve = dentro && !document.hidden;
    if (deve && !rodando) {
      rodando = true;
      quadro = requestAnimationFrame(laco);
    } else if (!deve && rodando) {
      rodando = false;
      cancelAnimationFrame(quadro);
    }
  }

  layout();
  renderizar(0);
  if ('ResizeObserver' in window) new ResizeObserver(() => { layout(); renderizar(performance.now()); }).observe(bloco);
  else window.addEventListener('resize', () => { layout(); renderizar(performance.now()); });
  document.addEventListener('visibilitychange', pedir);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { dentro = e.isIntersecting; pedir(); }, { threshold: 0.01 }).observe(bloco);
  } else {
    dentro = true;
    pedir();
  }
}
