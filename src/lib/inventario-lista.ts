export type CatalogoLista = { id: string; nome: string; volumeM3: number };
export type ItemLista = { id: string; nome: string; quantidade: number; volumeUnitario: number; catalogoId: string | null };

export type LinhaInventario = {
  chave: string;
  catalogoId: string | null;
  itemId: string | null;
  nome: string;
  quantidade: number;
  volumeUnitario: number | null;
  legado: boolean;
  valor: number | null;
};

export function ordenarPtBr<T extends { nome: string }>(itens: T[]) {
  return [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

export function lerValoresInventario(extras: unknown): Record<string, number> {
  if (!extras || typeof extras !== "object" || Array.isArray(extras)) return {};
  const bruto = (extras as { inventarioValores?: unknown }).inventarioValores;
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  const saida: Record<string, number> = {};
  for (const [chave, valor] of Object.entries(bruto)) {
    if (typeof valor === "number" && Number.isFinite(valor) && valor >= 0) saida[chave] = valor;
  }
  return saida;
}

export function montarLinhasInventario(catalogo: CatalogoLista[], itens: ItemLista[], valores: Record<string, number>): LinhaInventario[] {
  const ids = new Set(catalogo.map((item) => item.id));
  const porCatalogo = new Map<string, ItemLista[]>();
  const legados: ItemLista[] = [];
  for (const item of itens) {
    if (item.catalogoId && ids.has(item.catalogoId)) {
      const lista = porCatalogo.get(item.catalogoId) ?? [];
      lista.push(item);
      porCatalogo.set(item.catalogoId, lista);
    } else {
      legados.push(item);
    }
  }
  const doCatalogo = ordenarPtBr(catalogo).map((item) => {
    const grupo = porCatalogo.get(item.id) ?? [];
    const chave = `catalogo:${item.id}`;
    return {
      chave,
      catalogoId: item.id,
      itemId: null,
      nome: item.nome,
      quantidade: grupo.reduce((soma, atual) => soma + atual.quantidade, 0),
      volumeUnitario: item.volumeM3,
      legado: false,
      valor: valores[chave] ?? null,
    };
  });
  const fora = ordenarPtBr(legados).map((item) => {
    const chave = `item:${item.id}`;
    return {
      chave,
      catalogoId: null,
      itemId: item.id,
      nome: item.nome,
      quantidade: item.quantidade,
      volumeUnitario: item.volumeUnitario,
      legado: true,
      valor: valores[chave] ?? null,
    };
  });
  return [...doCatalogo, ...fora];
}
