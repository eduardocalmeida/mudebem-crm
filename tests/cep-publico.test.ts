import { describe, expect, it } from "vitest";
import { consultarCep, formatarCep } from "@/server/cep-publico";
import { municipiosDaUf } from "@/server/municipios-publico";
import { montarEndereco } from "@/server/formulario-publico";

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

describe("CEP público", () => {
  it("formata e recusa CEP incompleto sem chamar a rede", async () => {
    expect(formatarCep("01310100")).toBe("01310-100");
    let chamadas = 0;
    const endereco = await consultarCep("123", async () => {
      chamadas += 1;
      return resposta({});
    });
    expect(endereco).toBeNull();
    expect(chamadas).toBe(0);
  });

  it("usa ViaCEP e cai para a BrasilAPI sem guardar credencial", async () => {
    const urls: string[] = [];
    const via = await consultarCep("01310100", async (url) => {
      urls.push(url);
      return resposta({
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      });
    });
    expect(via?.logradouro).toBe("Avenida Paulista");
    expect(urls).toEqual(["https://viacep.com.br/ws/01310100/json/"]);

    const fallback = await consultarCep("74000000", async (url) => {
      if (url.includes("viacep")) return resposta({ erro: true });
      return resposta({ street: "Rua 3", neighborhood: "Setor Central", city: "Goiânia", state: "GO" });
    });
    expect(fallback).toMatchObject({ cidade: "Goiânia", uf: "GO", cep: "74000-000" });
  });

  it("monta o endereço numa linha e lista municípios só da UF", async () => {
    expect(montarEndereco({
      logradouro: "Avenida Paulista",
      numero: "1000",
      complemento: "ap 12",
      bairro: "Bela Vista",
      cep: "01310-100",
    })).toBe("Avenida Paulista, 1000 · ap 12 · Bela Vista · CEP 01310-100");
    expect(montarEndereco({ endereco: "Rua já pronta, 10" })).toBe("Rua já pronta, 10");

    expect(municipiosDaUf("XX")).toEqual([]);
    const goias = municipiosDaUf("GO");
    expect(goias).toContain("Goiânia");
    expect(goias).toContain("Anápolis");
    expect(goias.indexOf("Anápolis")).toBeLessThan(goias.indexOf("Goiânia"));
    expect(municipiosDaUf("SP")).toContain("São Paulo");
  });
});
