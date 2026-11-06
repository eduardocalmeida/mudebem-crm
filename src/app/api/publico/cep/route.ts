import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cep = new URL(req.url).searchParams.get("cep")?.replace(/\D/g, "") || "";
  if (cep.length !== 8) return NextResponse.json({ erro: "CEP inválido." }, { status: 400 });
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" });
  if (!resposta.ok) return NextResponse.json({ erro: "Consulta de CEP indisponível." }, { status: 502 });
  const dados = (await resposta.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (dados.erro) return NextResponse.json({ erro: "CEP não encontrado." }, { status: 404 });
  return NextResponse.json({
    endereco: [dados.logradouro, dados.bairro].filter(Boolean).join(", "),
    cidade: dados.localidade || "",
    uf: dados.uf || "",
  });
}
