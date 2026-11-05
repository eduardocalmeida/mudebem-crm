import { NextResponse } from "next/server";
import { z } from "zod";
import { atorDaRequisicao, lerJson, responderErro } from "@/lib/api";
import { erroZod } from "@/lib/errors";
import { enviarMensagem } from "@/server/whatsapp";

const esquema = z
  .object({
    texto: z.string().trim().min(1).max(4096).optional(),
    modelo: z
      .object({
        nome: z.string().trim().min(1).max(512),
        idioma: z.string().trim().min(2).max(16).optional(),
        parametros: z.array(z.string().max(1024)).max(20).optional(),
      })
      .optional(),
  })
  .strict()
  .refine((dados) => Boolean(dados.texto) !== Boolean(dados.modelo), {
    message: "Informe texto ou modelo, não os dois.",
  });

type Contexto = { params: Promise<{ id: string }> };

export async function POST(req: Request, contexto: Contexto) {
  try {
    await atorDaRequisicao(req);
    const { id } = await contexto.params;
    const resultado = esquema.safeParse(await lerJson(req));
    if (!resultado.success) throw erroZod(resultado.error);
    const mensagem = resultado.data.modelo
      ? await enviarMensagem(id, {
          modelo: {
            nome: resultado.data.modelo.nome,
            idioma: resultado.data.modelo.idioma || "pt_BR",
            parametros: resultado.data.modelo.parametros,
          },
        })
      : await enviarMensagem(id, { texto: resultado.data.texto! });
    return NextResponse.json(
      {
        id: mensagem.id,
        wamid: mensagem.wamid,
        direcao: mensagem.direcao,
        tipo: mensagem.tipo,
        texto: mensagem.texto,
        status: mensagem.status,
        criadaEm: mensagem.criadaEm.toISOString(),
      },
      { status: 201 },
    );
  } catch (erro) {
    return responderErro(erro);
  }
}
