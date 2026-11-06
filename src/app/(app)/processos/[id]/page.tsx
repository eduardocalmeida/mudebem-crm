import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAnexo, FormEtapa, FormNota, FormProcesso, FormRemoverAnexo } from "@/components/formularios";
import { SeloCanal, SeloEtapa, SeloExemplo } from "@/components/selos";
import { camposDoPapel, destinosPossiveis, etapaPorId, rotuloEtapa } from "@/lib/domain";
import { carregarEtapas } from "@/server/etapas";
import { AppError } from "@/lib/errors";
import { formatarBRL, formatarData, formatarDataHora, formatarNumero, localidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AbaInventario, AbaTarefas } from "@/components/abas-operacao";
import { FichaConversa } from "@/components/ficha-conversa";
import { AbaFiscal } from "@/components/nfse-painel";
import { obterProcesso } from "@/server/processos";
import { exigirUsuario } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const processo = await prisma.processo.findUnique({ where: { id }, select: { codigo: true } });
  return { title: processo?.codigo ?? "Processo" };
}

export default async function ProcessoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; aviso?: string; secao?: string; acao?: string; fio?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const consulta = await searchParams;
  const aba = consulta.aba || "resumo";
  const processo = await obterProcesso(id, true).catch((erro: unknown) => {
    if (erro instanceof AppError && erro.status === 404) return null;
    throw erro;
  });
  if (!processo) notFound();

  const [clientes, usuarios] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      include: { contatos: { orderBy: { nome: "asc" }, select: { id: true, nome: true } } },
    }),
    prisma.usuario.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const etapas = await carregarEtapas();
  const destinos = destinosPossiveis(usuario.papel, processo.etapa, etapas).map((etapa) => ({
    id: etapa,
    rotulo: rotuloEtapa(etapa, etapas),
  }));

  return (
    <>
      <header className="pagina-cabeca">
        <div>
          <p className="sobretitulo">Oportunidade</p>
          <h1>{processo.codigo}</h1>
          <p className="linha" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <SeloEtapa etapa={processo.etapa} />
            <SeloCanal canal={processo.canal} />
            {processo.exemplo ? <SeloExemplo /> : null}
            <Link href={`/clientes/${processo.cliente.id}`}>{processo.cliente.nome}</Link>
          </p>
        </div>
        <Link className="btn secundario" href="/processos">
          Voltar ao quadro
        </Link>
      </header>
      {processo.exemplo ? (
        <p className="faixa-exemplo">Dado de exemplo gerado pelo seed. Pode ser editado para demonstração.</p>
      ) : null}
      <nav className="abas">
        {[
          ["resumo", "Resumo"],
          ["inventario", "Inventário"],
          ["tarefas", "Tarefas"],
          ["fiscal", "Fiscal"],
        ].map(([idAba, rotulo]) => (
          <Link key={idAba} className={aba === idAba || (idAba === "fiscal" && (aba === "cte" || aba === "nfse")) ? "ativa" : ""} href={`/processos/${processo.id}?aba=${idAba}`}>
            {rotulo}
          </Link>
        ))}
      </nav>
      {aba === "inventario" ? <AbaInventario processoId={processo.id} /> : null}
      {aba === "tarefas" ? <AbaTarefas processoId={processo.id} /> : null}
      {aba === "fiscal" || aba === "cte" || aba === "nfse" ? (
        <AbaFiscal processoId={processo.id} aviso={consulta.aviso} secao={consulta.secao} admin={usuario.papel === "ADMIN"} />
      ) : null}
      {aba === "resumo" ? (
      <>
      <p className="muted">{etapaPorId(processo.etapa, etapas).resumo}</p>
      <section className="topo-lead">
        <article className="cartao bloco rota-grande">
          <div>
            <span className="muted">Origem</span>
            <strong>{localidade(processo.origem.cidade, processo.origem.uf)}</strong>
            <div>{processo.origem.endereco || "Endereço não informado"}</div>
          </div>
          <div aria-hidden>→</div>
          <div>
            <span className="muted">Destino</span>
            <strong>{localidade(processo.destino.cidade, processo.destino.uf)}</strong>
            <div>{processo.destino.endereco || "Endereço não informado"}</div>
          </div>
        </article>
        <article className="cartao bloco valor-principal">
          <span className="muted">Valor</span>
          <b>{formatarBRL(processo.valorAprovado ?? processo.valorCotado)}</b>
          <small className="muted">
            {processo.valorAprovado != null ? "aprovado" : "cotado"}
            {" · "}frete {formatarBRL(processo.valorFrete)}
            {" · "}seguro {formatarBRL(processo.valorSeguro)}
          </small>
          <div className="muted">
            Coleta {formatarData(processo.dataColeta)} · entrega {formatarData(processo.dataEntrega)}
            {processo.dataPrevista || processo.dataPretendida ? ` · prevista ${formatarData(processo.dataPrevista ?? processo.dataPretendida)}` : ""}
          </div>
        </article>
      </section>
      <AcoesDaEtapa etapa={processo.etapa} processoId={processo.id} acao={consulta.acao} etapas={etapas} />
      <section className="ficha">
        <div>
          <article className="cartao bloco">
            <h2>Dados do processo</h2>
            <p className="muted">Responsável: {processo.responsavel?.nome ?? "não definido"}.</p>
            {processo.inventario ? <p>{processo.inventario}</p> : null}
            <FormProcesso
              modo="editar"
              processoId={processo.id}
              etapaSlug={processo.etapa}
              campos={camposDoPapel(usuario.papel)}
              clientes={clientes}
              usuarios={usuarios}
              valores={{
                titulo: processo.titulo,
                canal: processo.canal,
                clienteId: processo.cliente.id,
                contatoId: processo.contato?.id,
                colaborador: processo.colaborador ?? "",
                responsavelId: processo.responsavel?.id,
                origemEndereco: processo.origem.endereco ?? "",
                origemCidade: processo.origem.cidade ?? "",
                origemUf: processo.origem.uf ?? "",
                origemReferencia: processo.origem.referencia ?? "",
                origemAndar: processo.origem.andar ?? "",
                origemElevador: processo.origem.elevador ?? "",
                origemImovel: processo.origem.imovel ?? "",
                destinoEndereco: processo.destino.endereco ?? "",
                destinoCidade: processo.destino.cidade ?? "",
                destinoUf: processo.destino.uf ?? "",
                destinoReferencia: processo.destino.referencia ?? "",
                destinoAndar: processo.destino.andar ?? "",
                destinoElevador: processo.destino.elevador ?? "",
                destinoImovel: processo.destino.imovel ?? "",
                modalidade: processo.modalidade ?? "",
                descricaoColeta: processo.descricaoColeta ?? "",
                descricaoEntrega: processo.descricaoEntrega ?? "",
                embalagemNecessaria: processo.embalagemNecessaria == null ? "" : processo.embalagemNecessaria ? "sim" : "nao",
                volume: processo.volume ?? "",
                itensEspeciais: processo.itensEspeciais ?? "",
                dataPretendida: processo.dataPretendida ? formatarData(processo.dataPretendida) : "",
                dataColeta: processo.dataColeta ? formatarData(processo.dataColeta) : "",
                dataEntrega: processo.dataEntrega ? formatarData(processo.dataEntrega) : "",
                dataPrevista: processo.dataPrevista || processo.dataPretendida ? formatarData(processo.dataPrevista ?? processo.dataPretendida) : "",
                dataEmissao: processo.dataEmissao ? formatarData(processo.dataEmissao) : "",
                diasParaColetar: processo.diasParaColetar == null ? "" : String(processo.diasParaColetar),
                diasParaViagem: processo.diasParaViagem == null ? "" : String(processo.diasParaViagem),
                inventario: processo.inventario ?? "",
                valorCotado: formatarNumero(processo.valorCotado),
                valorAprovado: formatarNumero(processo.valorAprovado),
                valorFrete: formatarNumero(processo.valorFrete),
                valorSeguro: formatarNumero(processo.valorSeguro),
                formaPagamento: processo.formaPagamento ?? "",
                validadeProposta: processo.validadeProposta ? formatarData(processo.validadeProposta) : "",
                fonte: processo.marketing.fonte ?? "",
                numeroOc: processo.numeroOc ?? "",
                numeroCte: processo.numeroCte ?? "",
                numeroNf: processo.numeroNf ?? "",
                dataVencimento: processo.dataVencimento ? formatarData(processo.dataVencimento) : "",
                dataRecebimento: processo.dataRecebimento ? formatarData(processo.dataRecebimento) : "",
              }}
            />
          </article>
          <article className="cartao bloco">
            <h2>Anexos</h2>
            <div className="anexos">
              {(processo.anexos ?? []).length === 0 ? <p className="muted">Nenhum arquivo ainda.</p> : null}
              {(processo.anexos ?? []).map((anexo) => (
                <div className="anexo" key={anexo.id}>
                  <a href={`/api/anexos/${anexo.id}`}>
                    <strong>{anexo.nomeArquivo}</strong>
                    <div className="muted">
                      {Math.ceil(anexo.tamanho / 1024)} KB · {formatarDataHora(anexo.criadoEm)} · {anexo.autor ?? "sistema"}
                    </div>
                  </a>
                  {usuario.papel === "ADMIN" ? <FormRemoverAnexo anexoId={anexo.id} /> : null}
                </div>
              ))}
            </div>
            <FormAnexo processoId={processo.id} />
          </article>
        </div>
        <aside>
          <FichaConversa processoId={processo.id} usuarioId={usuario.id} fio={consulta.fio} />
          <article className="cartao bloco">
            <h2>Mover etapa</h2>
            <FormEtapa processoId={processo.id} destinos={destinos} />
          </article>
          <article className="cartao bloco">
            <h2>Nota</h2>
            <FormNota processoId={processo.id} />
          </article>
          <article className="cartao bloco">
            <h2>Histórico</h2>
            <div className="timeline">
              {(processo.eventos ?? []).map((evento) => (
                <article key={evento.id}>
                  <strong>{formatarDataHora(evento.criadoEm)}</strong>
                  <div>{evento.mensagem}</div>
                  <small className="muted">{evento.autor}</small>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </section>
      </>
      ) : null}
    </>
  );
}

function AcoesDaEtapa({
  etapa,
  processoId,
  acao,
  etapas,
}: {
  etapa: string;
  processoId: string;
  acao?: string;
  etapas: { slug: string; ordem: number }[];
}) {
  const ordem = etapas.find((item) => item.slug === etapa)?.ordem ?? 0;
  const botoes = [
    ordem >= 40 ? { chave: "proposta", rotulo: "Gerar proposta", href: `/processos/${processoId}?aba=resumo&acao=proposta` } : null,
    ordem >= 70 ? { chave: "contrato", rotulo: "Gerar contrato", href: `/processos/${processoId}?aba=resumo&acao=contrato` } : null,
    ordem >= 80 ? { chave: "fiscal", rotulo: "Abrir CT-e", href: `/processos/${processoId}?aba=fiscal` } : null,
    ordem >= 80 ? { chave: "os", rotulo: "Gerar O.S.", href: `/processos/${processoId}?aba=resumo&acao=os` } : null,
    ordem >= 100 ? { chave: "recibo", rotulo: "Gerar recibo", href: `/processos/${processoId}?aba=resumo&acao=recibo` } : null,
  ].filter((item) => item !== null);
  const avisos: Record<string, string> = {
    proposta: "A proposta ainda não gera PDF neste CRM. O valor aprovado, o frete, o seguro e a validade ficam nesta ficha.",
    contrato: "O contrato ainda não gera PDF neste CRM. O fechamento segue pela etapa e pelos dados comerciais.",
    os: "A ordem de serviço ainda não gera PDF neste CRM. A operação usa endereço, datas e volume desta ficha.",
    recibo: "O recibo ainda não gera PDF neste CRM. O financeiro usa NF, vencimento e recebimento.",
  };
  if (botoes.length === 0 && !(acao && avisos[acao])) return null;
  return (
    <div className="acoes-etapa">
      {botoes.map((botao) => (
        <Link key={botao.chave} className={acao === botao.chave ? "btn primario" : "btn secundario"} href={botao.href}>
          {botao.rotulo}
        </Link>
      ))}
      {acao && avisos[acao] ? <p className="faixa-exemplo">{avisos[acao]}</p> : null}
    </div>
  );
}
