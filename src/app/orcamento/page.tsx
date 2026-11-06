import { FormularioOrcamento } from "@/components/formulario-orcamento";
import { Logo } from "@/components/logo";
import { listarCatalogo } from "@/server/inventario";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orçamento" };

function um(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor || "").slice(0, 500);
}

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const consulta = await searchParams;
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") || cabecalhos.get("host") || "";
  const referrerInformado = um(consulta.referrer);
  let referrer = referrerInformado;
  if (!referrer) {
    const origem = cabecalhos.get("referer") || "";
    try {
      if (origem && new URL(origem).host !== host) referrer = origem;
    } catch {
      referrer = "";
    }
  }
  const catalogo = await listarCatalogo();
  const embed = um(consulta.embed) === "1";
  return (
    <main className={embed ? "orcamento embed" : "orcamento"}>
      <header>
        <Logo />
        <p className="sobretitulo">Mude Bem Mudanças e Logística</p>
        <h1>Peça seu orçamento</h1>
        <p className="muted">Conte de onde sai, para onde vai e o que será transportado. O volume em m³ entra no pedido.</p>
      </header>
      <FormularioOrcamento
        embed={embed}
        catalogo={catalogo.map((item) => ({
          id: item.id,
          nome: item.nome,
          categoria: item.categoria,
          volumeM3: item.volumeM3.toNumber(),
        }))}
        atribuicao={{
          utmSource: um(consulta.utm_source),
          utmMedium: um(consulta.utm_medium),
          utmCampaign: um(consulta.utm_campaign),
          utmTerm: um(consulta.utm_term),
          utmContent: um(consulta.utm_content),
          fbclid: um(consulta.fbclid),
          gclid: um(consulta.gclid),
          referrer,
        }}
      />
    </main>
  );
}
