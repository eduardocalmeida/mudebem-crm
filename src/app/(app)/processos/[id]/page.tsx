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
import { AbaCte } from "@/components/cte-painel";
import { obterProcesso } from "@/server/processos";
import { exigirUsuario } from "@/server/session";

async function ConversasDoProcesso({ processoId }: { processoId: string }) {
  const conversas = await prisma.conversaWhatsapp.findMany({
    where: { processoId },
    select: { id: true, nomeContato: true, waId: true },
  });
  if (conversas.length === 0) return null;
  return (
    <p>
      WhatsApp:{" "}
      {conversas.map((conversa) => (
        <Link key={conversa.id} href={`/whatsapp/${conversa.id}`}>
          {conversa.nomeContato || conversa.waId}
        </Link>
      ))}
    </p>
  );
}

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
  searchParams: Promise<{ aba?: string; aviso?: string; secao?: string }>;
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
          <p className="sobretitulo">{processo.codigo}</p>
          <h1>{processo.titulo}</h1>
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
      <ConversasDoProcesso processoId={processo.id} />
      <nav className="abas">
        {[
          ["resumo", "Resumo"],
          ["inventario", "Inventário"],
          ["tarefas", "Tarefas"],
          ["cte", "CT-e"],
        ].map(([idAba, rotulo]) => (
          <Link key={idAba} className={aba === idAba ? "ativa" : ""} href={`/processos/${processo.id}?aba=${idAba}`}>
            {rotulo}
          </Link>
        ))}
      </nav>
      {aba === "inventario" ? <AbaInventario processoId={processo.id} /> : null}
      {aba === "tarefas" ? <AbaTarefas processoId={processo.id} /> : null}
      {aba === "cte" ? <AbaCte processoId={processo.id} aviso={consulta.aviso} secao={consulta.secao} /> : null}
      {aba === "resumo" ? (
      <>
      <p className="muted">{etapaPorId(processo.etapa, etapas).resumo}</p>
      <section className="rota-grande">
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
      </section>
      <section className="fatos">
        <article className="cartao fato">
          <span>Colaborador</span>
          <strong>{processo.colaborador || "—"}</strong>
        </article>
        <article className="cartao fato">
          <span>Contato</span>
          <strong>{processo.contato?.nome || "—"}</strong>
          <small className="muted">
            {processo.contato?.email || "sem e-mail"} · {processo.contato?.telefone || "sem telefone"}
          </small>
        </article>
        <article className="cartao fato">
          <span>Coleta / entrega</span>
          <strong>
            {formatarData(processo.dataColeta)} → {formatarData(processo.dataEntrega)}
          </strong>
        </article>
        <article className="cartao fato">
          <span>Valor</span>
          <strong>{formatarBRL(processo.valorAprovado ?? processo.valorCotado)}</strong>
          <small className="muted">cotado {formatarBRL(processo.valorCotado)}</small>
        </article>
        <article className="cartao fato">
          <span>OC</span>
          <strong>{processo.numeroOc || "—"}</strong>
        </article>
        <article className="cartao fato">
          <span>CT-e</span>
          <strong>{processo.numeroCte || "—"}</strong>
        </article>
        <article className="cartao fato">
          <span>NF / fatura</span>
          <strong>{processo.numeroNf || "—"}</strong>
        </article>
        <article className="cartao fato">
          <span>Vencimento / recebimento</span>
          <strong>
            {formatarData(processo.dataVencimento)} · {formatarData(processo.dataRecebimento)}
          </strong>
        </article>
      </section>
      <section className="ficha">
        <div>
          <article className="cartao bloco">
            <h2>Dados do processo</h2>
            <p className="muted">Responsável: {processo.responsavel?.nome ?? "não definido"}.</p>
            {processo.inventario ? <p>{processo.inventario}</p> : null}
            <FormProcesso
              modo="editar"
              processoId={processo.id}
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
                dataPrevista: processo.dataPrevista ? formatarData(processo.dataPrevista) : "",
                dataEmissao: processo.dataEmissao ? formatarData(processo.dataEmissao) : "",
                diasParaColetar: processo.diasParaColetar == null ? "" : String(processo.diasParaColetar),
                diasParaViagem: processo.diasParaViagem == null ? "" : String(processo.diasParaViagem),
                motoristaNome: processo.motorista.nome ?? "",
                motoristaPlaca: processo.motorista.placa ?? "",
                motoristaAntt: processo.motorista.antt ?? "",
                motoristaCnh: processo.motorista.cnh ?? "",
                motoristaCpf: processo.motorista.cpf ?? "",
                inventario: processo.inventario ?? "",
                valorCotado: formatarNumero(processo.valorCotado),
                valorAprovado: formatarNumero(processo.valorAprovado),
                valorFrete: formatarNumero(processo.valorFrete),
                valorSeguro: formatarNumero(processo.valorSeguro),
                valorTransporte: formatarNumero(processo.valorTransporte),
                valorTotal: formatarNumero(processo.valorTotal),
                formaPagamento: processo.formaPagamento ?? "",
                validadeProposta: processo.validadeProposta ? formatarData(processo.validadeProposta) : "",
                linkProposta: processo.links.proposta ?? "",
                linkContrato: processo.links.contrato ?? "",
                linkContratoCarreteiro: processo.links.contratoCarreteiro ?? "",
                linkOs: processo.links.os ?? "",
                linkRecibo: processo.links.recibo ?? "",
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
