export function GET(req: Request) {
  const url = new URL(req.url);
  const origem = `${url.protocol}//${url.host}`;
  const js = `(function () {
  var origem = ${JSON.stringify(origem)};
  var atual = document.currentScript;
  var alvo = document.getElementById("mudebem-orcamento");
  if (!alvo && atual && atual.parentNode) {
    alvo = document.createElement("div");
    alvo.id = "mudebem-orcamento";
    atual.parentNode.insertBefore(alvo, atual);
  }
  if (!alvo) return;
  var params = new URLSearchParams(window.location.search);
  var destino = new URLSearchParams();
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach(function (chave) {
    var valor = params.get(chave);
    if (valor) destino.set(chave, valor);
  });
  if (document.referrer) destino.set("referrer", document.referrer);
  destino.set("embed", "1");
  var quadro = document.createElement("iframe");
  quadro.src = origem + "/orcamento?" + destino.toString();
  quadro.title = "Peça um orçamento da Mude Bem";
  quadro.style.width = "100%";
  quadro.style.border = "0";
  quadro.style.minHeight = "880px";
  quadro.setAttribute("loading", "lazy");
  alvo.appendChild(quadro);
  window.addEventListener("message", function (evento) {
    if (evento.origin !== origem) return;
    var dados = evento.data || {};
    if (dados.tipo === "mudebem-altura" && typeof dados.altura === "number") {
      quadro.style.height = Math.max(640, dados.altura) + "px";
    }
  });
})();
`;
  return new Response(js, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
