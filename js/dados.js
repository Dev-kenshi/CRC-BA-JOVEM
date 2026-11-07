// Carrega dados/<nome>.json. Em falha de rede ou de leitura, avisa com console.warn e devolve null.
export const TEXTO_INDISPONIVEL = 'Conteúdo indisponível no momento.';

export async function carregar(nome) {
  try {
    const resposta = await fetch(`dados/${nome}.json`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.json();
  } catch (erro) {
    console.warn(`Não foi possível carregar dados/${nome}.json: ${erro.message}`);
    return null;
  }
}

// Mostra o aviso padrão dentro de um contêiner.
export function indisponivel(conteiner) {
  if (conteiner) conteiner.textContent = TEXTO_INDISPONIVEL;
}
